import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Mail,
  Phone,
  Search,
  XCircle,
} from "lucide-react";
import { bookingService } from "../../services/bookingService";
import {
  formatCurrency,
  formatDate,
  normalizePartnerBooking,
  PARTNER_BOOKING_SORT_OPTIONS,
  PARTNER_BOOKING_TABS,
  PARTNER_SERVICE_TYPE_OPTIONS,
  unwrapPagedItems,
} from "../../utils/partnerBookingPresentation";
import { PARTNER_BOOKING_TEXT } from "../../utils/partnerBookingText";

const PAGE_SIZE = 10;

function getErrorMessage(error, fallback) {
  if (error?.details?.length) {
    return error.details[0];
  }

  return error?.message || fallback;
}

function FeedbackBanner({ feedback, onDismiss }) {
  if (!feedback) {
    return null;
  }

  const isSuccess = feedback.type === "success";

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5"
      >
        {PARTNER_BOOKING_TEXT.dismiss}
      </button>
    </div>
  );
}

function CancelBookingModal({
  booking,
  cancelReason,
  onChangeReason,
  onClose,
  onConfirm,
  loading,
}) {
  if (!booking) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#1a2332]">
            {PARTNER_BOOKING_TEXT.cancelBooking}
          </h2>
          <p className="mt-1 text-sm text-[#5a6577]">
            {booking.bookingCode} • {booking.displayName}
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium text-[#1a2332]">
          {PARTNER_BOOKING_TEXT.cancellationReason}
        </label>
        <textarea
          rows={4}
          value={cancelReason}
          onChange={(event) => onChangeReason(event.target.value)}
          placeholder={PARTNER_BOOKING_TEXT.cancelReasonPlaceholder}
          className="w-full rounded-xl border border-[#d6dde6] px-3 py-2 text-sm text-[#1a2332] outline-none transition focus:border-[#008fa0] focus:ring-2 focus:ring-[#008fa0]/15"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d6dde6] px-4 py-2 text-sm font-medium text-[#5a6577] hover:bg-[#f4f6f8]"
          >
            {PARTNER_BOOKING_TEXT.dismiss}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !cancelReason.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {PARTNER_BOOKING_TEXT.submitCancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function OperationalSnapshotCell({ booking }) {
  const snapshots = Array.isArray(booking.operationalSnapshots)
    ? booking.operationalSnapshots
    : [];

  if (snapshots.length === 0) {
    return (
      <div className="text-xs text-[#8d95a3]">
        {PARTNER_BOOKING_TEXT.notAvailable}
      </div>
    );
  }

  function snapshotSecondaryLabel(snapshot) {
    if (snapshot.serviceType === 1) {
      return `${snapshot.currentUnits || 0}/${snapshot.maximumUnits || 0} khách • tối thiểu ${snapshot.minimumUnits || 1}`;
    }
    if (snapshot.serviceType === 0 && snapshot.currentUnits != null) {
      const parts = [`${snapshot.currentUnits} phòng`];
      if (snapshot.checkInDate && snapshot.checkOutDate) {
        parts.push(`${formatDate(snapshot.checkInDate)} - ${formatDate(snapshot.checkOutDate)}`);
      }
      return parts.join(" • ");
    }
    return null;
  }

  function snapshotStatusLabel(snapshot) {
    if (snapshot.serviceType === 1) {
      if (snapshot.remainingUnits <= 0) return "Đã đầy";
      if (snapshot.currentUnits >= snapshot.minimumUnits) return "Đã đủ khách";
      return "Chưa đủ khách";
    }
    if (snapshot.serviceType === 0) {
      if (snapshot.remainingUnits == null) return "Không có dữ liệu";
      if (snapshot.remainingUnits <= 0) return "Hết phòng";
      return `Còn ${snapshot.remainingUnits} phòng`;
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {snapshots.map((snapshot, index) => {
        const showServiceName = booking.isCombo;
        const badgeClassName = snapshot.isAttention
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-slate-100 text-slate-700 border border-slate-200";
        const secondaryLabel = snapshotSecondaryLabel(snapshot);
        const statusLabel = snapshotStatusLabel(snapshot);

        return (
          <div
            key={`${booking.id}-ops-${index}`}
            className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2"
          >
            {showServiceName ? (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5a6577]">
                {snapshot.serviceName}
              </div>
            ) : null}
            <div className="mt-0.5 text-sm font-medium text-[#1a2332]">
              {snapshot.serviceType === 1 && snapshot.primaryLabel
                ? `Lượt khởi hành ${snapshot.primaryLabel}`
                : snapshot.primaryLabel || PARTNER_BOOKING_TEXT.notAvailable}
            </div>
            {secondaryLabel ? (
              <div className="mt-1 text-xs text-[#5a6577]">
                {secondaryLabel}
              </div>
            ) : null}
            {statusLabel ? (
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeClassName}`}
                >
                  {statusLabel}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ServiceOverviewSection({ booking }) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-[#1a2332]">{booking.displayName}</div>
      <div className="flex flex-wrap gap-2">
        {booking.isCombo ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#5a6577]">
            {PARTNER_BOOKING_TEXT.comboBooking}
          </span>
        ) : null}
        <span className="rounded-full bg-[#d8e1e8] px-2.5 py-1 text-xs font-medium text-[#35515e]">
          {booking.serviceTypeLabel}
        </span>
      </div>
      {booking.address ? (
        <div className="line-clamp-2 text-xs text-[#5a6577]">{booking.address}</div>
      ) : null}
    </div>
  );
}

function TimeOverviewSection({ booking }) {
  return (
    <div className="space-y-1 text-sm text-[#1a2332]">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-[#708093]" />
        <span>{booking.scheduleLabel}</span>
      </div>
      <div className="text-xs text-[#5a6577]">{booking.partyLabel}</div>
      {booking.isPendingPayment && booking.expiresAt ? (
        <div className="text-xs text-amber-700">
          {PARTNER_BOOKING_TEXT.paymentDueAt}: {formatDate(booking.expiresAt)}
        </div>
      ) : null}
    </div>
  );
}

function buildFilters({ activeTab, keyword, serviceType, page }) {
  const tabConfig = PARTNER_BOOKING_TABS.find((tab) => tab.id === activeTab);
  const tabFilters = tabConfig?.getFilters?.() || {};

  return {
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    serviceType: serviceType === "" ? undefined : Number(serviceType),
    ...tabFilters,
  };
}

export default function PartnerBooking() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [expandedBookingIds, setExpandedBookingIds] = useState([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedKeyword, serviceTypeFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      setLoading(true);
      setError(null);

      try {
        const response = await bookingService.getPartnerBookings(
          buildFilters({
            activeTab,
            keyword: debouncedKeyword,
            serviceType: serviceTypeFilter,
            page,
          }),
        );

        if (cancelled) {
          return;
        }

        const paged = unwrapPagedItems(response);
        const normalizedBookings = paged.items.map(normalizePartnerBooking);
        setBookings(normalizedBookings);
        setTotalCount(paged.totalCount);
        setTotalPages(Math.max(1, paged.totalPages));
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(requestError, PARTNER_BOOKING_TEXT.loadError));
        setBookings([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedKeyword, page, refreshKey, serviceTypeFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadTabCounts() {
      setStatsLoading(true);

      try {
        const responses = await Promise.all(
          PARTNER_BOOKING_TABS.map((tab) =>
            bookingService.getPartnerBookings({
              ...tab.getFilters(),
              keyword: debouncedKeyword || undefined,
              serviceType:
                serviceTypeFilter === "" ? undefined : Number(serviceTypeFilter),
              page: 1,
              pageSize: 1,
            }),
          ),
        );

        if (cancelled) {
          return;
        }

        const nextCounts = {};
        PARTNER_BOOKING_TABS.forEach((tab, index) => {
          nextCounts[tab.id] = unwrapPagedItems(responses[index]).totalCount;
        });
        setTabCounts(nextCounts);
      } catch {
        if (!cancelled) {
          setTabCounts({});
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    loadTabCounts();

    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, refreshKey, serviceTypeFilter]);

  async function runAction(bookingId, action) {
    setActionLoadingId(bookingId);
    setFeedback(null);

    try {
      if (action === "confirm") {
        await bookingService.confirmBooking(bookingId);
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessConfirm,
        });
      }

      if (action === "complete") {
        await bookingService.completeBooking(bookingId);
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessComplete,
        });
      }

      if (action === "cancel") {
        await bookingService.cancelPartnerBooking(bookingId, cancelReason.trim());
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessCancel,
        });
        setCancelTarget(null);
        setCancelReason("");
      }

      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      const fallback =
        action === "confirm"
          ? PARTNER_BOOKING_TEXT.fetchFailureConfirm
          : action === "complete"
            ? PARTNER_BOOKING_TEXT.fetchFailureComplete
            : PARTNER_BOOKING_TEXT.fetchFailureCancel;

      setFeedback({
        type: "error",
        message: getErrorMessage(requestError, fallback),
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleBookingRow(bookingId) {
    setExpandedBookingIds((current) =>
      current.includes(bookingId)
        ? current.filter((id) => id !== bookingId)
        : [...current, bookingId],
    );
  }

  const sortedBookings = [...bookings].sort((left, right) => {
    if (sortBy === "amount") {
      return right.finalAmount - left.finalAmount;
    }

    if (sortBy === "serviceTime") {
      return (
        new Date(right.schedule.primaryDate || 0).getTime() -
        new Date(left.schedule.primaryDate || 0).getTime()
      );
    }

    return (
      new Date(right.bookingDate || 0).getTime() -
      new Date(left.bookingDate || 0).getTime()
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-[#1a2332]">
            {PARTNER_BOOKING_TEXT.pageTitle}
          </h1>
          <p className="max-w-3xl text-sm text-[#5a6577] md:text-base">
            {PARTNER_BOOKING_TEXT.pageDescription}
          </p>
        </div>

        <FeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(null)}
        />

        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d95a3]" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={PARTNER_BOOKING_TEXT.searchPlaceholder}
              className="w-full rounded-2xl border border-[#d6dde6] bg-white py-3 pl-10 pr-4 text-sm text-[#1a2332] outline-none transition focus:border-[#008fa0] focus:ring-2 focus:ring-[#008fa0]/15"
            />
          </label>

          <select
            value={serviceTypeFilter}
            onChange={(event) => setServiceTypeFilter(event.target.value)}
            className="rounded-2xl border border-[#d6dde6] bg-white px-4 py-3 text-sm text-[#1a2332] outline-none transition focus:border-[#008fa0] focus:ring-2 focus:ring-[#008fa0]/15"
          >
            {PARTNER_SERVICE_TYPE_OPTIONS.map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-2xl border border-[#d6dde6] bg-white px-4 py-3 text-sm text-[#1a2332] outline-none transition focus:border-[#008fa0] focus:ring-2 focus:ring-[#008fa0]/15"
          >
            {PARTNER_BOOKING_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex min-w-max gap-2 p-3">
            {PARTNER_BOOKING_TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#008fa0] text-white"
                      : "bg-[#f4f6f8] text-[#5a6577] hover:bg-[#e8ecf0] hover:text-[#1a2332]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-[#5a6577]"
                    }`}
                  >
                    {statsLoading ? "…" : tabCounts[tab.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#e8ecf0] px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1a2332]">
                {totalCount} booking
              </h2>
              <p className="mt-1 text-sm text-[#5a6577]">
                {PARTNER_BOOKING_TABS.find((tab) => tab.id === activeTab)?.label}
              </p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-[#008fa0]" />}
          </div>

          {error && !loading ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="mt-4 rounded-xl bg-[#008fa0] px-4 py-2 text-sm font-medium text-white hover:bg-[#007a8a]"
              >
                {PARTNER_BOOKING_TEXT.retry}
              </button>
            </div>
          ) : null}

          {!error ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#edf1f5]">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#5a6577]">
                    <th className="px-6 py-3">{PARTNER_BOOKING_TEXT.bookingCode}</th>
                    <th className="px-6 py-3">{PARTNER_BOOKING_TEXT.customer}</th>
                    <th className="px-6 py-3">{PARTNER_BOOKING_TEXT.payment}</th>
                    <th className="px-6 py-3">{PARTNER_BOOKING_TEXT.status}</th>
                    <th className="px-6 py-3 text-right">
                      {PARTNER_BOOKING_TEXT.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f5]">
                  {!loading && sortedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <Clock3 className="mx-auto mb-3 h-10 w-10 text-[#8d95a3]" />
                        <p className="text-base font-medium text-[#1a2332]">
                          {PARTNER_BOOKING_TEXT.noBookings}
                        </p>
                        <p className="mt-1 text-sm text-[#5a6577]">
                          {debouncedKeyword
                            ? PARTNER_BOOKING_TEXT.keywordEmptyState(
                                debouncedKeyword,
                              )
                            : PARTNER_BOOKING_TEXT.noBookings}
                        </p>
                      </td>
                    </tr>
                  ) : null}

                  {sortedBookings.map((booking) => (
                    <Fragment key={booking.id}>
                      {(() => {
                        const isExpanded = expandedBookingIds.includes(booking.id);

                        return (
                          <>
                      <tr
                        key={`${booking.id}-main`}
                        onClick={() => toggleBookingRow(booking.id)}
                        className="cursor-pointer align-top transition hover:bg-[#f8fafc]"
                        aria-expanded={isExpanded}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e8ecf0] text-[#5a6577] transition ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </span>
                            <div className="space-y-1">
                              <div className="font-semibold text-[#1a2332]">
                                {booking.bookingCode}
                              </div>
                              <div className="text-xs text-[#5a6577]">
                                {formatDate(booking.bookingDate)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-[#1a2332]">
                              {booking.customerName}
                            </div>
                            {booking.contactEmail ? (
                              <div className="flex items-center gap-1 text-xs text-[#5a6577]">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{booking.contactEmail}</span>
                              </div>
                            ) : null}
                            {booking.contactPhone ? (
                              <div className="flex items-center gap-1 text-xs text-[#5a6577]">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{booking.contactPhone}</span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="font-semibold text-[#1a2332]">
                              {formatCurrency(booking.finalAmount)}
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${booking.paymentBadge.className}`}
                            >
                              {booking.paymentBadge.label}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${booking.fulfillmentBadge.className}`}
                          >
                            {booking.fulfillmentBadge.label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate("/PartnerBookingDetails", {
                                  state: { bookingId: booking.id },
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#d6dde6] px-3 py-2 text-xs font-medium text-[#1a2332] hover:bg-[#f4f6f8]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {PARTNER_BOOKING_TEXT.viewDetail}
                            </button>

                            {booking.canPartnerConfirm ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runAction(booking.id, "confirm");
                                }}
                                disabled={actionLoadingId === booking.id}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#0f766e] px-3 py-2 text-xs font-medium text-white hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoadingId === booking.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {PARTNER_BOOKING_TEXT.confirmBooking}
                              </button>
                            ) : null}

                            {booking.canPartnerComplete ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runAction(booking.id, "complete");
                                }}
                                disabled={actionLoadingId === booking.id}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#008fa0] px-3 py-2 text-xs font-medium text-white hover:bg-[#007a8a] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoadingId === booking.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {PARTNER_BOOKING_TEXT.completeBooking}
                              </button>
                            ) : null}

                            {booking.canPartnerCancel ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCancelTarget(booking);
                                  setCancelReason("");
                                }}
                                disabled={actionLoadingId === booking.id}
                                className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {PARTNER_BOOKING_TEXT.cancelBooking}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr key={`${booking.id}-detail`} className="border-b border-[#edf1f5]">
                          <td colSpan={5} className="px-6 pb-4 pt-0">
                            <div className="grid gap-4 rounded-2xl bg-[#e2e8ee] px-5 py-4 md:grid-cols-3">
                              <div>
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a6577]">
                                  {PARTNER_BOOKING_TEXT.service}
                                </div>
                                <ServiceOverviewSection booking={booking} />
                              </div>
                              <div>
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a6577]">
                                  {PARTNER_BOOKING_TEXT.time}
                                </div>
                                <TimeOverviewSection booking={booking} />
                              </div>
                              <div>
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5a6577]">
                                  {PARTNER_BOOKING_TEXT.operations}
                                </div>
                                <OperationalSnapshotCell booking={booking} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                          </>
                        );
                      })()}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-[#e8ecf0] px-6 py-4">
            <div className="text-sm text-[#5a6577]">
              Trang {page}/{totalPages} • {totalCount} booking
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="rounded-xl border border-[#d6dde6] p-2 text-[#5a6577] hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={page === totalPages}
                className="rounded-xl border border-[#d6dde6] p-2 text-[#5a6577] hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CancelBookingModal
        booking={cancelTarget}
        cancelReason={cancelReason}
        onChangeReason={setCancelReason}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason("");
        }}
        onConfirm={() => runAction(cancelTarget.id, "cancel")}
        loading={actionLoadingId === cancelTarget?.id}
      />
    </div>
  );
}
