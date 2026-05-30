using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("TourScheduleRuns")]
    public class TourScheduleRun
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourScheduleId { get; set; }

        public int RunIndex { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public int MaxParticipants { get; set; }

        public int BookedSlots { get; set; } = 0;

        [Required]
        public TourScheduleStatus Status { get; set; } = TourScheduleStatus.Active;

        [ForeignKey("TourScheduleId")]
        public virtual TourSchedule TourSchedule { get; set; } = null!;

        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<ComboBookingItem> ComboBookingItems { get; set; } = new List<ComboBookingItem>();
    }
}
