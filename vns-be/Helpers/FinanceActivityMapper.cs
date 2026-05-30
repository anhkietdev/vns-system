using VNS.API.Models.Enums;

namespace VNS.API.Helpers
{
    public static class FinanceActivityMapper
    {
        public static FinanceActivityType FromSettlementType(SettlementEntryType entryType)
        {
            return entryType switch
            {
                SettlementEntryType.PaymentCaptured => FinanceActivityType.PaymentCaptured,
                SettlementEntryType.PartnerReceivableReleased => FinanceActivityType.ReceivableReleased,
                SettlementEntryType.RefundProcessed => FinanceActivityType.RefundAdjustment,
                SettlementEntryType.PayoutCompleted => FinanceActivityType.PayoutCompleted,
                _ => throw new ArgumentOutOfRangeException(nameof(entryType), entryType, "Unsupported settlement entry type")
            };
        }

        public static string ToCode(FinanceActivityType activityType)
        {
            return activityType switch
            {
                FinanceActivityType.PaymentCaptured => "payment_captured",
                FinanceActivityType.ReceivableReleased => "receivable_released",
                FinanceActivityType.RefundAdjustment => "refund_adjustment",
                FinanceActivityType.PayoutRequested => "payout_requested",
                FinanceActivityType.PayoutCompleted => "payout_completed",
                FinanceActivityType.PayoutRejected => "payout_rejected",
                _ => throw new ArgumentOutOfRangeException(nameof(activityType), activityType, "Unsupported finance activity type")
            };
        }

        public static string GetDefaultStatus(FinanceActivityType activityType)
        {
            return activityType switch
            {
                FinanceActivityType.PayoutRequested => "pending",
                FinanceActivityType.PayoutRejected => "rejected",
                _ => "completed"
            };
        }
    }
}
