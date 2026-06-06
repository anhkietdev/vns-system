export function normalizeError(error) {
  const fallback = {
    title: "Khong the hoan tat",
    message: "Da xay ra loi. Vui long thu lai.",
    details: [],
    retryable: true,
  };

  if (!error) {
    return fallback;
  }

  const payload = error.payload || error.response?.data || {};
  const status = error.status || error.response?.status;
  const details = payload?.errors
    ? Object.values(payload.errors).flat().filter(Boolean)
    : Array.isArray(error.details)
      ? error.details.filter(Boolean)
      : [];
  const message =
    payload?.message ||
    payload?.title ||
    error.message ||
    fallback.message;

  if (status === 401) {
    return {
      title: "Phien dang nhap het han",
      message: "Vui long dang nhap lai de tiep tuc.",
      details,
      retryable: false,
    };
  }

  if (status === 403) {
    return {
      title: "Khong du quyen",
      message,
      details,
      retryable: false,
    };
  }

  if (status === 404) {
    return {
      title: "Khong tim thay du lieu",
      message,
      details,
      retryable: false,
    };
  }

  if (status === 400 || status === 422) {
    return {
      title: "Du lieu chua hop le",
      message,
      details,
      retryable: false,
    };
  }

  if (status >= 500) {
    return {
      title: "Loi may chu",
      message,
      details,
      retryable: true,
    };
  }

  if (
    error.name === "TypeError" ||
    /failed to fetch/i.test(message) ||
    /network/i.test(message)
  ) {
    return {
      title: "Loi ket noi",
      message: "Khong the ket noi den may chu. Vui long thu lai.",
      details,
      retryable: true,
    };
  }

  return {
    title: status ? `Loi ${status}` : "Khong the hoan tat",
    message,
    details,
    retryable: true,
  };
}
