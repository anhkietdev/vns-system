import {
  COMMERCIAL_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
  PARTNER_BOOKING_TEXT,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "./partnerBookingText";

export const SERVICE_TYPE = {
  HOMESTAY: 0,
  TOUR: 1,
  ACTIVITY: 2,
  COMBO: 3,
};

export const BOOKING_COMMERCIAL_STATUS = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  REFUND_PENDING: 2,
  REFUNDED: 3,
  FORFEITED: 4,
  EXPIRED: 5,
};

export const BOOKING_FULFILLMENT_STATUS = {
  AWAITING_PARTNER: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  NO_SHOW: 4,
};

export const PAYMENT_STATUS = {
  PENDING: 0,
  COMPLETED: 1,
  FAILED: 2,
  REFUNDED: 3,
};

export const PAYMENT_METHOD = {
  VNPAY: 0,
  WALLET: 1,
  COMBINED: 2,
};

export const REFUND_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  PROCESSED: 3,
};

const serviceTypeNames = {
  homestay: SERVICE_TYPE.HOMESTAY,
  tour: SERVICE_TYPE.TOUR,
  activity: SERVICE_TYPE.ACTIVITY,
  combo: SERVICE_TYPE.COMBO,
};

const commercialStatusNames = {
  pendingpayment: BOOKING_COMMERCIAL_STATUS.PENDING_PAYMENT,
  paid: BOOKING_COMMERCIAL_STATUS.PAID,
  refundpending: BOOKING_COMMERCIAL_STATUS.REFUND_PENDING,
  refunded: BOOKING_COMMERCIAL_STATUS.REFUNDED,
  forfeited: BOOKING_COMMERCIAL_STATUS.FORFEITED,
  expired: BOOKING_COMMERCIAL_STATUS.EXPIRED,
};

const fulfillmentStatusNames = {
  awaitingpartner: BOOKING_FULFILLMENT_STATUS.AWAITING_PARTNER,
  confirmed: BOOKING_FULFILLMENT_STATUS.CONFIRMED,
  completed: BOOKING_FULFILLMENT_STATUS.COMPLETED,
  cancelled: BOOKING_FULFILLMENT_STATUS.CANCELLED,
  noshow: BOOKING_FULFILLMENT_STATUS.NO_SHOW,
};

const paymentStatusNames = {
  pending: PAYMENT_STATUS.PENDING,
  completed: PAYMENT_STATUS.COMPLETED,
  paid: PAYMENT_STATUS.COMPLETED,
  failed: PAYMENT_STATUS.FAILED,
  refunded: PAYMENT_STATUS.REFUNDED,
};

const paymentMethodNames = {
  vnpay: PAYMENT_METHOD.VNPAY,
  wallet: PAYMENT_METHOD.WALLET,
  combined: PAYMENT_METHOD.COMBINED,
};

const refundStatusNames = {
  pending: REFUND_STATUS.PENDING,
  approved: REFUND_STATUS.APPROVED,
  rejected: REFUND_STATUS.REJECTED,
  processed: REFUND_STATUS.PROCESSED,
};

function normalizeEnum(value, nameMap) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const key = value.replace(/[_\s-]/g, "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(nameMap, key)) {
      return nameMap[key];
    }
  }

  return null;
}

