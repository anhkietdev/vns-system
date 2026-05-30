using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("ServiceChangeRequests")]
    public class ServiceChangeRequest
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        [Required]
        [Column(TypeName = "nvarchar(max)")]
        public string ProposedJson { get; set; } = string.Empty;

        [Required]
        public ServiceApprovalStatus Status { get; set; } = ServiceApprovalStatus.Pending;

        [MaxLength(2000)]
        public string? RejectionReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        public Guid? ReviewedBy { get; set; }

        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;
    }
}
