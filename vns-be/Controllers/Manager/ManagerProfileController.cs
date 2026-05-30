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
    public class ManagerProfileController : ControllerBase
    {
        private readonly IManagerService _managerService;

        public ManagerProfileController(IManagerService managerService)
        {
            _managerService = managerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _managerService.GetManagerProfileAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin hồ sơ thành công"));
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateManagerProfileDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _managerService.UpdateManagerProfileAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật hồ sơ thành công"));
        }

        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _managerService.ChangeManagerPasswordAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đổi mật khẩu thành công"));
        }
    }
}