function pickFirst(raw, keys, fallback = null) {
  for (const key of keys) {
    const value = raw?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function normalizePayment(rawPayment) {
  if (!rawPayment) {
    return null;
  }

  return {
    id: pickFirst(rawPayment, ["id"]),
    amount: Number(pickFirst(rawPayment, ["amount"], 0) || 0),
    walletAmount: Number(pickFirst(rawPayment, ["walletAmount"], 0) || 0),
    vnPayAmount: Number(pickFirst(rawPayment, ["vnPayAmount"], 0) || 0),
    paymentMethod: normalizeEnum(
      pickFirst(rawPayment, ["paymentMethod"]),
      paymentMethodNames,
    ),
    paymentStatus: normalizeEnum(
      pickFirst(rawPayment, ["paymentStatus"]),
      paymentStatusNames,
    ),
    paidAt: pickFirst(rawPayment, ["paidAt"]),
  };
}

function buildPayments(raw) {
  const payments = Array.isArray(raw?.payments)
    ? raw.payments.map(normalizePayment).filter(Boolean)
    : [];

  const singlePayment = normalizePayment(raw?.payment);
  if (singlePayment && !payments.some((payment) => payment.id === singlePayment.id)) {
    payments.unshift(singlePayment);
  }

  return payments;
}

function sumPayments(payments, key) {
  return payments.reduce((total, payment) => total + Number(payment?.[key] || 0), 0);
}

function getPrimaryPayment(payments) {
  return payments[0] || null;
}

function getBadge(label, className) {
  return { label, className };
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function formatDate(value) {
  if (!value) {
    return PARTNER_BOOKING_TEXT.notAvailable;
  }

  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(value) {
  if (!value) {
    return PARTNER_BOOKING_TEXT.notAvailable;
  }

  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getServiceTypeLabel(value) {
  const type = normalizeEnum(value, serviceTypeNames);
  switch (type) {
    case SERVICE_TYPE.HOMESTAY:
      return PARTNER_BOOKING_TEXT.serviceTypes.homestay;
    case SERVICE_TYPE.TOUR:
      return PARTNER_BOOKING_TEXT.serviceTypes.tour;
    case SERVICE_TYPE.ACTIVITY:
      return PARTNER_BOOKING_TEXT.serviceTypes.activity;
    case SERVICE_TYPE.COMBO:
      return PARTNER_BOOKING_TEXT.serviceTypes.combo;
    default:
      return PARTNER_BOOKING_TEXT.unknownService;
  }
}

export function getPaymentMethodLabel(value) {
  const paymentMethod = normalizeEnum(value, paymentMethodNames);
  switch (paymentMethod) {
    case PAYMENT_METHOD.VNPAY:
      return PAYMENT_METHOD_LABELS.vnPay;
    case PAYMENT_METHOD.WALLET:
      return PAYMENT_METHOD_LABELS.wallet;
    case PAYMENT_METHOD.COMBINED:
      return PAYMENT_METHOD_LABELS.combined;
    default:
      return PARTNER_BOOKING_TEXT.notAvailable;
  }
}

export function getPaymentBadge(paymentStatus, commercialStatus) {
  const normalizedPaymentStatus = normalizeEnum(paymentStatus, paymentStatusNames);
  const normalizedCommercialStatus = normalizeEnum(
    commercialStatus,
    commercialStatusNames,
  );

  if (normalizedPaymentStatus === PAYMENT_STATUS.REFUNDED) {
    return getBadge(
      PAYMENT_STATUS_LABELS.refunded,
      "bg-purple-50 text-purple-700 border border-purple-200",
    );
  }

  if (normalizedPaymentStatus === PAYMENT_STATUS.COMPLETED) {
    return getBadge(
      PAYMENT_STATUS_LABELS.completed,
      "bg-green-50 text-green-700 border border-green-200",
    );
  }

  if (normalizedPaymentStatus === PAYMENT_STATUS.FAILED) {
    return getBadge(
      PAYMENT_STATUS_LABELS.failed,
      "bg-red-50 text-red-700 border border-red-200",
    );
  }

  if (normalizedCommercialStatus === BOOKING_COMMERCIAL_STATUS.REFUNDED) {
    return getBadge(
      PAYMENT_STATUS_LABELS.refunded,
      "bg-purple-50 text-purple-700 border border-purple-200",
    );
  }

  if (normalizedCommercialStatus === BOOKING_COMMERCIAL_STATUS.PAID) {
    return getBadge(
      PAYMENT_STATUS_LABELS.completed,
      "bg-green-50 text-green-700 border border-green-200",
    );
  }

  if (normalizedCommercialStatus === BOOKING_COMMERCIAL_STATUS.EXPIRED) {
    return getBadge(
      PAYMENT_STATUS_LABELS.failed,
      "bg-red-50 text-red-700 border border-red-200",
    );
  }

  return getBadge(
    PAYMENT_STATUS_LABELS.pending,
    "bg-amber-50 text-amber-700 border border-amber-200",
  );
}

export function getCommercialBadge(value) {
  const status = normalizeEnum(value, commercialStatusNames);
  switch (status) {
    case BOOKING_COMMERCIAL_STATUS.PENDING_PAYMENT:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.pendingPayment,
        "bg-amber-50 text-amber-700 border border-amber-200",
      );
    case BOOKING_COMMERCIAL_STATUS.PAID:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.paid,
        "bg-green-50 text-green-700 border border-green-200",
      );
    case BOOKING_COMMERCIAL_STATUS.REFUND_PENDING:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.refundPending,
        "bg-orange-50 text-orange-700 border border-orange-200",
      );
    case BOOKING_COMMERCIAL_STATUS.REFUNDED:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.refunded,
        "bg-purple-50 text-purple-700 border border-purple-200",
      );
    case BOOKING_COMMERCIAL_STATUS.FORFEITED:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.forfeited,
        "bg-rose-50 text-rose-700 border border-rose-200",
      );
    case BOOKING_COMMERCIAL_STATUS.EXPIRED:
      return getBadge(
        COMMERCIAL_STATUS_LABELS.expired,
        "bg-slate-100 text-slate-700 border border-slate-200",
      );
    default:
      return getBadge(
        PARTNER_BOOKING_TEXT.notAvailable,
        "bg-slate-100 text-slate-700 border border-slate-200",
      );
  }
}

