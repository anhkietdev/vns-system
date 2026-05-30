using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Booking;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Refund;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public static class BookingRefundHelper
    {
        private sealed class RefundComponentSource
        {
            public string ServiceName { get; set; } = string.Empty;
            public ServiceType ServiceType { get; set; }
            public decimal SubTotal { get; set; }
            public CancellationPolicyType PolicyType { get; set; }
            public DateTime? ReferenceDate { get; set; }
        }

        public sealed class RefundPreview
        {
            public decimal RefundEligibleAmount { get; set; }
            public string EligibilityMessage { get; set; } = string.Empty;
            public List<RefundPreviewComponentDto> Components { get; set; } = new();
        }

        public static decimal CalculateRefundPercent(Booking booking, DateTime requestedAtUtc)
        {
            if (booking.FinalAmount <= 0)
                return 0;

            var preview = BuildRefundPreview(booking, requestedAtUtc);
            return preview.RefundEligibleAmount <= 0
                ? 0
                : Math.Round(preview.RefundEligibleAmount / booking.FinalAmount * 100m, 2, MidpointRounding.AwayFromZero);
        }

        public static bool CanRefund(Booking booking, DateTime requestedAtUtc)
        {
            if (booking.RefundRequest != null)
                return false;
            if (booking.Payment == null || booking.Payment.PaymentStatus != PaymentStatus.Completed)
                return false;
            if (booking.CommercialStatus != BookingCommercialStatus.Paid)
                return false;
            if (booking.FulfillmentStatus == BookingFulfillmentStatus.Completed
                || booking.FulfillmentStatus == BookingFulfillmentStatus.Cancelled)
                return false;

            return BuildRefundPreview(booking, requestedAtUtc).RefundEligibleAmount > 0;
        }

        public static RefundPreview BuildRefundPreview(Booking booking, DateTime requestedAtUtc)
        {
            if (booking.Payment == null || booking.Payment.PaymentStatus != PaymentStatus.Completed)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Booking has not completed payment, so no refund is available yet.",
                };
            }

            if (booking.CommercialStatus != BookingCommercialStatus.Paid)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Only paid bookings can request a refund.",
                };
            }

            if (booking.FulfillmentStatus == BookingFulfillmentStatus.Completed)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Completed bookings are no longer eligible for a refund.",
                };
            }

            if (booking.FulfillmentStatus == BookingFulfillmentStatus.Cancelled)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Cancelled bookings are already closed for additional refund requests.",
                };
            }

            if (booking.RefundRequest != null)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "A refund request for this booking is already being processed.",
                };
            }

            var sources = BuildRefundSources(booking);
            if (!sources.Any())
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Refund information is not available for this booking.",
                };
            }

            var totalSourceAmount = sources.Sum(item => item.SubTotal);
            if (totalSourceAmount <= 0)
            {
                return new RefundPreview
                {
                    EligibilityMessage = "Refund information is not available for this booking.",
                };
            }

            var comboDiscountAmount = booking.ComboId.HasValue
                ? Math.Max(0, totalSourceAmount - booking.TotalAmount)
                : 0;
            var voucherDiscountAmount = Math.Max(0, booking.DiscountAmount);
            var allocatedCombo = 0m;
            var allocatedVoucher = 0m;
            var preview = new RefundPreview();

            for (var index = 0; index < sources.Count; index++)
            {
                var source = sources[index];
                var ratio = totalSourceAmount <= 0 ? 0m : source.SubTotal / totalSourceAmount;
                var comboAllocation = index == sources.Count - 1
                    ? comboDiscountAmount - allocatedCombo
                    : Math.Round(comboDiscountAmount * ratio, 2, MidpointRounding.AwayFromZero);
                var voucherAllocation = index == sources.Count - 1
                    ? voucherDiscountAmount - allocatedVoucher
                    : Math.Round(voucherDiscountAmount * ratio, 2, MidpointRounding.AwayFromZero);

                allocatedCombo += comboAllocation;
                allocatedVoucher += voucherAllocation;

                var baseAmount = Math.Max(0, source.SubTotal - comboAllocation - voucherAllocation);
                var refundPercent = CalculateRefundPercent(
                    source.PolicyType,
                    booking.BookingDate,
                    source.ReferenceDate,
                    requestedAtUtc);
                var refundAmount = Math.Round(baseAmount * refundPercent / 100m, 2, MidpointRounding.AwayFromZero);

                preview.Components.Add(new RefundPreviewComponentDto
                {
                    ServiceName = source.ServiceName,
                    ServiceType = source.ServiceType,
                    BaseAmount = baseAmount,
                    RefundPercent = refundPercent,
                    RefundAmount = refundAmount,
                    PolicyType = source.PolicyType,
                    ReferenceDate = source.ReferenceDate,
                });
            }

            preview.RefundEligibleAmount = preview.Components.Sum(item => item.RefundAmount);
            preview.EligibilityMessage = preview.RefundEligibleAmount > 0
                ? booking.ComboId.HasValue
                    ? "Estimated refund based on the current cancellation policy of each service in the combo."
                    : "Estimated refund based on the current cancellation policy for this booking."
                : booking.ComboId.HasValue
                    ? "This combo is not eligible for a refund under the current component cancellation policies."
                    : "This booking is not eligible for a refund under the current cancellation policy.";

            return preview;
        }

        public static DateTime GetServiceStartUtc(Booking booking)
        {
            if (booking.Service.ServiceType == ServiceType.Homestay && booking.CheckInDate.HasValue)
            {
                var checkInTime = booking.Service.Homestay?.CheckInTime ?? new TimeSpan(14, 0, 0);
                return booking.CheckInDate.Value.Date.Add(checkInTime);
            }

            var firstTourStartUtc = booking.BookingDetails
                .Where(detail => detail.TourSchedule != null)
                .Select(detail => detail.TourSchedule!.StartDate)
                .OrderBy(date => date)
                .FirstOrDefault();

            if (firstTourStartUtc != default)
                return firstTourStartUtc;

            var firstComboTourStartUtc = booking.ComboBookingItems
                .Where(item => item.TourSchedule != null)
                .Select(item => item.TourSchedule!.StartDate)
                .OrderBy(date => date)
                .FirstOrDefault();

            if (firstComboTourStartUtc != default)
                return firstComboTourStartUtc;

            if (booking.CheckInDate.HasValue)
                return booking.CheckInDate.Value;

            return booking.BookingDate.AddDays(1);
        }

        public static decimal CalculateRefundPercent(
            CancellationPolicyType policyType,
            DateTime bookingDateUtc,
            DateTime? serviceStartUtc,
            DateTime requestedAtUtc)
        {
            if (!serviceStartUtc.HasValue || serviceStartUtc.Value <= requestedAtUtc)
                return 0;

            if (policyType != CancellationPolicyType.NonRefundable
                && QualifiesForGraceWindow(bookingDateUtc, serviceStartUtc.Value, requestedAtUtc))
            {
                return 100;
            }

            var timeUntilStart = serviceStartUtc.Value - requestedAtUtc;

            return policyType switch
            {
                CancellationPolicyType.Free => timeUntilStart >= TimeSpan.FromHours(24) ? 100 : 0,
                CancellationPolicyType.Moderate => timeUntilStart >= TimeSpan.FromDays(5)
                    ? 100
                    : timeUntilStart > TimeSpan.Zero ? 50 : 0,
                CancellationPolicyType.Strict => timeUntilStart >= TimeSpan.FromDays(30)
                    ? 100
                    : timeUntilStart >= TimeSpan.FromDays(7) ? 50 : 0,
                CancellationPolicyType.NonRefundable => 0,
                _ => 0
            };
        }

        private static List<RefundComponentSource> BuildRefundSources(Booking booking)
        {
            if (booking.BookingComponents.Any())
            {
                return booking.BookingComponents
                    .OrderBy(item => item.CreatedAt)
                    .Select(item => new RefundComponentSource
                    {
                        ServiceName = string.IsNullOrWhiteSpace(item.ServiceNameSnapshot)
                            ? item.Service?.Name ?? booking.ComboName ?? booking.Service?.Name ?? "VNS service"
                            : item.ServiceNameSnapshot,
                        ServiceType = item.ServiceType,
                        SubTotal = item.SubTotal,
                        PolicyType = item.CancellationPolicyTypeSnapshot,
                        ReferenceDate = ResolveReferenceDate(
                            item.ServiceType,
                            item.CheckInDate,
                            item.StartDate,
                            item.Service?.Homestay?.CheckInTime),
                    })
                    .ToList();
            }

            if (booking.ComboBookingItems.Any())
            {
                return booking.ComboBookingItems
                    .OrderBy(item => item.CreatedAt)
                    .Select(item => new RefundComponentSource
                    {
                        ServiceName = item.Service?.Name ?? booking.ComboName ?? booking.Service?.Name ?? "VNS service",
                        ServiceType = item.Service?.ServiceType ?? ServiceType.Combo,
                        SubTotal = item.SubTotal,
                        PolicyType = item.Service?.CancellationPolicyType
                            ?? booking.Service?.CancellationPolicyType
                            ?? CancellationPolicyType.Moderate,
                        ReferenceDate = ResolveReferenceDate(
                            item.Service?.ServiceType ?? ServiceType.Combo,
                            item.CheckInDate,
                            item.StartDate,
                            item.Service?.Homestay?.CheckInTime),
                    })
                    .ToList();
            }

            if (booking.BookingDetails.Any())
            {
                return booking.BookingDetails
                    .OrderBy(item => item.Id)
                    .Select(item => new RefundComponentSource
                    {
                        ServiceName = booking.Service?.Name ?? "VNS service",
                        ServiceType = booking.Service?.ServiceType ?? ServiceType.Tour,
                        SubTotal = item.SubTotal,
                        PolicyType = booking.Service?.CancellationPolicyType ?? CancellationPolicyType.Moderate,
                        ReferenceDate = ResolveReferenceDate(
                            booking.Service?.ServiceType ?? ServiceType.Tour,
                            booking.CheckInDate,
                            item.TourSchedule?.StartDate,
                            booking.Service?.Homestay?.CheckInTime),
                    })
                    .ToList();
            }

            return new List<RefundComponentSource>
            {
                new()
                {
                    ServiceName = booking.ComboName ?? booking.Service?.Name ?? "VNS service",
                    ServiceType = booking.ComboId.HasValue ? ServiceType.Combo : booking.Service?.ServiceType ?? ServiceType.Tour,
                    SubTotal = booking.TotalAmount,
                    PolicyType = booking.Service?.CancellationPolicyType ?? CancellationPolicyType.Moderate,
                    ReferenceDate = ResolveReferenceDate(
                        booking.Service?.ServiceType ?? ServiceType.Tour,
                        booking.CheckInDate,
                        GetServiceStartUtc(booking),
                        booking.Service?.Homestay?.CheckInTime),
                }
            };
        }

        private static DateTime? ResolveReferenceDate(
            ServiceType serviceType,
            DateTime? checkInDate,
            DateTime? startDate,
            TimeSpan? checkInTime)
        {
            if (serviceType == ServiceType.Homestay)
            {
                if (!checkInDate.HasValue)
                    return null;

                return checkInDate.Value.Date.Add(checkInTime ?? new TimeSpan(14, 0, 0));
            }

            return startDate;
        }

        private static bool QualifiesForGraceWindow(DateTime bookingDateUtc, DateTime serviceStartUtc, DateTime requestedAtUtc)
        {
            var leadTime = serviceStartUtc - bookingDateUtc;
            var requestAge = requestedAtUtc - bookingDateUtc;

            return leadTime >= TimeSpan.FromDays(7)
                && requestAge >= TimeSpan.Zero
                && requestAge <= TimeSpan.FromHours(24);
        }
    }

    public class RefundService : IRefundService
    {
        private readonly VNSDbContext _context;
        private readonly ICommerceService _commerceService;

        public RefundService(
            VNSDbContext context,
            ICommerceService commerceService)
        {
            _context = context;
            _commerceService = commerceService;
        }

        public async Task<object> GetMyRefundRequestsAsync(Guid userId)
        {
            return await _context.RefundRequests
                .Include(r => r.Booking).ThenInclude(b => b.Service)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new RefundRequestDto
                {
                    Id = r.Id,
                    BookingId = r.BookingId,
                    BookingCode = r.Booking.BookingCode,
                    ServiceName = r.Booking.ComboId.HasValue ? (r.Booking.ComboName ?? r.Booking.Service.Name) : r.Booking.Service.Name,
                    Reason = r.Reason,
                    RefundAmount = r.RefundAmount,
                    Status = r.Status,
                    AdminNote = r.AdminNote,
                    CreatedAt = r.CreatedAt,
                    ProcessedAt = r.ProcessedAt
                })
                .ToListAsync();
        }

        public async Task<object> GetRefundRequestsAsync(RefundFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.RefundRequests
                .Include(r => r.Booking).ThenInclude(b => b.Service)
                .Include(r => r.User)
                .AsQueryable();

            if (filter.Status.HasValue)
                query = query.Where(r => r.Status == filter.Status.Value);

            if (filter.FromDate.HasValue)
                query = query.Where(r => r.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(r => r.CreatedAt <= filter.ToDate.Value);

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var keyword = filter.Keyword.ToLower();
                query = query.Where(r =>
                    r.Booking.BookingCode.ToLower().Contains(keyword) ||
                    r.User.FullName.ToLower().Contains(keyword) ||
                    r.Booking.Service.Name.ToLower().Contains(keyword));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(r => new RefundListItemDto
                {
                    Id = r.Id,
                    BookingId = r.BookingId,
                    BookingCode = r.Booking.BookingCode,
                    CustomerName = r.User.FullName,
                    ServiceName = r.Booking.ComboId.HasValue ? (r.Booking.ComboName ?? r.Booking.Service.Name) : r.Booking.Service.Name,
                    RequestedAmount = r.RefundAmount,
                    ApprovedAmount = r.Status == RefundStatus.Processed ? r.RefundAmount : null,
                    Status = r.Status,
                    Reason = r.Reason,
                    AdminNote = r.AdminNote,
                    RequestedAt = r.CreatedAt,
                    ProcessedAt = r.ProcessedAt
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
    }
}
