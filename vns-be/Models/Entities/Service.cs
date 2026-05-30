using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("Services")]
    public class Service
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid PartnerId { get; set; }

        [Required]
        public Guid DestinationId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(5000)]
        public string? Description { get; set; }

        [Required]
        public ServiceType ServiceType { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        public double? Latitude { get; set; }

        public double? Longitude { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? DiscountPrice { get; set; }

        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        [Required]
        public ServiceApprovalStatus ApprovalStatus { get; set; } = ServiceApprovalStatus.Pending;

        public bool IsActive { get; set; } = true;

        public double AverageRating { get; set; } = 0;

        public int TotalReviews { get; set; } = 0;

        public int TotalBookings { get; set; } = 0;

        [Required]
        public CancellationPolicyType CancellationPolicyType { get; set; } = CancellationPolicyType.Moderate;

        [MaxLength(1000)]
        public string? CancellationPolicyDescription { get; set; }

        [MaxLength(2000)]
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("PartnerId")]
        public virtual Partner Partner { get; set; } = null!;

        [ForeignKey("DestinationId")]
        public virtual Destination Destination { get; set; } = null!;

        public virtual ICollection<ServiceImage> ServiceImages { get; set; } = new List<ServiceImage>();
        public virtual ICollection<Tour> Tours { get; set; } = new List<Tour>();
        public virtual Homestay? Homestay { get; set; }
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();
        public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public virtual ICollection<ServiceChangeRequest> ChangeRequests { get; set; } = new List<ServiceChangeRequest>();
    }
}
