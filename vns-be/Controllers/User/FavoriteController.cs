using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class FavoriteController : ControllerBase
    {
        private readonly IFavoriteService _favoriteService;

        public FavoriteController(IFavoriteService favoriteService)
        {
            _favoriteService = favoriteService;
        }

        [HttpPost("{serviceId}")]
        [Authorize]
        public async Task<IActionResult> ToggleFavorite(Guid serviceId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _favoriteService.ToggleFavoriteAsync(userId, serviceId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Cập nhật yêu thích thành công"));
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetFavorites([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _favoriteService.GetFavoritesAsync(userId, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách yêu thích thành công"));
        }
    }
}
