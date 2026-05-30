using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Booking
{
    public class CreateBookingDto
    {
        public Guid? ServiceId { get; set; }
        public int NumberOfGuests { get; set; }
        public string ContactName { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string? SpecialRequests { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public string? VoucherCode { get; set; }
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.VNPay;
        public List<BookingDetailItemDto> Details { get; set; } = new();
        public string? IdempotencyKey { get; set; }
        public Guid? ComboId { get; set; }
        public string? ComboName { get; set; }
        public Guid? ComboQuoteId { get; set; }
        public List<ComboBookingSelectionDto> ComboSelections { get; set; } = new();
    }

    public class CreateComboQuoteDto
    {
        public Guid ComboId { get; set; }
        public int NumberOfGuests { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? RoomId { get; set; }
        public List<ComboQuoteTierSelectionDto> TierSelections { get; set; } = new();
    }

    public class ComboQuoteTierSelectionDto
    {
        public Guid TourPricingTierId { get; set; }
        public int Quantity { get; set; }
    }

    public class ComboBookingQuoteDto
    {
        public Guid QuoteId { get; set; }
        public Guid ComboId { get; set; }
        public string ComboName { get; set; } = string.Empty;
        public ComboDateDriver DateDriver { get; set; }
        public int NumberOfGuests { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public Guid? TourScheduleId { get; set; }
        public decimal OriginalAmount { get; set; }
        public decimal ComboDiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public DateTime ExpiresAt { get; set; }
        public List<ComboBookingQuoteItemDto> Items { get; set; } = new();
    }

    public class ComboBookingQuoteItemDto
    {
        public Guid ComboItemId { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public Guid? RoomId { get; set; }
        public string? RoomName { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourPricingTierId { get; set; }
        public string? TourPricingTierName { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class BookingDetailItemDto
    {
        public Guid? RoomId { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourPricingTierId { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class ComboBookingSelectionDto
    {
        public Guid? ComboItemId { get; set; }
        public Guid ServiceId { get; set; }
        public Guid? RoomId { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourPricingTierId { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class BookingListDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string BookingCode { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public string? ThumbnailUrl { get; set; }
        public BookingStatus Status { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
        public PaymentStatus? PaymentStatus { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal WalletAmount { get; set; }
        public decimal VnPayAmount { get; set; }
        public int NumberOfGuests { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime BookingDate { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public Guid? PartnerId { get; set; }
        public string? PartnerName { get; set; }
        public string? CustomerName { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public Guid? ComboId { get; set; }
        public string? ComboName { get; set; }
        public BookingCommercialStatus CommercialStatus { get; set; }
        public BookingFulfillmentStatus FulfillmentStatus { get; set; }
        public bool CanPay { get; set; }
        public bool CanCancel { get; set; }
        public bool CanRefund { get; set; }
        public bool CanPartnerConfirm { get; set; }
        public bool CanPartnerComplete { get; set; }
        public bool CanPartnerCancel { get; set; }
        public List<BookingOperationalSnapshotDto> OperationalSnapshots { get; set; } = new();
    }

    public class BookingOperationalSnapshotDto
    {
        public ServiceType ServiceType { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? PrimaryLabel { get; set; }
        public bool IsAttention { get; set; }
        public int? MinimumUnits { get; set; }
        public int? CurrentUnits { get; set; }
        public int? MaximumUnits { get; set; }
        public int? RemainingUnits { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
    }

    public class BookingDetailDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string BookingCode { get; set; } = string.Empty;
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? Address { get; set; }
        public BookingStatus Status { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public int NumberOfGuests { get; set; }
        public string ContactName { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string? SpecialRequests { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime BookingDate { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public Guid? PartnerId { get; set; }
        public string? PartnerName { get; set; }
        public string? CustomerName { get; set; }
        public string? VoucherCode { get; set; }
        public Guid? ComboId { get; set; }
        public string? ComboName { get; set; }
        public decimal? ComboOriginalAmount { get; set; }
        public decimal? ComboBundleDiscountAmount { get; set; }
        public BookingCommercialStatus CommercialStatus { get; set; }
        public BookingFulfillmentStatus FulfillmentStatus { get; set; }
        public bool CanPay { get; set; }
        public bool CanCancel { get; set; }
        public bool CanRefund { get; set; }
        public bool CanPartnerConfirm { get; set; }
        public bool CanPartnerComplete { get; set; }
        public bool CanPartnerCancel { get; set; }
        public decimal RefundEligibleAmount { get; set; }
        public string? RefundEligibilityMessage { get; set; }
        public List<RefundPreviewComponentDto> RefundComponents { get; set; } = new();
        public RefundSummaryDto? RefundSummary { get; set; }
        public PaymentInfoDto? Payment { get; set; }
        public List<PaymentInfoDto> Payments { get; set; } = new();
        public List<BookingDetailLineDto> Details { get; set; } = new();
        public List<ComboBookingItemDto> ComboItems { get; set; } = new();
    }

    public class PaymentInfoDto
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public decimal WalletAmount { get; set; }
        public decimal VnPayAmount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public PaymentStatus PaymentStatus { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class RefundSummaryDto
    {
        public Guid Id { get; set; }
        public RefundStatus Status { get; set; }
        public decimal RequestedAmount { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? AdminNote { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }

    public class RefundPreviewComponentDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public decimal BaseAmount { get; set; }
        public decimal RefundPercent { get; set; }
        public decimal RefundAmount { get; set; }
        public CancellationPolicyType PolicyType { get; set; }
        public DateTime? ReferenceDate { get; set; }
    }

    public class BookingDetailLineDto
    {
        public Guid Id { get; set; }
        public string? RoomName { get; set; }
        public string? TourPackageName { get; set; }
        public string? TourPricingTierName { get; set; }
        public Guid? TourScheduleRunId { get; set; }
        public string? TourScheduleRunInfo { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class ComboBookingItemDto
    {
        public Guid Id { get; set; }
        public Guid? ComboItemId { get; set; }
        public int DisplayOrder { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public ServiceType ServiceType { get; set; }
        public string? ThumbnailUrl { get; set; }
        public Guid? RoomId { get; set; }
        public string? RoomName { get; set; }
        public Guid? TourScheduleId { get; set; }
        public Guid? TourScheduleRunId { get; set; }
        public string? TourScheduleRunInfo { get; set; }
        public Guid? TourPricingTierId { get; set; }
        public string? TourPricingTierName { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class BookingFilterDto
    {
        public BookingStatus? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class CancelBookingDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}
