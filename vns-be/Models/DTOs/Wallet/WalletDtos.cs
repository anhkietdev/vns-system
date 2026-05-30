using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Wallet
{
    public class WalletDto
    {
        public Guid Id { get; set; }
        public decimal Balance { get; set; }
        public bool IsActive { get; set; }
    }

    public class TopUpDto
    {
        public decimal Amount { get; set; }
    }

    public class ConfirmTopUpRawDto
    {
        public string RawQuery { get; set; } = string.Empty;
    }

    public class WalletTransactionDto
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public WalletTransactionType Type { get; set; }
        public string? Description { get; set; }
        public Guid? BookingId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
