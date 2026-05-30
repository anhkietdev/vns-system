using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Auth
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] Models.DTOs.Auth.LoginDto dto)
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đăng nhập thành công"));
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] Models.DTOs.Auth.RegisterDto dto)
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đăng ký thành công"));
        }

        [HttpPost("register-partner")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterPartner([FromBody] Models.DTOs.Auth.RegisterPartnerDto dto)
        {
            var result = await _authService.RegisterPartnerAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đăng ký đối tác thành công"));
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] Models.DTOs.Auth.ForgotPasswordDto dto)
        {
            var result = await _authService.ForgotPasswordAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Mã OTP đã được gửi"));
        }

        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] Models.DTOs.Auth.VerifyOtpDto dto)
        {
            var result = await _authService.VerifyOtpAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xác thực OTP thành công"));
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] Models.DTOs.Auth.ResetPasswordDto dto)
        {
            var result = await _authService.ResetPasswordAsync(dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đặt lại mật khẩu thành công"));
        }

        [HttpPut("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] Models.DTOs.Auth.ChangePasswordDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _authService.ChangePasswordAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đổi mật khẩu thành công"));
        }
    }
}
