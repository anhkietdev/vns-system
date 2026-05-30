using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Recommendation
{
    public class RecommendedServiceDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public string? ThumbnailUrl { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalBookings { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public string PartnerName { get; set; } = string.Empty;
        public double RecommendationScore { get; set; }
        public string RecommendationReason { get; set; } = string.Empty;
    }

    public class RecommendedDestinationDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public int ServiceCount { get; set; }
        public string RecommendationReason { get; set; } = string.Empty;
    }
}
