using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Voucher;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class VoucherController : ControllerBase
    {
        private readonly IVoucherService _voucherService;

        public VoucherController(IVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveVouchers()
        {
            // Nếu user đã login, filter bỏ voucher đã dùng hết lượt
            Guid? userId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var uid))
                userId = uid;
            var result = await _voucherService.GetActiveVouchersForUserAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách voucher thành công"));
        }

        [HttpPost("apply")]
        [Authorize]
        public async Task<IActionResult> ApplyVoucher([FromBody] ApplyVoucherDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _voucherService.ApplyVoucherAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Áp dụng voucher thành công"));
        }
    }
}
