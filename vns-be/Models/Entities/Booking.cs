using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("Bookings")]
    public class Booking
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(30)]
        public string BookingCode { get; set; } = string.Empty;

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        [Required]
        public Guid PartnerId { get; set; }

        [Required]
        public BookingStatus Status { get; set; } = BookingStatus.Pending;

        [Required]
        public BookingCommercialStatus CommercialStatus { get; set; } = BookingCommercialStatus.PendingPayment;

        [Required]
        public BookingFulfillmentStatus FulfillmentStatus { get; set; } = BookingFulfillmentStatus.AwaitingPartner;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; } = 0;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal FinalAmount { get; set; }

        public Guid? VoucherId { get; set; }

        public Guid? ComboId { get; set; }

        [MaxLength(300)]
        public string? ComboName { get; set; }

        [MaxLength(100)]
        public string? IdempotencyKey { get; set; }

        public int NumberOfGuests { get; set; }

        [MaxLength(1000)]
        public string? SpecialRequests { get; set; }

        [Required]
        [MaxLength(150)]
        public string ContactName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string ContactPhone { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string ContactEmail { get; set; } = string.Empty;

        public DateTime? CheckInDate { get; set; }

        public DateTime? CheckOutDate { get; set; }

        [Required]
        public DateTime BookingDate { get; set; } = DateTime.UtcNow;

        public DateTime? ConfirmedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime? CancelledAt { get; set; }

        [MaxLength(1000)]
        public string? CancellationReason { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;

        [ForeignKey("PartnerId")]
        public virtual Partner Partner { get; set; } = null!;

        [ForeignKey("VoucherId")]
        public virtual Voucher? Voucher { get; set; }

        [ForeignKey("ComboId")]
        public virtual Combo? Combo { get; set; }

        public virtual Payment? Payment { get; set; }
        public virtual PaymentOrder? PaymentOrder { get; set; }
        public virtual Review? Review { get; set; }
        public virtual RefundRequest? RefundRequest { get; set; }
        public virtual ICollection<RefundCase> RefundCases { get; set; } = new List<RefundCase>();
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<BookingComponent> BookingComponents { get; set; } = new List<BookingComponent>();
        public virtual ICollection<InventoryReservation> InventoryReservations { get; set; } = new List<InventoryReservation>();
        public virtual ICollection<ComboBookingItem> ComboBookingItems { get; set; } = new List<ComboBookingItem>();
        public virtual ICollection<SettlementEntry> SettlementEntries { get; set; } = new List<SettlementEntry>();
        public virtual ICollection<WalletTransaction> WalletTransactions { get; set; } = new List<WalletTransaction>();
        public virtual ICollection<VoucherUsage> VoucherUsages { get; set; } = new List<VoucherUsage>();
    }
}
