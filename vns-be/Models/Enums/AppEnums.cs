namespace VNS.API.Models.Enums
{
    public enum UserRole
    {
        Admin,
        Manager,
        Partner,
        User
    }

    public enum ServiceType
    {
        Homestay,
        Tour,
        Combo
    }

    // Legacy projection used by existing API consumers.
    public enum BookingStatus
    {
        Pending,
        Confirmed,
        InProgress,
        Completed,
        Cancelled,
        Refunded,
        NoShow,
        Expired,
        RefundPending
    }

    public enum BookingCommercialStatus
    {
        PendingPayment,
        Paid,
        RefundPending,
        Refunded,
        Forfeited,
        Expired
    }

    public enum BookingFulfillmentStatus
    {
        AwaitingPartner,
        Confirmed,
        Completed,
        Cancelled,
        NoShow
    }

    public enum PaymentStatus
    {
        Pending,
        Completed,
        Failed,
        Refunded
    }

    public enum PaymentOrderStatus
    {
        Pending,
        Paid,
        Refunded,
        Cancelled,
        Expired
    }

    public enum PaymentAttemptStatus
    {
        Pending,
        Completed,
        Failed,
        Cancelled,
        Expired
    }

    public enum PaymentMethod
    {
        VNPay,
        Wallet,
        Combined
    }

    public enum WalletTransactionType
    {
        TopUp,
        Payment,
        Refund,
        Commission,
        Payout
    }

    public enum PartnerVerificationStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum ServiceApprovalStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum NotificationType
    {
        BookingConfirmed,
        BookingCancelled,
        PaymentSuccess,
        PaymentFailed,
        RefundProcessed,
        ReviewReminder,
        PreTripReminder,
        PriceDropAlert,
        NewMessage,
        PartnerPayout
    }

    public enum CancellationPolicyType
    {
        Free,
        Moderate,
        Strict,
        NonRefundable
    }

    public enum VoucherType
    {
        Percentage,
        FixedAmount
    }

    public enum ComboDiscountType
    {
        Percentage,
        FixedAmount
    }

    public enum ComboDateDriver
    {
        Stay,
        Tour
    }

    public enum ChatMessageType
    {
        Text,
        Image,
        System
    }

    public enum RefundStatus
    {
        Pending = 0,
        Processed = 3
    }

    public enum RefundCaseStatus
    {
        Pending = 0,
        Processed = 3
    }

    public enum RefundExecutionStatus
    {
        Pending,
        Completed,
        Failed
    }

    public enum RefundDestination
    {
        Wallet
    }

    public enum ReviewStatus
    {
        New,
        Reviewed,
        Actioned
    }

    public enum TourScheduleStatus
    {
        Active,
        Cancelled,
        Full
    }

    public enum TourPricingModel
    {
        GuestType
    }

    public enum TourPricingTierType
    {
        Standard,
        Adult,
        Child,
        Infant,
        Senior,
        GroupBracket
    }

    public enum PayoutStatus
    {
        Pending,
        Completed,
        Rejected
    }

    public enum BookingComponentType
    {
        Primary,
        ComboItem
    }

    public enum InventoryReservationType
    {
        Room,
        TourSchedule
    }

    public enum InventoryReservationStatus
    {
        Active,
        Released,
        Expired,
        Consumed
    }

    public enum SettlementEntryType
    {
        PaymentCaptured,
        PartnerReceivableReleased,
        RefundProcessed,
        PayoutCompleted
    }

    public enum FinanceActivityType
    {
        PaymentCaptured,
        ReceivableReleased,
        RefundAdjustment,
        PayoutRequested,
        PayoutCompleted,
        PayoutRejected
    }
}
