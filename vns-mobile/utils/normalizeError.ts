type NormalizedError = {
  title?: string;
  message: string;
  details?: string[];
  retryable?: boolean;
};

export function normalizeError(error: unknown): NormalizedError {
  const fallback: NormalizedError = {
    title: "Khong the hoan tat",
    message: "Da xay ra loi. Vui long thu lai.",
    details: [],
    retryable: true,
  };

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const anyError = error as any;
  const payload = anyError.response?.data || anyError.payload || {};
  const status = anyError.response?.status || anyError.status;
  const details = payload?.errors
    ? Object.values(payload.errors).flat().filter(Boolean)
    : Array.isArray(anyError.details)
      ? anyError.details.filter(Boolean)
      : [];
  const message =
    payload?.message ||
    payload?.title ||
    anyError.message ||
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

  if (/network/i.test(message) || /request failed/i.test(message)) {
    return {
      title: "Loi ket noi",
      message: "Khong the ket noi den may chu. Vui long thu lai.",
      details,
      retryable: true,
    };
  }

  return {
    title: status ? `Loi ${status}` : fallback.title,
    message,
    details,
    retryable: true,
  };
}