export function getFulfillmentBadge(value) {
  const status = normalizeEnum(value, fulfillmentStatusNames);
  switch (status) {
    case BOOKING_FULFILLMENT_STATUS.AWAITING_PARTNER:
      return getBadge(
        FULFILLMENT_STATUS_LABELS.awaitingPartner,
        "bg-cyan-50 text-cyan-700 border border-cyan-200",
      );
    case BOOKING_FULFILLMENT_STATUS.CONFIRMED:
      return getBadge(
        FULFILLMENT_STATUS_LABELS.confirmed,
        "bg-blue-50 text-blue-700 border border-blue-200",
      );
    case BOOKING_FULFILLMENT_STATUS.COMPLETED:
      return getBadge(
        FULFILLMENT_STATUS_LABELS.completed,
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
      );
    case BOOKING_FULFILLMENT_STATUS.CANCELLED:
      return getBadge(
        FULFILLMENT_STATUS_LABELS.cancelled,
        "bg-red-50 text-red-700 border border-red-200",
      );
    case BOOKING_FULFILLMENT_STATUS.NO_SHOW:
      return getBadge(
        FULFILLMENT_STATUS_LABELS.noShow,
        "bg-slate-100 text-slate-700 border border-slate-200",
      );
    default:
      return getBadge(
        PARTNER_BOOKING_TEXT.notAvailable,
        "bg-slate-100 text-slate-700 border border-slate-200",
      );
  }
}

export function getRefundStatusBadge(value) {
  const status = normalizeEnum(value, refundStatusNames);
  switch (status) {
    case REFUND_STATUS.REJECTED:
      return getBadge(
        REFUND_STATUS_LABELS.rejected,
        "bg-red-50 text-red-700 border border-red-200",
      );
    case REFUND_STATUS.PROCESSED:
      return getBadge(
        REFUND_STATUS_LABELS.processed,
        "bg-green-50 text-green-700 border border-green-200",
      );
    default:
      return null;
  }
}

