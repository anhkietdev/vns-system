using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Voucher
{
    public class ApplyVoucherDto
    {
        public string Code { get; set; } = string.Empty;
        public decimal OrderAmount { get; set; }
        public ServiceType? ServiceType { get; set; }
    }

    public class VoucherDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public VoucherType VoucherType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int UsageLimit { get; set; }
        public int UsedCount { get; set; }
        public int UserUsageLimit { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public ServiceType? ServiceType { get; set; }
        public bool IsActive { get; set; }
    }

}
