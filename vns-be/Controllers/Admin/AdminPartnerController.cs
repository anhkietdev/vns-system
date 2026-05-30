using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Admin
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminPartnerController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminPartnerController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPartners([FromQuery] int? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var result = await _adminService.GetAllPartnersAsync(status, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đối tác thành công"));
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingPartners([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _adminService.GetPendingPartnersAsync(page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đối tác chờ duyệt thành công"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPartnerDetail(Guid id)
        {
            var result = await _adminService.GetPartnerDetailAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin đối tác thành công"));
        }
    }
}
