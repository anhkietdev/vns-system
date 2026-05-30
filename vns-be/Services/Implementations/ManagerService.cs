using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class ManagerService : IManagerService
    {
        private readonly VNSDbContext _context;
        private readonly INotificationService _notificationService;

        public ManagerService(VNSDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<object> GetAllPartnersAsync(int? status, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Partners
                .Include(p => p.User)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(p => (int)p.VerificationStatus == status.Value);

            query = query.OrderByDescending(p => p.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PartnerListItemDto
                {
                    Id = p.Id,
                    BusinessName = p.BusinessName,
                    OwnerName = p.User.FullName,
                    Email = p.User.Email,
                    PhoneNumber = p.User.PhoneNumber,
                    VerificationStatus = p.VerificationStatus,
                    CommissionRate = p.CommissionRate,
                    TotalServices = p.Services.Count,
                    TotalBookings = p.Services.SelectMany(s => s.Bookings).Count(),
                    TotalRevenue = p.Services.SelectMany(s => s.Bookings).Where(b => b.Status == BookingStatus.Completed).Sum(b => (decimal?)b.FinalAmount) ?? 0,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = (int)Math.Ceiling((double)totalCount / pageSize) };
        }

        public async Task<object> GetPendingPartnersAsync(int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Partners
                .Include(p => p.User)
                .Include(p => p.PartnerDocuments)
                .Where(p => p.VerificationStatus == PartnerVerificationStatus.Pending)
                .OrderByDescending(p => p.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PartnerListItemDto
                {
                    Id = p.Id,
                    BusinessName = p.BusinessName,
                    OwnerName = p.User.FullName,
                    Email = p.User.Email,
                    PhoneNumber = p.User.PhoneNumber,
                    VerificationStatus = p.VerificationStatus,
                    CommissionRate = p.CommissionRate,
                    TotalServices = p.Services.Count,
                    TotalBookings = p.Bookings.Count,
                    TotalRevenue = p.Bookings.Where(b => b.Status == BookingStatus.Completed).Sum(b => b.FinalAmount),
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize, TotalPages = (int)Math.Ceiling((double)totalCount / pageSize) };
        }

        public async Task<object> GetPartnerDetailAsync(Guid partnerId)
        {
            var partner = await _context.Partners
                .Include(p => p.User)
                .Include(p => p.PartnerDocuments)
                .Include(p => p.Services)
                .Include(p => p.Bookings)
                .FirstOrDefaultAsync(p => p.Id == partnerId);

            if (partner == null) throw new Exception("Khong tim thay doi tac");

            return new PartnerDetailAdminDto
            {
                Id = partner.Id,
                BusinessName = partner.BusinessName,
                BusinessLicense = partner.BusinessLicense,
                TaxCode = partner.TaxCode,
                Description = partner.Description,
                Address = partner.Address,
                OwnerName = partner.User.FullName,
                Email = partner.User.Email,
                PhoneNumber = partner.User.PhoneNumber,
                VerificationStatus = partner.VerificationStatus,
                VerificationNote = partner.VerificationNote,
                CommissionRate = partner.CommissionRate,
                TotalServices = partner.Services.Count,
                TotalBookings = partner.Bookings.Count,
                TotalRevenue = partner.Bookings.Where(b => b.Status == BookingStatus.Completed).Sum(b => b.FinalAmount),
                CreatedAt = partner.CreatedAt,
                Documents = partner.PartnerDocuments.Select(d => new PartnerDocumentDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    DocumentUrl = d.DocumentUrl,
                    UploadedAt = d.UploadedAt
                }).ToList()
            };
        }

        public async Task<object> VerifyPartnerAsync(Guid partnerId, PartnerVerificationDto dto, Guid managerId)
        {
            var partner = await _context.Partners.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == partnerId);
            if (partner == null) throw new Exception("Khong tim thay doi tac");

            partner.VerificationStatus = dto.IsApproved ? PartnerVerificationStatus.Approved : PartnerVerificationStatus.Rejected;
            partner.VerificationNote = dto.Note;
            partner.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var title = dto.IsApproved ? "Doi tac da duoc phe duyet" : "Doi tac bi tu choi";
            var content = dto.IsApproved
                ? "Chuc mung! Tai khoan doi tac cua ban da duoc phe duyet."
                : $"Tai khoan doi tac bi tu choi. Ly do: {dto.Note ?? "Khong co ghi chu"}";

            await _notificationService.SendNotificationAsync(partner.UserId, title, content, NotificationType.PartnerPayout, partner.Id);

            return new { Message = $"Da {(dto.IsApproved ? "phe duyet" : "tu choi")} doi tac {partner.BusinessName}" };
        }

        public async Task<object> UpdateCommissionRateAsync(Guid partnerId, UpdateCommissionRateDto dto)
        {
            var partner = await _context.Partners.FindAsync(partnerId);
            if (partner == null) throw new Exception("Khong tim thay doi tac");

            partner.CommissionRate = dto.CommissionRate;
            partner.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = $"Cap nhat ty le hoa hong thanh {dto.CommissionRate}%" };
        }

        public async Task<object> GetManagerProfileAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            return new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.AvatarUrl,
                user.Role,
                user.CreatedAt
            };
        }

        public async Task<object> UpdateManagerProfileAsync(Guid userId, UpdateManagerProfileDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            if (dto.FullName != null) user.FullName = dto.FullName;
            if (dto.AvatarUrl != null) user.AvatarUrl = dto.AvatarUrl;
            if (dto.PhoneNumber != null) user.PhoneNumber = dto.PhoneNumber;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new { Message = "Cap nhat ho so thanh cong" };
        }

        public async Task<object> ChangeManagerPasswordAsync(Guid userId, ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                throw new Exception("Mat khau hien tai khong chinh xac");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = "Doi mat khau thanh cong" };
        }
    }
}
