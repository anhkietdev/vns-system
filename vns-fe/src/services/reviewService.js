import { apiGet, apiPost } from "./api";

export const reviewService = {
  // ==================== ReviewController (User) ====================

  // GET /api/Review/service/{serviceId}?page=...&pageSize=...&sortBy=...
  async getServiceReviews(serviceId, page, pageSize, sortBy) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (sortBy) params.set("sortBy", sortBy);
    const query = params.toString();
    return apiGet(`/api/Review/service/${serviceId}${query ? `?${query}` : ""}`);
  },

  // ==================== PartnerReviewController ====================

  // GET /api/PartnerReview
  async getPartnerReviews(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    const query = params.toString();
    return apiGet(`/api/PartnerReview${query ? `?${query}` : ""}`);
  },

  // POST /api/PartnerReview/{reviewId}/respond
  async respondToReview(reviewId, data) {
    return apiPost(`/api/PartnerReview/${reviewId}/respond`, data);
  },
};
