using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class DestinationController : ControllerBase
    {
        private readonly IDestinationService _destinationService;

        public DestinationController(IDestinationService destinationService)
        {
            _destinationService = destinationService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var result = await _destinationService.GetAllAsync();
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách điểm đến thành công"));
        }

        [HttpGet("popular")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPopular([FromQuery] int count = 10)
        {
            var result = await _destinationService.GetPopularAsync(count);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy điểm đến phổ biến thành công"));
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _destinationService.GetByIdAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông tin điểm đến thành công"));
        }
    }
}
