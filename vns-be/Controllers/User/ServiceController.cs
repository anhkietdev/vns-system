using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Service;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public ServiceController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetServices([FromQuery] ServiceFilterDto filter)
        {
            var result = await _serviceService.GetServicesAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách dịch vụ thành công"));
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetServiceById(Guid id)
        {
            var result = await _serviceService.GetServiceByIdAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin dịch vụ thành công"));
        }

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchServices([FromQuery] string? keyword, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var filter = new ServiceFilterDto { Keyword = keyword, Page = page, PageSize = pageSize };
            var result = await _serviceService.GetServicesAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tìm kiếm dịch vụ thành công"));
        }

        [HttpGet("popular")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPopularServices([FromQuery] int count = 10)
        {
            var result = await _serviceService.GetPopularServicesAsync(count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy dịch vụ phổ biến thành công"));
        }

        [HttpGet("nearby")]
        [AllowAnonymous]
        public async Task<IActionResult> GetNearbyServices([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusKm = 50)
        {
            var result = await _serviceService.GetNearbyServicesAsync(lat, lng, radiusKm);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy dịch vụ gần đây thành công"));
        }
    }
}
