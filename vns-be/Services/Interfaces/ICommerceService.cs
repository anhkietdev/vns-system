using VNS.API.Models.Entities;
using VNS.API.Models.Enums;

namespace VNS.API.Services.Interfaces
{
    public interface ICommerceService
    {
        Task EnsureBookingArtifactsAsync(Booking booking, Service primaryService);
        Task EnsureBookingArtifactsAsync(Booking booking);
        Task<PaymentOrder> EnsurePaymentOrderAsync(Booking booking);
        Task<PaymentAttempt> CreatePaymentAttemptAsync(
            Booking booking,
            PaymentMethod paymentMethod,
            decimal amount,
            decimal walletAmount,
            decimal vnPayAmount,
            string? idempotencyToken = null);
        Task CompletePaymentAsync(
            Booking booking,
            PaymentAttempt attempt,
            PaymentStatus legacyPaymentStatus,
            string? externalTransactionId,
            string? gatewayResponseCode,
            string? callbackPayload = null);
        Task FailPaymentAsync(
            Booking booking,
            PaymentAttempt attempt,
            string? failureReason,
            string? gatewayResponseCode = null,
            string? callbackPayload = null);
        Task ExpireBookingAsync(Booking booking);
        Task ReleaseReservationsAsync(Guid bookingId, InventoryReservationStatus status);
        Task EnsureRefundCaseAsync(RefundRequest refundRequest, Booking booking);
        Task CompleteRefundAsync(Booking booking, RefundRequest refundRequest, decimal amount, Guid? partnerId);
        Task AddPayoutSettlementAsync(PartnerPayout payout);
        Task<bool> ReleasePartnerReceivableAsync(Booking booking);
        BookingStatus GetLegacyBookingStatus(Booking booking);
        bool CanPay(Booking booking);
        bool CanCancel(Booking booking);
        bool CanRefund(Booking booking);
    }
}
