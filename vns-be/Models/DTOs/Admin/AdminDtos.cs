using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Admin
{
    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int TotalPartners { get; set; }
        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public int PendingPartners { get; set; }
        public int PendingRefunds { get; set; }
        public int PendingServices { get; set; }
        public int ActiveServices { get; set; }
        public List<RevenueChartItemDto> RevenueChart { get; set; } = new();
        public List<BookingChartItemDto> BookingChart { get; set; } = new();
    }

    public class RevenueChartItemDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class BookingChartItemDto
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class UserListDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TotalBookings { get; set; }
        public int TotalServices { get; set; }
        public decimal TotalSpent { get; set; }
    }

    public class UserFilterDto
    {
        public string? Keyword { get; set; }
        public UserRole? Role { get; set; }
        public bool? IsActive { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? SortBy { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class UpdateUserStatusDto
    {
        public bool IsActive { get; set; }
        public string? Reason { get; set; }
    }

    public class UpdateUserRoleDto
    {
        public UserRole Role { get; set; }
    }

    public class PartnerVerificationDto
    {
        public bool IsApproved { get; set; }
        public string? Note { get; set; }
    }

    public class UpdateCommissionRateDto
    {
        public decimal CommissionRate { get; set; }
    }

    public class PartnerListItemDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public PartnerVerificationStatus VerificationStatus { get; set; }
        public decimal CommissionRate { get; set; }
        public int TotalServices { get; set; }
        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PartnerDetailAdminDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessLicense { get; set; }
        public string? TaxCode { get; set; }
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public PartnerVerificationStatus VerificationStatus { get; set; }
        public string? VerificationNote { get; set; }
        public decimal CommissionRate { get; set; }
        public int TotalServices { get; set; }
        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PartnerDocumentDto> Documents { get; set; } = new();
    }

    public class PartnerDocumentDto
    {
        public Guid Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    public class RevenueReportDto
    {
        public decimal CapturedGross { get; set; }
        public decimal RefundedGross { get; set; }
        public decimal NetCommission { get; set; }
        public decimal ReleasedPartnerEarnings { get; set; }
        public decimal PaidOutNet { get; set; }
        public decimal PendingPayouts { get; set; }
        public decimal CurrentPartnerPayable { get; set; }
        public decimal MonthlyGrowth { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCommission { get; set; }
        public decimal TotalPayout { get; set; }
        public decimal PlatformProfit { get; set; }
        public int TotalTransactions { get; set; }
        public List<RevenueChartItemDto> Chart { get; set; } = new();
    }

    public class RevenueFilterDto
    {
        public string Period { get; set; } = "monthly"; // daily, monthly, yearly
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class PayoutListItemDto
    {
        public Guid Id { get; set; }
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public decimal LedgerAmount { get; set; }
        public PayoutStatus Status { get; set; }
        public string? BankName { get; set; }
        public string? BankAccount { get; set; }
        public DateTime RequestedAt { get; set; }
        public Guid? ProcessedBy { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? Note { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class ProcessPayoutDto
    {
        public bool IsApproved { get; set; } = true;
        public string? Note { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class FinanceActivityListItemDto
    {
        public Guid Id { get; set; }
        public string ActivityType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? BookingId { get; set; }
        public string? BookingCode { get; set; }
        public Guid? PartnerId { get; set; }
        public string? PartnerName { get; set; }
        public Guid? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public Guid? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal PartnerDelta { get; set; }
        public decimal CommissionDelta { get; set; }
        public string? Description { get; set; }
        public string? TransactionReference { get; set; }
        public DateTime OccurredAt { get; set; }
    }

    public class TransactionFilterDto
    {
        public FinanceActivityType? ActivityType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class RefundListItemDto
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public string BookingCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public RefundStatus Status { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? AdminNote { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }

    public class RefundFilterDto
    {
        public RefundStatus? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class CreateVoucherDto
    {
        public string Code { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Description { get; set; }
        public VoucherType VoucherType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int TotalQuantity { get; set; }
        public int? UserUsageLimit { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public ServiceType? ApplicableServiceType { get; set; }
    }

    public class UpdateVoucherDto
    {
        public string? Code { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public VoucherType? VoucherType { get; set; }
        public decimal? DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? TotalQuantity { get; set; }
        public int? UserUsageLimit { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool? IsActive { get; set; }
        public ServiceType? ApplicableServiceType { get; set; }
    }

    public class VoucherListItemDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Description { get; set; }
        public VoucherType VoucherType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int TotalQuantity { get; set; }
        public int UsedQuantity { get; set; }
        public int UserUsageLimit { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public ServiceType? ApplicableServiceType { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class VoucherFilterDto
    {
        public string? Keyword { get; set; }
        public VoucherType? VoucherType { get; set; }
        public bool? IsActive { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class FeedbackListItemDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        public bool IsVisible { get; set; }
        public string? AdminStatus { get; set; }
        public string? PartnerResponse { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class FeedbackFilterDto
    {
        public string? Keyword { get; set; }
        public int? MinRating { get; set; }
        public int? MaxRating { get; set; }
        public bool? IsVisible { get; set; }
        public Guid? ServiceId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class UpdateVisibilityDto
    {
        public bool IsVisible { get; set; }
        public string? Status { get; set; }
    }

    public class ServiceApprovalFilterDto
    {
        public ServiceApprovalStatus? Status { get; set; }
        public ServiceType? ServiceType { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class ServiceApprovalActionDto
    {
        public string? Note { get; set; }
        public string? Reason { get; set; }
    }

    public class PayoutFilterDto
    {
        public PayoutStatus? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Keyword { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class PartnerBalanceListItemDto
    {
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CapturedGross { get; set; }
        public decimal RefundedGross { get; set; }
        public decimal CommissionNet { get; set; }
        public decimal ReleasedNet { get; set; }
        public decimal LedgerBalance { get; set; }
        public decimal PaidOut { get; set; }
        public decimal PendingPayout { get; set; }
        public decimal AvailableToWithdraw { get; set; }
        public int TotalCompletedBookings { get; set; }
        public int TotalPendingBookings { get; set; }
        public int TotalCancelledBookings { get; set; }
    }

    public class PartnerBalanceTotalsDto
    {
        public decimal TotalCapturedGross { get; set; }
        public decimal TotalRefundedGross { get; set; }
        public decimal TotalCommissionNet { get; set; }
        public decimal TotalReleasedNet { get; set; }
        public decimal TotalLedgerBalance { get; set; }
        public decimal TotalPendingPayout { get; set; }
        public decimal TotalPaidOut { get; set; }
        public decimal TotalAvailableToWithdraw { get; set; }
        public int PartnerCount { get; set; }
    }

    public class CreateManagerDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Region { get; set; }
    }

    public class UpdateManagerProfileDto
    {
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public string? PhoneNumber { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}
