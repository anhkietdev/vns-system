import { apiGet, apiPost, apiPut, apiDelete } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5272";

function authHeaders() {
  const token = localStorage.getItem("vns_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (!res.ok) {
    throw new Error(data.message || data.title || `Lỗi ${res.status}`);
  }
  return data;
}

export const serviceService = {
  // ==================== ServiceController (User/Public) ====================

  // GET /api/Service?partnerId=...&includeInactive=true
  async getPartnerServices(partnerId) {
    const params = new URLSearchParams({ includeInactive: "true" });
    if (partnerId) params.set("partnerId", partnerId);
    const res = await fetch(`${BASE_URL}/api/Service?${params}`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  // GET /api/Service?serviceType=...&title=...
  async getServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.serviceType !== undefined) params.set("serviceType", filters.serviceType);
    if (filters.title) params.set("title", filters.title);
    if (filters.locationId) params.set("locationId", filters.locationId);
    if (filters.partnerId) params.set("partnerId", filters.partnerId);
    if (filters.includeInactive !== undefined)
      params.set("includeInactive", filters.includeInactive);
    const res = await fetch(`${BASE_URL}/api/Service?${params}`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  // GET /api/Service/{id}
  async getServiceById(id) {
    const res = await fetch(`${BASE_URL}/api/Service/${id}`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  // ==================== PartnerServiceController ====================

  // GET /api/PartnerService
  async getOwnServices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", filters.page);
    if (filters.pageSize) params.set("pageSize", filters.pageSize);
    if (filters.approvalStatus !== undefined) params.set("approvalStatus", filters.approvalStatus);
    if (filters.isActive !== undefined) params.set("isActive", filters.isActive);
    const query = params.toString();
    return apiGet(`/api/PartnerService${query ? `?${query}` : ""}`);
  },

  // GET /api/PartnerService/{id}
  async getOwnServiceDetail(id) {
    return apiGet(`/api/PartnerService/${id}`);
  },

  // POST /api/PartnerService/tour
  async createTour(data) {
    return apiPost("/api/PartnerService/tour", data);
  },

  // POST /api/PartnerService/homestay
  async createHomestay(data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/homestay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService (generic - routes to tour or homestay based on serviceType)
  async createPartnerService(data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/tour`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // PUT /api/PartnerService/{serviceId}
  async updatePartnerService(serviceId, data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${serviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // DELETE /api/PartnerService/{serviceId}
  async deleteService(serviceId) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${serviceId}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService/{tourId}/schedules (if backend supports sub-resources)
  async addTourSchedule(tourId, data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${tourId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService/{tourId}/itineraries (if backend supports sub-resources)
  async addTourItinerary(tourId, data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${tourId}/itineraries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService/{homestayId}/rooms
  async addHomestayRoom(homestayId, data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${homestayId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService/{homestayId}/availability/bulk
  async bulkHomestayAvailability(homestayId, data) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${homestayId}/availability/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // POST /api/PartnerService/{homestayId}/create (submit for review)
  async submitHomestay(homestayId) {
    const res = await fetch(`${BASE_URL}/api/PartnerService/${homestayId}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ confirmed: true }),
    });
    return handleResponse(res);
  },

  // GET /api/Destination
  async getDestinations() {
    const res = await fetch(`${BASE_URL}/api/Destination`, {
      headers: { ...authHeaders() },
    });
    return handleResponse(res);
  },
};

// ServiceType enum mapping
export const SERVICE_TYPE = {
  0: { label: "Lưu trú", filterKey: "homestay", priceUnit: "/đêm" },
  1: { label: "Tour", filterKey: "tour", priceUnit: "/người" },
};

// BookingStatus mapping
export const BOOKING_STATUS = {
  0: "Đã xác nhận",
  1: "Đang diễn ra",
  2: "Hoàn thành",
  3: "Đã hủy",
  4: "Đã hoàn tiền",
  5: "Chờ hoàn tiền",
};
