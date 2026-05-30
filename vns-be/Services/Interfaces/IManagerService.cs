using VNS.API.Models.DTOs.Admin;

namespace VNS.API.Services.Interfaces
{
    public interface IManagerService
    {
        Task<object> GetAllPartnersAsync(int? status, int page, int pageSize);
        Task<object> GetPendingPartnersAsync(int page, int pageSize);
        Task<object> GetPartnerDetailAsync(Guid partnerId);
        Task<object> VerifyPartnerAsync(Guid partnerId, PartnerVerificationDto dto, Guid managerId);
        Task<object> UpdateCommissionRateAsync(Guid partnerId, UpdateCommissionRateDto dto);
        Task<object> GetManagerProfileAsync(Guid userId);
        Task<object> UpdateManagerProfileAsync(Guid userId, UpdateManagerProfileDto dto);
        Task<object> ChangeManagerPasswordAsync(Guid userId, ChangePasswordDto dto);
    }
}
