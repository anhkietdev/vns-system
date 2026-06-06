import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export const managerService = {
  // ==================== AdminController (shared dashboard) ====================

  async getDashboard() {
    return apiGet("/api/Admin/dashboard");
  },
  // ==================== ManagerPartnerController ====================

  async getAllPartners(status, page, pageSize) {
    const params = new URLSearchParams();
    if (status !== undefined && status !== null) params.set("status", status);
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/ManagerPartner${query ? `?${query}` : ""}`);
  },

  async getPendingVerifications(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/ManagerPartner/pending${query ? `?${query}` : ""}`);
  },

  async getPartnerDetail(id) {
    return apiGet(`/api/ManagerPartner/${id}`);
  },

  async verifyPartner(id, data) {
    return apiPut(`/api/ManagerPartner/${id}/verify`, data);
  },

  async updateCommissionRate(id, data) {
    return apiPut(`/api/ManagerPartner/${id}/commission`, data);
  },

  // ==================== ManagerServiceApprovalController ====================

  async getPendingServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    if (filters.status !== undefined) params.set("status", filters.status);
    const query = params.toString();
    return apiGet(`/api/ManagerServiceApproval/pending${query ? `?${query}` : ""}`);
  },

  async getApprovalDetail(id) {
    return apiGet(`/api/ManagerServiceApproval/${id}`);
  },

  async approveService(id, data) {
    return apiPut(`/api/ManagerServiceApproval/${id}/approve`, data);
  },

  async rejectService(id, data) {
    return apiPut(`/api/ManagerServiceApproval/${id}/reject`, data);
  },

  // ==================== ManagerVoucherController ====================

  async getAllVouchers(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/ManagerVoucher${query ? `?${query}` : ""}`);
  },

  async createVoucher(data) {
    return apiPost("/api/ManagerVoucher", data);
  },

  async updateVoucher(id, data) {
    return apiPut(`/api/ManagerVoucher/${id}`, data);
  },

  async deleteVoucher(id) {
    return apiDelete(`/api/ManagerVoucher/${id}`);
  },

  // ==================== ManagerFeedbackController ====================

  async getFeedback(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/ManagerFeedback${query ? `?${query}` : ""}`);
  },

  async toggleFeedbackVisibility(id, data) {
    return apiPut(`/api/ManagerFeedback/${id}/visibility`, data);
  },

  async deleteFeedback(id) {
    return apiDelete(`/api/ManagerFeedback/${id}`);
  },

  // ==================== AdminFinanceController (shared with Admin) ====================

  async getRevenue(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.set("fromDate", startDate);
    if (endDate) params.set("toDate", endDate);
    const query = params.toString();
    return apiGet(`/api/AdminFinance/revenue${query ? `?${query}` : ""}`);
  },

  async getPayouts(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminFinance/payouts${query ? `?${query}` : ""}`);
  },

  async processPayout(id, data) {
    return apiPost(`/api/AdminFinance/payouts/${id}/process`, data);
  },

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

  async getPartnerBalances() {
    return apiGet("/api/AdminFinance/partner-balances");
  },

  async getServiceBalances(partnerId) {
    return apiGet(`/api/AdminFinance/service-balances/${partnerId}`);
  },

  // ==================== AdminRefundController (view-only) ====================

  async getRefundRequests(status, page, pageSize) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/AdminRefund${query ? `?${query}` : ""}`);
  },
};
