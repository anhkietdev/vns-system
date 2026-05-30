using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Auth;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly VNSDbContext _context;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(VNSDbContext context, IConfiguration config, IMemoryCache cache, IEmailService emailService, ILogger<AuthService> logger)
        {
            _context = context;
            _config = config;
            _cache = cache;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            // Brute force protection: check if account is locked
            var lockKey = $"login_locked_{dto.Email}";
            if (_cache.TryGetValue(lockKey, out _))
                throw new BusinessException("Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.");

            var user = await _context.Users
                .Include(u => u.Partner)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
            {
                IncrementLoginAttempts(dto.Email);
                throw new BusinessException("Email hoặc mật khẩu không chính xác");
            }

            if (!user.IsActive)
                throw new BusinessException("Tài khoản đã bị khóa");

            if (string.IsNullOrEmpty(user.PasswordHash))
                throw new BusinessException("Tài khoản chưa được thiết lập mật khẩu");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                IncrementLoginAttempts(dto.Email);
                throw new BusinessException("Email hoặc mật khẩu không chính xác");
            }

            // Reset login attempts on success
            _cache.Remove($"login_attempts_{dto.Email}");

            var token = JwtHelper.GenerateToken(user, _config);

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                Message = "Đăng nhập thành công",
                User = new UserInfoDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    AvatarUrl = user.AvatarUrl,
                    Role = user.Role,
                    PartnerId = user.Partner?.Id
                }
            };
        }

        private void IncrementLoginAttempts(string email)
        {
            var attemptsKey = $"login_attempts_{email}";
            var attempts = _cache.GetOrCreate(attemptsKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                return 0;
            });
            attempts++;
            _cache.Set(attemptsKey, attempts, TimeSpan.FromMinutes(15));

            if (attempts >= 5)
            {
                _cache.Set($"login_locked_{email}", true, TimeSpan.FromMinutes(15));
                _cache.Remove(attemptsKey);
            }
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new BusinessException("Email đã được sử dụng");

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                PhoneNumber = dto.PhoneNumber,
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            // Create wallet for new user
            var wallet = new Wallet
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Balance = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();

            var token = JwtHelper.GenerateToken(user, _config);

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                Message = "Đăng ký thành công",
                User = new UserInfoDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    AvatarUrl = user.AvatarUrl,
                    Role = user.Role
                }
            };
        }

        public async Task<AuthResponseDto> RegisterPartnerAsync(RegisterPartnerDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new BusinessException("Email đã được sử dụng");

            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                PhoneNumber = dto.PhoneNumber,
                Role = UserRole.Partner,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);

            var partner = new Partner
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                BusinessName = dto.BusinessName,
                BusinessLicense = dto.BusinessLicense,
                TaxCode = dto.TaxCode,
                Description = dto.Description,
                Address = dto.Address,
                VerificationStatus = PartnerVerificationStatus.Pending,
                CommissionRate = 10.00m,
                CreatedAt = DateTime.UtcNow
            };

            _context.Partners.Add(partner);

            // Create wallet
            var wallet = new Wallet
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Balance = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Wallets.Add(wallet);

            await _context.SaveChangesAsync();

            var token = JwtHelper.GenerateToken(user, _config);

            return new AuthResponseDto
            {
                Success = true,
                Token = token,
                Message = "Đăng ký đối tác thành công",
                User = new UserInfoDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    AvatarUrl = user.AvatarUrl,
                    Role = user.Role,
                    PartnerId = partner.Id
                }
            };
        }

        public async Task<object> ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            // Only send OTP if user exists, but always return the same message
            if (user != null)
            {
                var otp = Random.Shared.Next(100000, 999999).ToString();
                _cache.Set($"otp_{dto.Email}", otp, TimeSpan.FromMinutes(5));

                try
                {
                    await _emailService.SendOtpEmailAsync(dto.Email, otp);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Gửi email OTP thất bại cho {Email}", dto.Email);
                }
            }

            return new { Email = dto.Email, Message = "Nếu email tồn tại, mã OTP sẽ được gửi" };
        }

        public async Task<object> VerifyOtpAsync(VerifyOtpDto dto)
        {
            // Brute force protection on OTP
            var otpAttemptsKey = $"otp_attempts_{dto.Email}";
            if (_cache.TryGetValue(otpAttemptsKey, out int otpAttempts) && otpAttempts >= 5)
            {
                // Invalidate the OTP entirely after too many failed attempts
                _cache.Remove($"otp_{dto.Email}");
                _cache.Remove(otpAttemptsKey);
                throw new BusinessException("Quá nhiều lần thử sai. Mã OTP đã bị vô hiệu hóa. Vui lòng yêu cầu mã mới.");
            }

            var cacheKey = $"otp_{dto.Email}";
            if (!_cache.TryGetValue(cacheKey, out string? storedOtp) || storedOtp != dto.Otp)
            {
                // Increment OTP attempt count
                var currentAttempts = _cache.GetOrCreate(otpAttemptsKey, entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
                    return 0;
                });
                _cache.Set(otpAttemptsKey, currentAttempts + 1, TimeSpan.FromMinutes(10));

                throw new BusinessException("Mã OTP không hợp lệ hoặc đã hết hạn");
            }

            // Remove OTP from cache after successful verification (prevent reuse)
            _cache.Remove(cacheKey);
            _cache.Remove(otpAttemptsKey);

            // Mark OTP as verified
            _cache.Set($"otp_verified_{dto.Email}", true, TimeSpan.FromMinutes(10));

            return await Task.FromResult(new { Email = dto.Email, Verified = true });
        }

        public async Task<object> ResetPasswordAsync(ResetPasswordDto dto)
        {
            // Check that OTP was verified first
            if (!_cache.TryGetValue($"otp_verified_{dto.Email}", out _))
                throw new BusinessException("Vui lòng xác thực OTP trước khi đặt lại mật khẩu");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
                throw new BusinessException("Người dùng không tồn tại");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Remove verified flag from cache
            _cache.Remove($"otp_verified_{dto.Email}");
            _cache.Remove($"otp_{dto.Email}");

            // Gửi email thông báo đổi mật khẩu
            _ = _emailService.SendPasswordChangedEmailAsync(user.Email, user.FullName);

            return new { Message = "Đặt lại mật khẩu thành công" };
        }

        public async Task<object> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new BusinessException("Người dùng không tồn tại");

            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                throw new BusinessException("Mật khẩu hiện tại không chính xác");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Gửi email thông báo đổi mật khẩu
            _ = _emailService.SendPasswordChangedEmailAsync(user.Email, user.FullName);

            return new { Message = "Đổi mật khẩu thành công" };
        }
    }
}
