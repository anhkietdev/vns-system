using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class PartnerService : IPartnerService
    {
        private readonly VNSDbContext _context;
        private readonly ICommerceService _commerceService;

        public PartnerService(VNSDbContext context, ICommerceService commerceService)
        {
            _context = context;
            _commerceService = commerceService;
        }

        private async Task<Partner> GetPartnerByUserIdAsync(Guid userId)
        {
            var partner = await _context.Partners
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (partner == null)
                throw new BusinessException("Khong tim thay doi tac", 404);

            return partner;
        }

        private Task<decimal> GetLedgerBalanceAsync(Guid partnerId)
        {
            return _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId)
                .SumAsync(entry => (decimal?)entry.PartnerDelta)
                .ContinueWith(task => task.Result ?? 0m);
        }

        private Task<decimal> GetPendingPayoutLockAsync(Guid partnerId)
        {
            return _context.PartnerPayouts
                .Where(payout => payout.PartnerId == partnerId && payout.Status == PayoutStatus.Pending)
                .SumAsync(payout => (decimal?)payout.NetAmount)
                .ContinueWith(task => task.Result ?? 0m);
        }

        private static decimal CalculateGrowth(decimal current, decimal previous)
        {
            if (previous <= 0)
                return current > 0 ? 100 : 0;

            return Math.Round(((current - previous) / previous) * 100m, 2, MidpointRounding.AwayFromZero);
        }

        private static PartnerFinanceActivityDto MapPartnerSettlementActivity(SettlementEntry entry)
        {
            var activityType = FinanceActivityMapper.FromSettlementType(entry.EntryType);
            return new PartnerFinanceActivityDto
            {
                Id = entry.Id,
                ActivityType = FinanceActivityMapper.ToCode(activityType),
                Status = FinanceActivityMapper.GetDefaultStatus(activityType),
                BookingId = entry.BookingId,
                BookingCode = entry.Booking?.BookingCode,
                CustomerName = entry.Booking?.User?.FullName,
                ServiceName = entry.Booking?.Service?.Name,
                GrossAmount = entry.GrossAmount,
                PartnerDelta = entry.PartnerDelta,
                CommissionDelta = entry.PlatformDelta,
                Description = entry.Description,
                TransactionReference = entry.PartnerPayout?.TransactionReference,
                OccurredAt = entry.CreatedAt
            };
        }

        private static PartnerFinanceActivityDto MapPartnerPayoutActivity(PartnerPayout payout, FinanceActivityType activityType)
        {
            return new PartnerFinanceActivityDto
            {
                Id = payout.Id,
                ActivityType = FinanceActivityMapper.ToCode(activityType),
                Status = FinanceActivityMapper.GetDefaultStatus(activityType),
                GrossAmount = payout.NetAmount,
                PartnerDelta = activityType == FinanceActivityType.PayoutRequested ? -payout.NetAmount : 0,
                CommissionDelta = 0,
                Description = payout.Note,
                TransactionReference = payout.TransactionReference,
                OccurredAt = payout.ProcessedAt ?? payout.CreatedAt
            };
        }

        public async Task<object> GetPartnerProfileAsync(Guid userId)
        {
            var partner = await _context.Partners
                .Include(p => p.User)
                .Include(p => p.PartnerDocuments)
                .Include(p => p.Services)
                .Include(p => p.Bookings)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (partner == null)
                throw new BusinessException("Khong tim thay doi tac", 404);

            return new PartnerProfileDto
            {
                Id = partner.Id,
                BusinessName = partner.BusinessName,
                BusinessLicense = partner.BusinessLicense,
                TaxCode = partner.TaxCode,
                Description = partner.Description,
                Address = partner.Address,
                LogoUrl = partner.LogoUrl,
                BannerUrl = partner.BannerUrl,
                OwnerName = partner.User.FullName,
                Email = partner.User.Email,
                PhoneNumber = partner.User.PhoneNumber,
                VerificationStatus = partner.VerificationStatus,
                VerificationNote = partner.VerificationNote,
                BankName = partner.BankName,
                BankAccountNumber = partner.BankAccountNumber,
                BankAccountName = partner.BankAccountName,
                CommissionRate = partner.CommissionRate,
                TotalServices = partner.Services.Count,
                TotalBookings = partner.Bookings.Count,
                TotalRevenue = await _context.SettlementEntries
                    .Where(entry => entry.PartnerId == partner.Id && entry.EntryType == SettlementEntryType.PaymentCaptured)
                    .SumAsync(entry => (decimal?)entry.GrossAmount) ?? 0,
                CreatedAt = partner.CreatedAt
            };
        }

        public async Task<object> UpdatePartnerProfileAsync(Guid userId, UpdatePartnerProfileDto dto)
        {
            var partner = await GetPartnerByUserIdAsync(userId);

            if (!string.IsNullOrEmpty(dto.BusinessName)) partner.BusinessName = dto.BusinessName;
            if (dto.Description != null) partner.Description = dto.Description;
            if (dto.Address != null) partner.Address = dto.Address;
            if (dto.LogoUrl != null) partner.LogoUrl = dto.LogoUrl;
            if (dto.BannerUrl != null) partner.BannerUrl = dto.BannerUrl;
            if (dto.BankName != null) partner.BankName = dto.BankName;
            if (dto.BankAccountNumber != null) partner.BankAccountNumber = dto.BankAccountNumber;
            if (dto.BankAccountName != null) partner.BankAccountName = dto.BankAccountName;

            if (dto.FullName != null) partner.User.FullName = dto.FullName;
            if (dto.PhoneNumber != null) partner.User.PhoneNumber = dto.PhoneNumber;

            partner.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = "Cap nhat thong tin doi tac thanh cong" };
        }

        public async Task<object> AddPartnerDocumentAsync(Guid userId, string documentType, string documentUrl)
        {
            var partner = await GetPartnerByUserIdAsync(userId);

            var doc = new PartnerDocument
            {
                Id = Guid.NewGuid(),
                PartnerId = partner.Id,
                DocumentType = documentType,
                DocumentUrl = documentUrl,
                UploadedAt = DateTime.UtcNow
            };

            _context.PartnerDocuments.Add(doc);
            await _context.SaveChangesAsync();

            return new { Id = doc.Id, Message = "Tai len tai lieu thanh cong" };
        }

        public async Task<object> GetPartnerDocumentsAsync(Guid userId)
        {
            var partner = await GetPartnerByUserIdAsync(userId);

            return await _context.PartnerDocuments
                .Where(d => d.PartnerId == partner.Id)
                .OrderByDescending(d => d.UploadedAt)
                .Select(d => new PartnerDocumentListDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    DocumentUrl = d.DocumentUrl,
                    UploadedAt = d.UploadedAt
                })
                .ToListAsync();
        }

        public async Task<object> GetPartnerDashboardAsync(Guid userId)
        {
            var partner = await GetPartnerByUserIdAsync(userId);
            var partnerId = partner.Id;

            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var previousMonthStart = monthStart.AddMonths(-1);

            var totalBookings = await _context.Bookings.CountAsync(b => b.PartnerId == partnerId);
            var pendingBookings = await _context.Bookings.CountAsync(b => b.PartnerId == partnerId && b.FulfillmentStatus == BookingFulfillmentStatus.Confirmed);
            var completedBookings = await _context.Bookings.CountAsync(b => b.PartnerId == partnerId && b.FulfillmentStatus == BookingFulfillmentStatus.Completed);
            var cancelledBookings = await _context.Bookings.CountAsync(b => b.PartnerId == partnerId && b.FulfillmentStatus == BookingFulfillmentStatus.Cancelled);

            var capturedGross = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId && entry.EntryType == SettlementEntryType.PaymentCaptured)
                .SumAsync(entry => (decimal?)entry.GrossAmount) ?? 0;
            var monthlyCapturedGross = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId
                    && entry.EntryType == SettlementEntryType.PaymentCaptured
                    && entry.CreatedAt >= monthStart)
                .SumAsync(entry => (decimal?)entry.GrossAmount) ?? 0;
            var commissionNet = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId)
                .SumAsync(entry => (decimal?)entry.PlatformDelta) ?? 0;
            var releasedNet = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId && entry.EntryType == SettlementEntryType.PartnerReceivableReleased)
                .SumAsync(entry => (decimal?)entry.PartnerDelta) ?? 0;
            var monthlyReleasedNet = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId
                    && entry.EntryType == SettlementEntryType.PartnerReceivableReleased
                    && entry.CreatedAt >= monthStart)
                .SumAsync(entry => (decimal?)entry.PartnerDelta) ?? 0;
            var previousMonthlyReleasedNet = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId
                    && entry.EntryType == SettlementEntryType.PartnerReceivableReleased
                    && entry.CreatedAt >= previousMonthStart
                    && entry.CreatedAt < monthStart)
                .SumAsync(entry => (decimal?)entry.PartnerDelta) ?? 0;
            var ledgerBalance = await GetLedgerBalanceAsync(partnerId);
            var pendingPayout = await GetPendingPayoutLockAsync(partnerId);
            var paidOut = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId && entry.EntryType == SettlementEntryType.PayoutCompleted)
                .SumAsync(entry => (decimal?)entry.GrossAmount) ?? 0;
            var availableToWithdraw = Math.Max(0, ledgerBalance - pendingPayout);

            var totalServices = await _context.Services.CountAsync(s => s.PartnerId == partnerId);
            var activeServices = await _context.Services.CountAsync(s => s.PartnerId == partnerId && s.IsActive);
            var totalReviews = await _context.Reviews.CountAsync(r => r.Booking.PartnerId == partnerId);
            var avgRating = await _context.Reviews
                .Where(r => r.Booking.PartnerId == partnerId)
                .AverageAsync(r => (double?)r.Rating) ?? 0;

            var sixMonthsAgo = monthStart.AddMonths(-5);
            var releasedChartData = await _context.SettlementEntries
                .Where(entry => entry.PartnerId == partnerId
                    && entry.EntryType == SettlementEntryType.PartnerReceivableReleased
                    && entry.CreatedAt >= sixMonthsAgo)
                .GroupBy(entry => new { entry.CreatedAt.Year, entry.CreatedAt.Month })
                .Select(group => new
                {
                    group.Key.Year,
                    group.Key.Month,
                    Amount = group.Sum(entry => entry.PartnerDelta)
                })
                .OrderBy(item => item.Year)
                .ThenBy(item => item.Month)
                .ToListAsync();

            var releasedChart = releasedChartData
                .Select(item => new PartnerRevenueChartItemDto
                {
                    Label = $"{item.Month}/{item.Year}",
                    Amount = item.Amount
                })
                .ToList();

            return new PartnerDashboardDto
            {
                CapturedGross = capturedGross,
                CommissionNet = commissionNet,
                ReleasedNet = releasedNet,
                LedgerBalance = ledgerBalance,
                PaidOut = paidOut,
                AvailableToWithdraw = availableToWithdraw,
                CommissionRate = partner.CommissionRate,
                MonthlyReleasedNet = monthlyReleasedNet,
                MonthlyGrowth = CalculateGrowth(monthlyReleasedNet, previousMonthlyReleasedNet),
                TotalRevenue = capturedGross,
                MonthlyRevenue = monthlyCapturedGross,
                TotalCommission = commissionNet,
                PendingPayout = pendingPayout,
                TotalPaidOut = paidOut,
                AvailableBalance = availableToWithdraw,
                TotalBookings = totalBookings,
                PendingBookings = pendingBookings,
                CompletedBookings = completedBookings,
                CancelledBookings = cancelledBookings,
                TotalServices = totalServices,
                ActiveServices = activeServices,
                AverageRating = Math.Round(avgRating, 1),
                TotalReviews = totalReviews,
                RevenueChart = releasedChart
            };
        }

        public async Task<object> GetPartnerPayoutsAsync(Guid userId, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var partner = await GetPartnerByUserIdAsync(userId);

            var query = _context.PartnerPayouts
                .Where(p => p.PartnerId == partner.Id)
                .OrderByDescending(p => p.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PartnerPayoutListDto
                {
                    Id = p.Id,
                    RequestedAmount = p.Amount,
                    LedgerAmount = p.NetAmount,
                    Status = p.Status,
                    RequestedAt = p.CreatedAt,
                    ProcessedBy = p.ProcessedBy,
                    ProcessedAt = p.ProcessedAt,
                    BankName = p.BankName,
                    BankAccount = p.BankAccount,
                    Note = p.Note,
                    TransactionReference = p.TransactionReference
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<object> GetPartnerTransactionsAsync(Guid userId, PartnerTransactionFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var partner = await GetPartnerByUserIdAsync(userId);

            var settlementEntries = await _context.SettlementEntries
                .Include(entry => entry.Booking!).ThenInclude(booking => booking.Service)
                .Include(entry => entry.Booking!).ThenInclude(booking => booking.User)
                .Include(entry => entry.PartnerPayout)
                .Where(entry => entry.PartnerId == partner.Id)
                .ToListAsync();

            var payoutActivities = await _context.PartnerPayouts
                .Where(payout => payout.PartnerId == partner.Id
                    && (payout.Status == PayoutStatus.Pending || payout.Status == PayoutStatus.Rejected))
                .ToListAsync();

            var activities = settlementEntries
                .Select(MapPartnerSettlementActivity)
                .Concat(payoutActivities.Select(payout => MapPartnerPayoutActivity(
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

            var ordered = activities
                .OrderByDescending(item => item.OccurredAt)
                .ToList();

            var totalCount = ordered.Count;
            var items = ordered
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToList();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        public async Task<object> GetPartnerRevenueAsync(Guid userId, DateTime? from, DateTime? to)
        {
            var partner = await GetPartnerByUserIdAsync(userId);

            var entries = _context.SettlementEntries
                .Where(entry => entry.PartnerId == partner.Id)
                .AsQueryable();

            if (from.HasValue)
                entries = entries.Where(entry => entry.CreatedAt >= from.Value);

            if (to.HasValue)
                entries = entries.Where(entry => entry.CreatedAt <= to.Value);

            var settlementEntries = await entries.ToListAsync();

            var totalRevenue = settlementEntries
                .Where(entry => entry.EntryType == SettlementEntryType.PaymentCaptured)
                .Sum(entry => entry.GrossAmount);
            var commissionAmount = settlementEntries.Sum(entry => entry.PlatformDelta);
            var netRevenue = settlementEntries.Sum(entry => entry.PartnerDelta);

            var monthlyRevenue = settlementEntries
                .Where(entry => entry.EntryType == SettlementEntryType.PartnerReceivableReleased)
                .GroupBy(entry => new { entry.CreatedAt.Year, entry.CreatedAt.Month })
                .Select(group => new
                {
                    group.Key.Year,
                    group.Key.Month,
                    Revenue = group.Sum(entry => entry.PartnerDelta),
                    BookingCount = group.Count()
                })
                .OrderBy(item => item.Year)
                .ThenBy(item => item.Month)
                .ToList();

            return new
            {
                TotalRevenue = totalRevenue,
                CommissionRate = partner.CommissionRate,
                CommissionAmount = commissionAmount,
                NetRevenue = netRevenue,
                TotalBookings = await _context.Bookings.CountAsync(booking => booking.PartnerId == partner.Id),
                MonthlyRevenue = monthlyRevenue
            };
        }

        public async Task<object> RequestPayoutAsync(Guid userId, RequestPayoutDto dto)
        {
            if (dto.Amount <= 0)
                throw new BusinessException("So tien rut phai lon hon 0");

            var partner = await GetPartnerByUserIdAsync(userId);
            var bankName = string.IsNullOrWhiteSpace(dto.BankName)
                ? partner.BankName?.Trim()
                : dto.BankName.Trim();
            var bankAccount = string.IsNullOrWhiteSpace(dto.BankAccount)
                ? partner.BankAccountNumber?.Trim()
                : dto.BankAccount.Trim();

            if (string.IsNullOrWhiteSpace(bankName) || string.IsNullOrWhiteSpace(bankAccount))
            {
                throw new BusinessException(
                    "Vui long cung cap ten ngan hang va so tai khoan, hoac cap nhat thong tin ngan hang trong ho so doi tac");
            }

            var ledgerBalance = await GetLedgerBalanceAsync(partner.Id);
            var pendingPayoutLock = await GetPendingPayoutLockAsync(partner.Id);
            var availableBalance = Math.Max(0, ledgerBalance - pendingPayoutLock);

            if (dto.Amount > availableBalance)
                throw new BusinessException($"So du kha dung khong du. So du hien tai: {availableBalance:N0} VND");

            var payout = new PartnerPayout
            {
                Id = Guid.NewGuid(),
                PartnerId = partner.Id,
                Amount = dto.Amount,
                CommissionAmount = 0,
                NetAmount = dto.Amount,
                PeriodStart = DateTime.UtcNow.AddMonths(-1),
                PeriodEnd = DateTime.UtcNow,
                Status = PayoutStatus.Pending,
                Note = dto.Note,
                BankName = bankName,
                BankAccount = bankAccount,
                CreatedAt = DateTime.UtcNow
            };

            _context.PartnerPayouts.Add(payout);
            await _context.SaveChangesAsync();

            return new
            {
                Id = payout.Id,
                RequestedAmount = payout.Amount,
                LedgerAmount = payout.NetAmount,
                payout.Status,
                RequestedAt = payout.CreatedAt,
                payout.BankName,
                payout.BankAccount,
                Message = "Yeu cau rut tien da duoc gui"
            };
        }
    }
}
