using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Admin
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpPut("users/{id}/reset-password")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResetUserPassword(Guid id, [FromBody] ResetPasswordDto dto)
        {
            var result = await _adminService.ResetUserPasswordAsync(id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Reset mật khẩu thành công"));
        }

        [HttpGet("dashboard")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetDashboard()
        {
            var result = await _adminService.GetDashboardStatsAsync();
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thống kê tổng quan thành công"));
        }

        [HttpGet("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUsers([FromQuery] UserFilterDto filter)
        {
            var result = await _adminService.GetUsersAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách người dùng thành công"));
        }

        [HttpPut("users/{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusDto dto)
        {
            var result = await _adminService.UpdateUserStatusAsync(id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật trạng thái người dùng thành công"));
        }

        [HttpPut("users/{id}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleDto dto)
        {
            var adminId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
            var result = await _adminService.UpdateUserRoleAsync(id, dto, adminId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật vai trò người dùng thành công"));
        }

        [HttpDelete("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var result = await _adminService.DeleteUserAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xoá người dùng thành công"));
        }

        [HttpPost("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateManager([FromBody] CreateManagerDto dto)
        {
            var adminId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
            var result = await _adminService.CreateManagerAsync(dto, adminId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo tài khoản quản lý thành công"));
        }
    }
}
