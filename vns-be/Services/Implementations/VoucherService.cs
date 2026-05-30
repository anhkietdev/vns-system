using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Voucher;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;
using AdminCreateVoucherDto = VNS.API.Models.DTOs.Admin.CreateVoucherDto;
using AdminUpdateVoucherDto = VNS.API.Models.DTOs.Admin.UpdateVoucherDto;
using AdminVoucherFilterDto = VNS.API.Models.DTOs.Admin.VoucherFilterDto;

namespace VNS.API.Services.Implementations
{
    public class VoucherService : IVoucherService
    {
        private readonly VNSDbContext _context;

        public VoucherService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetActiveVouchersAsync()
        {
            var now = DateTime.UtcNow;
            return await _context.Vouchers
                .Where(v => v.IsActive && v.StartDate <= now && v.EndDate >= now && v.UsedCount < v.UsageLimit)
                .OrderByDescending(v => v.CreatedAt)
                .Select(v => new VoucherDto
                {
                    Id = v.Id,
                    Code = v.Code,
                    Name = v.Name,
                    Description = v.Description,
                    VoucherType = v.VoucherType,
                    DiscountValue = v.DiscountValue,
                    MaxDiscountAmount = v.MaxDiscountAmount,
                    MinOrderAmount = v.MinOrderAmount,
                    UsageLimit = v.UsageLimit,
                    UsedCount = v.UsedCount,
                    UserUsageLimit = v.UserUsageLimit,
                    StartDate = v.StartDate,
                    EndDate = v.EndDate,
                    ServiceType = v.ServiceType,
                    IsActive = v.IsActive
                })
                .ToListAsync();
        }

        public async Task<object> GetActiveVouchersForUserAsync(Guid? userId)
        {
            var now = DateTime.UtcNow;
            var vouchers = await _context.Vouchers
                .Where(v => v.IsActive && v.StartDate <= now && v.EndDate >= now && v.UsedCount < v.UsageLimit)
                .OrderByDescending(v => v.CreatedAt)
                .Select(v => new VoucherDto
                {
                    Id = v.Id,
                    Code = v.Code,
                    Name = v.Name,
                    Description = v.Description,
                    VoucherType = v.VoucherType,
                    DiscountValue = v.DiscountValue,
                    MaxDiscountAmount = v.MaxDiscountAmount,
                    MinOrderAmount = v.MinOrderAmount,
                    UsageLimit = v.UsageLimit,
                    UsedCount = v.UsedCount,
                    UserUsageLimit = v.UserUsageLimit,
                    StartDate = v.StartDate,
                    EndDate = v.EndDate,
                    ServiceType = v.ServiceType,
                    IsActive = v.IsActive
                })
                .ToListAsync();

            if (userId.HasValue)
            {
                var usages = await _context.VoucherUsages
                    .Where(vu => vu.UserId == userId.Value)
                    .GroupBy(vu => vu.VoucherId)
                    .Select(g => new { VoucherId = g.Key, Count = g.Count() })
                    .ToListAsync();

                var voucherLimits = await _context.Vouchers
                    .Where(v => usages.Select(u => u.VoucherId).Contains(v.Id))
                    .Select(v => new { v.Id, v.UserUsageLimit })
                    .ToListAsync();

                vouchers = vouchers.Where(v =>
                {
                    var usage = usages.FirstOrDefault(u => u.VoucherId == v.Id);
                    if (usage == null) return true;
                    var limit = voucherLimits.FirstOrDefault(l => l.Id == v.Id);
                    if (limit == null || limit.UserUsageLimit <= 0) return true;
                    return usage.Count < limit.UserUsageLimit;
                }).ToList();
            }

            return vouchers;
        }

        public async Task<object> ApplyVoucherAsync(Guid userId, ApplyVoucherDto dto)
        {
            dto.Code = dto.Code.Trim().ToUpper();
            var voucher = await ValidateVoucherAsync(dto.Code, userId, dto.OrderAmount, dto.ServiceType);
            if (voucher == null)
                throw new BusinessException("Voucher không hợp lệ");

            var discount = await CalculateDiscountAsync(voucher, dto.OrderAmount);

            return new
            {
                VoucherId = voucher.Id,
                Code = voucher.Code,
                Name = voucher.Name,
                VoucherType = voucher.VoucherType,
                DiscountValue = voucher.DiscountValue,
                MaxDiscountAmount = voucher.MaxDiscountAmount,
                MinOrderAmount = voucher.MinOrderAmount,
                UsageLimit = voucher.UsageLimit,
                UserUsageLimit = voucher.UserUsageLimit,
                ServiceType = voucher.ServiceType,
                DiscountAmount = discount,
                FinalAmount = dto.OrderAmount - discount
            };
        }

