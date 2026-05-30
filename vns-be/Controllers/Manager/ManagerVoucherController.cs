using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Manager
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Manager")]
    public class ManagerVoucherController : ControllerBase
    {
        private readonly IVoucherService _voucherService;

        public ManagerVoucherController(IVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllVouchers([FromQuery] VoucherFilterDto filter)
        {
            var result = await _voucherService.GetAllVouchersAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách voucher thành công"));
        }

        [HttpPost]
        public async Task<IActionResult> CreateVoucher([FromBody] CreateVoucherDto dto)
        {
            var result = await _voucherService.CreateVoucherAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo voucher thành công"));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVoucher(Guid id, [FromBody] UpdateVoucherDto dto)
        {
            var result = await _voucherService.UpdateVoucherAsync(id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật voucher thành công"));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVoucher(Guid id)
        {
            var result = await _voucherService.DeleteVoucherAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xoá voucher thành công"));
        }
    }
}
