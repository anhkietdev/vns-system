const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5272";

function buildApiError(message, options = {}) {
  const error = new Error(message);
  error.status = options.status;
  error.payload = options.payload;
  error.details = options.details || [];
  return error;
}

function authHeaders() {
  const token = localStorage.getItem("vns_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function handleResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw buildApiError(
      data.message || data.title || `Loi ${res.status}`,
      {
        status: res.status,
        payload: data,
        details: data?.errors
          ? Object.values(data.errors).flat().filter(Boolean)
          : [],
      }
    );
  }

  return data;
}

export const authService = {
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/api/Auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(data) {
    const res = await fetch(`${BASE_URL}/api/Auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async registerPartner(data) {
    const res = await fetch(`${BASE_URL}/api/Auth/register-partner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async forgotPassword(email) {
    const res = await fetch(`${BASE_URL}/api/Auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async verifyOtp(email, otp) {
    const res = await fetch(`${BASE_URL}/api/Auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
  },

  async resetPassword(email, otp, newPassword) {
    const res = await fetch(`${BASE_URL}/api/Auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  async changePassword(data) {
    const res = await fetch(`${BASE_URL}/api/Auth/change-password`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
