using Microsoft.AspNetCore.Http;

namespace VNS.API.Models.DTOs.Review
{
    public class CreateReviewDto
    {
        public Guid BookingId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public List<IFormFile>? Images { get; set; }
    }

    public class CreateReviewJsonDto
    {
        public Guid BookingId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public class ReviewListDto
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatarUrl { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string? PartnerResponse { get; set; }
        public DateTime? PartnerRespondedAt { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public bool IsVisible { get; set; }
        public string AdminStatus { get; set; } = "new";
    }
}
