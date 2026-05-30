using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Wallet;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;
        private readonly IConfiguration _config;

        public WalletController(IWalletService walletService, IConfiguration config)
        {
            _walletService = walletService;
            _config = config;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetWallet()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _walletService.GetWalletAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin ví thành công"));
        }

        [HttpGet("transactions")]
        [Authorize]
        public async Task<IActionResult> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _walletService.GetTransactionsAsync(userId, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy lịch sử giao dịch thành công"));
        }

        [HttpPost("topup")]
        [Authorize]
        public async Task<IActionResult> TopUp([FromBody] Models.DTOs.Wallet.TopUpDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var result = await _walletService.TopUpAsync(userId, dto.Amount, ipAddress);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo liên kết nạp tiền thành công"));
        }

        [HttpPost("confirm-topup-raw")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmTopUpRaw([FromBody] ConfirmTopUpRawDto dto)
        {
            try
            {
                var result = await _walletService.ProcessTopUpCallbackRawAsync(dto.RawQuery);
                var isSuccess = result == "success" || result == "already_processed";
                return Ok(ApiResponse<object>.SuccessResponse(new { success = isSuccess, result }, isSuccess ? "Nạp tiền thành công" : result));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }
        }

        [HttpGet("topup-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> TopUpCallback()
        {
            string success = "false";
            string message = "Đã xảy ra lỗi";
            string txnRef = "";
            var redirectBaseUrl = _config["VNPay:TopUpFrontendUrl"] ?? "myapp://topup-result";
            var redirectUrl = $"{redirectBaseUrl}?success=false";

            try
            {
                var queryCollection = HttpContext.Request.Query;
                txnRef = queryCollection["vnp_TxnRef"].ToString();
                var result = await _walletService.ProcessTopUpCallbackAsync(queryCollection);

                success = result == "success" || result == "already_processed" ? "true" : "false";
                message = result switch
                {
                    "success" => "Nạp tiền thành công",
                    "already_processed" => "Giao dịch đã được xử lý",
                    "failed" => "Thanh toán thất bại",
                    "invalid_hash" => "Chữ ký không hợp lệ",
                    "expired" => "Giao dịch đã hết hạn",
                    "amount_mismatch" => "Số tiền không khớp",
                    _ => "Đã xảy ra lỗi"
                };
                redirectUrl = $"{redirectBaseUrl}?success={success}&txnRef={System.Web.HttpUtility.UrlEncode(txnRef)}&message={System.Web.HttpUtility.UrlEncode(message)}";
            }
            catch (Exception ex)
            {
                message = ex.Message;
                redirectUrl = $"{redirectBaseUrl}?success=false&txnRef={System.Web.HttpUtility.UrlEncode(txnRef)}&message={System.Web.HttpUtility.UrlEncode(message)}";
            }

            var isSuccess = success == "true";
            var redirectHref = WebUtility.HtmlEncode(redirectUrl);
            var redirectScriptUrl = System.Web.HttpUtility.JavaScriptStringEncode(redirectUrl);
            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <title>Kết quả nạp tiền</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }}
        .card {{ background: #fff; border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .icon {{ font-size: 64px; margin-bottom: 16px; }}
        .title {{ font-size: 22px; font-weight: 700; color: #1a2332; margin-bottom: 8px; }}
        .msg {{ font-size: 14px; color: #5a6577; line-height: 1.6; margin-bottom: 28px; }}
        .btn {{ display: block; width: 100%; padding: 14px; border-radius: 14px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; margin-bottom: 12px; text-decoration: none; }}
        .btn-primary {{ background: #008fa0; color: #fff; }}
        .btn-secondary {{ background: #f4f6f8; color: #5a6577; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='icon'>{(isSuccess ? "✅" : "❌")}</div>
        <div class='title'>{(isSuccess ? "Nạp tiền thành công" : "Nạp tiền thất bại")}</div>
        <div class='msg'>{message}</div>
        <a class='btn btn-primary' href='myapp://topup-result?success={success}&txnRef={txnRef}'>Quay lại ứng dụng</a>
        <div class='btn btn-secondary' onclick='window.close()'>Đóng trang này</div>
    </div>
    <script>
        document.querySelector('.btn-primary')?.setAttribute('href', '{redirectHref}');
        setTimeout(function() {{
            window.location.href = '{redirectScriptUrl}';
        }}, 1000);
    </script>
</body>
</html>";

            return Content(html, "text/html");
        }
    }
}
