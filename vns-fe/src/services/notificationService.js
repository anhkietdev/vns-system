import { apiGet, apiPut } from "./api";

export const notificationService = {
  // GET /api/Notification?page=...&pageSize=...
  async getNotifications(page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/Notification${query ? `?${query}` : ""}`);
  },

  // GET /api/Notification/unread-count
  async getUnreadCount() {
    return apiGet("/api/Notification/unread-count");
  },

  // PUT /api/Notification/{id}/read
  async markAsRead(id) {
    return apiPut(`/api/Notification/${id}/read`);
  },

  // PUT /api/Notification/read-all
  async markAllAsRead() {
    return apiPut("/api/Notification/read-all");
  },
};
