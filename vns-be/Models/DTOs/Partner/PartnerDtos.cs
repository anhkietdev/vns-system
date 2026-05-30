using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Partner
{
    public class PartnerProfileDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessLicense { get; set; }
        public string? TaxCode { get; set; }
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string? LogoUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public PartnerVerificationStatus VerificationStatus { get; set; }
        public string? VerificationNote { get; set; }
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankAccountName { get; set; }
        public decimal CommissionRate { get; set; }
        public int TotalServices { get; set; }
        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdatePartnerProfileDto
    {
        public string? FullName { get; set; }
        public string? BusinessName { get; set; }
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankAccountName { get; set; }
    }

    public class UploadDocumentDto
    {
        public string DocumentType { get; set; } = string.Empty;
        public IFormFile File { get; set; } = null!;
    }

    public class PartnerDocumentListDto
    {
        public Guid Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class PartnerDashboardDto
    {
        public decimal CapturedGross { get; set; }
        public decimal CommissionNet { get; set; }
        public decimal ReleasedNet { get; set; }
        public decimal LedgerBalance { get; set; }
        public decimal PaidOut { get; set; }
        public decimal AvailableToWithdraw { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal MonthlyReleasedNet { get; set; }
        public decimal MonthlyGrowth { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public decimal TotalCommission { get; set; }
        public decimal PendingPayout { get; set; }
        public decimal TotalPaidOut { get; set; }
        public decimal AvailableBalance { get; set; }
        public int TotalBookings { get; set; }
        public int PendingBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public int TotalServices { get; set; }
        public int ActiveServices { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public List<PartnerRevenueChartItemDto> RevenueChart { get; set; } = new();
    }

    public class PartnerRevenueChartItemDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class PartnerBookingFilterDto
    {
        public BookingStatus? Status { get; set; }
        public BookingCommercialStatus? CommercialStatus { get; set; }
        public List<BookingCommercialStatus>? CommercialStatuses { get; set; }
        public List<BookingCommercialStatus>? ExcludedCommercialStatuses { get; set; }
        public BookingFulfillmentStatus? FulfillmentStatus { get; set; }
        public List<BookingFulfillmentStatus>? FulfillmentStatuses { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Keyword { get; set; }
        public Guid? ServiceId { get; set; }
        public int? ServiceType { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PartnerPayoutListDto
    {
        public Guid Id { get; set; }
        public decimal RequestedAmount { get; set; }
        public decimal LedgerAmount { get; set; }
        public PayoutStatus Status { get; set; }
        public DateTime RequestedAt { get; set; }
        public Guid? ProcessedBy { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? BankName { get; set; }
        public string? BankAccount { get; set; }
        public string? Note { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class PartnerFinanceActivityDto
    {
        public Guid Id { get; set; }
        public string ActivityType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? BookingId { get; set; }
        public string? BookingCode { get; set; }
        public string? CustomerName { get; set; }
        public string? ServiceName { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal PartnerDelta { get; set; }
        public decimal CommissionDelta { get; set; }
        public string? Description { get; set; }
        public string? TransactionReference { get; set; }
        public DateTime OccurredAt { get; set; }
    }

    public class PartnerTransactionFilterDto
    {
        public FinanceActivityType? ActivityType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PartnerServiceFilterDto
    {
        public string? Keyword { get; set; }
        public ServiceType? ServiceType { get; set; }
        public ServiceApprovalStatus? ApprovalStatus { get; set; }
        public bool? IsActive { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PartnerReviewListDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public string? PartnerResponse { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PartnerReviewFilterDto
    {
        public Guid? ServiceId { get; set; }
        public int? MinRating { get; set; }
        public int? MaxRating { get; set; }
        public bool? HasResponse { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class ReviewResponseDto
    {
        public string Response { get; set; } = string.Empty;
    }

    public class CancelPartnerBookingDto
    {
        public string? Reason { get; set; }
    }

    public class RequestPayoutDto
    {
        public decimal Amount { get; set; }
        public string? BankAccount { get; set; }
        public string? BankName { get; set; }
        public string? Note { get; set; }
    }
}
