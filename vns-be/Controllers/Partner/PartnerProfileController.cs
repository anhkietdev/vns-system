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
    public class PartnerProfileController : ControllerBase
    {
        private readonly IPartnerService _partnerService;
        private readonly ICloudinaryService _cloudinaryService;

        public PartnerProfileController(IPartnerService partnerService, ICloudinaryService cloudinaryService)
        {
            _partnerService = partnerService;
            _cloudinaryService = cloudinaryService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.GetPartnerProfileAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin đối tác thành công"));
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdatePartnerProfileDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.UpdatePartnerProfileAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật thông tin đối tác thành công"));
        }

        [HttpPost("document")]
        public async Task<IActionResult> UploadDocument([FromForm] UploadDocumentDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var imageUrl = await _cloudinaryService.UploadImageAsync(dto.File);
            var result = await _partnerService.AddPartnerDocumentAsync(userId, dto.DocumentType, imageUrl);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tải lên giấy tờ xác minh thành công"));
        }

        [HttpGet("documents")]
        public async Task<IActionResult> GetDocuments()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _partnerService.GetPartnerDocumentsAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách giấy tờ thành công"));
        }
    }
}
