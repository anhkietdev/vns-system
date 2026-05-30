using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly IRecommendationService _recommendationService;

        public RecommendationController(IRecommendationService recommendationService)
        {
            _recommendationService = recommendationService;
        }

        [HttpGet("personalized")]
        [Authorize]
        public async Task<IActionResult> GetPersonalizedRecommendations([FromQuery] int count = 10)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy gợi ý cá nhân hóa thành công"));
        }

        [HttpGet("trending")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTrendingServices([FromQuery] int count = 10)
        {
            var result = await _recommendationService.GetTrendingServicesAsync(count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy dịch vụ thịnh hành thành công"));
        }

        [HttpGet("similar/{serviceId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSimilarServices(Guid serviceId, [FromQuery] int count = 5)
        {
            var result = await _recommendationService.GetSimilarServicesAsync(serviceId, count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy dịch vụ tương tự thành công"));
        }

        [HttpGet("destinations")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRecommendedDestinations([FromQuery] int count = 5)
        {
            Guid? userId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }

            var result = await _recommendationService.GetRecommendedDestinationsAsync(userId, count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy điểm đến gợi ý thành công"));
        }
    }
}
