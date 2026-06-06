import { apiGet } from "./api";

export const destinationService = {
  // GET /api/Destination
  async getAll() {
    return apiGet("/api/Destination");
  },

  // GET /api/Destination/{id}
  async getById(id) {
    return apiGet(`/api/Destination/${id}`);
  },
};
