import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import { partnerService } from "../../services/partnerService";

const fmt = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " ₫";

const activityConfig = {
  payment_captured: {
    label: "Tiền đã thu",
    icon: ArrowDownLeft,
    tone: "bg-green-50 text-green-700",
  },
  receivable_released: {
    label: "Thu nhập được mở khóa",
    icon: Wallet,
    tone: "bg-blue-50 text-blue-700",
  },
  refund_adjustment: {
    label: "Điều chỉnh hoàn tiền",
    icon: ArrowUpRight,
    tone: "bg-orange-50 text-orange-700",
  },
  payout_requested: {
    label: "Yêu cầu rút tiền",
    icon: Clock,
    tone: "bg-amber-50 text-amber-700",
  },
  payout_completed: {
    label: "Đã thanh toán",
    icon: Banknote,
    tone: "bg-emerald-50 text-emerald-700",
  },
  payout_rejected: {
    label: "Rút tiền bị từ chối",
    icon: XCircle,
    tone: "bg-red-50 text-red-700",
  },
};

const payoutStatusConfig = {
  pending: { label: "Chờ xử lý", tone: "bg-amber-50 text-amber-700" },
  completed: { label: "Đã thanh toán", tone: "bg-green-50 text-green-700" },
  rejected: { label: "Từ chối", tone: "bg-red-50 text-red-700" },
};

const activityStatusConfig = {
  pending: { label: "Đang chờ", tone: "bg-amber-50 text-amber-700" },
  completed: { label: "Hoàn thành", tone: "bg-green-50 text-green-700" },
  rejected: { label: "Bị từ chối", tone: "bg-red-50 text-red-700" },
};

const unwrap = (response) => response?.data || response || {};
const unwrapItems = (response) => {
  const data = unwrap(response);
  return data.items || data.Items || [];
};

const normalizeStatus = (status) => {
  if (typeof status === "string") return status.toLowerCase();
  return ["pending", "completed", "rejected"][status] || "pending";
};

