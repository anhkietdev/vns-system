using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("TourPricingTiers")]
    public class TourPricingTier
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        public int MinQuantity { get; set; } = 1;

        public int MaxQuantity { get; set; } = 1;

        public int DisplayOrder { get; set; }

        [ForeignKey("TourId")]
        public virtual Tour Tour { get; set; } = null!;

        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<TourSchedulePricingOverride> SchedulePricingOverrides { get; set; } = new List<TourSchedulePricingOverride>();
    }
}
