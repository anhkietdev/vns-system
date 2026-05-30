using VNS.API.Models.Entities;
using VNS.API.Models.Enums;

namespace VNS.API.Helpers
{
    public sealed class ComboEligibilityResult
    {
        public bool IsEligible => BlockingReasons.Count == 0;
        public List<string> BlockingReasons { get; } = new();
    }

    public static class ComboBundleHelper
    {
        public static ComboEligibilityResult EvaluateComboReadiness(
            IReadOnlyCollection<Service> services,
            ComboDateDriver dateDriver,
            int stayOffsetBeforeDays,
            int stayOffsetAfterDays,
            bool requireApproved)
        {
            var result = new ComboEligibilityResult();

            if (services.Count != 2)
            {
                result.BlockingReasons.Add("Combo phai gom dung 2 dich vu.");
                return result;
            }

            var homestays = services.Where(service => service.ServiceType == ServiceType.Homestay).ToList();
            var tours = services.Where(service => service.ServiceType == ServiceType.Tour).ToList();

            if (homestays.Count != 1 || tours.Count != 1)
            {
                result.BlockingReasons.Add("Combo chi ho tro dung 1 homestay va 1 tour.");
                return result;
            }

            foreach (var service in services)
            {
                if (!service.IsActive)
                    result.BlockingReasons.Add($"Dich vu '{service.Name}' dang tam ngung hoat dong.");

                if (service.ApprovalStatus == ServiceApprovalStatus.Rejected)
                    result.BlockingReasons.Add($"Dich vu '{service.Name}' da bi tu choi.");

                if (requireApproved && service.ApprovalStatus != ServiceApprovalStatus.Approved)
                    result.BlockingReasons.Add($"Dich vu '{service.Name}' chua duoc phe duyet.");
            }

            var homestayService = homestays[0];
            var homestay = homestayService.Homestay;
            if (homestay == null)
            {
                result.BlockingReasons.Add($"Homestay '{homestayService.Name}' dang thieu thong tin luu tru.");
            }
            else
            {
                var activeRooms = homestay.Rooms.Where(room => room.IsActive).ToList();
                if (!activeRooms.Any())
                    result.BlockingReasons.Add($"Homestay '{homestayService.Name}' khong co phong dang hoat dong.");

                if (dateDriver == ComboDateDriver.Tour)
                {
                    var stayLength = Math.Max(1, stayOffsetBeforeDays + stayOffsetAfterDays + 1);
                    if (stayLength < homestay.MinNights)
                    {
                        result.BlockingReasons.Add(
                            $"Cau hinh combo chua dap ung toi thieu {homestay.MinNights} dem cua homestay '{homestayService.Name}'.");
                    }
                }
            }

            var tourService = tours[0];
            var futureSchedules = tourService.Tours
                .SelectMany(tour => tour.TourSchedules.Select(schedule => new { tour, schedule }))
                .Where(item => item.schedule.Status == TourScheduleStatus.Active)
                .Where(item => item.schedule.StartDate > DateTime.UtcNow)
                .Where(item => !(item.tour.BookingCutoffHours > 0 && item.schedule.StartDate <= DateTime.UtcNow.AddHours(item.tour.BookingCutoffHours)))
                .Where(item => GetScheduleRemainingCapacity(item.schedule) > 0)
                .ToList();

            if (!futureSchedules.Any())
                result.BlockingReasons.Add($"Tour '{tourService.Name}' khong co lich khoi hanh hop le trong tuong lai.");

            return result;
        }

        public static bool IsBundleEligibleService(Service service, bool requireApproved)
        {
            if (!service.IsActive)
                return false;

            if (service.ApprovalStatus == ServiceApprovalStatus.Rejected)
                return false;

            if (requireApproved && service.ApprovalStatus != ServiceApprovalStatus.Approved)
                return false;

            return service.ServiceType == ServiceType.Homestay || service.ServiceType == ServiceType.Tour;
        }