const PartnerFinance = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawBankAccount, setWithdrawBankAccount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [dashboard, setDashboard] = useState({
    capturedGross: 0,
    commissionNet: 0,
    releasedNet: 0,
    ledgerBalance: 0,
    paidOut: 0,
    availableToWithdraw: 0,
    pendingPayout: 0,
    commissionRate: 0,
    monthlyReleasedNet: 0,
    monthlyGrowth: 0,
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
  });
  const [activities, setActivities] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activityFilter, setActivityFilter] = useState("");

  const fetchFinanceData = async () => {
    setLoading(true);
    setError("");

    try {
      const txFilters = { page: 1, pageSize: 100 };
      if (activityFilter) txFilters.activityType = activityFilter;

      const [dashboardRes, activitiesRes, payoutsRes, profileRes] =
        await Promise.all([
          partnerService.getDashboard(),
          partnerService.getTransactions(txFilters),
          partnerService.getPayouts(1, 50),
          partnerService.getProfile().catch(() => null),
        ]);

      const summary = unwrap(dashboardRes);
      const profile = unwrap(profileRes);
      setDashboard({
        capturedGross: summary.capturedGross || 0,
        commissionNet: summary.commissionNet || 0,
        releasedNet: summary.releasedNet || 0,
        ledgerBalance: summary.ledgerBalance || 0,
        paidOut: summary.paidOut || 0,
        availableToWithdraw: summary.availableToWithdraw || 0,
        pendingPayout: summary.pendingPayout || 0,
        commissionRate: summary.commissionRate || 0,
        monthlyReleasedNet: summary.monthlyReleasedNet || 0,
        monthlyGrowth: summary.monthlyGrowth || 0,
        totalBookings: summary.totalBookings || 0,
        completedBookings: summary.completedBookings || 0,
        pendingBookings: summary.pendingBookings || 0,
        cancelledBookings: summary.cancelledBookings || 0,
      });
      setWithdrawBank((current) => current || profile.bankName || "");
      setWithdrawBankAccount(
        (current) => current || profile.bankAccountNumber || "",
      );

      setActivities(
        unwrapItems(activitiesRes)
          .filter((item) => item.activityType !== "payment_captured")
          .map((item) => ({
          ...item,
          activityType: item.activityType || "receivable_released",
          status: (item.status || "completed").toLowerCase(),
        })),
      );

      setPayouts(
        unwrapItems(payoutsRes).map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
        })),
      );
    } catch (err) {
      console.error("Partner finance fetch failed", err);
      setError("Không thể tải dữ liệu tài chính. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [activityFilter]);

  const refundRate = useMemo(() => {
    if (!activities.length) return 0;
    const refunds = activities.filter(
      (activity) => activity.activityType === "refund_adjustment",
    ).length;
    return (refunds / activities.length) * 100;
  }, [activities]);

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      window.alert("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    if (amount > dashboard.availableToWithdraw) {
      window.alert("Số tiền rút vượt quá số dư khả dụng.");
      return;
    }

    if (!withdrawBank.trim() || !withdrawBankAccount.trim()) {
      window.alert("Vui lòng nhập đầy đủ tên ngân hàng và số tài khoản.");
      return;
    }

    setWithdrawLoading(true);
    try {
      await partnerService.requestPayout({
        amount,
        bankName: withdrawBank.trim(),
        bankAccount: withdrawBankAccount.trim(),
        note: null,
      });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawBank("");
      setWithdrawBankAccount("");
      await fetchFinanceData();
    } catch (err) {
      console.error("Withdraw request failed", err);
      window.alert("Không thể gửi yêu cầu rút tiền.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-[#5a6577]">
          Đang tải dữ liệu tài chính...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#e8ecf0] p-8 text-center max-w-md w-full">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-[#1a2332] font-medium mb-2">{error}</p>
          <button
            onClick={fetchFinanceData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a2332] mb-1">Tài chính</h1>
          <p className="text-sm text-[#5a6577]">
            Theo dõi dòng tiền từ thu tiền đến thanh toán đã chi trả.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFinanceData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#e8ecf0] rounded-lg text-sm text-[#3d4654] hover:bg-white"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <Banknote className="w-4 h-4" />
            Yêu cầu rút tiền
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Luồng tài chính hiện tại</p>
          <p>
            Tiền của khách được ghi nhận khi thanh toán thành công. Thu nhập của
            đối tác chỉ được mở khóa sau khi đặt chỗ hoàn thành, và yêu cầu rút
            tiền chỉ trừ khỏi sổ cái khi yêu cầu thanh toán được phê duyệt.
          </p>
        </div>
      </div>

      <div className="border-b border-[#e8ecf0] mb-8">
        <nav className="-mb-px flex flex-wrap gap-6">
          {[
            ["overview", "Tổng quan"],
            ["activity", "Lịch sử giao dịch"],
            ["payouts", "Lịch sử rút tiền"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-[#5a6577] hover:text-[#1a2332]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e8ecf0]">
                <h3 className="text-base font-semibold text-[#1a2332]">
                  Hoạt động gần đây
                </h3>
              </div>
              <div className="divide-y divide-[#f0f2f4]">
                {activities.slice(0, 6).map((activity) => {
                  const config =
                    activityConfig[activity.activityType] ||
                    activityConfig.payment_captured;
                  const Icon = config.icon;
                  return (
                    <div
                      key={activity.id}
                      className="px-6 py-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${config.tone}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1a2332] truncate">
                            {config.label}
                          </p>
                          <p className="text-xs text-[#8d95a3] truncate">
                            {activity.serviceName ||
                              activity.description ||
                              activity.bookingCode ||
                              "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#1a2332]">
                          {fmt(activity.activityType === "refund_adjustment" ? activity.grossAmount : (activity.partnerDelta ?? activity.grossAmount))}
                        </p>
                        <p className="text-xs text-[#8d95a3]">
                          {activity.occurredAt
                            ? new Date(activity.occurredAt).toLocaleString(
                                "vi-VN",
                              )
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-[#8d95a3]">
                    Chưa có hoạt động tài chính.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h3 className="text-base font-semibold text-[#1a2332] mb-4">
                Trạng thái đặt chỗ
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#5a6577]">Đã hoàn thành</span>
                  <span className="font-semibold text-[#1a2332]">
                    {dashboard.completedBookings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5a6577]">Đã xác nhận</span>
                  <span className="font-semibold text-[#1a2332]">
                    {dashboard.pendingBookings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5a6577]">Đã hủy</span>
                  <span className="font-semibold text-[#1a2332]">
                    {dashboard.cancelledBookings}
                  </span>
                </div>
                <div className="pt-4 border-t border-[#f0f2f4]">
                  <p className="text-[#5a6577] mb-1">Hoa hồng đối tác</p>
                  <p className="text-xl font-bold text-[#1a2332]">
                    {dashboard.commissionRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["", "Tất cả"],
              ["ReceivableReleased", "Tiền đã thu"],
              ["RefundAdjustment", "Điều chỉnh hoàn tiền"],
              ["PayoutRequested", "Yêu cầu rút tiền"],
              ["PayoutCompleted", "Đã thanh toán"],
              ["PayoutRejected", "Rút tiền bị từ chối"],
            ].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setActivityFilter(code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  activityFilter === code
                    ? "bg-primary text-white"
                    : "bg-white border border-[#e8ecf0] text-[#5a6577]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f9fafb] border-b border-[#e8ecf0]">
                <tr>
                  {[
                    "Hoạt động",
                    "Đặt chỗ",
                    "Khách hàng",
                    "Dịch vụ",
                    "Tổng",
                    "Thu nhập của tôi",
                    "Hoa hồng nền tảng",
                    "Trạng thái",
                    "Thời gian",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left font-medium text-[#5a6577]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {activities.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-[#8d95a3]"
                    >
                      Chưa có hoạt động tài chính.
                    </td>
                  </tr>
                )}
                {activities.map((activity) => {
                  const config =
                    activityConfig[activity.activityType] ||
                    activityConfig.payment_captured;
                  const Icon = config.icon;

                  return (
                    <tr key={activity.id} className="hover:bg-[#f9fafb]">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.tone}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#5a6577]">
                        {activity.bookingCode || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {activity.customerName || "—"}
                      </td>
                      <td className="px-4 py-3">{activity.serviceName || "—"}</td>
                      <td className="px-4 py-3">{fmt(activity.grossAmount)}</td>
                      <td
                        className={`px-4 py-3 font-medium ${activity.partnerDelta < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {fmt(activity.partnerDelta)}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${activity.commissionDelta < 0 ? "text-red-600" : "text-blue-600"}`}
                      >
                        {fmt(activity.commissionDelta)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${(activityStatusConfig[activity.status] || activityStatusConfig.completed).tone}`}
                        >
                          {
                            (
                              activityStatusConfig[activity.status] ||
                              activityStatusConfig.completed
                            ).label
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5a6577]">
                        {activity.occurredAt
                          ? new Date(activity.occurredAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payouts" && (
        <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8ecf0]">
            <h3 className="text-base font-semibold text-[#1a2332]">
              Lịch sử rút tiền
            </h3>
            <p className="text-sm text-[#5a6577] mt-1">
              Các yêu cầu đang chờ sẽ giảm số dư khả dụng, các yêu cầu đã thanh
              toán tạo giao dịch hoàn tất.
            </p>
          </div>
          <div className="divide-y divide-[#f0f2f4]">
            {payouts.length === 0 && (
              <div className="px-6 py-10 text-center text-[#8d95a3]">
                Chưa có yêu cầu rút tiền.
              </div>
            )}
            {payouts.map((payout) => {
              const statusConfig =
                payoutStatusConfig[payout.status] || payoutStatusConfig.pending;
              return (
                <div
                  key={payout.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1a2332]">
                      {fmt(payout.ledgerAmount)}
                    </p>
                    <p className="text-xs text-[#8d95a3]">
                      {payout.bankName || "—"} · {payout.bankAccount || "—"}
                    </p>
                    <p className="text-xs text-[#8d95a3]">
                      Yêu cầu lúc:{" "}
                      {payout.requestedAt
                        ? new Date(payout.requestedAt).toLocaleString("vi-VN")
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.tone}`}
                    >
                      {statusConfig.label}
                    </span>
                    <p className="text-xs text-[#8d95a3] mt-2">
                      {payout.transactionReference ||
                        payout.note ||
                        "Không có ghi chú"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[#1a2332] mb-1">
              Yêu cầu rút tiền
            </h3>
            <p className="text-sm text-[#5a6577] mb-5">
              Có thể rút:{" "}
              <span className="font-semibold text-green-600">
                {fmt(dashboard.availableToWithdraw)}
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-1">
                  Số tiền muốn rút
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl bg-white"
                  placeholder="VD: 5000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-1">
                  Tên ngân hàng
                </label>
                <input
                  type="text"
                  value={withdrawBank}
                  onChange={(event) => setWithdrawBank(event.target.value)}
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl bg-white"
                  placeholder="VD: Vietcombank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-1">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  value={withdrawBankAccount}
                  onChange={(event) =>
                    setWithdrawBankAccount(event.target.value)
                  }
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl bg-white"
                  placeholder="Nhập số tài khoản"
                />
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  Các yêu cầu đang chờ sẽ khóa số dư khả dụng. Số dư sổ cái chỉ
                  giảm khi yêu cầu được phê duyệt.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-[#e8ecf0] text-[#5a6577] rounded-xl hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-50"
              >
                {withdrawLoading ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerFinance;
