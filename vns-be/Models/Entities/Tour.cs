using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("Tours")]
    public class Tour
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Duration { get; set; } = string.Empty;

        public int MaxParticipants { get; set; }

        public int MinParticipants { get; set; }

        public int BookingCutoffHours { get; set; } = 24;

        [MaxLength(500)]
        public string? MeetingPoint { get; set; }

        [MaxLength(4000)]
        public string? IncludedItemsText { get; set; }

        [MaxLength(4000)]
        public string? ExcludedItemsText { get; set; }

        [Required]
        public CancellationPolicyType CancellationPolicyType { get; set; } = CancellationPolicyType.Moderate;

        [MaxLength(1000)]
        public string? CancellationPolicyDescription { get; set; }

        public int DisplayOrder { get; set; }

        // Navigation properties
        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;

        public virtual ICollection<TourSchedule> TourSchedules { get; set; } = new List<TourSchedule>();
        public virtual ICollection<TourItinerary> TourItineraries { get; set; } = new List<TourItinerary>();
        public virtual ICollection<TourImage> TourImages { get; set; } = new List<TourImage>();
        public virtual ICollection<TourPricingTier> TourPricingTiers { get; set; } = new List<TourPricingTier>();
    }
}
