using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Admin
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Manager")]
    public class AdminFinanceController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly VNSDbContext _context;

        public AdminFinanceController(IAdminService adminService, VNSDbContext context)
        {
            _adminService = adminService;
            _context = context;
        }

        [HttpGet("partner-balances")]
        public async Task<IActionResult> GetPartnerBalances()
        {
            var partners = await _context.Partners
                .Where(partner => partner.VerificationStatus == PartnerVerificationStatus.Approved)
                .Select(partner => new
                {
                    partner.Id,
                    partner.BusinessName,
                    partner.LogoUrl,
                    partner.CommissionRate
                })
                .ToListAsync();

            var settlementGroups = await _context.SettlementEntries
                .Where(entry => entry.PartnerId != null)
                .GroupBy(entry => entry.PartnerId!.Value)
                .Select(group => new
                {
                    PartnerId = group.Key,
                    CapturedGross = group.Where(entry => entry.EntryType == SettlementEntryType.PaymentCaptured).Sum(entry => entry.GrossAmount),
                    RefundedGross = group.Where(entry => entry.EntryType == SettlementEntryType.RefundProcessed).Sum(entry => entry.GrossAmount),
                    CommissionNet = group.Sum(entry => entry.PlatformDelta),
                    ReleasedNet = group.Where(entry => entry.EntryType == SettlementEntryType.PartnerReceivableReleased).Sum(entry => entry.PartnerDelta),
                    LedgerBalance = group.Sum(entry => entry.PartnerDelta),
                    PaidOut = group.Where(entry => entry.EntryType == SettlementEntryType.PayoutCompleted).Sum(entry => entry.GrossAmount)
                })
                .ToDictionaryAsync(item => item.PartnerId);

            var pendingPayouts = await _context.PartnerPayouts
                .Where(payout => payout.Status == PayoutStatus.Pending)
                .GroupBy(payout => payout.PartnerId)
                .Select(group => new
                {
                    PartnerId = group.Key,
                    PendingPayout = group.Sum(payout => payout.NetAmount)
                })
                .ToDictionaryAsync(item => item.PartnerId, item => item.PendingPayout);

            var bookingStats = await _context.Bookings
                .GroupBy(booking => booking.PartnerId)
                .Select(group => new
                {
                    PartnerId = group.Key,
                    TotalCompletedBookings = group.Count(booking => booking.FulfillmentStatus == BookingFulfillmentStatus.Completed),
                    TotalPendingBookings = group.Count(booking => booking.FulfillmentStatus == BookingFulfillmentStatus.Confirmed),
                    TotalCancelledBookings = group.Count(booking => booking.FulfillmentStatus == BookingFulfillmentStatus.Cancelled)
                })
                .ToDictionaryAsync(item => item.PartnerId);

            var items = partners
                .Select(partner =>
                {
                    settlementGroups.TryGetValue(partner.Id, out var settlement);
                    pendingPayouts.TryGetValue(partner.Id, out var pendingPayout);
                    bookingStats.TryGetValue(partner.Id, out var booking);

                    var ledgerBalance = settlement?.LedgerBalance ?? 0;
                    return new PartnerBalanceListItemDto
                    {
                        PartnerId = partner.Id,
                        PartnerName = partner.BusinessName,
                        LogoUrl = partner.LogoUrl,
                        CommissionRate = partner.CommissionRate,
                        CapturedGross = settlement?.CapturedGross ?? 0,
                        RefundedGross = settlement?.RefundedGross ?? 0,
                        CommissionNet = settlement?.CommissionNet ?? 0,
                        ReleasedNet = settlement?.ReleasedNet ?? 0,
                        LedgerBalance = ledgerBalance,
                        PaidOut = settlement?.PaidOut ?? 0,
                        PendingPayout = pendingPayout,
                        AvailableToWithdraw = Math.Max(0, ledgerBalance - pendingPayout),
                        TotalCompletedBookings = booking?.TotalCompletedBookings ?? 0,
                        TotalPendingBookings = booking?.TotalPendingBookings ?? 0,
                        TotalCancelledBookings = booking?.TotalCancelledBookings ?? 0
                    };
                })
                .OrderByDescending(item => item.LedgerBalance)
                .ToList();

            var totals = new PartnerBalanceTotalsDto
            {
                TotalCapturedGross = items.Sum(item => item.CapturedGross),
                TotalRefundedGross = items.Sum(item => item.RefundedGross),
                TotalCommissionNet = items.Sum(item => item.CommissionNet),
                TotalReleasedNet = items.Sum(item => item.ReleasedNet),
                TotalLedgerBalance = items.Sum(item => item.LedgerBalance),
                TotalPendingPayout = items.Sum(item => item.PendingPayout),
                TotalPaidOut = items.Sum(item => item.PaidOut),
                TotalAvailableToWithdraw = items.Sum(item => item.AvailableToWithdraw),
                PartnerCount = items.Count
            };

            return Ok(ApiResponse<object>.SuccessResponse(new { Totals = totals, Items = items }, "Lay so du tung doi tac thanh cong"));
        }

        [HttpGet("service-balances/{partnerId}")]
        public async Task<IActionResult> GetServiceBalances(Guid partnerId)
        {
            var services = await _context.Services
                .Where(service => service.PartnerId == partnerId)
                .Select(service => new
                {
                    ServiceId = service.Id,
                    ServiceName = service.Name,
                    ServiceType = service.ServiceType,
                    ThumbnailUrl = service.ThumbnailUrl,
                    TotalBookings = _context.Bookings.Count(booking => booking.ServiceId == service.Id),
                    CompletedBookings = _context.Bookings.Count(booking => booking.ServiceId == service.Id && booking.FulfillmentStatus == BookingFulfillmentStatus.Completed),
                    CancelledBookings = _context.Bookings.Count(booking => booking.ServiceId == service.Id && booking.FulfillmentStatus == BookingFulfillmentStatus.Cancelled),
                    CapturedGross = _context.SettlementEntries
                        .Where(entry => entry.Booking != null && entry.Booking.ServiceId == service.Id && entry.EntryType == SettlementEntryType.PaymentCaptured)
                        .Sum(entry => (decimal?)entry.GrossAmount) ?? 0,
                    RefundedGross = _context.SettlementEntries
                        .Where(entry => entry.Booking != null && entry.Booking.ServiceId == service.Id && entry.EntryType == SettlementEntryType.RefundProcessed)
                        .Sum(entry => (decimal?)entry.GrossAmount) ?? 0
                })
                .OrderByDescending(item => item.CapturedGross)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(services, "Lay chi tiet theo dich vu thanh cong"));
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenueReport([FromQuery] RevenueFilterDto filter)
        {
            var result = await _adminService.GetRevenueReportAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay bao cao doanh thu thanh cong"));
        }

        [HttpGet("payouts")]
        public async Task<IActionResult> GetPayouts([FromQuery] PayoutFilterDto filter)
        {
            var result = await _adminService.GetPayoutsAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay danh sach thanh toan cho doi tac thanh cong"));
        }

        [HttpPost("payouts/{id}/process")]
        public async Task<IActionResult> ProcessPayout(Guid id, [FromBody] ProcessPayoutDto dto)
        {
            var adminId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
            var result = await _adminService.ProcessPayoutAsync(id, dto, adminId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xu ly thanh toan cho doi tac thanh cong"));
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilterDto filter)
        {
            var result = await _adminService.GetTransactionsAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay danh sach giao dich thanh cong"));
        }
    }
}
