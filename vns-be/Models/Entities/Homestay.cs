using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VNS.API.Models.Entities
{
    [Table("Homestays")]
    public class Homestay
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        [Required]
        public TimeSpan CheckInTime { get; set; }

        [Required]
        public TimeSpan CheckOutTime { get; set; }

        public int MinNights { get; set; } = 1;

        public int MaxNights { get; set; } = 30;

        public DateTime? AvailableFrom { get; set; }

        public DateTime? AvailableTo { get; set; }

        // Navigation properties
        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;

        public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
        public virtual ICollection<HomestayAmenity> HomestayAmenities { get; set; } = new List<HomestayAmenity>();
    }
}