        public async Task<Voucher?> ValidateVoucherAsync(string code, Guid userId, decimal orderAmount, ServiceType? serviceType)
        {
            code = code.Trim().ToUpper();
            var now = DateTime.UtcNow;
            var voucher = await _context.Vouchers
                .FirstOrDefaultAsync(v => v.Code == code && v.IsActive);

            if (voucher == null)
                throw new BusinessException("Mã voucher không tồn tại");

            if (voucher.StartDate > now)
                throw new BusinessException("Voucher chưa có hiệu lực");

            if (voucher.EndDate < now)
                throw new BusinessException("Voucher đã hết hạn");

            if (voucher.UsedCount >= voucher.UsageLimit)
                throw new BusinessException("Voucher đã hết lượt sử dụng");

            if (voucher.MinOrderAmount.HasValue && orderAmount < voucher.MinOrderAmount.Value)
                throw new BusinessException($"Đơn hàng tối thiểu {voucher.MinOrderAmount.Value:N0}đ để sử dụng voucher này");

            if (voucher.ServiceType.HasValue && serviceType.HasValue && voucher.ServiceType != serviceType)
                throw new BusinessException("Voucher không áp dụng cho loại dịch vụ này");

            var userUsageCount = await _context.VoucherUsages
                .CountAsync(vu => vu.VoucherId == voucher.Id && vu.UserId == userId);

            if (voucher.UserUsageLimit > 0 && userUsageCount >= voucher.UserUsageLimit)
                throw new BusinessException("Bạn đã sử dụng hết lượt cho voucher này");

            return voucher;
        }

        public Task<decimal> CalculateDiscountAsync(Voucher voucher, decimal orderAmount)
        {
            decimal discount;

            if (voucher.VoucherType == VoucherType.Percentage)
            {
                discount = orderAmount * voucher.DiscountValue / 100;
                if (voucher.MaxDiscountAmount.HasValue && discount > voucher.MaxDiscountAmount.Value)
                    discount = voucher.MaxDiscountAmount.Value;
            }
            else
            {
                discount = voucher.DiscountValue;
            }

            if (discount > orderAmount)
                discount = orderAmount;

            return Task.FromResult(discount);
        }

        public async Task<object> GetAllVouchersAsync(AdminVoucherFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Vouchers.AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(v => v.Code.ToLower().Contains(kw)
                    || (v.Name != null && v.Name.ToLower().Contains(kw))
                    || (v.Description != null && v.Description.ToLower().Contains(kw)));
            }

            if (filter.VoucherType.HasValue)
                query = query.Where(v => v.VoucherType == filter.VoucherType.Value);

