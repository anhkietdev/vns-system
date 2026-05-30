using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("TourImages")]
    public class TourImage
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid TourId { get; set; }

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }

        public bool IsCover { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("TourId")]
        public virtual Tour Tour { get; set; } = null!;
    }
}
