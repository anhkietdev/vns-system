using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class PaymentService : IPaymentService
    {
        private readonly VNSDbContext _context;
        private readonly IConfiguration _config;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly ICommerceService _commerceService;

        public PaymentService(
            VNSDbContext context,
            IConfiguration config,
            INotificationService notificationService,
            IEmailService emailService,
            ICommerceService commerceService)
        {
            _context = context;
            _config = config;
            _notificationService = notificationService;
            _emailService = emailService;
            _commerceService = commerceService;
        }

        public async Task<object> CreateVnPayUrlAsync(Guid userId, Guid bookingId, string ipAddress)
        {
            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (!_commerceService.CanPay(booking))
                throw new BusinessException("Đặt chỗ không ở trạng thái chờ thanh toán");

            if (booking.Payment == null)
                throw new BusinessException("Không tìm thấy thông tin thanh toán");

            var vnpayAmount = booking.Payment.Amount;
            var paymentUrl = BuildVnPayUrl(booking.BookingCode, vnpayAmount, ipAddress);

            booking.Payment.PaymentMethod = PaymentMethod.VNPay;
            booking.Payment.WalletAmount = 0;
            booking.Payment.VnPayAmount = vnpayAmount;
            booking.Payment.PaymentStatus = PaymentStatus.Pending;
            booking.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _commerceService.CreatePaymentAttemptAsync(
                booking,
                PaymentMethod.VNPay,
                booking.FinalAmount,
                0,
                vnpayAmount);

            return new { PaymentUrl = paymentUrl, BookingCode = booking.BookingCode };
        }

        public async Task<string> ProcessVnPayCallbackAsync(IQueryCollection queryCollection)
        {
            var hashSecret = _config["VNPay:HashSecret"]!;
            var frontendUrl = _config["VNPay:FrontendUrl"]
                ?? throw new InvalidOperationException("VNPay:FrontendUrl is not configured in appsettings.");

            var vnp = new SortedList<string, string>();
            foreach (var (key, value) in queryCollection)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_") && key != "vnp_SecureHash" && key != "vnp_SecureHashType")
                    vnp.Add(key, value.ToString());
            }

            var receivedHash = queryCollection["vnp_SecureHash"].ToString();
            var signData = BuildQueryString(vnp);
            var checkHash = HmacSha512(hashSecret, signData);

            var bookingCode = queryCollection["vnp_TxnRef"].ToString();
            var responseCode = queryCollection["vnp_ResponseCode"].ToString();
            var transactionId = queryCollection["vnp_TransactionNo"].ToString();
            var callbackPayload = string.Join("&", queryCollection.Select(item => $"{item.Key}={item.Value}"));

            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .Include(b => b.Service)
                .FirstOrDefaultAsync(b => b.BookingCode == bookingCode);

            if (booking == null)
                return $"{frontendUrl}?success=false&message=booking_not_found";

            var paymentOrder = await _commerceService.EnsurePaymentOrderAsync(booking);
            var attempt = await _context.PaymentAttempts
                .Where(item => item.PaymentOrderId == paymentOrder.Id
                    && (item.PaymentMethod == PaymentMethod.VNPay || item.PaymentMethod == PaymentMethod.Combined))
                .OrderByDescending(item => item.CreatedAt)
                .FirstOrDefaultAsync();

            if (attempt == null)
            {
                attempt = await _commerceService.CreatePaymentAttemptAsync(
                    booking,
                    booking.Payment?.PaymentMethod ?? PaymentMethod.VNPay,
                    booking.FinalAmount,
                    booking.Payment?.WalletAmount ?? 0,
                    booking.Payment?.VnPayAmount ?? booking.FinalAmount);
            }

            if (booking.CommercialStatus == BookingCommercialStatus.Paid)
                return $"{frontendUrl}?success=true&message=already_processed&bookingCode={bookingCode}";

            if (!string.Equals(receivedHash, checkHash, StringComparison.OrdinalIgnoreCase))
            {
                if (booking.Payment != null)
                    booking.Payment.VnPayResponseCode = "INVALID_HASH";
                await _commerceService.FailPaymentAsync(booking, attempt, "Invalid signature", "INVALID_HASH", callbackPayload);
                return $"{frontendUrl}?success=false&message=invalid_hash&bookingCode={bookingCode}";
            }

            var vnpAmount = long.Parse(queryCollection["vnp_Amount"].ToString()) / 100;
            var expectedAmount = (long)(booking.Payment != null && booking.Payment.VnPayAmount > 0
                ? booking.Payment.VnPayAmount
                : booking.FinalAmount);
            if (vnpAmount != expectedAmount)
            {
                await _commerceService.FailPaymentAsync(booking, attempt, "Amount mismatch", responseCode, callbackPayload);
                return $"{frontendUrl}?success=false&message=amount_mismatch&bookingCode={bookingCode}";
            }

            if (booking.Payment != null)
            {
                booking.Payment.VnPayTransactionId = transactionId;
                booking.Payment.VnPayResponseCode = responseCode;
            }

            if (responseCode == "00")
            {
                if (booking.Payment != null && booking.Payment.PaymentMethod == PaymentMethod.Combined && booking.Payment.WalletAmount > 0)
                {
                    var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == booking.UserId);
                    if (wallet == null)
                    {
                        await _commerceService.FailPaymentAsync(booking, attempt, "Wallet not found for combined payment", responseCode, callbackPayload);
                        return $"{frontendUrl}?success=false&message=wallet_not_found&bookingCode={bookingCode}";
                    }

                    var walletAmount = booking.Payment.WalletAmount;
                    var updated = await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE Wallets SET Balance = Balance - {0} WHERE Id = {1} AND Balance >= {0}",
                        walletAmount, wallet.Id);
                    if (updated == 0)
                    {
                        await _commerceService.FailPaymentAsync(booking, attempt, "Insufficient wallet balance for combined payment", responseCode, callbackPayload);
                        return $"{frontendUrl}?success=false&message=insufficient_wallet_balance&bookingCode={bookingCode}";
                    }

                    await _context.Entry(wallet).ReloadAsync();
                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        Id = Guid.NewGuid(),
                        WalletId = wallet.Id,
                        BookingId = booking.Id,
                        Amount = -walletAmount,
                        BalanceBefore = wallet.Balance + walletAmount,
                        BalanceAfter = wallet.Balance,
                        Type = WalletTransactionType.Payment,
                        Description = $"Thanh toán một phần đặt chỗ #{booking.BookingCode}",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _commerceService.CompletePaymentAsync(
                    booking,
                    attempt,
                    PaymentStatus.Completed,
                    transactionId,
                    responseCode,
                    callbackPayload);

                await _notificationService.SendNotificationAsync(
                    booking.UserId,
                    "Thanh toán thành công",
                    $"Thanh toán cho đặt chỗ #{booking.BookingCode} đã hoàn tất",
                    NotificationType.PaymentSuccess,
                    booking.Id
                );

                var user = await _context.Users.FindAsync(booking.UserId);
                if (user != null)
                {
                    var methodName = booking.Payment?.PaymentMethod switch
                    {
                        PaymentMethod.VNPay => "VNPay",
                        PaymentMethod.Combined => "Ví + VNPay",
                        _ => "Ví VNS"
                    };
                    _ = _emailService.SendPaymentSuccessEmailAsync(
                        user.Email,
                        booking.BookingCode,
                        booking.Service?.Name ?? "Dịch vụ VNS",
                        booking.FinalAmount,
                        methodName ?? "VNPay");
                }

                await _context.SaveChangesAsync();
                return $"{frontendUrl}?success=true&bookingCode={bookingCode}";
            }

            await _commerceService.FailPaymentAsync(booking, attempt, "Gateway returned failure response", responseCode, callbackPayload);
            await _notificationService.SendNotificationAsync(
                booking.UserId,
                "Thanh toán thất bại",
                $"Thanh toán cho đặt chỗ #{booking.BookingCode} đã thất bại",
                NotificationType.PaymentFailed,
                booking.Id
            );

            return $"{frontendUrl}?success=false&bookingCode={bookingCode}";
        }

        public async Task<object> PayWithWalletAsync(Guid userId, Guid bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .Include(b => b.Service)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (!_commerceService.CanPay(booking))
                throw new BusinessException("Đặt chỗ không ở trạng thái chờ thanh toán");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
                throw new BusinessException("Không tìm thấy ví");

            var amount = booking.FinalAmount;
            var attempt = await _commerceService.CreatePaymentAttemptAsync(booking, PaymentMethod.Wallet, amount, amount, 0);

            var updated = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Wallets SET Balance = Balance - {0} WHERE Id = {1} AND Balance >= {0}",
                amount, wallet.Id);
            if (updated == 0)
            {
                if (booking.Payment != null)
                {
                    booking.Payment.PaymentMethod = PaymentMethod.Wallet;
                    booking.Payment.PaymentStatus = PaymentStatus.Failed;
                }

                booking.UpdatedAt = DateTime.UtcNow;
                await _commerceService.FailPaymentAsync(booking, attempt, "Insufficient wallet balance");

                try
                {
                    await _notificationService.SendNotificationAsync(
                        userId,
                        "Thanh toán thất bại",
                        $"Ví VNS không đủ số dư cho đặt chỗ #{booking.BookingCode}. Vui lòng nạp ví và thử lại.",
                        NotificationType.PaymentFailed,
                        booking.Id
                    );
                }
                catch
                {
                }

                throw new BusinessException("Số dư ví không đủ. Đặt chỗ vẫn được giữ cho đến khi hết hạn hoặc bạn thanh toán lại.");
            }

            await _context.Entry(wallet).ReloadAsync();
            _context.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = wallet.Id,
                BookingId = booking.Id,
                Amount = -amount,
                BalanceBefore = wallet.Balance + amount,
                BalanceAfter = wallet.Balance,
                Type = WalletTransactionType.Payment,
                Description = $"Thanh toán đặt chỗ #{booking.BookingCode}",
                CreatedAt = DateTime.UtcNow
            });

            booking.Payment!.PaymentMethod = PaymentMethod.Wallet;
            booking.Payment.WalletAmount = amount;
            booking.Payment.VnPayAmount = 0;
            booking.Payment.PaymentStatus = PaymentStatus.Completed;
            booking.Payment.PaidAt = DateTime.UtcNow;
            booking.ExpiresAt = null;
            booking.UpdatedAt = DateTime.UtcNow;

            await _commerceService.CompletePaymentAsync(
                booking,
                attempt,
                PaymentStatus.Completed,
                null,
                "WALLET");

            await _notificationService.SendNotificationAsync(
                userId,
                "Thanh toán thành công",
                $"Thanh toán bằng ví cho đặt chỗ #{booking.BookingCode} đã hoàn tất",
                NotificationType.PaymentSuccess,
                booking.Id
            );

            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                _ = _emailService.SendPaymentSuccessEmailAsync(
                    user.Email, booking.BookingCode, booking.Service?.Name ?? "Dịch vụ VNS",
                    booking.FinalAmount, "Ví VNS");
            }

            await _context.SaveChangesAsync();
            return new { Message = "Thanh toán bằng ví thành công", BookingCode = booking.BookingCode, WalletBalance = wallet.Balance };
        }

        public async Task<object> PayCombinedAsync(Guid userId, Guid bookingId, decimal walletAmount, string ipAddress)
        {
            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (!_commerceService.CanPay(booking))
                throw new BusinessException("Đặt chỗ không ở trạng thái chờ thanh toán");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
                throw new BusinessException("Không tìm thấy ví");

            if (wallet.Balance < walletAmount)
                throw new BusinessException("Số dư ví không đủ");

            if (walletAmount <= 0 || walletAmount >= booking.FinalAmount)
                throw new BusinessException("Số tiền từ ví phải lớn hơn 0 và nhỏ hơn tổng đơn");

            var vnpayAmount = booking.FinalAmount - walletAmount;

            booking.Payment!.PaymentMethod = PaymentMethod.Combined;
            booking.Payment.WalletAmount = walletAmount;
            booking.Payment.VnPayAmount = vnpayAmount;
            booking.Payment.PaymentStatus = PaymentStatus.Pending;
            booking.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _commerceService.CreatePaymentAttemptAsync(
                booking,
                PaymentMethod.Combined,
                booking.FinalAmount,
                walletAmount,
                vnpayAmount);

            var paymentUrl = BuildVnPayUrl(booking.BookingCode, vnpayAmount, ipAddress);
            return new { PaymentUrl = paymentUrl, BookingCode = booking.BookingCode, WalletReserved = walletAmount, VnPayAmount = vnpayAmount };
        }

        private string BuildVnPayUrl(string bookingCode, decimal amount, string ipAddress)
        {
            var tmnCode = _config["VNPay:TmnCode"]!;
            var hashSecret = _config["VNPay:HashSecret"]!;
            var vnpUrl = _config["VNPay:Url"]!;
            var callbackUrl = _config["VNPay:CallbackUrl"]!;
            var vnNow = DateTime.UtcNow.AddHours(7);

            var vnp = new SortedList<string, string>
            {
                { "vnp_Version", "2.1.0" },
                { "vnp_Command", "pay" },
                { "vnp_TmnCode", tmnCode },
                { "vnp_Amount", ((long)(amount * 100)).ToString() },
                { "vnp_CurrCode", "VND" },
                { "vnp_TxnRef", bookingCode },
                { "vnp_OrderInfo", $"Thanh toan dat cho {bookingCode}" },
                { "vnp_OrderType", "travel" },
                { "vnp_Locale", "vn" },
                { "vnp_ReturnUrl", callbackUrl },
                { "vnp_IpAddr", ipAddress },
                { "vnp_CreateDate", vnNow.ToString("yyyyMMddHHmmss") },
                { "vnp_ExpireDate", vnNow.AddMinutes(15).ToString("yyyyMMddHHmmss") }
            };

            var queryString = BuildQueryString(vnp);
            var vnpSecureHash = HmacSha512(hashSecret, queryString);
            return $"{vnpUrl}?{queryString}&vnp_SecureHash={vnpSecureHash}";
        }

        private static string BuildQueryString(SortedList<string, string> data)
        {
            var sb = new StringBuilder();
            foreach (var kv in data)
            {
                if (sb.Length > 0)
                    sb.Append('&');
                sb.Append(WebUtility.UrlEncode(kv.Key));
                sb.Append('=');
                sb.Append(WebUtility.UrlEncode(kv.Value));
            }

            return sb.ToString();
        }

        private static string HmacSha512(string key, string data)
        {
            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}
