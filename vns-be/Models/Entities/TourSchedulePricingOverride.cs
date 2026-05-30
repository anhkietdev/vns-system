using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("TourSchedulePricingOverrides")]
    public class TourSchedulePricingOverride
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourScheduleId { get; set; }

        [Required]
        public Guid TourPricingTierId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal CustomPrice { get; set; }

        [ForeignKey("TourScheduleId")]
        public virtual TourSchedule TourSchedule { get; set; } = null!;

        [ForeignKey("TourPricingTierId")]
        public virtual TourPricingTier TourPricingTier { get; set; } = null!;
    }
}
