using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("ReviewImages")]
    public class ReviewImage
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ReviewId { get; set; }

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("ReviewId")]
        public virtual Review Review { get; set; } = null!;
    }
}
