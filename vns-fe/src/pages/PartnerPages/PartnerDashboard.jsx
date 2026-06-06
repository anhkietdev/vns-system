import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HandPlatter,
  CalendarCheck,
  CircleDollarSign,
  Package,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  MessageCircleMore,
  TicketPercent,
  User,
  Loader2,
} from "lucide-react";
import { partnerService } from "../../services/partnerService";
import { bookingService } from "../../services/bookingService";

const formatPrice = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const quickActions = [
  {
    label: "Thêm dịch vụ",
    path: "/PartnerService",
    icon: HandPlatter,
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    label: "Tạo combo",
    path: "/PartnerCombo",
    icon: Package,
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    label: "Xem đặt chỗ",
    path: "/PartnerBooking",
    icon: CalendarCheck,
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    label: "Tin nhắn",
    path: "/PartnerMessaging",
    icon: MessageCircleMore,
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    label: "Tài chính",
    path: "/PartnerFinance",
    icon: CircleDollarSign,
    color: "bg-teal-50 text-teal-600 border-teal-100",
  },
  {
    label: "Hồ sơ",
    path: "/PartnerProfile",
    icon: User,
    color: "bg-[#f4f6f8] text-[#5a6577] border-[#e8ecf0]",
  },
];

const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    color: "bg-amber-50 text-amber-700",
    icon: Clock,
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-green-50 text-green-700",
    icon: CheckCircle,
  },
  in_progress: {
    label: "Đang thực hiện",
    color: "bg-blue-50 text-blue-700",
    icon: Clock,
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-50 text-red-700",
    icon: XCircle,
  },
  refunded: {
    label: "Đã hoàn tiền",
    color: "bg-purple-50 text-purple-700",
    icon: CheckCircle,
  },
  no_show: {
    label: "Không đến",
    color: "bg-gray-50 text-gray-700",
    icon: XCircle,
  },
  expired: {
    label: "Hết hạn",
    color: "bg-orange-50 text-orange-700",
    icon: AlertCircle,
  },
  refund_pending: {
    label: "Chờ hoàn tiền",
    color: "bg-indigo-50 text-indigo-700",
    icon: Clock,
  },
};

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({ businessName: "", isVerified: false });
  const [metrics, setMetrics] = useState([]);
  const [bookingStats, setBookingStats] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileRes, dashboardRes, bookingsRes] = await Promise.all([
          partnerService.getProfile(),
          partnerService.getDashboard(),
          bookingService.getPartnerBookings({ page: 1, pageSize: 5 }),
        ]);

        // Profile
        if (profileRes?.success && profileRes.data) {
          setProfile({
            businessName: profileRes.data.businessName || profileRes.data.ownerName || "Đối tác",
            isVerified: profileRes.data.verificationStatus === 1,
          });
        }

        // Dashboard metrics
        if (dashboardRes?.success && dashboardRes.data) {
          const d = dashboardRes.data;
          setMetrics([
            {
              label: "Dịch vụ",
              value: d.totalServices ?? 0,
              sub: `${d.activeServices ?? 0} đang hoạt động`,
              color: "bg-blue-50 text-blue-600",
              icon: HandPlatter,
              path: "/PartnerService",
            },
            {
              label: "Đặt chỗ",
              value: d.totalBookings ?? 0,
              sub: `${d.pendingBookings ?? 0} chờ xử lý`,
              color: "bg-green-50 text-green-600",
              icon: CalendarCheck,
              path: "/PartnerBooking",
            },
            {
              label: "Doanh thu",
              value: formatPrice(d.releasedNet ?? 0),
              sub: `${formatPrice(d.monthlyReleasedNet ?? 0)} tháng này`,
              color: "bg-purple-50 text-purple-600",
              icon: CircleDollarSign,
              path: "/PartnerFinance",
            },
            {
              label: "Đánh giá",
              value: d.averageRating ? `${d.averageRating}★` : "0★",
              sub: `${d.totalReviews ?? 0} lượt đánh giá`,
              color: "bg-amber-50 text-amber-600",
              icon: Star,
              path: "/PartnerBooking",
            },
          ]);

          setPendingCount(d.pendingBookings ?? 0);

          setBookingStats([
            { label: "Chờ xử lý", value: d.pendingBookings ?? 0, icon: Clock, color: "text-amber-500" },
            { label: "Hoàn thành", value: d.completedBookings ?? 0, icon: CheckCircle, color: "text-green-500" },
            { label: "Đã hủy", value: d.cancelledBookings ?? 0, icon: XCircle, color: "text-red-400" },
          ]);
        }

        // Recent bookings
        if (bookingsRes?.success && bookingsRes.data) {
          const items = Array.isArray(bookingsRes.data) ? bookingsRes.data : bookingsRes.data.items || [];
          setRecentBookings(
            items.map((b) => ({
              id: b.bookingCode || b.id,
              bookingId: b.id,
              customer: b.customerName || b.userName || "Khách hàng",
              service: b.serviceName || "Dịch vụ",
              date: b.bookingDate
                ? new Date(b.bookingDate).toLocaleDateString("vi-VN")
                : "",
              status: typeof b.status === "number" ? ["pending","confirmed","in_progress","completed","cancelled","refunded","no_show","expired","refund_pending"][b.status] || "pending" : (b.status || "pending").toString().toLowerCase(),
              amount: b.totalAmount ?? b.amount ?? 0,
            }))
          );
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[#8d95a3] text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover text-sm transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] mb-1">
            Chào mừng trở lại, {profile.businessName}!
          </h1>
          <p className="text-[#8d95a3] text-sm">
            Theo dõi hiệu suất kinh doanh của bạn
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => navigate(m.path)}
                className="bg-white rounded-xl border border-[#e8ecf0] p-5 text-left hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#c8cdd4] group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-[#8d95a3] mb-1">{m.label}</p>
                <p className="text-xl font-bold text-[#1a2332]">{m.value}</p>
                <p className="text-xs text-[#a8b0bc] mt-1">{m.sub}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <h3 className="font-semibold text-[#1a2332] mb-4">
                Truy cập nhanh
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((a) => {
                  const Icon = a.icon;
                  const isAddService = a.label === "Thêm dịch vụ";
                  const disabled = isAddService && !profile.isVerified;
                  return (
                    <button
                      key={a.label}
                      onClick={() => {
                        if (disabled) return;
                        navigate(a.path);
                      }}
                      disabled={disabled}
                      title={
                        disabled
                          ? "Vui lòng hoàn tất xác minh tài khoản trước khi đăng dịch vụ"
                          : a.label
                      }
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-opacity ${a.color} ${
                        disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:opacity-80 cursor-pointer"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column - Recent Bookings */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[#1a2332]">Đặt chỗ gần đây</h3>
                <button
                  onClick={() => navigate("/PartnerBooking")}
                  className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {recentBookings.length === 0 ? (
                <div className="text-center py-8 text-[#8d95a3]">
                  <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-[#c8cdd4]" />
                  <p className="text-sm">Chưa có đặt chỗ nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e8ecf0]">
                        <th className="text-left pb-3 text-xs font-medium text-[#8d95a3] uppercase">
                          Mã
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#8d95a3] uppercase">
                          Khách
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#8d95a3] uppercase hidden md:table-cell">
                          Dịch vụ
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#8d95a3] uppercase hidden lg:table-cell">
                          Ngày
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#8d95a3] uppercase">
                          Trạng thái
                        </th>
                        <th className="text-right pb-3 text-xs font-medium text-[#8d95a3] uppercase">
                          Số tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4]">
                      {recentBookings.map((b) => {
                        const s = statusConfig[b.status] || statusConfig.pending;
                        const Icon = s.icon;
                        return (
                          <tr
                            key={b.id}
                            className="hover:bg-[#f9fafb] cursor-pointer"
                            onClick={() =>
                              navigate("/PartnerBookingDetails", {
                                state: { bookingId: b.bookingId },
                              })
                            }
                          >
                            <td className="py-3 font-medium text-[#1a2332]">
                              {b.id}
                            </td>
                            <td className="py-3 text-[#5a6577]">{b.customer}</td>
                            <td className="py-3 text-[#5a6577] hidden md:table-cell">
                              {b.service}
                            </td>
                            <td className="py-3 text-[#8d95a3] hidden lg:table-cell">
                              {b.date}
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}
                              >
                                <Icon className="w-3 h-3" />
                                {s.label}
                              </span>
                            </td>
                            <td className="py-3 text-right font-medium text-[#1a2332]">
                              {formatPrice(b.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
