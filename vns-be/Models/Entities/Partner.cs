using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("Partners")]
    public class Partner
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(250)]
        public string BusinessName { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? BusinessLicense { get; set; }

        [MaxLength(50)]
        public string? TaxCode { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? BannerUrl { get; set; }

        [Required]
        public PartnerVerificationStatus VerificationStatus { get; set; } = PartnerVerificationStatus.Pending;

        [MaxLength(1000)]
        public string? VerificationNote { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal CommissionRate { get; set; } = 10.00m;

        public double Rating { get; set; } = 0;

        public int TotalReviews { get; set; } = 0;

        [MaxLength(200)]
        public string? BankName { get; set; }

        [MaxLength(50)]
        public string? BankAccountNumber { get; set; }

        [MaxLength(200)]
        public string? BankAccountName { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        public virtual Wallet? Wallet { get; set; }
        public virtual ICollection<Service> Services { get; set; } = new List<Service>();
        public virtual ICollection<PartnerDocument> PartnerDocuments { get; set; } = new List<PartnerDocument>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<ChatConversation> ChatConversations { get; set; } = new List<ChatConversation>();
        public virtual ICollection<PartnerPayout> Payouts { get; set; } = new List<PartnerPayout>();
    }
}
