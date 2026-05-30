using VNS.API.Models.DTOs.Voucher;
using VNS.API.Models.Entities;
using AdminCreateVoucherDto = VNS.API.Models.DTOs.Admin.CreateVoucherDto;
using AdminUpdateVoucherDto = VNS.API.Models.DTOs.Admin.UpdateVoucherDto;
using AdminVoucherFilterDto = VNS.API.Models.DTOs.Admin.VoucherFilterDto;

namespace VNS.API.Services.Interfaces
{
    public interface IVoucherService
    {
        Task<object> GetActiveVouchersAsync();
        Task<object> GetActiveVouchersForUserAsync(Guid? userId);
        Task<object> ApplyVoucherAsync(Guid userId, ApplyVoucherDto dto);
        Task<Voucher?> ValidateVoucherAsync(string code, Guid userId, decimal orderAmount, Models.Enums.ServiceType? serviceType);
        Task<decimal> CalculateDiscountAsync(Voucher voucher, decimal orderAmount);
        Task<object> GetAllVouchersAsync(AdminVoucherFilterDto filter);
        Task<object> CreateVoucherAsync(AdminCreateVoucherDto dto);
        Task<object> UpdateVoucherAsync(Guid id, AdminUpdateVoucherDto dto);
        Task<object> DeleteVoucherAsync(Guid id);
    }
}
