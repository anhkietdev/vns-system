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
    public class PartnerReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public PartnerReviewController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPartnerReviews([FromQuery] PartnerReviewFilterDto filter)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _reviewService.GetPartnerReviewsAsync(userId, filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đánh giá thành công"));
        }

        [HttpPost("{id}/respond")]
        public async Task<IActionResult> RespondToReview(Guid id, [FromBody] ReviewResponseDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _reviewService.RespondToReviewAsync(userId, id, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Phản hồi đánh giá thành công"));
        }
    }
}
