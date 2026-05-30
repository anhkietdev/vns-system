using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;
using System.Web;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IConfiguration _config;

        public PaymentController(IPaymentService paymentService, IConfiguration config)
        {
            _paymentService = paymentService;
            _config = config;
        }

        [HttpPost("vnpay/{bookingId}")]
        [Authorize]
        public async Task<IActionResult> CreateVnPayUrl(Guid bookingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var result = await _paymentService.CreateVnPayUrlAsync(userId, bookingId, ipAddress);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo liên kết thanh toán VNPay thành công"));
        }

        [HttpGet("vnpay-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> VnPayCallback()
        {
            string success = "false";
            string bookingCode = "";
            var redirectUrl = $"{_config["VNPay:FrontendUrl"] ?? "myapp://payment-result"}?success=false";
            string message = "Đã xảy ra lỗi";

            try
            {
                var queryCollection = HttpContext.Request.Query;
                var resultUrl = await _paymentService.ProcessVnPayCallbackAsync(queryCollection);
                redirectUrl = resultUrl;
                // Parse result URL params
                var uri = new Uri(resultUrl);
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                success = query["success"] ?? "false";
                bookingCode = query["bookingCode"] ?? "";
                message = query["message"] ?? (success == "true" ? "Thanh toán thành công" : "Thanh toán thất bại");
            }
            catch (Exception ex)
            {
                message = ex.Message;
            }

            var isSuccess = success == "true";
            var redirectHref = WebUtility.HtmlEncode(redirectUrl);
            var redirectScriptUrl = HttpUtility.JavaScriptStringEncode(redirectUrl);
            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <title>Kết quả thanh toán</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }}
        .card {{ background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .icon {{ font-size: 64px; margin-bottom: 16px; }}
        .title {{ font-size: 22px; font-weight: 700; color: #1a2332; margin-bottom: 8px; }}
        .code {{ font-size: 15px; color: #008fa0; font-weight: 600; margin-bottom: 8px; }}
        .msg {{ font-size: 14px; color: #5a6577; line-height: 1.6; margin-bottom: 28px; }}
        .btn {{ display: block; width: 100%; padding: 14px; border-radius: 14px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; margin-bottom: 12px; text-decoration: none; }}
        .btn-primary {{ background: #008fa0; color: #fff; }}
        .btn-secondary {{ background: #f4f6f8; color: #5a6577; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='icon'>{(isSuccess ? "✅" : "❌")}</div>
        <div class='title'>{(isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại")}</div>
        {(string.IsNullOrEmpty(bookingCode) ? "" : $"<div class='code'>Mã đặt chỗ: {bookingCode}</div>")}
        <div class='msg'>{(isSuccess ? "Đơn đặt chỗ của bạn đã được thanh toán thành công. Bạn có thể đóng trang này và quay lại ứng dụng." : message)}</div>
        <a class='btn btn-primary' href='myapp://payment-result?success={success}&bookingCode={bookingCode}'>Quay lại ứng dụng</a>
        <div class='btn btn-secondary' onclick='window.close()'>Đóng trang này</div>
    </div>
    <script>
        document.querySelector('.btn-primary')?.setAttribute('href', '{redirectHref}');
        // Tự động thử mở app sau 1 giây
        setTimeout(function() {{
            window.location.href = '{redirectScriptUrl}';
        }}, 1000);
    </script>
</body>
</html>";

            return Content(html, "text/html");
        }

        // Endpoint cho mobile gọi trực tiếp sau khi VNPay redirect (JSON body)
        [HttpPost("confirm-vnpay")]
        [Authorize]
        public async Task<IActionResult> ConfirmVnPay([FromBody] Dictionary<string, string> vnpParams)
        {
            try
            {
                var queryDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>();
                foreach (var kv in vnpParams)
                    queryDict[kv.Key] = kv.Value;
                var queryCollection = new Microsoft.AspNetCore.Http.QueryCollection(queryDict);

                var resultUrl = await _paymentService.ProcessVnPayCallbackAsync(queryCollection);
                var uri = new Uri(resultUrl);
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var success = query["success"] == "true";

                return Ok(ApiResponse<object>.SuccessResponse(new { Success = success, Message = query["message"] },
                    success ? "Xác nhận thanh toán thành công" : "Xác nhận thanh toán thất bại"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }

        // Endpoint cho mobile gửi RAW query string bọc trong JSON
        [HttpPost("confirm-vnpay-raw")]
        [Authorize]
        public async Task<IActionResult> ConfirmVnPayRaw([FromBody] VnPayRawDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto?.QueryString))
                    return BadRequest(ApiResponse<object>.ErrorResponse("Query string rỗng"));

                // HttpUtility.ParseQueryString decode đúng cả + và %20 thành space
                var parsed = System.Web.HttpUtility.ParseQueryString(dto.QueryString);
                var queryDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>();
                foreach (string? key in parsed.AllKeys)
                {
                    if (key != null)
                        queryDict[key] = parsed[key] ?? "";
                }
                var queryCollection = new Microsoft.AspNetCore.Http.QueryCollection(queryDict);

                var resultUrl = await _paymentService.ProcessVnPayCallbackAsync(queryCollection);
                var uri = new Uri(resultUrl);
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var success = query["success"] == "true";

                return Ok(ApiResponse<object>.SuccessResponse(new { Success = success, Message = query["message"] },
                    success ? "Xác nhận thanh toán thành công" : "Xác nhận thanh toán thất bại"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }

        public class VnPayRawDto
        {
            public string QueryString { get; set; } = "";
        }

        [HttpPost("wallet/{bookingId}")]
        [Authorize]
        public async Task<IActionResult> PayWithWallet(Guid bookingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _paymentService.PayWithWalletAsync(userId, bookingId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Thanh toán bằng ví thành công"));
        }

        [HttpPost("combined/{bookingId}")]
        [Authorize]
        public async Task<IActionResult> PayCombined(Guid bookingId, [FromQuery] decimal walletAmount)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var result = await _paymentService.PayCombinedAsync(userId, bookingId, walletAmount, ipAddress);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo thanh toán kết hợp thành công"));
        }
    }
}
