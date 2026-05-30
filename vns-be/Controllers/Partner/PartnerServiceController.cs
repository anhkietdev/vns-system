using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.DTOs.Service;
using VNS.API.Services.Interfaces;
using VNS.API.Data;
using VNS.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace VNS.API.Controllers.Partner
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Partner")]
    public class PartnerServiceController : ControllerBase
    {
        private readonly IServiceService _serviceService;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly VNSDbContext _context;

        public PartnerServiceController(IServiceService serviceService, ICloudinaryService cloudinaryService, VNSDbContext context)
        {
            _serviceService = serviceService;
            _cloudinaryService = cloudinaryService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetOwnServices([FromQuery] PartnerServiceFilterDto filter)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.GetPartnerServicesAsync(userId, filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách dịch vụ thành công"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetServiceDetail(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.GetPartnerServiceDetailAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy chi tiết dịch vụ thành công"));
        }

        [HttpPost("tour")]
        public async Task<IActionResult> CreateTour([FromBody] CreateTourDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.CreateTourAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo tour du lịch thành công"));
        }

        [HttpPost("homestay")]
        public async Task<IActionResult> CreateHomestay([FromBody] CreateHomestayDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.CreateHomestayAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo homestay thành công"));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(Guid id, [FromBody] UpdateServiceDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.UpdateServiceAsync(userId, id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật dịch vụ thành công"));
        }

        [HttpPost("{id}/images")]
        public async Task<IActionResult> AddImage(Guid id, IFormFile file)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == id && s.PartnerId == partner!.Id);
            if (service == null) return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy dịch vụ"));

            var url = await _cloudinaryService.UploadImageAsync(file);
            var order = await _context.ServiceImages.CountAsync(si => si.ServiceId == id);
            _context.ServiceImages.Add(new ServiceImage { Id = Guid.NewGuid(), ServiceId = id, ImageUrl = url, DisplayOrder = order, CreatedAt = DateTime.UtcNow });

            if (string.IsNullOrEmpty(service.ThumbnailUrl)) { service.ThumbnailUrl = url; }
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { url, id = id }, "Thêm ảnh thành công"));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeactivateService(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _serviceService.DeactivateServiceAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Ngừng hoạt động dịch vụ thành công"));
        }
    }
}
