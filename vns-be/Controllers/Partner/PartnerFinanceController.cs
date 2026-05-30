using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Partner
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Partner")]
    public class PartnerFinanceController : ControllerBase
    {
        private readonly IPartnerService _partnerService;

        public PartnerFinanceController(IPartnerService partnerService)
        {
            _partnerService = partnerService;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetFinanceDashboard()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.GetPartnerDashboardAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thống kê tài chính thành công"));
        }

        [HttpGet("payouts")]
        public async Task<IActionResult> GetPayouts([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.GetPartnerPayoutsAsync(userId, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách thanh toán thành công"));
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] PartnerTransactionFilterDto filter)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.GetPartnerTransactionsAsync(userId, filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách giao dịch thành công"));
        }

        [HttpPost("payout-request")]
        public async Task<IActionResult> RequestPayout([FromBody] RequestPayoutDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.RequestPayoutAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Yêu cầu rút tiền thành công"));
        }
    }
}
