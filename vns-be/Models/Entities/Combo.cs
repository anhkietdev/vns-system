using System.ComponentModel.DataAnnotations;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    public class Combo
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid PartnerId { get; set; }

        [Required, MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        public decimal OriginalPrice { get; set; } // Tổng giá gốc các services
        public decimal ComboPrice { get; set; }    // Giá combo (giảm)

        [Required]
        public ComboDiscountType DiscountType { get; set; } = ComboDiscountType.Percentage;

        public decimal DiscountValue { get; set; }

        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        public ComboDateDriver DateDriver { get; set; } = ComboDateDriver.Stay;

        public int StayOffsetBeforeDays { get; set; }

        public int StayOffsetAfterDays { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public virtual Partner Partner { get; set; } = null!;
        public virtual ICollection<ComboItem> ComboItems { get; set; } = new List<ComboItem>();
        public virtual ICollection<ComboBookingItem> ComboBookingItems { get; set; } = new List<ComboBookingItem>();
    }

    public class ComboItem
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ComboId { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        public int DisplayOrder { get; set; }
        // Deprecated combo-itinerary fields. Kept temporarily for compatibility with old records.
        public int StartDayOffset { get; set; }
        public int DurationDays { get; set; } = 1;

        [MaxLength(500)]
        public string? UsageNotes { get; set; }

        public Guid? PreferredRoomId { get; set; }

        public Guid? PreferredTourPricingTierId { get; set; }

        // Navigation
        public virtual Combo Combo { get; set; } = null!;
        public virtual Service Service { get; set; } = null!;
        public virtual ICollection<ComboBookingItem> ComboBookingItems { get; set; } = new List<ComboBookingItem>();
    }
}
