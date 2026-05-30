using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Wallet;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class WalletService : IWalletService
    {
        private readonly VNSDbContext _context;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;
        private readonly ILogger<WalletService> _logger;
        private readonly IEmailService _emailService;

        public WalletService(VNSDbContext context, IConfiguration config, IMemoryCache cache, ILogger<WalletService> logger, IEmailService emailService)
        {
            _context = context;
            _config = config;
            _cache = cache;
            _logger = logger;
            _emailService = emailService;
        }

        public async Task<object> GetWalletAsync(Guid userId)
        {
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                wallet = new Wallet
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Balance = 0,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            return new WalletDto
            {
                Id = wallet.Id,
                Balance = wallet.Balance,
                IsActive = wallet.IsActive
            };
        }

        public async Task<object> GetTransactionsAsync(Guid userId, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
                throw new BusinessException("Không tìm thấy ví");

            var query = _context.WalletTransactions
                .Where(wt => wt.WalletId == wallet.Id)
                .OrderByDescending(wt => wt.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(wt => new WalletTransactionDto
                {
                    Id = wt.Id,
                    Amount = wt.Amount,
                    BalanceBefore = wt.BalanceBefore,
                    BalanceAfter = wt.BalanceAfter,
                    Type = wt.Type,
                    Description = wt.Description,
                    BookingId = wt.BookingId,
                    CreatedAt = wt.CreatedAt
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<object> TopUpAsync(Guid userId, decimal amount, string ipAddress)
        {
            if (amount < 10000)
                throw new BusinessException("Số tiền nạp tối thiểu là 10.000 VNĐ");
            if (amount > 50000000)
                throw new BusinessException("Số tiền nạp tối đa là 50.000.000 VNĐ");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                wallet = new Wallet
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Balance = 0,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            var tmnCode = _config["VNPay:TmnCode"]!;
            var hashSecret = _config["VNPay:HashSecret"]!;
            var vnpUrl = _config["VNPay:Url"]!;
            var callbackUrl = _config["VNPay:TopUpCallbackUrl"]!;

            var vnNow = DateTime.UtcNow.AddHours(7);
            var txnRef = $"TOPUP{userId:N}{vnNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}";

            // Lưu mapping txnRef -> userId vào cache (20 phút, dư thời gian VNPay xử lý)
            _cache.Set($"topup_{txnRef}", new TopUpInfo { UserId = userId, Amount = amount }, TimeSpan.FromMinutes(20));

            var vnp = new SortedList<string, string>
            {
                { "vnp_Version", "2.1.0" },
                { "vnp_Command", "pay" },
                { "vnp_TmnCode", tmnCode },
                { "vnp_Amount", ((long)(amount * 100)).ToString() },
                { "vnp_CurrCode", "VND" },
                { "vnp_TxnRef", txnRef },
                { "vnp_OrderInfo", $"Nap tien vi {txnRef}" },
                { "vnp_OrderType", "topup" },
                { "vnp_Locale", "vn" },
                { "vnp_ReturnUrl", callbackUrl },
                { "vnp_IpAddr", ipAddress },
                { "vnp_CreateDate", vnNow.ToString("yyyyMMddHHmmss") },
                { "vnp_ExpireDate", vnNow.AddMinutes(15).ToString("yyyyMMddHHmmss") }
            };

            var queryString = BuildQueryString(vnp);
            var vnpSecureHash = HmacSha512(hashSecret, queryString);
            var paymentUrl = $"{vnpUrl}?{queryString}&vnp_SecureHash={vnpSecureHash}";

            return new { paymentUrl, txnRef, amount };
        }

        public async Task<string> ProcessTopUpCallbackAsync(IQueryCollection queryCollection)
        {
            var hashSecret = _config["VNPay:HashSecret"]!;

            var vnp = new SortedList<string, string>();
            foreach (var (key, value) in queryCollection)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_") && key != "vnp_SecureHash" && key != "vnp_SecureHashType")
                    vnp.Add(key, value.ToString());
            }

            var receivedHash = queryCollection["vnp_SecureHash"].ToString();
            var signData = BuildQueryString(vnp);
            var checkHash = HmacSha512(hashSecret, signData);

            var txnRef = queryCollection["vnp_TxnRef"].ToString();
            var responseCode = queryCollection["vnp_ResponseCode"].ToString();
            var vnpAmount = long.Parse(queryCollection["vnp_Amount"].ToString()) / 100m;

            if (!txnRef.StartsWith("TOPUP"))
                return "invalid";

            if (!string.Equals(receivedHash, checkHash, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Top-up callback invalid hash: {TxnRef}", txnRef);
                return "invalid_hash";
            }

            // Lấy thông tin top-up từ cache
            if (!_cache.TryGetValue($"topup_{txnRef}", out TopUpInfo? topUpInfo) || topUpInfo == null)
            {
                if (TryBuildTopUpInfoFromTxnRef(txnRef, vnpAmount, out topUpInfo))
                {
                    _logger.LogInformation("Top-up callback recovered from txnRef: {TxnRef}", txnRef);
                }
                else
                {
                _logger.LogWarning("Top-up callback: txnRef={TxnRef} không tìm thấy trong cache", txnRef);
                    return "expired";
                }
            }

            if (topUpInfo == null)
                return "expired";

            if (responseCode != "00")
                return "failed";

            if (vnpAmount != topUpInfo.Amount)
            {
                _logger.LogWarning("Top-up callback: số tiền không khớp txnRef={TxnRef}", txnRef);
                return "amount_mismatch";
            }

            // Prevent duplicate processing
            var alreadyProcessed = await _context.WalletTransactions
                .AnyAsync(wt => wt.Description != null && wt.Description.Contains(txnRef));
            if (alreadyProcessed)
                return "already_processed";

            // Credit wallet
            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == topUpInfo.UserId);
            if (wallet == null)
                return "wallet_not_found";

            var balanceBefore = wallet.Balance;
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Wallets SET Balance = Balance + {0}, UpdatedAt = {1} WHERE Id = {2}",
                topUpInfo.Amount, DateTime.UtcNow, wallet.Id);
            await _context.Entry(wallet).ReloadAsync();

            _context.WalletTransactions.Add(new WalletTransaction
            {
                Id = Guid.NewGuid(),
                WalletId = wallet.Id,
                Amount = topUpInfo.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = wallet.Balance,
                Type = WalletTransactionType.TopUp,
                Description = $"Nạp tiền qua VNPay #{txnRef}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Xóa cache
            _cache.Remove($"topup_{txnRef}");

            _logger.LogInformation("Top-up thành công: userId={UserId}, amount={Amount}, txnRef={TxnRef}",
                topUpInfo.UserId, topUpInfo.Amount, txnRef);

            // Gửi email thông báo nạp tiền thành công
            var user = await _context.Users.FindAsync(wallet.UserId);
            if (user != null && !string.IsNullOrEmpty(user.Email))
            {
                _ = _emailService.SendEmailAsync(
                    user.Email,
                    $"Nạp tiền ví VNS thành công - {topUpInfo.Amount:N0} VNĐ",
                    $"<h2>Nạp tiền thành công</h2>" +
                    $"<p>Xin chào <b>{user.FullName ?? user.Email}</b>,</p>" +
                    $"<p>Bạn đã nạp thành công <b>{topUpInfo.Amount:N0} VNĐ</b> vào Ví VNS.</p>" +
                    $"<p><b>Mã giao dịch:</b> {txnRef}</p>" +
                    $"<p><b>Số dư hiện tại:</b> {wallet.Balance:N0} VNĐ</p>" +
                    $"<p>Trân trọng,<br/>Đội ngũ VNS</p>"
                );
            }

            return "success";
        }

        public async Task<string> ProcessTopUpCallbackRawAsync(string rawQuery)
        {
            // Parse raw query string to IQueryCollection-compatible format
            var dict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>();
            foreach (var param in rawQuery.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = param.Split('=', 2);
                var key = WebUtility.UrlDecode(parts[0]);
                var val = parts.Length > 1 ? WebUtility.UrlDecode(parts[1]) : "";
                dict[key] = val;
            }
            var queryCollection = new Microsoft.AspNetCore.Http.QueryCollection(dict);
            return await ProcessTopUpCallbackAsync(queryCollection);
        }

        private static string BuildQueryString(SortedList<string, string> data)
        {
            var sb = new StringBuilder();
            foreach (var kv in data)
            {
                if (sb.Length > 0) sb.Append('&');
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

        private static bool TryBuildTopUpInfoFromTxnRef(string txnRef, decimal amount, out TopUpInfo? info)
        {
            info = null;

            if (string.IsNullOrWhiteSpace(txnRef) || !txnRef.StartsWith("TOPUP", StringComparison.OrdinalIgnoreCase))
                return false;

            var payload = txnRef.Substring("TOPUP".Length);
            if (payload.Length < 32)
                return false;

            var userIdSegment = payload[..32];
            if (!Guid.TryParseExact(userIdSegment, "N", out var userId))
                return false;

            info = new TopUpInfo
            {
                UserId = userId,
                Amount = amount
            };

            return true;
        }

        private class TopUpInfo
        {
            public Guid UserId { get; set; }
            public decimal Amount { get; set; }
        }
    }
}
