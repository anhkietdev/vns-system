using VNS.API.Models.DTOs.Admin;

namespace VNS.API.Services.Interfaces
{
    public interface IRefundService
    {
        Task<object> GetMyRefundRequestsAsync(Guid userId);
        Task<object> GetRefundRequestsAsync(RefundFilterDto filter);
    }
}
