using VNS.API.Models.DTOs.Auth;

namespace VNS.API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> RegisterPartnerAsync(RegisterPartnerDto dto);
        Task<object> ForgotPasswordAsync(ForgotPasswordDto dto);
        Task<object> VerifyOtpAsync(VerifyOtpDto dto);
        Task<object> ResetPasswordAsync(ResetPasswordDto dto);
        Task<object> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    }
}
