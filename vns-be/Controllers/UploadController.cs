using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UploadController : ControllerBase
    {
        private readonly ICloudinaryService _cloudinaryService;

        public UploadController(ICloudinaryService cloudinaryService)
        {
            _cloudinaryService = cloudinaryService;
        }

        [HttpPost("image")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromForm] string? folder)
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.ErrorResponse("Please choose a file"));

            var url = await _cloudinaryService.UploadImageAsync(
                file,
                string.IsNullOrWhiteSpace(folder) ? "vns" : folder
            );

            return Ok(ApiResponse<object>.SuccessResponse(new { url }, "Image uploaded"));
        }

        [HttpPost("images")]
        public async Task<IActionResult> UploadImages([FromForm] List<IFormFile> files, [FromForm] string? folder)
        {
            if (files == null || files.Count == 0)
                return BadRequest(ApiResponse<object>.ErrorResponse("Please choose at least one file"));

            var urls = await _cloudinaryService.UploadImagesAsync(
                files,
                string.IsNullOrWhiteSpace(folder) ? "vns" : folder
            );

            return Ok(ApiResponse<object>.SuccessResponse(new { urls }, "Images uploaded"));
        }
    }
}