function buildScheduleSummary(raw, serviceType) {
  const checkInDate = pickFirst(raw, ["checkInDate"]);
  const checkOutDate = pickFirst(raw, ["checkOutDate"]);
  const startDate = pickFirst(raw, ["startDate"], checkInDate);
  const endDate = pickFirst(raw, ["endDate"], checkOutDate);

  if (serviceType === SERVICE_TYPE.HOMESTAY && checkInDate && checkOutDate) {
    return {
      primaryDate: checkInDate,
      secondaryDate: checkOutDate,
      label: `${formatDate(checkInDate)} - ${formatDate(checkOutDate)}`,
    };
  }

  if (startDate || endDate) {
    return {
      primaryDate: startDate,
      secondaryDate: endDate,
      label:
        startDate && endDate
          ? `${formatDate(startDate)} - ${formatDate(endDate)}`
          : formatDate(startDate || endDate),
    };
  }

  return {
    primaryDate: pickFirst(raw, ["bookingDate"]),
    secondaryDate: null,
    label: formatDate(pickFirst(raw, ["bookingDate"])),
  };
}

function buildPartySummary(raw, serviceType) {
  const guests = Number(pickFirst(raw, ["numberOfGuests", "guests"], 0) || 0);
  if (guests > 0) {
    return `${guests} ${PARTNER_BOOKING_TEXT.guests.toLowerCase()}`;
  }

  if (serviceType === SERVICE_TYPE.COMBO) {
    const comboItems = Array.isArray(raw?.comboItems) ? raw.comboItems : [];
    return comboItems.length > 0 ? `${comboItems.length} ${PARTNER_BOOKING_TEXT.comboItems.toLowerCase()}` : PARTNER_BOOKING_TEXT.notAvailable;
  }

  return PARTNER_BOOKING_TEXT.notAvailable;
}

