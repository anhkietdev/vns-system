using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("TourItineraries")]
    public class TourItinerary
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourId { get; set; }

        [Required]
        public int DayNumber { get; set; }

        public int DisplayOrder { get; set; }

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        public TimeSpan? StartTime { get; set; }

        public TimeSpan? EndTime { get; set; }

        [MaxLength(300)]
        public string? Location { get; set; }

        [MaxLength(50)]
        public string? ActivityType { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        // Navigation properties
        [ForeignKey("TourId")]
        public virtual Tour Tour { get; set; } = null!;
    }
}
