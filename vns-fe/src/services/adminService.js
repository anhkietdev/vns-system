import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export const adminService = {
  // ==================== AdminController ====================

  // GET /api/Admin/dashboard
  async getDashboard() {
    return apiGet("/api/Admin/dashboard");
  },

  // GET /api/Admin/users?role=...&keyword=...&page=...&pageSize=...
  async getUsers(role, search, page, pageSize) {
    const roleEnum = { user: 3, partner: 2, manager: 1, admin: 0 };
    const params = new URLSearchParams();
    if (role && roleEnum[role] !== undefined) params.set("role", roleEnum[role]);
    if (search) params.set("keyword", search);
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/Admin/users${query ? `?${query}` : ""}`);
  },

  // PUT /api/Admin/users/{id}/status
  async toggleUserStatus(id, data) {
    return apiPut(`/api/Admin/users/${id}/status`, data);
  },

  // PUT /api/Admin/users/{id}/role
  async updateUserRole(id, data) {
    return apiPut(`/api/Admin/users/${id}/role`, data);
  },

  // DELETE /api/Admin/users/{id}
  async deleteUser(id) {
    return apiDelete(`/api/Admin/users/${id}`);
  },

  // POST /api/Admin/users (create manager)
  async createManager(data) {
    return apiPost("/api/Admin/users", data);
  },

  // PUT /api/Admin/users/{id}/reset-password
  async resetUserPassword(id, data) {
    return apiPut(`/api/Admin/users/${id}/reset-password`, data);
  },

  // ==================== AdminPartnerController ====================

  // GET /api/AdminPartner?status=...&page=...&pageSize=...
  async getAllPartners(status, page, pageSize) {
    const params = new URLSearchParams();
    if (status !== undefined && status !== null) params.set("status", status);
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminPartner${query ? `?${query}` : ""}`);
  },

  // GET /api/AdminPartner/pending?page=...&pageSize=...
  async getPendingVerifications(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminPartner/pending${query ? `?${query}` : ""}`);
  },

  // GET /api/AdminPartner/{id}
  async getPartnerDetail(id) {
    return apiGet(`/api/AdminPartner/${id}`);
  },

  // PUT /api/AdminPartner/{id}/verify
  async verifyPartner(id, data) {
    return apiPut(`/api/AdminPartner/${id}/verify`, data);
  },

  // PUT /api/AdminPartner/{id}/commission
  async updateCommissionRate(id, data) {
    return apiPut(`/api/AdminPartner/${id}/commission`, data);
  },

  // ==================== AdminServiceApprovalController ====================

  // GET /api/AdminServiceApproval/pending
  async getPendingServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    if (filters.status !== undefined) params.set("status", filters.status);
    const query = params.toString();
    return apiGet(`/api/AdminServiceApproval/pending${query ? `?${query}` : ""}`);
  },

  // GET /api/AdminServiceApproval/{id}
  async getApprovalDetail(id) {
    return apiGet(`/api/AdminServiceApproval/${id}`);
  },

  // PUT /api/AdminServiceApproval/{id}/approve
  async approveService(id, data) {
    return apiPut(`/api/AdminServiceApproval/${id}/approve`, data);
  },

  // PUT /api/AdminServiceApproval/{id}/reject
  async rejectService(id, data) {
    return apiPut(`/api/AdminServiceApproval/${id}/reject`, data);
  },

  // ==================== AdminRefundController ====================

  // GET /api/AdminRefund?status=...&page=...&pageSize=...
  async getRefundRequests(status, page, pageSize) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminRefund${query ? `?${query}` : ""}`);
  },

  // ==================== AdminVoucherController ====================

  // GET /api/AdminVoucher?page=...&pageSize=...
  async getAllVouchers(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminVoucher${query ? `?${query}` : ""}`);
  },

  // POST /api/AdminVoucher
  async createVoucher(data) {
    return apiPost("/api/AdminVoucher", data);
  },

  // PUT /api/AdminVoucher/{id}
  async updateVoucher(id, data) {
    return apiPut(`/api/AdminVoucher/${id}`, data);
  },

  // DELETE /api/AdminVoucher/{id}
  async deleteVoucher(id) {
    return apiDelete(`/api/AdminVoucher/${id}`);
  },

  // ==================== AdminFeedbackController ====================

  // GET /api/AdminFeedback?page=...&pageSize=...
  async getFeedback(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminFeedback${query ? `?${query}` : ""}`);
  },

  // PUT /api/AdminFeedback/{id}/visibility
  async toggleFeedbackVisibility(id, data) {
    return apiPut(`/api/AdminFeedback/${id}/visibility`, data);
  },

  // DELETE /api/AdminFeedback/{id}
  async deleteFeedback(id) {
    return apiDelete(`/api/AdminFeedback/${id}`);
  },

  // ==================== AdminFinanceController ====================

  // GET /api/AdminFinance/revenue?startDate=...&endDate=...
  async getRevenue(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.set("fromDate", startDate);
    if (endDate) params.set("toDate", endDate);
    const query = params.toString();
    return apiGet(`/api/AdminFinance/revenue${query ? `?${query}` : ""}`);
  },

  // GET /api/AdminFinance/payouts?page=...&pageSize=...
  async getPayouts(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminFinance/payouts${query ? `?${query}` : ""}`);
  },

  // POST /api/AdminFinance/payouts/{id}/process
  async processPayout(id, data) {
    return apiPost(`/api/AdminFinance/payouts/${id}/process`, data);
  },

  // GET /api/AdminFinance/transactions?page=...&pageSize=...
  async getTransactions(pageOrFilters, pageSize) {
    const params = new URLSearchParams();
    if (typeof pageOrFilters === "object" && pageOrFilters !== null) {
      const filters = pageOrFilters;
      if (filters.activityType) params.set("activityType", filters.activityType);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      if (filters.keyword) params.set("keyword", filters.keyword);
      if (filters.page) params.set("page", filters.page);
      if (filters.pageSize) params.set("pageSize", filters.pageSize);
    } else {
      if (pageOrFilters) params.set("page", pageOrFilters);
      if (pageSize) params.set("pageSize", pageSize);
    }
    const query = params.toString();
    return apiGet(`/api/AdminFinance/transactions${query ? `?${query}` : ""}`);
  },

  // GET /api/AdminFinance/partner-balances - dashboard tổng tiền admin giữ cho từng partner
  async getPartnerBalances() {
    return apiGet(`/api/AdminFinance/partner-balances`);
  },

  // GET /api/AdminFinance/service-balances/{partnerId} - chi tiết theo từng service của partner
  async getServiceBalances(partnerId) {
    return apiGet(`/api/AdminFinance/service-balances/${partnerId}`);
  },
};
