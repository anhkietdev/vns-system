using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.Enums;

namespace VNS.API.Services.Interfaces
{
    public interface IAdminService
    {
        Task<object> GetDashboardStatsAsync();
        Task<object> GetUsersAsync(UserFilterDto filter);
        Task<object> UpdateUserStatusAsync(Guid userId, UpdateUserStatusDto dto);
        Task<object> UpdateUserRoleAsync(Guid userId, UpdateUserRoleDto dto, Guid adminId);
        Task<object> DeleteUserAsync(Guid userId);
        Task<object> GetAllPartnersAsync(int? status, int page, int pageSize);
        Task<object> GetPendingPartnersAsync(int page, int pageSize);
        Task<object> GetPartnerDetailAsync(Guid partnerId);
        Task<object> GetRevenueReportAsync(RevenueFilterDto filter);
        Task<object> GetPayoutsAsync(PayoutFilterDto filter);
        Task<object> ProcessPayoutAsync(Guid payoutId, ProcessPayoutDto dto, Guid adminId);
        Task<object> GetTransactionsAsync(TransactionFilterDto filter);
        Task<object> CreateManagerAsync(CreateManagerDto dto, Guid adminId);
        Task<object> ResetUserPasswordAsync(Guid userId, ResetPasswordDto dto);
    }
}
