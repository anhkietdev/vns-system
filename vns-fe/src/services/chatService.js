import { apiGet, apiPost, apiPut } from "./api";

export const chatService = {
  // ==================== ChatController ====================
  // Note: Both user and partner share the same ChatController at /api/Chat

  // GET /api/Chat/conversations
  async getConversations() {
    return apiGet("/api/Chat/conversations");
  },

  // GET /api/Chat/{conversationId}/messages?page=...&pageSize=...
  async getMessages(conversationId, page, pageSize) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiGet(`/api/Chat/${conversationId}/messages${query ? `?${query}` : ""}`);
  },

  // POST /api/Chat
  async sendMessage(data) {
    return apiPost("/api/Chat", data);
  },

  // PUT /api/Chat/{conversationId}/read
  async markAsRead(conversationId) {
    return apiPut(`/api/Chat/${conversationId}/read`);
  },
};