export function normalizePartnerBooking(raw) {
  const payments = buildPayments(raw);
  const primaryPayment = getPrimaryPayment(payments);
  const serviceType = normalizeEnum(
    pickFirst(raw, ["serviceType"]),
    serviceTypeNames,
  );
  const commercialStatus = normalizeEnum(
    pickFirst(raw, ["commercialStatus"]),
    commercialStatusNames,
  );
  const fulfillmentStatus = normalizeEnum(
    pickFirst(raw, ["fulfillmentStatus"]),
    fulfillmentStatusNames,
  );
  const paymentStatus = primaryPayment?.paymentStatus ?? normalizeEnum(
    pickFirst(raw, ["paymentStatus"]),
    paymentStatusNames,
  );
  const paymentMethod =
    primaryPayment?.paymentMethod ??
    normalizeEnum(pickFirst(raw, ["paymentMethod"]), paymentMethodNames);
  const refundSummary = raw?.refundSummary
    ? {
        id: pickFirst(raw.refundSummary, ["id"]),
        status: normalizeEnum(
          pickFirst(raw.refundSummary, ["status"]),
          refundStatusNames,
        ),
        requestedAmount: Number(
          pickFirst(raw.refundSummary, ["requestedAmount"], 0) || 0,
        ),
        approvedAmount:
          pickFirst(raw.refundSummary, ["approvedAmount"]) != null
            ? Number(raw.refundSummary.approvedAmount)
            : null,
        reason: pickFirst(raw.refundSummary, ["reason"], ""),
        adminNote: pickFirst(raw.refundSummary, ["adminNote"]),
        requestedAt: pickFirst(raw.refundSummary, ["requestedAt"]),
        processedAt: pickFirst(raw.refundSummary, ["processedAt"]),
      }
    : null;
  const schedule = buildScheduleSummary(raw, serviceType);
  const displayName =
    pickFirst(raw, ["comboName", "serviceName"], PARTNER_BOOKING_TEXT.unknownService);
  const totalPaidAmount = payments.length > 0
    ? sumPayments(payments, "amount")
    : Number(pickFirst(raw, ["paidAmount"], 0) || 0);
  const walletAmount = payments.length > 0
    ? sumPayments(payments, "walletAmount")
    : Number(pickFirst(raw, ["walletAmount"], 0) || 0);
  const vnPayAmount = payments.length > 0
    ? sumPayments(payments, "vnPayAmount")
    : Number(pickFirst(raw, ["vnPayAmount"], 0) || 0);
  const canPartnerConfirm = Boolean(
    pickFirst(raw, ["canPartnerConfirm"], false),
  );
  const canPartnerComplete = Boolean(
    pickFirst(raw, ["canPartnerComplete"], false),
  );
  const canPartnerCancel = Boolean(
    pickFirst(raw, ["canPartnerCancel"], false),
  );

  return {
    raw,
    id: pickFirst(raw, ["id"]),
    userId: pickFirst(raw, ["userId"]),
    bookingCode: pickFirst(raw, ["bookingCode"], ""),
    serviceName: pickFirst(raw, ["serviceName"], displayName),
    displayName,
    serviceType,
    serviceTypeLabel: getServiceTypeLabel(serviceType),
    isCombo: Boolean(pickFirst(raw, ["comboId"])),
    comboId: pickFirst(raw, ["comboId"]),
    comboName: pickFirst(raw, ["comboName"]),
    address: pickFirst(raw, ["address"]),
    customerName: pickFirst(
      raw,
      ["customerName", "contactName"],
      PARTNER_BOOKING_TEXT.unknownCustomer,
    ),
    contactEmail: pickFirst(raw, ["contactEmail"]),
    contactPhone: pickFirst(raw, ["contactPhone"]),
    specialRequests: pickFirst(raw, ["specialRequests"]),
    totalAmount: Number(pickFirst(raw, ["totalAmount"], 0) || 0),
    discountAmount: Number(pickFirst(raw, ["discountAmount"], 0) || 0),
    finalAmount: Number(pickFirst(raw, ["finalAmount"], 0) || 0),
    paymentMethod,
    paymentMethodLabel: getPaymentMethodLabel(paymentMethod),
    paymentStatus,
    totalPaidAmount,
    walletAmount,
    vnPayAmount,
    bookingDate: pickFirst(raw, ["bookingDate"]),
    expiresAt: pickFirst(raw, ["expiresAt"]),
    confirmedAt: pickFirst(raw, ["confirmedAt"]),
    completedAt: pickFirst(raw, ["completedAt"]),
    cancelledAt: pickFirst(raw, ["cancelledAt"]),
    cancellationReason: pickFirst(raw, ["cancellationReason"]),
    commercialStatus,
    fulfillmentStatus,
    commercialBadge: getCommercialBadge(commercialStatus),
    fulfillmentBadge: getFulfillmentBadge(fulfillmentStatus),
    paymentBadge: getPaymentBadge(paymentStatus, commercialStatus),
    refundSummary,
    refundBadge: refundSummary
      ? getRefundStatusBadge(refundSummary.status)
      : null,
    canPay: Boolean(pickFirst(raw, ["canPay"], false)),
    canCancel: Boolean(pickFirst(raw, ["canCancel"], false)),
    canRefund: Boolean(pickFirst(raw, ["canRefund"], false)),
    canPartnerConfirm,
    canPartnerComplete,
    canPartnerCancel,
    isPendingPayment:
      commercialStatus === BOOKING_COMMERCIAL_STATUS.PENDING_PAYMENT,
    isAwaitingPartner:
      fulfillmentStatus === BOOKING_FULFILLMENT_STATUS.AWAITING_PARTNER,
    isConfirmed:
      fulfillmentStatus === BOOKING_FULFILLMENT_STATUS.CONFIRMED,
    isCompleted:
      fulfillmentStatus === BOOKING_FULFILLMENT_STATUS.COMPLETED,
    isCancelled:
      fulfillmentStatus === BOOKING_FULFILLMENT_STATUS.CANCELLED,
    isRefundPending:
      commercialStatus === BOOKING_COMMERCIAL_STATUS.REFUND_PENDING,
    isRefunded: commercialStatus === BOOKING_COMMERCIAL_STATUS.REFUNDED,
    payment: primaryPayment,
    payments,
    details: Array.isArray(raw?.details) ? raw.details : [],
    comboItems: Array.isArray(raw?.comboItems) ? raw.comboItems : [],
    operationalSnapshots: Array.isArray(raw?.operationalSnapshots)
      ? raw.operationalSnapshots
      : [],
    numberOfGuests: Number(pickFirst(raw, ["numberOfGuests"], 0) || 0),
    checkInDate: pickFirst(raw, ["checkInDate"]),
    checkOutDate: pickFirst(raw, ["checkOutDate"]),
    startDate: pickFirst(raw, ["startDate"]),
    endDate: pickFirst(raw, ["endDate"]),
    schedule,
    scheduleLabel: schedule.label,
    partyLabel: buildPartySummary(raw, serviceType),
  };
}