            if (filter.IsActive.HasValue)
                query = query.Where(v => v.IsActive == filter.IsActive.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(v => v.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(v => new VNS.API.Models.DTOs.Admin.VoucherListItemDto
                {
                    Id = v.Id,
                    Code = v.Code,
                    Name = v.Name,
                    Description = v.Description,
                    VoucherType = v.VoucherType,
                            DiscountValue = v.DiscountValue,
                    MaxDiscountAmount = v.MaxDiscountAmount,
                    MinOrderAmount = v.MinOrderAmount,
                    TotalQuantity = v.UsageLimit,
                    UsedQuantity = v.UsedCount,
                    UserUsageLimit = v.UserUsageLimit,
                    StartDate = v.StartDate,
                    EndDate = v.EndDate,
                    IsActive = v.IsActive,
                    ApplicableServiceType = v.ServiceType,
                    CreatedAt = v.CreatedAt
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        public async Task<object> CreateVoucherAsync(AdminCreateVoucherDto dto)
        {
            dto.Code = dto.Code.Trim().ToUpper();
            if (await _context.Vouchers.AnyAsync(v => v.Code == dto.Code))
                throw new BusinessException("Mã voucher đã tồn tại");

            ValidateVoucherInput(
                dto.Code,
                dto.VoucherType,
                dto.DiscountValue,
                dto.MaxDiscountAmount,
                dto.MinOrderAmount,
                dto.TotalQuantity,
                dto.UserUsageLimit,
                dto.StartDate,
                dto.EndDate);

            var voucher = new Voucher
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Name = !string.IsNullOrWhiteSpace(dto.Name) ? dto.Name : dto.Code,
                Description = dto.Description,
                VoucherType = dto.VoucherType,
                DiscountValue = dto.DiscountValue,
                MaxDiscountAmount = dto.VoucherType == VoucherType.FixedAmount ? null : dto.MaxDiscountAmount,
                MinOrderAmount = dto.MinOrderAmount,
                UsageLimit = dto.TotalQuantity,
                UserUsageLimit = dto.UserUsageLimit ?? 0,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                ServiceType = dto.ApplicableServiceType,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();

            return new { Id = voucher.Id, Message = "Tạo voucher thành công" };
        }

        public async Task<object> UpdateVoucherAsync(Guid id, AdminUpdateVoucherDto dto)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) throw new BusinessException("Không tìm thấy voucher");

            if (!string.IsNullOrWhiteSpace(dto.Code))
            {
                dto.Code = dto.Code.Trim().ToUpper();
                var exists = await _context.Vouchers.AnyAsync(v => v.Code == dto.Code && v.Id != id);
                if (exists) throw new BusinessException("Mã voucher đã tồn tại");
                voucher.Code = dto.Code;
            }

            var nextCode = !string.IsNullOrWhiteSpace(dto.Code) ? dto.Code : voucher.Code;
            var nextVoucherType = dto.VoucherType ?? voucher.VoucherType;
            var nextDiscountValue = dto.DiscountValue ?? voucher.DiscountValue;
            var nextMaxDiscountAmount = nextVoucherType == VoucherType.FixedAmount
                ? null
                : dto.MaxDiscountAmount.HasValue
                    ? dto.MaxDiscountAmount
                    : voucher.MaxDiscountAmount;
            var nextMinOrderAmount = dto.MinOrderAmount.HasValue ? dto.MinOrderAmount : voucher.MinOrderAmount;
            var nextUsageLimit = dto.TotalQuantity ?? voucher.UsageLimit;
            var nextUserUsageLimit = dto.UserUsageLimit ?? voucher.UserUsageLimit;
            var nextStartDate = dto.StartDate ?? voucher.StartDate;
            var nextEndDate = dto.EndDate ?? voucher.EndDate;

            ValidateVoucherInput(
                nextCode,
                nextVoucherType,
                nextDiscountValue,
                nextMaxDiscountAmount,
                nextMinOrderAmount,
                nextUsageLimit,
                nextUserUsageLimit,
                nextStartDate,
                nextEndDate);

            if (dto.Name != null) voucher.Name = dto.Name;
            if (dto.Description != null) voucher.Description = dto.Description;
            if (dto.VoucherType.HasValue) voucher.VoucherType = dto.VoucherType.Value;
            if (dto.DiscountValue.HasValue) voucher.DiscountValue = dto.DiscountValue.Value;
            if (nextVoucherType == VoucherType.FixedAmount)
                voucher.MaxDiscountAmount = null;
            else if (dto.MaxDiscountAmount.HasValue)
                voucher.MaxDiscountAmount = dto.MaxDiscountAmount.Value;
            if (dto.MinOrderAmount.HasValue) voucher.MinOrderAmount = dto.MinOrderAmount.Value;
            if (dto.TotalQuantity.HasValue) voucher.UsageLimit = dto.TotalQuantity.Value;
            if (dto.UserUsageLimit.HasValue) voucher.UserUsageLimit = dto.UserUsageLimit.Value;
            if (dto.StartDate.HasValue) voucher.StartDate = dto.StartDate.Value;
            if (dto.EndDate.HasValue) voucher.EndDate = dto.EndDate.Value;
            if (dto.IsActive.HasValue) voucher.IsActive = dto.IsActive.Value;
            if (dto.ApplicableServiceType.HasValue) voucher.ServiceType = dto.ApplicableServiceType.Value;

            await _context.SaveChangesAsync();

            return new { Message = "Cập nhật voucher thành công" };
        }

        public async Task<object> DeleteVoucherAsync(Guid id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) throw new BusinessException("Không tìm thấy voucher");

            _context.Vouchers.Remove(voucher);
            await _context.SaveChangesAsync();

            return new { Message = "Xóa voucher thành công" };
        }

        private static void ValidateVoucherInput(
            string code,
            VoucherType voucherType,
            decimal discountValue,
            decimal? maxDiscountAmount,
            decimal? minOrderAmount,
            int usageLimit,
            int? userUsageLimit,
            DateTime startDate,
            DateTime endDate)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new BusinessException("Vui lòng nhập mã voucher");

            if (code.Length < 3 || code.Length > 50 || !Regex.IsMatch(code, "^[A-Z0-9_-]+$"))
                throw new BusinessException("Mã voucher chỉ được chứa chữ in hoa, số, gạch ngang hoặc gạch dưới");

            if (discountValue <= 0)
                throw new BusinessException("Giá trị giảm phải lớn hơn 0");

            if (voucherType == VoucherType.Percentage && discountValue > 100)
                throw new BusinessException("Voucher phần trăm không được vượt quá 100%");

            if (voucherType == VoucherType.Percentage && maxDiscountAmount.HasValue && maxDiscountAmount <= 0)
                throw new BusinessException("Giảm tối đa phải lớn hơn 0");

            if (minOrderAmount.HasValue && minOrderAmount < 0)
                throw new BusinessException("Đơn hàng tối thiểu không hợp lệ");

            if (usageLimit <= 0)
                throw new BusinessException("Tổng lượt sử dụng phải lớn hơn 0");

            if (userUsageLimit.HasValue && userUsageLimit < 0)
                throw new BusinessException("Giới hạn mỗi người dùng không hợp lệ");

            if (userUsageLimit.HasValue && userUsageLimit > usageLimit)
                throw new BusinessException("Giới hạn mỗi người dùng không được lớn hơn tổng lượt sử dụng");

            if (startDate >= endDate)
                throw new BusinessException("Ngày bắt đầu phải sớm hơn ngày kết thúc");
        }
    }
}
