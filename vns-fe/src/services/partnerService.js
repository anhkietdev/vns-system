import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "./api";

export const partnerService = {
  // ==================== PartnerProfileController ====================

  // GET /api/PartnerProfile
  async getProfile() {
    return apiGet("/api/PartnerProfile");
  },

  // PUT /api/PartnerProfile
  async updateProfile(data) {
    return apiPut("/api/PartnerProfile", data);
  },

  // POST /api/PartnerProfile/document
  async uploadDocument(formData) {
    return apiUpload("/api/PartnerProfile/document", formData);
  },

  // GET /api/PartnerProfile/documents
  async getDocuments() {
    return apiGet("/api/PartnerProfile/documents");
  },

  // ==================== PartnerFinanceController ====================

  // GET /api/PartnerFinance/dashboard
  async getDashboard() {
    return apiGet("/api/PartnerFinance/dashboard");
  },

  // GET /api/PartnerFinance/payouts?page=...&pageSize=...
  async getPayouts(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/PartnerFinance/payouts${query ? `?${query}` : ""}`);
  },

  // GET /api/PartnerFinance/transactions
  async getTransactions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.activityType) params.set("activityType", filters.activityType);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    const query = params.toString();
    return apiGet(`/api/PartnerFinance/transactions${query ? `?${query}` : ""}`);
  },

  // POST /api/PartnerFinance/payout-request
  async requestPayout(data) {
    return apiPost("/api/PartnerFinance/payout-request", data);
  },
  // ==================== PartnerComboController ====================

  async getCombos() {
    return apiGet("/api/PartnerCombo");
  },

  async getComboDetail(id) {
    return apiGet(`/api/PartnerCombo/${id}`);
  },

  async createCombo(data) {
    return apiPost("/api/PartnerCombo", data);
  },

  async updateCombo(id, data) {
    return apiPut(`/api/PartnerCombo/${id}`, data);
  },

  async deleteCombo(id) {
    return apiDelete(`/api/PartnerCombo/${id}`);
  },
};
