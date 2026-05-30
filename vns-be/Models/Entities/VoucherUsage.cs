using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("VoucherUsages")]
    public class VoucherUsage
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid VoucherId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; }

        public DateTime UsedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("VoucherId")]
        public virtual Voucher Voucher { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;
    }
}
