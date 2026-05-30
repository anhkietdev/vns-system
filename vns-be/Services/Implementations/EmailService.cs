using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;
        private readonly HttpClient _httpClient;

        public EmailService(IConfiguration config, ILogger<EmailService> logger, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient("Resend");
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var apiKey = _config["Resend:ApiKey"];
                var fromEmail = _config["Resend:FromEmail"] ?? "noreply@qlhtt.io.vn";
                var fromName = _config["Resend:FromName"] ?? "VNS";

                var payload = new
                {
                    from = $"{fromName} <{fromEmail}>",
                    to = new[] { toEmail },
                    subject = subject,
                    html = body
                };

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
                {
                    Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Resend API lỗi: {StatusCode} - {Error}", response.StatusCode, error);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi gửi email đến {Email}", toEmail);
            }
        }

        public async Task SendOtpEmailAsync(string toEmail, string otp)
        {
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #0066cc;'>VNS - Du lịch khám phá Việt Nam</h2>
                    <p>Xin chào,</p>
                    <p>Mã OTP của bạn là:</p>
                    <div style='background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;'>{otp}</span>
                    </div>
                    <p>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
                    <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'/>
                    <p style='color: #999; font-size: 12px;'>VNS - Vietnam Travel Explorer</p>
                </div>";

            await SendEmailAsync(toEmail, "Mã xác thực OTP - VNS", body);
        }

        public async Task SendPasswordChangedEmailAsync(string toEmail, string fullName)
        {
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #0066cc;'>VNS - Du lịch khám phá Việt Nam</h2>
                    <p>Xin chào <strong>{fullName}</strong>,</p>
                    <p>Mật khẩu tài khoản của bạn đã được thay đổi thành công.</p>
                    <div style='background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;'>
                        <p style='margin: 0;'>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ bộ phận hỗ trợ ngay lập tức.</p>
                    </div>
                    <p>Thời gian thay đổi: <strong>{DateTime.UtcNow.AddHours(7):dd/MM/yyyy HH:mm}</strong></p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'/>
                    <p style='color: #999; font-size: 12px;'>VNS - Vietnam Travel Explorer</p>
                </div>";

            await SendEmailAsync(toEmail, "Thông báo đổi mật khẩu - VNS", body);
        }

        public async Task SendPaymentSuccessEmailAsync(string toEmail, string bookingCode, string serviceName, decimal amount, string paymentMethod)
        {
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #0066cc;'>VNS - Du lịch khám phá Việt Nam</h2>
                    <p>Xin chào,</p>
                    <p>Thanh toán của bạn đã được xử lý thành công!</p>
                    <div style='background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;'>
                        <p><strong>Mã đặt chỗ:</strong> {bookingCode}</p>
                        <p><strong>Dịch vụ:</strong> {serviceName}</p>
                        <p><strong>Số tiền:</strong> {amount:N0} VNĐ</p>
                        <p><strong>Phương thức:</strong> {paymentMethod}</p>
                        <p><strong>Thời gian:</strong> {DateTime.UtcNow.AddHours(7):dd/MM/yyyy HH:mm}</p>
                    </div>
                    <p>Đặt chỗ của bạn đang chờ đối tác xác nhận. Bạn sẽ nhận được thông báo khi đặt chỗ được xác nhận.</p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'/>
                    <p style='color: #999; font-size: 12px;'>VNS - Vietnam Travel Explorer</p>
                </div>";

            await SendEmailAsync(toEmail, $"Thanh toán thành công #{bookingCode} - VNS", body);
        }

        public async Task SendTripInfoEmailAsync(string toEmail, string bookingCode, string serviceName, string contactName, int numberOfGuests, DateTime? checkIn, DateTime? checkOut)
        {
            var dateInfo = "";
            if (checkIn.HasValue && checkOut.HasValue)
                dateInfo = $"<p><strong>Ngày nhận phòng:</strong> {checkIn.Value:dd/MM/yyyy}</p><p><strong>Ngày trả phòng:</strong> {checkOut.Value:dd/MM/yyyy}</p>";
            else if (checkIn.HasValue)
                dateInfo = $"<p><strong>Ngày khởi hành:</strong> {checkIn.Value:dd/MM/yyyy}</p>";

            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #0066cc;'>VNS - Du lịch khám phá Việt Nam</h2>
                    <p>Xin chào <strong>{contactName}</strong>,</p>
                    <p>Đặt chỗ của bạn đã được xác nhận! Dưới đây là thông tin chuyến đi:</p>
                    <div style='background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066cc;'>
                        <p><strong>Mã đặt chỗ:</strong> {bookingCode}</p>
                        <p><strong>Dịch vụ:</strong> {serviceName}</p>
                        <p><strong>Số khách:</strong> {numberOfGuests}</p>
                        {dateInfo}
                    </div>
                    <p>Chúc bạn có chuyến đi vui vẻ!</p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'/>
                    <p style='color: #999; font-size: 12px;'>VNS - Vietnam Travel Explorer</p>
                </div>";

            await SendEmailAsync(toEmail, $"Thông tin chuyến đi #{bookingCode} - VNS", body);
        }
    }
}
