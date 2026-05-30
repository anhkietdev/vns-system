using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;

namespace VNS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComboController : ControllerBase
    {
        private readonly VNSDbContext _context;

        public ComboController(VNSDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveCombos()
        {
            var combos = await LoadCombosQuery()
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var response = combos
                .Where(combo => EvaluatePublicReadiness(combo).IsEligible)
                .Select(BuildComboSummaryResponse)
                .ToList();

            return Ok(ApiResponse<object>.SuccessResponse(response, "Lay danh sach combo thanh cong"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetActiveComboDetail(Guid id)
        {
            var combo = await LoadCombosQuery()
                .Where(c => c.Id == id && c.IsActive)
                .FirstOrDefaultAsync();

            if (combo == null)
                return NotFound(ApiResponse<object>.ErrorResponse("Khong tim thay combo"));

            var readiness = EvaluatePublicReadiness(combo);
            if (!readiness.IsEligible)
                return NotFound(ApiResponse<object>.ErrorResponse("Khong tim thay combo"));

            return Ok(ApiResponse<object>.SuccessResponse(
                BuildComboDetailResponse(combo, readiness),
                "Lay chi tiet combo thanh cong"));
        }

        private IQueryable<Combo> LoadCombosQuery()
        {
            return _context.Combos
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Destination)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .Include(c => c.Partner);
        }

        private static ComboEligibilityResult EvaluatePublicReadiness(Combo combo)
        {
            return ComboBundleHelper.EvaluateComboReadiness(
                combo.ComboItems.Select(item => item.Service).ToList(),
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                requireApproved: true);
        }

        private static object BuildComboSummaryResponse(Combo combo)
        {
            var orderedItems = combo.ComboItems.OrderBy(item => item.DisplayOrder).ToList();
            var homestay = orderedItems.FirstOrDefault(item => item.Service.ServiceType == ServiceType.Homestay);
            var tour = orderedItems.FirstOrDefault(item => item.Service.ServiceType == ServiceType.Tour);
            var discountAmount = Math.Max(0, combo.OriginalPrice - combo.ComboPrice);
            var discountPercent = ComboBundleHelper.GetDiscountPercent(combo.OriginalPrice, combo.ComboPrice);

            return new
            {
                combo.Id,
                combo.Name,
                combo.Description,
                combo.OriginalPrice,
                combo.ComboPrice,
                FromOriginalPrice = combo.OriginalPrice,
                FromComboPrice = combo.ComboPrice,
                DiscountAmount = discountAmount,
                DiscountPercent = discountPercent,
                Discount = discountPercent,
                combo.DiscountType,
                combo.DiscountValue,
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                combo.ThumbnailUrl,
                PartnerName = combo.Partner.BusinessName,
                ServiceCount = orderedItems.Count,
                Homestay = homestay != null ? BuildServiceSummary(homestay) : null,
                Tour = tour != null ? BuildServiceSummary(tour) : null,
                Services = orderedItems.Select(BuildServiceSummary).ToList(),
                IsPubliclyBookable = true,
                BlockingReasons = Array.Empty<string>()
            };
        }

        private static object BuildComboDetailResponse(Combo combo, ComboEligibilityResult readiness)
        {
            var orderedItems = combo.ComboItems.OrderBy(item => item.DisplayOrder).ToList();
            var homestayItem = orderedItems.First(item => item.Service.ServiceType == ServiceType.Homestay);
            var tourItem = orderedItems.First(item => item.Service.ServiceType == ServiceType.Tour);
            var homestay = homestayItem.Service.Homestay;

            var futureSchedules = tourItem.Service.Tours
                .SelectMany(tour => tour.TourSchedules.Select(schedule => new { Tour = tour, Schedule = schedule }))
                .Where(item => item.Schedule.Status == TourScheduleStatus.Active)
                .Where(item => item.Schedule.StartDate > DateTime.UtcNow)
                .Where(item => !(item.Tour.BookingCutoffHours > 0 && item.Schedule.StartDate <= DateTime.UtcNow.AddHours(item.Tour.BookingCutoffHours)))
                .Where(item => ComboBundleHelper.GetScheduleRemainingCapacity(item.Schedule) > 0)
                .OrderBy(item => item.Schedule.StartDate)
                .Select(item => new
                {
                    item.Schedule.Id,
                    item.Schedule.StartDate,
                    item.Schedule.EndDate,
                    item.Schedule.Status,
                    PackageId = item.Tour.Id,
                    PackageName = item.Tour.Name,
                    item.Tour.BookingCutoffHours,
                    RemainingCapacity = ComboBundleHelper.GetScheduleRemainingCapacity(item.Schedule),
                    AvailableSlots = item.Schedule.AvailableSlots,
                    RunCount = item.Schedule.RunCount,
                    FromPrice = ComboBundleHelper.GetScheduleFromPrice(
                        item.Schedule,
                        item.Tour.TourPricingTiers,
                        tourItem.Service.DiscountPrice ?? tourItem.Service.BasePrice)
                })
                .ToList();

            return new
            {
                combo.Id,
                combo.Name,
                combo.Description,
                combo.OriginalPrice,
                combo.ComboPrice,
                combo.DiscountType,
                combo.DiscountValue,
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                combo.ThumbnailUrl,
                PartnerName = combo.Partner.BusinessName,
                ServiceCount = orderedItems.Count,
                Homestay = BuildServiceSummary(homestayItem),
                Tour = BuildServiceSummary(tourItem),
                Services = orderedItems.Select(BuildServiceSummary).ToList(),
                IsPubliclyBookable = readiness.IsEligible,
                BlockingReasons = readiness.BlockingReasons,
                HomestayRules = homestay == null ? null : new
                {
                    homestay.MinNights,
                    homestay.MaxNights,
                    homestay.AvailableFrom,
                    homestay.AvailableTo,
                    ActiveRoomCount = homestay.Rooms.Count(room => room.IsActive),
                    Rooms = homestay.Rooms
                        .Where(room => room.IsActive)
                        .Select(room => new
                        {
                            room.Id,
                            room.Name,
                            room.BasePrice,
                            room.MaxGuests,
                            room.Quantity,
                        })
                        .ToList()
                },
                TourSchedules = futureSchedules,
                TourPackages = tourItem.Service.Tours
                    .Select(tour => new
                    {
                        tour.Id,
                        tour.Name,
                        tour.Duration,
                        tour.MinParticipants,
                        tour.MaxParticipants,
                        tour.CancellationPolicyType,
                        tour.BookingCutoffHours,
                        PricingTiers = tour.TourPricingTiers
                            .OrderBy(tier => tier.DisplayOrder)
                            .Select(tier => new
                            {
                                tier.Id,
                                tier.Name,
                                tier.Description,
                                tier.UnitPrice,
                                tier.MinQuantity,
                                tier.MaxQuantity,
                            })
                            .ToList()
                    })
                    .ToList()
            };
        }

        private static object BuildServiceSummary(ComboItem item)
        {
            return new
            {
                item.Id,
                item.DisplayOrder,
                item.ServiceId,
                item.PreferredRoomId,
                item.PreferredTourPricingTierId,
                item.Service.Name,
                item.Service.ServiceType,
                BasePrice = item.Service.BasePrice,
                DiscountPrice = item.Service.DiscountPrice,
                FromPrice = ComboBundleHelper.GetServiceFromPrice(item.Service),
                item.Service.ThumbnailUrl,
                item.Service.Description,
                DestinationName = item.Service.Destination?.Name,
                CancellationPolicyType = item.Service.CancellationPolicyType,
            };
        }
    }
}
