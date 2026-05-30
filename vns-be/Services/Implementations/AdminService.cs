using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class AdminService : IAdminService
    {
        private readonly VNSDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ICommerceService _commerceService;

        public AdminService(VNSDbContext context, INotificationService notificationService, ICommerceService commerceService)
        {
            _context = context;
            _notificationService = notificationService;
            _commerceService = commerceService;
        }

        private static decimal CalculateGrowth(decimal current, decimal previous)
        {
            if (previous <= 0)
                return current > 0 ? 100 : 0;

            return Math.Round(((current - previous) / previous) * 100m, 2, MidpointRounding.AwayFromZero);
        }

        private static FinanceActivityListItemDto MapFinanceActivity(SettlementEntry entry)
        {
            var activityType = FinanceActivityMapper.FromSettlementType(entry.EntryType);

            return new FinanceActivityListItemDto
            {
                Id = entry.Id,
                ActivityType = FinanceActivityMapper.ToCode(activityType),
                Status = FinanceActivityMapper.GetDefaultStatus(activityType),
                BookingId = entry.BookingId,
                BookingCode = entry.Booking?.BookingCode,
                PartnerId = entry.PartnerId,
                PartnerName = entry.Partner?.BusinessName ?? entry.Booking?.Partner?.BusinessName,
                CustomerId = entry.Booking?.UserId,
                CustomerName = entry.Booking?.User?.FullName,
                ServiceId = entry.Booking?.ServiceId,
                ServiceName = entry.Booking?.Service?.Name,
                GrossAmount = entry.GrossAmount,
                PartnerDelta = entry.PartnerDelta,
                CommissionDelta = entry.PlatformDelta,
                Description = entry.Description,
                TransactionReference = entry.PartnerPayout?.TransactionReference,
                OccurredAt = entry.CreatedAt
            };
        }

        private static FinanceActivityListItemDto MapFinanceActivity(PartnerPayout payout, FinanceActivityType activityType)
        {
            return new FinanceActivityListItemDto
            {
                Id = payout.Id,
                ActivityType = FinanceActivityMapper.ToCode(activityType),
                Status = FinanceActivityMapper.GetDefaultStatus(activityType),
                PartnerId = payout.PartnerId,
                PartnerName = payout.Partner?.BusinessName,
                GrossAmount = payout.NetAmount,
                PartnerDelta = activityType == FinanceActivityType.PayoutRequested ? -payout.NetAmount : 0,
                CommissionDelta = 0,
                Description = payout.Note,
                TransactionReference = payout.TransactionReference,
                OccurredAt = payout.ProcessedAt ?? payout.CreatedAt
            };
        }

        public async Task<object> GetDashboardStatsAsync()
        {
            var totalUsers = await _context.Users.CountAsync(u => u.Role == UserRole.User);
            var totalPartners = await _context.Partners.CountAsync();
            var pendingPartners = await _context.Partners.CountAsync(p => p.VerificationStatus == PartnerVerificationStatus.Pending);
            var totalBookings = await _context.Bookings.CountAsync();
            var totalRevenue = await _context.Bookings.Where(b => b.Status == BookingStatus.Completed).SumAsync(b => (decimal?)b.FinalAmount) ?? 0;
            var pendingRefunds = await _context.RefundRequests.CountAsync(r => r.Status == RefundStatus.Pending);
            var pendingServices = await _context.Services.CountAsync(s => s.ApprovalStatus == ServiceApprovalStatus.Pending);
            var activeServices = await _context.Services.CountAsync(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved);

            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
            var revenueChart = await _context.Bookings
                .Where(b => b.Status == BookingStatus.Completed && b.CompletedAt >= sixMonthsAgo)
                .GroupBy(b => new { b.CompletedAt!.Value.Year, b.CompletedAt.Value.Month })
                .Select(g => new RevenueChartItemDto { Label = $"{g.Key.Month}/{g.Key.Year}", Amount = g.Sum(b => b.FinalAmount) })
                .ToListAsync();

            var bookingChart = await _context.Bookings
                .Where(b => b.BookingDate >= sixMonthsAgo)
                .GroupBy(b => new { b.BookingDate.Year, b.BookingDate.Month })
                .Select(g => new BookingChartItemDto { Label = $"{g.Key.Month}/{g.Key.Year}", Count = g.Count() })
                .ToListAsync();

            return new DashboardStatsDto
            {
                TotalUsers = totalUsers,
                TotalPartners = totalPartners,
                PendingPartners = pendingPartners,
                TotalBookings = totalBookings,
                TotalRevenue = totalRevenue,
                PendingRefunds = pendingRefunds,
                PendingServices = pendingServices,
                ActiveServices = activeServices,
                RevenueChart = revenueChart,
                BookingChart = bookingChart
            };
        }

        public async Task<object> GetUsersAsync(UserFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Users.AsQueryable();

            if (filter.Role.HasValue) query = query.Where(u => u.Role == filter.Role.Value);
            if (filter.IsActive.HasValue) query = query.Where(u => u.IsActive == filter.IsActive.Value);
            if (filter.FromDate.HasValue) query = query.Where(u => u.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue) query = query.Where(u => u.CreatedAt <= filter.ToDate.Value);
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(kw) || u.Email.ToLower().Contains(kw));
            }

            query = filter.SortBy switch
            {
                "name" => query.OrderBy(u => u.FullName),
                "email" => query.OrderBy(u => u.Email),
                "newest" => query.OrderByDescending(u => u.CreatedAt),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(u => new UserListDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    AvatarUrl = u.AvatarUrl,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    TotalBookings = u.Bookings.Count,
                    TotalServices = u.Role == UserRole.Partner
                        ? _context.Partners.Where(p => p.UserId == u.Id).Select(p => p.Services.Count).FirstOrDefault()
                        : 0,
                    TotalSpent = u.Bookings.Where(b => b.Status == BookingStatus.Completed).Sum(b => b.FinalAmount)
                })
                .ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<object> UpdateUserStatusAsync(Guid userId, UpdateUserStatusDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { IsActive = user.IsActive, Message = dto.IsActive ? "Da kich hoat tai khoan" : "Da khoa tai khoan" };
        }

        public async Task<object> UpdateUserRoleAsync(Guid userId, UpdateUserRoleDto dto, Guid adminId)
        {
            if (userId == adminId)
                throw new Exception("Khong the thay doi vai tro cua chinh minh");

            if (dto.Role == UserRole.Admin)
                throw new Exception("Khong the nang cap nguoi dung len vai tro Admin");

            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            user.Role = dto.Role;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Role = user.Role, Message = "Cap nhat vai tro thanh cong" };
        }

        public async Task<object> DeleteUserAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = "Xoa nguoi dung thanh cong" };
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

        public async Task<object> GetRevenueReportAsync(RevenueFilterDto filter)
        {
            var settlementQuery = _context.SettlementEntries.AsQueryable();
            if (filter.FromDate.HasValue) settlementQuery = settlementQuery.Where(entry => entry.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue) settlementQuery = settlementQuery.Where(entry => entry.CreatedAt <= filter.ToDate.Value);

            var settlements = await settlementQuery.ToListAsync();

            var pendingPayoutQuery = _context.PartnerPayouts.Where(payout => payout.Status == PayoutStatus.Pending).AsQueryable();
            if (filter.FromDate.HasValue) pendingPayoutQuery = pendingPayoutQuery.Where(payout => payout.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue) pendingPayoutQuery = pendingPayoutQuery.Where(payout => payout.CreatedAt <= filter.ToDate.Value);

            var capturedGross = settlements
                .Where(entry => entry.EntryType == SettlementEntryType.PaymentCaptured)
                .Sum(entry => entry.GrossAmount);
            var refundedGross = settlements
                .Where(entry => entry.EntryType == SettlementEntryType.RefundProcessed)
                .Sum(entry => entry.GrossAmount);
            var netCommission = settlements.Sum(entry => entry.PlatformDelta);
            var releasedPartnerEarnings = settlements
                .Where(entry => entry.EntryType == SettlementEntryType.PartnerReceivableReleased)
                .Sum(entry => entry.PartnerDelta);
            var paidOutNet = settlements
                .Where(entry => entry.EntryType == SettlementEntryType.PayoutCompleted)
                .Sum(entry => entry.GrossAmount);
            var pendingPayouts = await pendingPayoutQuery.SumAsync(payout => (decimal?)payout.NetAmount) ?? 0;
            var currentPartnerPayable = settlements.Sum(entry => entry.PartnerDelta) - pendingPayouts;

            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var previousMonthStart = monthStart.AddMonths(-1);
            var currentMonthCommission = await _context.SettlementEntries
                .Where(entry => entry.CreatedAt >= monthStart)
                .SumAsync(entry => (decimal?)entry.PlatformDelta) ?? 0;
            var previousMonthCommission = await _context.SettlementEntries
                .Where(entry => entry.CreatedAt >= previousMonthStart && entry.CreatedAt < monthStart)
                .SumAsync(entry => (decimal?)entry.PlatformDelta) ?? 0;

            var chart = settlements
                .Where(entry => entry.EntryType == SettlementEntryType.PaymentCaptured)
                .GroupBy(entry => filter.Period == "daily"
                    ? entry.CreatedAt.ToString("dd/MM")
                    : filter.Period == "yearly"
                        ? entry.CreatedAt.Year.ToString()
                        : $"{entry.CreatedAt.Month}/{entry.CreatedAt.Year}")
                .Select(group => new RevenueChartItemDto
                {
                    Label = group.Key,
                    Amount = group.Sum(entry => entry.GrossAmount)
                })
                .OrderBy(item => item.Label)
                .ToList();

            return new RevenueReportDto
            {
                CapturedGross = capturedGross,
                RefundedGross = refundedGross,
                NetCommission = netCommission,
                ReleasedPartnerEarnings = releasedPartnerEarnings,
                PaidOutNet = paidOutNet,
                PendingPayouts = pendingPayouts,
                CurrentPartnerPayable = Math.Max(0, currentPartnerPayable),
                MonthlyGrowth = CalculateGrowth(currentMonthCommission, previousMonthCommission),
                TotalRevenue = capturedGross,
                TotalCommission = netCommission,
                TotalPayout = paidOutNet,
                PlatformProfit = netCommission,
                TotalTransactions = settlements.Count,
                Chart = chart
            };
        }

        public async Task<object> GetPayoutsAsync(PayoutFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.PartnerPayouts
                .Include(payout => payout.Partner)
                .AsQueryable();

            if (filter.Status.HasValue) query = query.Where(payout => payout.Status == filter.Status.Value);
            if (filter.FromDate.HasValue) query = query.Where(payout => payout.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue) query = query.Where(payout => payout.CreatedAt <= filter.ToDate.Value);
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(payout =>
                    payout.Partner.BusinessName.ToLower().Contains(kw) ||
                    (payout.BankName != null && payout.BankName.ToLower().Contains(kw)) ||
                    (payout.TransactionReference != null && payout.TransactionReference.ToLower().Contains(kw)));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(payout => payout.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(payout => new PayoutListItemDto
                {
                    Id = payout.Id,
                    PartnerId = payout.PartnerId,
                    PartnerName = payout.Partner.BusinessName,
                    RequestedAmount = payout.Amount,
                    LedgerAmount = payout.NetAmount,
                    Status = payout.Status,
                    BankName = payout.BankName,
                    BankAccount = payout.BankAccount,
                    RequestedAt = payout.CreatedAt,
                    ProcessedBy = payout.ProcessedBy,
                    ProcessedAt = payout.ProcessedAt,
                    Note = payout.Note,
                    TransactionReference = payout.TransactionReference
                })
                .ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<object> ProcessPayoutAsync(Guid payoutId, ProcessPayoutDto dto, Guid adminId)
        {
            var payout = await _context.PartnerPayouts
                .Include(item => item.Partner)
                .ThenInclude(partner => partner.User)
                .FirstOrDefaultAsync(item => item.Id == payoutId);

            if (payout == null)
                throw new BusinessException("Khong tim thay yeu cau thanh toan", 404);

            if (payout.Status != PayoutStatus.Pending)
                throw new BusinessException("Yeu cau thanh toan da duoc xu ly");

            payout.ProcessedBy = adminId;
            payout.ProcessedAt = DateTime.UtcNow;
            payout.Note = dto.Note;
            payout.TransactionReference = dto.TransactionReference;

            if (dto.IsApproved)
            {
                payout.Status = PayoutStatus.Completed;
                payout.PaidAt = payout.ProcessedAt;
                await _context.SaveChangesAsync();
                await _commerceService.AddPayoutSettlementAsync(payout);
            }
            else
            {
                payout.Status = PayoutStatus.Rejected;
                payout.PaidAt = null;
                await _context.SaveChangesAsync();
            }

            if (payout.Partner?.UserId != Guid.Empty)
            {
                var title = dto.IsApproved ? "Yeu cau rut tien da duoc phe duyet" : "Yeu cau rut tien bi tu choi";
                var content = dto.IsApproved
                    ? $"Yeu cau rut tien {payout.Amount:N0} VND da duoc xu ly."
                    : $"Yeu cau rut tien {payout.Amount:N0} VND bi tu choi. {dto.Note ?? "Vui long kiem tra lai ghi chu."}";

                await _notificationService.SendNotificationAsync(
                    payout.Partner.UserId,
                    title,
                    content,
                    NotificationType.PartnerPayout,
                    payout.Id);
            }

            return new
            {
                payout.Id,
                payout.Status,
                payout.ProcessedAt,
                payout.TransactionReference,
                Message = dto.IsApproved ? "Da xu ly thanh toan cho doi tac" : "Da tu choi thanh toan cho doi tac"
            };
        }

        public async Task<object> GetTransactionsAsync(TransactionFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var settlements = await _context.SettlementEntries
                .Include(entry => entry.Booking!).ThenInclude(booking => booking.User)
                .Include(entry => entry.Booking!).ThenInclude(booking => booking.Service)
                .Include(entry => entry.Booking!).ThenInclude(booking => booking.Partner)
                .Include(entry => entry.Partner)
                .Include(entry => entry.PartnerPayout)
                .ToListAsync();

            var payoutActivities = await _context.PartnerPayouts
                .Include(payout => payout.Partner)
                .Where(payout => payout.Status == PayoutStatus.Pending || payout.Status == PayoutStatus.Rejected)
                .ToListAsync();

            var activities = settlements
                .Select(MapFinanceActivity)
                .Concat(payoutActivities.Select(payout => MapFinanceActivity(
                    payout,
                    payout.Status == PayoutStatus.Rejected ? FinanceActivityType.PayoutRejected : FinanceActivityType.PayoutRequested)))
                .AsEnumerable();

            if (filter.FromDate.HasValue)
                activities = activities.Where(item => item.OccurredAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                activities = activities.Where(item => item.OccurredAt <= filter.ToDate.Value);

            if (filter.ActivityType.HasValue)
            {
                var code = FinanceActivityMapper.ToCode(filter.ActivityType.Value);
                activities = activities.Where(item => item.ActivityType == code);
            }

            if (!string.IsNullOrWhiteSpace(filter.Keyword))
            {
                var keyword = filter.Keyword.Trim().ToLower();
                activities = activities.Where(item =>
                    (item.BookingCode != null && item.BookingCode.ToLower().Contains(keyword)) ||
                    (item.PartnerName != null && item.PartnerName.ToLower().Contains(keyword)) ||
                    (item.CustomerName != null && item.CustomerName.ToLower().Contains(keyword)) ||
                    (item.ServiceName != null && item.ServiceName.ToLower().Contains(keyword)) ||
                    (item.Description != null && item.Description.ToLower().Contains(keyword)) ||
                    (item.TransactionReference != null && item.TransactionReference.ToLower().Contains(keyword)));
            }

            var ordered = activities
                .OrderByDescending(item => item.OccurredAt)
                .ToList();

            var totalCount = ordered.Count;
            var items = ordered
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<object> ResetUserPasswordAsync(Guid userId, ResetPasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Khong tim thay nguoi dung");
            if (user.Role != UserRole.Manager) throw new Exception("Chi co the reset mat khau cho tai khoan quan ly");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = "Reset mat khau thanh cong", NewPassword = dto.NewPassword };
        }

        public async Task<object> CreateManagerAsync(CreateManagerDto dto, Guid adminId)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
                throw new Exception("Ho ten khong duoc de trong");
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new Exception("Email khong duoc de trong");

            var exists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
            if (exists) throw new Exception("Email da ton tai trong he thong");

            var defaultPassword = "Manager@123";
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword),
                Role = UserRole.Manager,
                IsActive = true,
                IsEmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return new
            {
                Id = user.Id,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                Role = user.Role.ToString(),
                DefaultPassword = defaultPassword,
                Message = "Tao tai khoan quan ly thanh cong"
            };
        }
    }
}
