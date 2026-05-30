using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VNS.API.Models.Enums;

namespace VNS.API.Models.Entities
{
    [Table("BookingComponents")]
    public class BookingComponent
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        public Guid ServiceId { get; set; }

        public Guid? ComboItemId { get; set; }

        [Required]
        public BookingComponentType ComponentType { get; set; } = BookingComponentType.Primary;

        [Required]
        public ServiceType ServiceType { get; set; }

        [MaxLength(300)]
        public string ServiceNameSnapshot { get; set; } = string.Empty;

        public Guid? RoomId { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourScheduleRunId { get; set; }
        public Guid? TourPricingTierId { get; set; }

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public int Quantity { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }

        [Required]
        public CancellationPolicyType CancellationPolicyTypeSnapshot { get; set; }

        [MaxLength(1000)]
        public string? CancellationPolicyDescriptionSnapshot { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("ServiceId")]
        public virtual Service Service { get; set; } = null!;

        [ForeignKey("ComboItemId")]
        public virtual ComboItem? ComboItem { get; set; }

        public virtual ICollection<InventoryReservation> InventoryReservations { get; set; } = new List<InventoryReservation>();
    }

    [Table("InventoryReservations")]
    public class InventoryReservation
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        public Guid BookingComponentId { get; set; }

        [Required]
        public InventoryReservationType ReservationType { get; set; }

        [Required]
        public InventoryReservationStatus Status { get; set; } = InventoryReservationStatus.Active;

        public Guid? RoomId { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourScheduleRunId { get; set; }

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public int Quantity { get; set; } = 1;

        public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReleasedAt { get; set; }

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("BookingComponentId")]
        public virtual BookingComponent BookingComponent { get; set; } = null!;
    }

    [Table("PaymentOrders")]
    public class PaymentOrder
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public PaymentOrderStatus Status { get; set; } = PaymentOrderStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        public virtual ICollection<PaymentAttempt> Attempts { get; set; } = new List<PaymentAttempt>();
    }

    [Table("PaymentAttempts")]
    public class PaymentAttempt
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid PaymentOrderId { get; set; }

        [Required]
        public PaymentMethod PaymentMethod { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal WalletAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal VnPayAmount { get; set; }

        [Required]
        public PaymentAttemptStatus Status { get; set; } = PaymentAttemptStatus.Pending;

        [MaxLength(100)]
        public string? ExternalTransactionId { get; set; }

        [MaxLength(10)]
        public string? GatewayResponseCode { get; set; }

        [MaxLength(200)]
        public string? IdempotencyToken { get; set; }

        [MaxLength(4000)]
        public string? CallbackPayload { get; set; }

        [MaxLength(1000)]
        public string? FailureReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        [ForeignKey("PaymentOrderId")]
        public virtual PaymentOrder PaymentOrder { get; set; } = null!;
    }

    [Table("RefundCases")]
    public class RefundCase
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RequestedAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? ApprovedAmount { get; set; }

        [Required]
        public RefundCaseStatus Status { get; set; } = RefundCaseStatus.Pending;

        [MaxLength(2000)]
        public string? DecisionNote { get; set; }

        public Guid? DecidedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DecidedAt { get; set; }

        [ForeignKey("BookingId")]
        public virtual Booking Booking { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        public virtual ICollection<RefundExecution> Executions { get; set; } = new List<RefundExecution>();
    }

    [Table("RefundExecutions")]
    public class RefundExecution
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid RefundCaseId { get; set; }

        [Required]
        public RefundDestination Destination { get; set; } = RefundDestination.Wallet;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public RefundExecutionStatus Status { get; set; } = RefundExecutionStatus.Pending;

        [MaxLength(100)]
        public string? ExternalReference { get; set; }

        [MaxLength(1000)]
        public string? FailureReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }

        [ForeignKey("RefundCaseId")]
        public virtual RefundCase RefundCase { get; set; } = null!;
    }

    [Table("SettlementEntries")]
    public class SettlementEntry
    {
        [Key]
        public Guid Id { get; set; }

        public Guid? BookingId { get; set; }
        public Guid? PartnerId { get; set; }
        public Guid? PaymentOrderId { get; set; }
        public Guid? RefundCaseId { get; set; }
        public Guid? PartnerPayoutId { get; set; }

        [Required]
        public SettlementEntryType EntryType { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal GrossAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PartnerDelta { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PlatformDelta { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("BookingId")]
        public virtual Booking? Booking { get; set; }

        [ForeignKey("PartnerId")]
        public virtual Partner? Partner { get; set; }

        [ForeignKey("PaymentOrderId")]
        public virtual PaymentOrder? PaymentOrder { get; set; }

        [ForeignKey("RefundCaseId")]
        public virtual RefundCase? RefundCase { get; set; }

        [ForeignKey("PartnerPayoutId")]
        public virtual PartnerPayout? PartnerPayout { get; set; }
    }
}
