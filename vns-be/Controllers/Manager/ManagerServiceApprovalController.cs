using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Service;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Manager
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Manager")]
    public class ManagerServiceApprovalController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public ManagerServiceApprovalController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingServices([FromQuery] ServiceApprovalFilterDto filter)
        {
            var result = await _serviceService.GetPendingServicesAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách dịch vụ chờ duyệt thành công"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetApprovalDetail(Guid id)
        {
            var result = await _serviceService.GetApprovalDetailAsync(id);
            return Ok(ApiResponse<ServiceDetailDto>.SuccessResponse(result, "Lấy chi tiết duyệt dịch vụ thành công"));
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveService(Guid id, [FromBody] ServiceApprovalActionDto dto)
        {
            var managerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.ApproveServiceAsync(id, dto, managerId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Phê duyệt dịch vụ thành công"));
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectService(Guid id, [FromBody] ServiceApprovalActionDto dto)
        {
            var managerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.RejectServiceAsync(id, dto, managerId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Từ chối dịch vụ thành công"));
        }
    }
}
