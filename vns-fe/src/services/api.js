const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5272";

function buildApiError(message, options = {}) {
  const error = new Error(message);
  error.status = options.status;
  error.payload = options.payload;
  error.details = options.details || [];
  return error;
}

export function authHeaders() {
  const token = localStorage.getItem("vns_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function handleResponse(res) {
  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw buildApiError(`Loi ${res.status}`, { status: res.status });
    }
    return {};
  }

  if (!res.ok) {
    const details = data?.errors
      ? Object.values(data.errors).flat().filter(Boolean)
      : [];

    throw buildApiError(
      data?.message || data?.title || `Loi ${res.status}`,
      {
        status: res.status,
        payload: data,
        details,
      }
    );
  }

  return data;
}

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiUpload(path, formData) {
  const token = localStorage.getItem("vns_token");
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse(res);
}

export { BASE_URL };