export function unwrapPagedItems(payload) {
  const data = payload?.data ?? payload;
  return {
    items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
    totalCount: Number(data?.totalCount ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
    page: Number(data?.page ?? 1),
    pageSize: Number(data?.pageSize ?? 10),
  };
}

export const PARTNER_BOOKING_TABS = [
  {
    id: "all",
    label: PARTNER_BOOKING_TEXT.tabs.all,
    getFilters: () => ({
      excludedCommercialStatuses: [BOOKING_COMMERCIAL_STATUS.PENDING_PAYMENT],
    }),
  },
  {
    id: "awaiting_partner",
    label: PARTNER_BOOKING_TEXT.tabs.awaitingPartner,
    getFilters: () => ({
      commercialStatus: BOOKING_COMMERCIAL_STATUS.PAID,
      fulfillmentStatus: BOOKING_FULFILLMENT_STATUS.AWAITING_PARTNER,
    }),
  },
  {
    id: "confirmed",
    label: PARTNER_BOOKING_TEXT.tabs.confirmed,
    getFilters: () => ({
      fulfillmentStatus: BOOKING_FULFILLMENT_STATUS.CONFIRMED,
      excludedCommercialStatuses: [
        BOOKING_COMMERCIAL_STATUS.REFUND_PENDING,
        BOOKING_COMMERCIAL_STATUS.REFUNDED,
      ],
    }),
  },
  {
    id: "completed",
    label: PARTNER_BOOKING_TEXT.tabs.completed,
    getFilters: () => ({
      fulfillmentStatus: BOOKING_FULFILLMENT_STATUS.COMPLETED,
    }),
  },
  {
    id: "cancelled_refunded",
    label: PARTNER_BOOKING_TEXT.tabs.cancelled,
    getFilters: () => ({
      fulfillmentStatuses: [BOOKING_FULFILLMENT_STATUS.CANCELLED],
      commercialStatuses: [
        BOOKING_COMMERCIAL_STATUS.REFUND_PENDING,
        BOOKING_COMMERCIAL_STATUS.REFUNDED,
      ],
    }),
  },
];

export const PARTNER_SERVICE_TYPE_OPTIONS = [
  { value: "", label: PARTNER_BOOKING_TEXT.serviceTypes.all },
  { value: SERVICE_TYPE.HOMESTAY, label: PARTNER_BOOKING_TEXT.serviceTypes.homestay },
  { value: SERVICE_TYPE.TOUR, label: PARTNER_BOOKING_TEXT.serviceTypes.tour },
  { value: SERVICE_TYPE.ACTIVITY, label: PARTNER_BOOKING_TEXT.serviceTypes.activity },
  { value: SERVICE_TYPE.COMBO, label: PARTNER_BOOKING_TEXT.serviceTypes.combo },
];

export const PARTNER_BOOKING_SORT_OPTIONS = [
  { value: "recent", label: PARTNER_BOOKING_TEXT.sortOptions.recent },
  { value: "amount", label: PARTNER_BOOKING_TEXT.sortOptions.amount },
  { value: "serviceTime", label: PARTNER_BOOKING_TEXT.sortOptions.serviceTime },
];
