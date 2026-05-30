using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("ComboBookingQuotes")]
    public class ComboBookingQuote
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ComboId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        public ComboDateDriver DateDriver { get; set; } = ComboDateDriver.Stay;

        public int NumberOfGuests { get; set; }

        public Guid? TourScheduleId { get; set; }

        public DateTime? CheckInDate { get; set; }

        public DateTime? CheckOutDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OriginalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ComboDiscountAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal FinalAmount { get; set; }

        [Required]
        [Column(TypeName = "nvarchar(max)")]
        public string ResolvedSelectionsJson { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiresAt { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ComboId")]
        public virtual Combo Combo { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
    }
}
