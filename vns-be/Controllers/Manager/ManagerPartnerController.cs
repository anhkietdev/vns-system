using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Manager
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Manager")]
    public class ManagerPartnerController : ControllerBase
    {
        private readonly IManagerService _managerService;

        public ManagerPartnerController(IManagerService managerService)
        {
            _managerService = managerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPartners([FromQuery] int? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var result = await _managerService.GetAllPartnersAsync(status, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đối tác thành công"));
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingPartners([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _managerService.GetPendingPartnersAsync(page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đối tác chờ duyệt thành công"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPartnerDetail(Guid id)
        {
            var result = await _managerService.GetPartnerDetailAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin đối tác thành công"));
        }

        [HttpPut("{id}/verify")]
        public async Task<IActionResult> VerifyPartner(Guid id, [FromBody] PartnerVerificationDto dto)
        {
            var managerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _managerService.VerifyPartnerAsync(id, dto, managerId);
            return Ok(ApiResponse<object>.SuccessResponse(result, dto.IsApproved ? "Phê duyệt đối tác thành công" : "Từ chối đối tác thành công"));
        }

        [HttpPut("{id}/commission")]
        public async Task<IActionResult> UpdateCommissionRate(Guid id, [FromBody] UpdateCommissionRateDto dto)
        {
            var result = await _managerService.UpdateCommissionRateAsync(id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật tỷ lệ hoa hồng thành công"));
        }
    }
}
