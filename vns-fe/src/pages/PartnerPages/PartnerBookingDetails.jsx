import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Wallet,
  XCircle,
} from "lucide-react";
import { bookingService } from "../../services/bookingService";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPaymentBadge,
  getPaymentMethodLabel,
  normalizePartnerBooking,
} from "../../utils/partnerBookingPresentation";
import { PARTNER_BOOKING_TEXT } from "../../utils/partnerBookingText";

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

function SectionCard({ title, children, icon: Icon }) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 text-[#008fa0]" /> : null}
        <h2 className="text-base font-semibold text-[#1a2332]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoList({ rows }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm text-[#1a2332]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BookingLineItems({ details, totalAmount }) {
  if (!details.length) {
    return <p className="text-sm text-[#5a6577]">{PARTNER_BOOKING_TEXT.notAvailable}</p>;
  }

  const total = totalAmount || details.reduce((sum, d) => sum + (d.subTotal || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#edf1f5]">
        <thead className="bg-[#f8fafc]">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#5a6577]">
            <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.service}</th>
            <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.quantity}</th>
            <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.unitPrice}</th>
            <th className="px-4 py-3 text-right">{PARTNER_BOOKING_TEXT.subtotal}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f5]">
          {details.map((detail) => {
            const scheduleDateRange = detail.startDate && detail.endDate
              ? `${formatDate(detail.startDate)} - ${formatDate(detail.endDate)}`
              : null;
            const lineName =
              detail.roomName ||
              detail.tourPricingTierName ||
              detail.tourPackageName ||
              scheduleDateRange ||
              PARTNER_BOOKING_TEXT.unknownService;

            const lineMeta = [scheduleDateRange, detail.tourScheduleRunInfo && `Lượt khởi hành ${detail.tourScheduleRunInfo}`]
              .filter(Boolean)
              .join(" • ");

            return (
              <tr key={detail.id}>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="font-medium text-[#1a2332]">{lineName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#1a2332]">
                  {detail.quantity}
                </td>
                <td className="px-4 py-3 text-sm text-[#1a2332]">
                  {formatCurrency(detail.unitPrice)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#1a2332]">
                  {formatCurrency(detail.subTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#edf1f5]">
            <td className="px-4 py-3 text-sm font-semibold text-[#1a2332]">
              {PARTNER_BOOKING_TEXT.amount}
            </td>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-[#008fa0]">
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ComboItemsSection({ comboItems }) {
  if (!comboItems.length) {
    return <p className="text-sm text-[#5a6577]">{PARTNER_BOOKING_TEXT.notAvailable}</p>;
  }

  return (
    <div className="grid gap-4">
      {comboItems.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1a2332]">
                {item.serviceName}
              </div>
              <div className="mt-1 text-xs text-[#5a6577]">
                {item.roomName ||
                  item.tourPricingTierName ||
                  (item.startDate && item.endDate ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}` : null) ||
                  PARTNER_BOOKING_TEXT.unknownService}
              </div>
              <div className="mt-1 text-xs text-[#5a6577]">
                {[item.startDate && item.endDate ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}` : null, item.tourScheduleRunInfo && `Lượt khởi hành ${item.tourScheduleRunInfo}`]
                  .filter(Boolean)
                  .join(" • ") || PARTNER_BOOKING_TEXT.notAvailable}
              </div>
            </div>
            <div className="text-right text-sm text-[#1a2332]">
              <div>{PARTNER_BOOKING_TEXT.quantity}: {item.quantity}</div>
              <div>{PARTNER_BOOKING_TEXT.unitPrice}: {formatCurrency(item.unitPrice)}</div>
              <div className="font-semibold text-[#008fa0]">
                {formatCurrency(item.subTotal)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentSection({ booking }) {
  return (
    <div className="space-y-5">
      <SectionCard title={PARTNER_BOOKING_TEXT.paymentHistory} icon={Receipt}>
        {booking.payments.length === 0 ? (
          <p className="text-sm text-[#5a6577]">{PARTNER_BOOKING_TEXT.emptyPayments}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#edf1f5]">
              <thead className="bg-[#f8fafc]">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#5a6577]">
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.paymentMethod}</th>
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.paymentStatus}</th>
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.amount}</th>
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.wallet}</th>
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.vnPay}</th>
                  <th className="px-4 py-3">{PARTNER_BOOKING_TEXT.paidAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f5]">
                {booking.payments.map((payment) => {
                  const paymentBadge = getPaymentBadge(
                    payment.paymentStatus,
                    booking.commercialStatus,
                  );

                  return (
                    <tr key={payment.id}>
                    <td className="px-4 py-3 text-sm text-[#1a2332]">
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${paymentBadge.className}`}
                      >
                        {paymentBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1a2332]">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1a2332]">
                      {formatCurrency(payment.walletAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1a2332]">
                      {formatCurrency(payment.vnPayAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1a2332]">
                      {formatDateTime(payment.paidAt)}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {booking.cancellationReason ? (
        <SectionCard title={PARTNER_BOOKING_TEXT.cancellationReason} icon={XCircle}>
          <p className="text-sm text-[#1a2332]">{booking.cancellationReason}</p>
        </SectionCard>
      ) : null}

      {booking.refundSummary && booking.refundBadge ? (
        <SectionCard title={PARTNER_BOOKING_TEXT.refundInfo} icon={Wallet}>
          <div className="space-y-5">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${booking.refundBadge.className}`}
            >
              {booking.refundBadge.label}
            </span>

            <InfoList
              rows={[
                {
                  label: PARTNER_BOOKING_TEXT.requestedAmount,
                  value: formatCurrency(booking.refundSummary.requestedAmount),
                },
                ...(booking.refundSummary.approvedAmount != null
                  ? [{
                      label: PARTNER_BOOKING_TEXT.approvedAmount,
                      value: formatCurrency(booking.refundSummary.approvedAmount),
                    }]
                  : []),
                {
                  label: PARTNER_BOOKING_TEXT.processedAt,
                  value: formatDateTime(booking.refundSummary.processedAt),
                },
              ]}
            />

            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
                {PARTNER_BOOKING_TEXT.refundReason}
              </div>
              <p className="mt-2 text-sm text-[#1a2332]">
                {booking.refundSummary.reason || PARTNER_BOOKING_TEXT.notAvailable}
              </p>
            </div>

            {booking.refundSummary.adminNote ? (
              <div className="rounded-2xl bg-[#f8fafc] p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
                  {PARTNER_BOOKING_TEXT.refundNote}
                </div>
                <p className="mt-2 text-sm text-[#1a2332]">
                  {booking.refundSummary.adminNote}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function RefundSection({ booking }) {
  if (!booking.refundSummary) {
    return null;
  }

  const refundBadge = booking.refundBadge;
  if (!refundBadge) return null;

  return (
    <SectionCard title={PARTNER_BOOKING_TEXT.refundInfo} icon={Wallet}>
      <div className="space-y-5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${refundBadge.className}`}
        >
          {refundBadge.label}
        </span>

        <InfoList
          rows={[
            {
              label: PARTNER_BOOKING_TEXT.requestedAmount,
              value: formatCurrency(booking.refundSummary.requestedAmount),
            },
            ...(booking.refundSummary.approvedAmount != null
              ? [{
                  label: PARTNER_BOOKING_TEXT.approvedAmount,
                  value: formatCurrency(booking.refundSummary.approvedAmount),
                }]
              : []),
            {
              label: PARTNER_BOOKING_TEXT.processedAt,
              value: formatDateTime(booking.refundSummary.processedAt),
            },
          ]}
        />

        <div className="rounded-2xl bg-[#f8fafc] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
            {PARTNER_BOOKING_TEXT.refundReason}
          </div>
          <p className="mt-2 text-sm text-[#1a2332]">
            {booking.refundSummary.reason || PARTNER_BOOKING_TEXT.notAvailable}
          </p>
        </div>

        {booking.refundSummary.adminNote ? (
          <div className="rounded-2xl bg-[#f8fafc] p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
              {PARTNER_BOOKING_TEXT.refundNote}
            </div>
            <p className="mt-2 text-sm text-[#1a2332]">
              {booking.refundSummary.adminNote}
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export default function PartnerBookingDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeId } = useParams();

  const bookingId =
    routeId || location.state?.bookingId || location.state?.booking?.id || null;

  const [booking, setBooking] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBooking() {
      if (!bookingId) {
        setError(PARTNER_BOOKING_TEXT.noBookingId);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await bookingService.getPartnerBookingById(bookingId);
        if (cancelled) {
          return;
        }

        const normalizedBooking = normalizePartnerBooking(response.data);
        setBooking(normalizedBooking);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            getErrorMessage(requestError, PARTNER_BOOKING_TEXT.loadError),
          );
          setBooking(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId, refreshKey]);

  async function runAction(action) {
    if (!booking) {
      return;
    }

    setActionLoading(action);
    setFeedback(null);

    try {
      if (action === "confirm") {
        await bookingService.confirmBooking(booking.id);
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessConfirm,
        });
      }

      if (action === "complete") {
        await bookingService.completeBooking(booking.id);
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessComplete,
        });
      }

      if (action === "cancel") {
        await bookingService.cancelPartnerBooking(
          booking.id,
          PARTNER_BOOKING_TEXT.partnerCancelReasonDefault,
        );
        setFeedback({
          type: "success",
          message: PARTNER_BOOKING_TEXT.fetchSuccessCancel,
        });
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
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] p-6">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#008fa0]" />
            <p className="text-sm text-[#5a6577]">{PARTNER_BOOKING_TEXT.loadDetail}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600">{error || PARTNER_BOOKING_TEXT.loadError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/PartnerBooking")}
              className="rounded-xl border border-[#d6dde6] px-4 py-2 text-sm font-medium text-[#5a6577] hover:bg-[#f4f6f8]"
            >
              {PARTNER_BOOKING_TEXT.backToList}
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-xl bg-[#008fa0] px-4 py-2 text-sm font-medium text-white hover:bg-[#007a8a]"
            >
              {PARTNER_BOOKING_TEXT.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timelineRows = [
    {
      label: PARTNER_BOOKING_TEXT.bookedAt,
      value: formatDateTime(booking.bookingDate),
    },
    {
      label: PARTNER_BOOKING_TEXT.paymentDueAt,
      value: formatDateTime(booking.expiresAt),
    },
    {
      label: PARTNER_BOOKING_TEXT.paidAt,
      value: formatDateTime(booking.payment?.paidAt),
    },
    {
      label: PARTNER_BOOKING_TEXT.confirmedAt,
      value: formatDateTime(booking.confirmedAt),
    },
    {
      label: PARTNER_BOOKING_TEXT.completedAt,
      value: formatDateTime(booking.completedAt),
    },
    {
      label: PARTNER_BOOKING_TEXT.cancelledAt,
      value: formatDateTime(booking.cancelledAt),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/PartnerBooking")}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[#d6dde6] bg-white px-4 py-2 text-sm font-medium text-[#1a2332] hover:bg-[#f8fafc]"
        >
          <ArrowLeft className="h-4 w-4" />
          {PARTNER_BOOKING_TEXT.backToList}
        </button>

        <FeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(null)}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm font-medium text-[#008fa0]">
                    {booking.bookingCode}
                  </div>
                  <h1 className="mt-2 text-3xl font-bold text-[#1a2332]">
                    {booking.displayName}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-[#5a6577]">
                    {PARTNER_BOOKING_TEXT.detailDescription}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${booking.fulfillmentBadge.className}`}
                >
                  {booking.fulfillmentBadge.label}
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${booking.commercialBadge.className}`}
                >
                  {booking.commercialBadge.label}
                </span>
              </div>
            </section>

            <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white">
              <div className="flex min-w-max gap-2 p-3">
                {Object.entries(PARTNER_BOOKING_TEXT.detailTabs).map(
                  ([tabId, label]) => (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() => setActiveTab(tabId)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                        activeTab === tabId
                          ? "bg-[#008fa0] text-white"
                          : "bg-[#f4f6f8] text-[#5a6577] hover:bg-[#e8ecf0] hover:text-[#1a2332]"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {activeTab === "summary" ? (
              <div className="grid gap-6">
                <SectionCard title={PARTNER_BOOKING_TEXT.bookingInfo} icon={Calendar}>
                  <InfoList
                    rows={[
                      {
                        label: PARTNER_BOOKING_TEXT.service,
                        value: booking.displayName,
                      },
                      {
                        label: PARTNER_BOOKING_TEXT.time,
                        value: booking.scheduleLabel,
                      },
                      {
                        label: PARTNER_BOOKING_TEXT.guests,
                        value: booking.partyLabel,
                      },
                    ]}
                  />

                  {booking.specialRequests ? (
                    <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
                        {PARTNER_BOOKING_TEXT.specialRequests}
                      </div>
                      <p className="mt-2 text-sm text-[#1a2332]">
                        {booking.specialRequests}
                      </p>
                    </div>
                  ) : null}

                  {booking.isCombo ? (
                    <div className="mt-5 space-y-3">
                      <h3 className="text-sm font-semibold text-[#1a2332]">
                        {PARTNER_BOOKING_TEXT.comboItems}
                      </h3>
                      <ComboItemsSection comboItems={booking.comboItems} />
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      <h3 className="text-sm font-semibold text-[#1a2332]">
                        {PARTNER_BOOKING_TEXT.lineItems}
                      </h3>
                      <BookingLineItems details={booking.details} totalAmount={booking.finalAmount} />
                    </div>
                  )}
                </SectionCard>

                <SectionCard title={PARTNER_BOOKING_TEXT.contactInfo} icon={Phone}>
                  <InfoList
                    rows={[
                      {
                        label: PARTNER_BOOKING_TEXT.customer,
                        value: booking.customerName,
                      },
                    ]}
                  />

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#f8fafc] p-4 text-sm text-[#1a2332]">
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        <Mail className="h-4 w-4 text-[#008fa0]" />
                        <span>Email</span>
                      </div>
                      <div>{booking.contactEmail || PARTNER_BOOKING_TEXT.notAvailable}</div>
                    </div>
                    <div className="rounded-2xl bg-[#f8fafc] p-4 text-sm text-[#1a2332]">
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        <Phone className="h-4 w-4 text-[#008fa0]" />
                        <span>Số điện thoại</span>
                      </div>
                      <div>{booking.contactPhone || PARTNER_BOOKING_TEXT.notAvailable}</div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeTab === "payment" ? <PaymentSection booking={booking} /> : null}
          </div>

          <aside className="space-y-6">
            <SectionCard title={PARTNER_BOOKING_TEXT.timeline} icon={Clock3}>
              <div className="space-y-4">
                {timelineRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-[#f8fafc] px-4 py-3"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-[#5a6577]">
                      {row.label}
                    </span>
                    <span className="text-right text-sm text-[#1a2332]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={PARTNER_BOOKING_TEXT.actions} icon={MessageSquare}>
              <div className="space-y-3">
                {booking.canPartnerConfirm ? (
                  <button
                    type="button"
                    onClick={() => runAction("confirm")}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-medium text-white hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "confirm" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {PARTNER_BOOKING_TEXT.confirmBooking}
                  </button>
                ) : null}

                {booking.canPartnerComplete ? (
                  <button
                    type="button"
                    onClick={() => runAction("complete")}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#008fa0] px-4 py-3 text-sm font-medium text-white hover:bg-[#007a8a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "complete" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {PARTNER_BOOKING_TEXT.completeBooking}
                  </button>
                ) : null}

                {booking.canPartnerCancel ? (
                  <button
                    type="button"
                    onClick={() => runAction("cancel")}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {PARTNER_BOOKING_TEXT.cancelBooking}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (!booking.userId) {
                      setFeedback({
                        type: "error",
                        message: PARTNER_BOOKING_TEXT.messagingUnavailable,
                      });
                      return;
                    }

                    navigate("/PartnerMessaging", {
                      state: {
                        targetUserId: booking.userId,
                        targetUserName: booking.customerName,
                        bookingCode: booking.bookingCode,
                        serviceName: booking.serviceName,
                        checkInDate: booking.checkInDate,
                        checkOutDate: booking.checkOutDate,
                      },
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d6dde6] px-4 py-3 text-sm font-medium text-[#1a2332] hover:bg-[#f8fafc]"
                >
                  <MessageSquare className="h-4 w-4" />
                  {PARTNER_BOOKING_TEXT.messageCustomer}
                </button>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
