using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Manager
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Manager")]
    public class ManagerFeedbackController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ManagerFeedbackController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllFeedback([FromQuery] FeedbackFilterDto filter)
        {
            var result = await _reviewService.GetAllFeedbackAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đánh giá thành công"));
        }

        [HttpPut("{id}/visibility")]
        public async Task<IActionResult> ToggleVisibility(Guid id, [FromBody] UpdateVisibilityDto dto)
        {
            var result = await _reviewService.UpdateReviewVisibilityAsync(id, dto.IsVisible, dto.Status);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật đánh giá thành công"));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFeedback(Guid id)
        {
            var result = await _reviewService.DeleteReviewAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xoá đánh giá thành công"));
        }
    }
}
