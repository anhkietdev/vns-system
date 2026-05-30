using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Review;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateReview([FromForm] CreateReviewDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _reviewService.CreateReviewAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo đánh giá thành công"));
        }

        // Endpoint JSON cho review không có hình - tránh vấn đề multipart boundary trên mobile
        [HttpPost("text")]
        [Authorize]
        public async Task<IActionResult> CreateReviewJson([FromBody] CreateReviewJsonDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var mapped = new CreateReviewDto
            {
                BookingId = dto.BookingId,
                Rating = dto.Rating,
                Comment = dto.Comment
            };
            var result = await _reviewService.CreateReviewAsync(userId, mapped);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tạo đánh giá thành công"));
        }

        [HttpGet("service/{serviceId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetServiceReviews(Guid serviceId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? sortBy = null)
        {
            var result = await _reviewService.GetServiceReviewsAsync(serviceId, page, pageSize, sortBy);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy đánh giá dịch vụ thành công"));
        }

        [HttpGet("my-reviews")]
        [Authorize]
        public async Task<IActionResult> GetUserReviews()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _reviewService.GetUserReviewsAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy đánh giá của bạn thành công"));
        }
    }
}
