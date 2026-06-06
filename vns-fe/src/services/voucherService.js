import { apiGet, apiPost } from "./api";

export const voucherService = {
  // ==================== VoucherController (User) ====================

  // GET /api/Voucher/active
  async getActiveVouchers() {
    return apiGet("/api/Voucher/active");
  },

  // POST /api/Voucher/apply
  async applyVoucher(code, orderAmount, serviceType) {
    return apiPost("/api/Voucher/apply", { code, orderAmount, serviceType });
  },
};
