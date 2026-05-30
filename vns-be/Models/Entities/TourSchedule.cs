using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("TourSchedules")]
    public class TourSchedule
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourId { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public int RunCount { get; set; } = 1;

        public int AvailableSlots { get; set; }

        public int BookedSlots { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PriceOverride { get; set; }

        [Required]
        public TourScheduleStatus Status { get; set; } = TourScheduleStatus.Active;

        // Navigation properties
        [ForeignKey("TourId")]
        public virtual Tour Tour { get; set; } = null!;

        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<TourSchedulePricingOverride> PricingOverrides { get; set; } = new List<TourSchedulePricingOverride>();
        public virtual ICollection<TourScheduleRun> ScheduleRuns { get; set; } = new List<TourScheduleRun>();
    }
}
