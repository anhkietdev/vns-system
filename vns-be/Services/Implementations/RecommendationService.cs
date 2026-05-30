using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Models.DTOs.Recommendation;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class RecommendationService : IRecommendationService
    {
        private readonly VNSDbContext _context;

        public RecommendationService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetPersonalizedRecommendationsAsync(Guid userId, int count = 10)
        {
            // Lấy lịch sử đặt dịch vụ của người dùng
            var userBookings = await _context.Bookings
                .Include(b => b.Service)
                .Where(b => b.UserId == userId && b.Status != BookingStatus.Cancelled)
                .ToListAsync();

            // Lấy danh sách yêu thích
            var userFavorites = await _context.Favorites
                .Include(f => f.Service)
                .Where(f => f.UserId == userId)
                .ToListAsync();

            // Lấy các review của người dùng
            var userReviews = await _context.Reviews
                .Where(r => r.UserId == userId)
                .ToListAsync();

            // Phân tích sở thích: loại dịch vụ ưa thích
            var preferredServiceTypes = userBookings
                .GroupBy(b => b.Service.ServiceType)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .ToList();

            // Phân tích sở thích: điểm đến ưa thích
            var preferredDestinationIds = userBookings
                .Select(b => b.Service.DestinationId)
                .Concat(userFavorites.Select(f => f.Service.DestinationId))
                .Distinct()
                .ToList();

            // Khoảng giá trung bình người dùng thường đặt
            var avgPrice = userBookings.Any()
                ? userBookings.Average(b => (double)(b.Service.DiscountPrice ?? b.Service.BasePrice))
                : 0;
            var priceRange = avgPrice > 0 ? avgPrice * 0.5 : 0;

            // Lấy ID các dịch vụ đã đặt
            var bookedServiceIds = userBookings.Select(b => b.ServiceId).Distinct().ToHashSet();

            // Lấy tất cả dịch vụ đang hoạt động
            var allServices = await _context.Services
                .Include(s => s.Partner)
                .Include(s => s.Destination)
                .Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved)
                .ToListAsync();

            // Tính điểm gợi ý cho từng dịch vụ
            var scoredServices = allServices.Select(s =>
            {
                double score = 0;
                var reasons = new List<string>();

                // +3 nếu cùng loại dịch vụ ưa thích
                if (preferredServiceTypes.Contains(s.ServiceType))
                {
                    score += 3;
                    reasons.Add("Phù hợp với sở thích của bạn");
                }

                // +2 nếu cùng điểm đến đã từng đặt hoặc yêu thích
                if (preferredDestinationIds.Contains(s.DestinationId))
                {
                    score += 2;
                    reasons.Add("Gần điểm đến bạn yêu thích");
                }

                // +1 nếu dịch vụ phổ biến (rating cao, nhiều lượt đặt)
                if (s.AverageRating >= 4.0 && s.TotalBookings >= 5)
                {
                    score += 1;
                    reasons.Add("Được đánh giá cao");
                }

                // +1 nếu giá nằm trong khoảng ưa thích
                if (avgPrice > 0)
                {
                    var servicePrice = (double)(s.DiscountPrice ?? s.BasePrice);
                    if (Math.Abs(servicePrice - avgPrice) <= priceRange)
                    {
                        score += 1;
                        reasons.Add("Phù hợp ngân sách của bạn");
                    }
                }

                // +0.5 nếu có giảm giá
                if (s.DiscountPrice.HasValue && s.DiscountPrice < s.BasePrice)
                {
                    score += 0.5;
                    reasons.Add("Đang có ưu đãi");
                }

                // -1 nếu đã đặt rồi
                if (bookedServiceIds.Contains(s.Id))
                {
                    score -= 1;
                }

                // Bonus theo rating
                score += s.AverageRating * 0.1;

                var reason = reasons.Any()
                    ? reasons.First()
                    : "Gợi ý cho bạn";

                return new RecommendedServiceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    ServiceType = s.ServiceType,
                    ThumbnailUrl = s.ThumbnailUrl,
                    BasePrice = s.BasePrice,
                    DiscountPrice = s.DiscountPrice,
                    AverageRating = s.AverageRating,
                    TotalReviews = s.TotalReviews,
                    TotalBookings = s.TotalBookings,
                    DestinationName = s.Destination.Name,
                    PartnerName = s.Partner.BusinessName,
                    RecommendationScore = Math.Round(score, 2),
                    RecommendationReason = reason
                };
            })
            .OrderByDescending(s => s.RecommendationScore)
            .Take(count)
            .ToList();

            return scoredServices;
        }

        public async Task<object> GetTrendingServicesAsync(int count = 10)
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            // Đếm số lượt đặt trong 30 ngày gần nhất cho từng dịch vụ
            var recentBookingCounts = await _context.Bookings
                .Where(b => b.BookingDate >= thirtyDaysAgo && b.Status != BookingStatus.Cancelled)
                .GroupBy(b => b.ServiceId)
                .Select(g => new { ServiceId = g.Key, BookingCount = g.Count() })
                .ToDictionaryAsync(x => x.ServiceId, x => x.BookingCount);

            var services = await _context.Services
                .Include(s => s.Partner)
                .Include(s => s.Destination)
                .Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved)
                .ToListAsync();

            var trendingServices = services.Select(s =>
            {
                var recentBookings = recentBookingCounts.GetValueOrDefault(s.Id, 0);
                // Điểm trending: kết hợp lượt đặt gần đây và rating
                var trendScore = recentBookings * 2.0 + s.AverageRating * 1.5 + s.TotalBookings * 0.1;

                string reason;
                if (recentBookings >= 10)
                    reason = $"Rất hot - {recentBookings} lượt đặt trong tháng";
                else if (recentBookings >= 5)
                    reason = $"Đang thịnh hành - {recentBookings} lượt đặt gần đây";
                else if (s.AverageRating >= 4.5)
                    reason = "Được yêu thích nhất";
                else
                    reason = "Đang thịnh hành";

                return new RecommendedServiceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    ServiceType = s.ServiceType,
                    ThumbnailUrl = s.ThumbnailUrl,
                    BasePrice = s.BasePrice,
                    DiscountPrice = s.DiscountPrice,
                    AverageRating = s.AverageRating,
                    TotalReviews = s.TotalReviews,
                    TotalBookings = s.TotalBookings,
                    DestinationName = s.Destination.Name,
                    PartnerName = s.Partner.BusinessName,
                    RecommendationScore = Math.Round(trendScore, 2),
                    RecommendationReason = reason
                };
            })
            .OrderByDescending(s => s.RecommendationScore)
            .Take(count)
            .ToList();

            return trendingServices;
        }

        public async Task<object> GetSimilarServicesAsync(Guid serviceId, int count = 5)
        {
            var targetService = await _context.Services
                .FirstOrDefaultAsync(s => s.Id == serviceId);

            if (targetService == null)
                throw new Exception("Không tìm thấy dịch vụ");

            var targetPrice = (double)(targetService.DiscountPrice ?? targetService.BasePrice);
            var priceRange = targetPrice * 0.4; // 40% khoảng giá

            var similarServices = await _context.Services
                .Include(s => s.Partner)
                .Include(s => s.Destination)
                .Where(s => s.Id != serviceId
                    && s.IsActive
                    && s.ApprovalStatus == ServiceApprovalStatus.Approved)
                .ToListAsync();

            var scored = similarServices.Select(s =>
            {
                double score = 0;
                var reasons = new List<string>();

                // +3 nếu cùng loại dịch vụ
                if (s.ServiceType == targetService.ServiceType)
                {
                    score += 3;
                    reasons.Add("Cùng loại dịch vụ");
                }

                // +2 nếu cùng điểm đến
                if (s.DestinationId == targetService.DestinationId)
                {
                    score += 2;
                    reasons.Add("Cùng điểm đến");
                }

                // +1 nếu khoảng giá tương đương
                var servicePrice = (double)(s.DiscountPrice ?? s.BasePrice);
                if (Math.Abs(servicePrice - targetPrice) <= priceRange)
                {
                    score += 1;
                    reasons.Add("Mức giá tương tự");
                }

                // Bonus theo rating
                score += s.AverageRating * 0.2;

                var reason = reasons.Any()
                    ? "Tương tự dịch vụ bạn đã xem"
                    : "Gợi ý cho bạn";

                return new RecommendedServiceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    ServiceType = s.ServiceType,
                    ThumbnailUrl = s.ThumbnailUrl,
                    BasePrice = s.BasePrice,
                    DiscountPrice = s.DiscountPrice,
                    AverageRating = s.AverageRating,
                    TotalReviews = s.TotalReviews,
                    TotalBookings = s.TotalBookings,
                    DestinationName = s.Destination.Name,
                    PartnerName = s.Partner.BusinessName,
                    RecommendationScore = Math.Round(score, 2),
                    RecommendationReason = reason
                };
            })
            .Where(s => s.RecommendationScore > 0)
            .OrderByDescending(s => s.RecommendationScore)
            .Take(count)
            .ToList();

            return scored;
        }

        public async Task<object> GetRecommendedDestinationsAsync(Guid? userId, int count = 5)
        {
            var visitedDestinationIds = new HashSet<Guid>();

            if (userId.HasValue)
            {
                // Lấy các điểm đến người dùng đã từng đặt
                visitedDestinationIds = (await _context.Bookings
                    .Include(b => b.Service)
                    .Where(b => b.UserId == userId.Value && b.Status != BookingStatus.Cancelled)
                    .Select(b => b.Service.DestinationId)
                    .Distinct()
                    .ToListAsync())
                    .ToHashSet();
            }

            var destinations = await _context.Destinations
                .Include(d => d.Services.Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved))
                .ToListAsync();

            var recommended = destinations.Select(d =>
            {
                var activeServiceCount = d.Services.Count;
                double score = 0;
                string reason;

                if (userId.HasValue && visitedDestinationIds.Contains(d.Id))
                {
                    // Đã từng đến, giảm điểm nhưng vẫn hiển thị
                    score = activeServiceCount * 0.5 + (d.IsPopular ? 1 : 0);
                    reason = "Bạn đã từng ghé thăm";
                }
                else if (d.IsPopular)
                {
                    score = activeServiceCount * 2.0 + 5;
                    reason = "Điểm đến phổ biến";
                }
                else if (activeServiceCount >= 3)
                {
                    score = activeServiceCount * 1.5 + 2;
                    reason = "Nhiều dịch vụ hấp dẫn";
                }
                else
                {
                    score = activeServiceCount + 1;
                    reason = "Khám phá điểm đến mới";
                }

                return new RecommendedDestinationDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Province = d.Province,
                    ImageUrl = d.ImageUrl,
                    Description = d.Description,
                    ServiceCount = activeServiceCount,
                    RecommendationReason = reason
                };
            })
            .OrderByDescending(d => d.ServiceCount > 0 ? 1 : 0) // Ưu tiên điểm đến có dịch vụ
            .ThenByDescending(d =>
            {
                // Nếu có userId, ưu tiên điểm đến chưa ghé
                if (userId.HasValue && visitedDestinationIds.Contains(d.Id))
                    return 0;
                return 1;
            })
            .ThenByDescending(d => d.ServiceCount)
            .Take(count)
            .ToList();

            return recommended;
        }
    }
}
