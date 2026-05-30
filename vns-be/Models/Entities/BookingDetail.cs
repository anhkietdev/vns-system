using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("BookingDetails")]
    public class BookingDetail
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        public Guid? RoomId { get; set; }

        public Guid? TourScheduleId { get; set; }

        public Guid? TourScheduleRunId { get; set; }

        public Guid? TourPricingTierId { get; set; }

        public int Quantity { get; set; } = 1;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }

        // Navigation properties
        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

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
