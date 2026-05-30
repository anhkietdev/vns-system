using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("HomestayAmenities")]
    public class HomestayAmenity
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid HomestayId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Icon { get; set; }

        // Navigation properties
        [ForeignKey("HomestayId")]
        public virtual Homestay Homestay { get; set; } = null!;
    }
}