        public static void ValidateBundleComposition(IReadOnlyCollection<Service> services)
        {
            if (services.Count != 2)
                throw new BusinessException("Combo phai gom dung 2 dich vu: 1 homestay va 1 tour.");

            var homestayCount = services.Count(service => service.ServiceType == ServiceType.Homestay);
            var tourCount = services.Count(service => service.ServiceType == ServiceType.Tour);

            if (homestayCount != 1 || tourCount != 1)
                throw new BusinessException("Combo chi ho tro dung 1 homestay va 1 tour.");
        }

        public static decimal GetServiceFromPrice(Service service)
        {
            if (service.ServiceType == ServiceType.Homestay)
            {
                var roomPrices = service.Homestay?.Rooms?
                    .Where(room => room.IsActive)
                    .Select(room => room.BasePrice)
                    .Where(price => price > 0)
                    .ToList();

                if (roomPrices != null && roomPrices.Count > 0)
                    return roomPrices.Min();
            }

            if (service.ServiceType == ServiceType.Tour)
            {
                var schedulePrices = service.Tours
                    .SelectMany(tour => tour.TourSchedules.Select(schedule =>
                        GetScheduleFromPrice(schedule, tour.TourPricingTiers, service.DiscountPrice ?? service.BasePrice)))
                    .Where(price => price > 0)
                    .ToList();

                if (schedulePrices.Count > 0)
                    return schedulePrices.Min();

                var tierPrices = service.Tours
                    .SelectMany(tour => tour.TourPricingTiers)
                    .Select(tier => tier.UnitPrice)
                    .Where(price => price > 0)
                    .ToList();

                if (tierPrices.Count > 0)
                    return tierPrices.Min();
            }

            return service.DiscountPrice ?? service.BasePrice;
        }

        public static decimal GetScheduleTierPrice(
            TourSchedule schedule,
            TourPricingTier tier,
            decimal fallbackBasePrice)
        {
            var customPrice = schedule.PricingOverrides
                .FirstOrDefault(item => item.TourPricingTierId == tier.Id)
                ?.CustomPrice;

            if (customPrice.HasValue && customPrice.Value > 0)
                return customPrice.Value;

            if (tier.UnitPrice > 0)
                return tier.UnitPrice;

            if (schedule.PriceOverride.HasValue && schedule.PriceOverride.Value > 0)
                return schedule.PriceOverride.Value;

            return fallbackBasePrice;
        }

        public static decimal GetScheduleFromPrice(
            TourSchedule schedule,
            IEnumerable<TourPricingTier> tiers,
            decimal fallbackBasePrice)
        {
            var prices = tiers
                .Select(tier => GetScheduleTierPrice(schedule, tier, fallbackBasePrice))
                .Where(price => price > 0)
                .ToList();

            if (prices.Count > 0)
                return prices.Min();

            if (schedule.PriceOverride.HasValue && schedule.PriceOverride.Value > 0)
                return schedule.PriceOverride.Value;

            return fallbackBasePrice;
        }

        public static int GetScheduleRemainingCapacity(TourSchedule schedule)
        {
            var totalSlots = Math.Max(1, schedule.RunCount) * Math.Max(0, schedule.AvailableSlots);
            return Math.Max(0, totalSlots - Math.Max(0, schedule.BookedSlots));
        }

        public static decimal CalculateDiscountAmount(
            ComboDiscountType discountType,
            decimal discountValue,
            decimal subtotal)
        {
            if (subtotal <= 0 || discountValue <= 0)
                return 0;

            if (discountType == ComboDiscountType.Percentage)
            {
                var percent = Math.Min(discountValue, 100);
                return Math.Round(subtotal * percent / 100m, 2, MidpointRounding.AwayFromZero);
            }

            return Math.Min(discountValue, subtotal);
        }

        public static decimal CalculateDiscountedTotal(
            ComboDiscountType discountType,
            decimal discountValue,
            decimal subtotal)
        {
            var discountAmount = CalculateDiscountAmount(discountType, discountValue, subtotal);
            return Math.Max(0, subtotal - discountAmount);
        }

        public static decimal GetDiscountPercent(decimal originalPrice, decimal discountedPrice)
        {
            if (originalPrice <= 0 || discountedPrice >= originalPrice)
                return 0;

            return Math.Round((1 - discountedPrice / originalPrice) * 100, 0, MidpointRounding.AwayFromZero);
        }
    }
}
