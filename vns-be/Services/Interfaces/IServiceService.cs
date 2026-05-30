using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.DTOs.Service;

namespace VNS.API.Services.Interfaces
{
    public interface IServiceService
    {
        Task<object> GetServicesAsync(ServiceFilterDto filter);
        Task<ServiceDetailDto> GetServiceByIdAsync(Guid id);
        Task<List<ServiceListDto>> GetPopularServicesAsync(int count);
        Task<List<ServiceListDto>> GetNearbyServicesAsync(double lat, double lng, double radiusKm);
        Task<object> CreateTourAsync(Guid userId, CreateTourDto dto);
        Task<object> CreateHomestayAsync(Guid userId, CreateHomestayDto dto);
        Task<object> UpdateServiceAsync(Guid userId, Guid serviceId, UpdateServiceDto dto);
        Task<object> DeleteServiceAsync(Guid userId, Guid serviceId);
        Task<object> GetPartnerServicesAsync(Guid userId, PartnerServiceFilterDto filter);
        Task<object> GetPartnerServiceDetailAsync(Guid userId, Guid serviceId);
        Task<object> DeactivateServiceAsync(Guid userId, Guid serviceId);
        Task<object> GetPendingServicesAsync(ServiceApprovalFilterDto filter);
        Task<ServiceDetailDto> GetApprovalDetailAsync(Guid approvalTargetId);
        Task<object> ApproveServiceAsync(Guid serviceId, ServiceApprovalActionDto dto, Guid adminId);
        Task<object> RejectServiceAsync(Guid serviceId, ServiceApprovalActionDto dto, Guid adminId);
    }
}
