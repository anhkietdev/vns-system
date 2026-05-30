using VNS.API.Models.DTOs.Partner;

namespace VNS.API.Services.Interfaces
{
    public interface IPartnerService
    {
        Task<object> GetPartnerProfileAsync(Guid userId);
        Task<object> UpdatePartnerProfileAsync(Guid userId, UpdatePartnerProfileDto dto);
        Task<object> AddPartnerDocumentAsync(Guid userId, string documentType, string documentUrl);
        Task<object> GetPartnerDocumentsAsync(Guid userId);
        Task<object> GetPartnerDashboardAsync(Guid userId);
        Task<object> GetPartnerPayoutsAsync(Guid userId, int page, int pageSize);
        Task<object> GetPartnerTransactionsAsync(Guid userId, PartnerTransactionFilterDto filter);
        Task<object> GetPartnerRevenueAsync(Guid userId, DateTime? from, DateTime? to);
        Task<object> RequestPayoutAsync(Guid userId, RequestPayoutDto dto);
    }
}
