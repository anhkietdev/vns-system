import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  TrendingDown,
  Wallet,
  XCircle,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";

const fmt = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " ₫";

const activityConfig = {
  receivable_released: {
    label: "Tiền đã thu",
    icon: Wallet,
    tone: "bg-blue-50 text-blue-700",
  },
  refund_adjustment: {
    label: "Điều chỉnh hoàn tiền",
    icon: TrendingDown,
    tone: "bg-orange-50 text-orange-700",
  },
  payout_requested: {
    label: "Yêu cầu thanh toán",
    icon: Clock,
    tone: "bg-amber-50 text-amber-700",
  },
  payout_completed: {
    label: "Đã thanh toán",
    icon: Banknote,
    tone: "bg-emerald-50 text-emerald-700",
  },
  payout_rejected: {
    label: "Từ chối thanh toán",
    icon: XCircle,
    tone: "bg-red-50 text-red-700",
  },
};

const statusLabels = {
  completed: "Hoàn thành",
  pending: "Đang chờ",
  rejected: "Từ chối",
};

const payoutStatusConfig = {
  pending: {
    label: "Chờ xử lý",
    tone: "bg-amber-50 text-amber-700",
    icon: Clock,
  },
  completed: {
    label: "Đã thanh toán",
    tone: "bg-green-50 text-green-700",
    icon: CheckCircle,
  },
  rejected: {
    label: "Từ chối",
    tone: "bg-red-50 text-red-700",
    icon: XCircle,
  },
};

const unwrap = (response) => response?.data || response || {};

function PaginationBar({ page, totalPages, totalCount, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#e8ecf0] bg-white">
      <span className="text-sm text-[#5a6577]">Tổng: {totalCount}</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`px-3 py-1 text-sm rounded-lg ${page <= 1 ? "text-[#c0c7d1] cursor-not-allowed" : "text-[#5a6577] hover:bg-[#f0f2f4]"}`}
        >
          Trước
        </button>
        <span className="text-sm text-[#1a2332] font-medium">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={`px-3 py-1 text-sm rounded-lg ${page >= totalPages ? "text-[#c0c7d1] cursor-not-allowed" : "text-[#5a6577] hover:bg-[#f0f2f4]"}`}
        >
          Sau
        </button>
      </div>
    </div>
  );
}

const normalizeStatus = (status) => {
  if (typeof status === "string") return status.toLowerCase();
  return ["pending", "completed", "rejected"][status] || "pending";
};

