import { apiGet, apiPost, apiPut } from "./api";

export const bookingService = {
  // ==================== PartnerBookingController ====================

  // GET /api/PartnerBooking?status=...&fromDate=...&toDate=...&page=...&pageSize=...
  async getPartnerBookings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status !== undefined) params.set("status", filters.status);
    if (filters.commercialStatus !== undefined) {
      params.set("commercialStatus", filters.commercialStatus);
    }
    if (Array.isArray(filters.commercialStatuses)) {
      filters.commercialStatuses.forEach((value) =>
        params.append("commercialStatuses", value),
      );
    }
    if (Array.isArray(filters.excludedCommercialStatuses)) {
      filters.excludedCommercialStatuses.forEach((value) =>
        params.append("excludedCommercialStatuses", value),
      );
    }
    if (filters.fulfillmentStatus !== undefined) {
      params.set("fulfillmentStatus", filters.fulfillmentStatus);
    }
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.serviceType !== undefined) params.set("serviceType", filters.serviceType);
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    const query = params.toString();
    return apiGet(`/api/PartnerBooking${query ? `?${query}` : ""}`);
  },

  // GET /api/PartnerBooking/{id}
  async getPartnerBookingById(id) {
    return apiGet(`/api/PartnerBooking/${id}`);
  },

  // PUT /api/PartnerBooking/{id}/confirm
  async confirmBooking(id) {
    return apiPut(`/api/PartnerBooking/${id}/confirm`);
  },

  // PUT /api/PartnerBooking/{id}/complete
  async completeBooking(id) {
    return apiPut(`/api/PartnerBooking/${id}/complete`);
  },

  // ==================== BookingController (User) ====================

  // GET /api/Booking/{id}
  async getBookingById(id) {
    return apiGet(`/api/Booking/${id}`);
  },

  // POST /api/Booking
  async createBooking(data) {
    return apiPost("/api/Booking", data);
  },

  // GET /api/Booking
  async getUserBookings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status !== undefined) params.set("status", filters.status);
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    const query = params.toString();
    return apiGet(`/api/Booking${query ? `?${query}` : ""}`);
  },

  // PUT /api/Booking/{id}/cancel (user)
  async cancelBooking(id, reason) {
    return apiPut(`/api/Booking/${id}/cancel`, { reason });
  },

  // PUT /api/PartnerBooking/{id}/cancel (partner)
  async cancelPartnerBooking(id, reason) {
    return apiPut(`/api/PartnerBooking/${id}/cancel`, { reason });
  },
};
