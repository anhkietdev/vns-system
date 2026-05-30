using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("ComboBookingItems")]
    public class ComboBookingItem
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        public Guid ComboId { get; set; }

        public Guid? ComboItemId { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        public Guid? RoomId { get; set; }

        public Guid? TourScheduleId { get; set; }

        public Guid? TourScheduleRunId { get; set; }

        public Guid? TourPricingTierId { get; set; }

        public DateTime? CheckInDate { get; set; }

        public DateTime? CheckOutDate { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public int Quantity { get; set; } = 1;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("ComboId")]
        public virtual Combo Combo { get; set; } = null!;

        [ForeignKey("ComboItemId")]
        public virtual ComboItem? ComboItem { get; set; }

        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;

        [ForeignKey("RoomId")]
        public virtual Room? Room { get; set; }

        [ForeignKey("TourScheduleId")]
        public virtual TourSchedule? TourSchedule { get; set; }

        [ForeignKey("TourScheduleRunId")]
        public virtual TourScheduleRun? TourScheduleRun { get; set; }

        [ForeignKey("TourPricingTierId")]
        public virtual TourPricingTier? TourPricingTier { get; set; }
    }
}