const ManagerFinance = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processLoading, setProcessLoading] = useState(null);
  const [payoutFilter, setPayoutFilter] = useState("all");
  const [overview, setOverview] = useState({
    capturedGross: 0,
    refundedGross: 0,
    netCommission: 0,
    releasedPartnerEarnings: 0,
    paidOutNet: 0,
    pendingPayouts: 0,
    currentPartnerPayable: 0,
    totalTransactions: 0,
    monthlyGrowth: 0,
  });
  const [partnerBalances, setPartnerBalances] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(0);
  const [payoutTotalCount, setPayoutTotalCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(0);
  const [transactionTotalCount, setTransactionTotalCount] = useState(0);
  const [balancePage, setBalancePage] = useState(1);
  const balancePageSize = 10;

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [revenueRes, payoutsRes, activitiesRes, balancesRes] = await Promise.all([
        adminService.getRevenue(),
        adminService.getPayouts(payoutPage, 10),
        adminService.getTransactions({ page: transactionPage, pageSize: 10 }),
        adminService.getPartnerBalances(),
      ]);

      const revenue = unwrap(revenueRes);
      const payoutResponse = unwrap(payoutsRes);
      const payoutsData = payoutResponse.items || payoutResponse.Items || [];
      const activityResponse = unwrap(activitiesRes);
      const activityData = activityResponse.items || activityResponse.Items || [];
      const balances = unwrap(balancesRes);

      setOverview({
        capturedGross: revenue.capturedGross || 0,
        refundedGross: revenue.refundedGross || 0,
        netCommission: revenue.netCommission || 0,
        releasedPartnerEarnings: revenue.releasedPartnerEarnings || 0,
        paidOutNet: revenue.paidOutNet || 0,
        pendingPayouts: revenue.pendingPayouts || 0,
        currentPartnerPayable: revenue.currentPartnerPayable || 0,
        totalTransactions: revenue.totalTransactions || 0,
        monthlyGrowth: revenue.monthlyGrowth || 0,
      });

      setPartnerBalances(balances.items || balances.Items || []);
      setBalancePage(1);

      setPayouts(
        payoutsData.map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
        })),
      );
      setPayoutTotalPages(payoutResponse.totalPages || payoutResponse.TotalPages || 0);
      setPayoutTotalCount(payoutResponse.totalCount || payoutResponse.TotalCount || 0);

      setActivities(
        activityData
          .filter((item) => item.activityType !== "payment_captured")
          .map((item) => ({
          ...item,
          status: (item.status || "completed").toLowerCase(),
          activityType: item.activityType || "payment_captured",
        })),
      );
      setTransactionTotalPages(activityResponse.totalPages || activityResponse.TotalPages || 0);
      setTransactionTotalCount(activityResponse.totalCount || activityResponse.TotalCount || 0);
    } catch (err) {
      console.error("Finance fetch failed", err);
      setError("Không thể tải dữ liệu tài chính. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [payoutPage, transactionPage]);

  const handleProcessPayout = async (payoutId, isApproved) => {
    const note = window.prompt(
      isApproved ? "Ghi chú thanh toán (tùy chọn)" : "Lý do từ chối (tùy chọn)",
      "",
    );
    const transactionReference = isApproved
      ? window.prompt("Mã giao dịch ngân hàng (tùy chọn)", "") || null
      : null;

    setProcessLoading(payoutId);
    try {
      await adminService.processPayout(payoutId, {
        isApproved,
        note: note || null,
        transactionReference,
      });
      await fetchData();
    } catch (err) {
      console.error("Process payout failed", err);
      window.alert("Không thể xử lý thanh toán.");
    } finally {
      setProcessLoading(null);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (payoutFilter === "all") return payouts;
    return payouts.filter((item) => item.status === payoutFilter);
  }, [payoutFilter, payouts]);

  const balanceTotalPages = Math.max(1, Math.ceil(partnerBalances.length / balancePageSize));
  const paginatedBalances = partnerBalances.slice(
    (balancePage - 1) * balancePageSize,
    balancePage * balancePageSize,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-[#5a6577]">Đang tải dữ liệu tài chính...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a2332] mb-1">Tài chính nền tảng</h1>
          <p className="text-sm text-[#5a6577]">
            Thu nhập thống nhất cho doanh thu, chi trả đối tác và hoàn tiền.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#e8ecf0] rounded-lg text-sm text-[#3d4654] hover:bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Tải lại
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border-b border-[#e8ecf0] mb-8">
        <nav className="-mb-px flex flex-wrap gap-6">
          {[
            ["overview", "Tổng quan"],
            ...(isAdmin ? [["payouts", "Yêu cầu thanh toán"]] : []),
            ["transactions", "Lịch sử giao dịch"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-[#5a6577] hover:text-[#3d4654]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: "Tổng giao dịch",
                value: (overview.totalTransactions || 0).toLocaleString("vi-VN"),
                sub: `giao dịch`,
                icon: RefreshCw,
                tone: "bg-blue-100 text-blue-700",
              },
              {
                label: "Thu nhập",
                value: fmt(overview.netCommission),
                sub: `${overview.monthlyGrowth > 0 ? "+" : ""}${overview.monthlyGrowth}% so với tháng trước`,
                icon: CreditCard,
                tone: "bg-green-100 text-green-700",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl border border-[#e8ecf0] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${card.tone}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-sm text-[#5a6577] mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-[#1a2332]">{card.value}</p>
                  <p className="text-xs text-[#8d95a3] mt-1">{card.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8ecf0]">
              <h3 className="text-lg font-semibold text-[#1a2332]">Số dư đối tác</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f9fafb] text-[#5a6577]">
                  <tr>
                    {[
                      "Đối tác",
                      "Thu nhập",
                      "Hoa hồng",
                      "Đã hoàn",
                      "Có thể rút",
                      "Chờ thanh toán",
                      "Đã chi trả",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {partnerBalances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[#8d95a3]">
                        Chưa có dữ liệu.
                      </td>
                    </tr>
                  )}
                  {paginatedBalances.map((partner) => (
                    <tr key={partner.partnerId} className="hover:bg-[#f9fafb]">
                      <td className="px-4 py-3 font-medium text-[#1a2332]">{partner.partnerName}</td>
                      <td className="px-4 py-3 font-semibold text-[#1a2332]">{fmt(partner.ledgerBalance)}</td>
                      <td className="px-4 py-3 text-blue-600">{fmt(partner.commissionNet)}</td>
                      <td className="px-4 py-3 text-orange-600">{fmt(partner.refundedGross)}</td>
                      <td className="px-4 py-3 text-green-600">{fmt(partner.availableToWithdraw)}</td>
                      <td className="px-4 py-3 text-amber-600">{fmt(partner.pendingPayout)}</td>
                      <td className="px-4 py-3">{fmt(partner.paidOut)}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
          <PaginationBar page={transactionPage} totalPages={transactionTotalPages} totalCount={transactionTotalCount} onPageChange={setTransactionPage} />
        </div>
        </div>
      )}

      {activeTab === "payouts" && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tất cả"],
              ["pending", "Chờ xử lý"],
              ["completed", "Đã thanh toán"],
              ["rejected", "Từ chối"],
            ].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setPayoutFilter(code)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  payoutFilter === code
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
                    "Đối tác",
                    "Yêu cầu",
                    "Số dư thu nhập",
                    "Ngân hàng",
                    "Tham chiếu",
                    "Trạng thái",
                    "Yêu cầu lúc",
                    "Thao tác",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-medium text-[#5a6577]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#8d95a3]">
                      Không có yêu cầu nào.
                    </td>
                  </tr>
                )}
                {filteredPayouts.map((payout) => {
                  const statusConfig = payoutStatusConfig[payout.status] || payoutStatusConfig.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={payout.id} className="hover:bg-[#f9fafb]">
                      <td className="px-4 py-3 font-medium text-[#1a2332]">{payout.partnerName}</td>
                      <td className="px-4 py-3">{fmt(payout.requestedAmount)}</td>
                      <td className="px-4 py-3">{fmt(payout.ledgerAmount)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p>{payout.bankName || "—"}</p>
                          <p className="text-xs text-[#8d95a3]">{payout.bankAccount || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5a6577]">{payout.transactionReference || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.tone}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5a6577]">
                        {payout.requestedAt ? new Date(payout.requestedAt).toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {payout.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcessPayout(payout.id, true)}
                              disabled={processLoading === payout.id}
                              className="px-3 py-1 text-xs rounded-lg bg-primary text-white disabled:opacity-50"
                            >
                              {processLoading === payout.id ? "..." : "Duyệt"}
                            </button>
                            <button
                              onClick={() => handleProcessPayout(payout.id, false)}
                              disabled={processLoading === payout.id}
                              className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-700 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8d95a3]">
                            {payout.processedAt ? new Date(payout.processedAt).toLocaleString("vi-VN") : "Đã xử lý"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f9fafb] border-b border-[#e8ecf0]">
                <tr>
                  {[
                    "Hoạt động",
                    "Mã đặt chỗ",
                    "Đối tác",
                    "Khách hàng",
                    "Dịch vụ",
                    "Tổng",
                    "Đối tác nhận",
                    "Hoa hồng nền tảng",
                    "Trạng thái",
                    "Thời gian",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-medium text-[#5a6577]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#8d95a3]">
                      Không có giao dịch nào.
                    </td>
                  </tr>
                )}
                {activities.map((activity) => {
                  const config = activityConfig[activity.activityType] || Object.values(activityConfig)[0];
                  const Icon = config.icon;
                  return (
                    <tr key={activity.id} className="hover:bg-[#f9fafb]">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.tone}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#5a6577]">{activity.bookingCode || "—"}</td>
                      <td className="px-4 py-3">{activity.partnerName || "—"}</td>
                      <td className="px-4 py-3">{activity.customerName || "—"}</td>
                      <td className="px-4 py-3">{activity.serviceName || "—"}</td>
                      <td className="px-4 py-3">{fmt(activity.grossAmount)}</td>
                      <td className={`px-4 py-3 font-medium ${activity.partnerDelta < 0 ? "text-red-600" : "text-green-600"}`}>
                        {fmt(activity.partnerDelta)}
                      </td>
                      <td className={`px-4 py-3 font-medium ${activity.commissionDelta < 0 ? "text-red-600" : "text-blue-600"}`}>
                        {fmt(activity.commissionDelta)}
                      </td>
                      <td className="px-4 py-3 text-[#5a6577]">{statusLabels[activity.status] || activity.status}</td>
                      <td className="px-4 py-3 text-[#5a6577]">
                        {activity.occurredAt ? new Date(activity.occurredAt).toLocaleString("vi-VN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerFinance;
