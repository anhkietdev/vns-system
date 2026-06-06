import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  TicketPercent,
  Wrench,
  Loader2,
} from "lucide-react";
import { managerService } from "../../services/managerService";

function normalizeStatus(s) {
  if (typeof s === "number") return ["pending", "approved", "rejected"][s] || "pending";
  return String(s || "pending").toLowerCase();
}

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, partnersRes, servicesRes] = await Promise.all([
          managerService.getDashboard(),
          managerService.getPendingVerifications(1, 5),
          managerService.getPendingServices({ page: 1, pageSize: 5 }),
        ]);

        if (dashboardRes) {
          const dashData = dashboardRes.data || dashboardRes;
          setStats(dashData);
        }
        if (partnersRes) {
          const raw = partnersRes.data || partnersRes;
          const items = Array.isArray(raw) ? raw : raw.items || raw.data || [];
          setVerificationRequests(items);
        }
        if (servicesRes) {
          const raw = servicesRes.data || servicesRes;
          const items = Array.isArray(raw) ? raw : raw.items || raw.data || [];
          const onlyPending = items.filter((i) => normalizeStatus(i.approvalStatus) === "pending");
          setPendingServices(onlyPending);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
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
          <p className="text-[#5a6577] text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const d = stats || {};
  const dashStats = {
    totalPartners: d.totalPartners || 0,
    verifiedPartners: (d.totalPartners || 0) - (d.pendingPartners || 0),
    pendingVerification: d.pendingPartners || 0,
    activeServices: d.activeServices || 0,
    pendingServices: d.pendingServices || 0,
  };

  const metrics = [
    {
      label: "Đối tác",
      value: dashStats.totalPartners,
      sub: `${dashStats.verifiedPartners} đã xác minh · ${dashStats.pendingVerification} chờ duyệt`,
      color: "bg-blue-100 text-blue-600",
      icon: Building,
      path: "/ManagerAccountManagement",
      alert: dashStats.pendingVerification > 0,
    },
    {
      label: "Dịch vụ",
      value: dashStats.activeServices,
      sub: `${dashStats.pendingServices} chờ phê duyệt`,
      color: "bg-green-100 text-green-600",
      icon: FileText,
      path: "/ManagerServiceApproval",
      alert: dashStats.pendingServices > 0,
    },
  ];

  const quickActions = [
    {
      label: "Duyệt hồ sơ đối tác",
      path: "/ManagerAccountManagement",
      icon: ShieldCheck,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      badge: dashStats.pendingVerification,
    },
    {
      label: "Duyệt dịch vụ",
      path: "/ManagerServiceApproval",
      icon: Wrench,
      color: "bg-green-50 text-green-700 border-green-200",
      badge: dashStats.pendingServices,
    },
    {
      label: "Quản lý khuyến mãi",
      path: "/ManagerPromotion",
      icon: TicketPercent,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      label: "Tài chính nền tảng",
      path: "/ManagerFinance",
      icon: DollarSign,
      color: "bg-teal-50 text-teal-700 border-teal-200",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332] mb-1">
              Bảng điều khiển Quản lý
            </h1>
            <p className="text-[#5a6577] text-sm">
              Theo dõi hoạt động nền tảng và quản lý đối tác
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => navigate(m.path)}
                className="bg-white rounded-xl border border-[#e8ecf0] p-5 text-left hover:border-primary/30 transition-all group relative"
              >
                {m.alert && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8d95a3] group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-[#5a6577] mb-1">{m.label}</p>
                <p className="text-xl font-bold text-[#1a2332]">{m.value}</p>
                <p className="text-xs text-[#8d95a3] mt-1">{m.sub}</p>
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
                Tác vụ nhanh
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.path)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity ${a.color}`}
                    >
                      {a.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {a.badge}
                        </span>
                      )}
                      <Icon className="w-4 h-4" />
                      <span className="text-center leading-tight">
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Verifications */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#1a2332]">
                    Hồ sơ chờ xác minh
                  </h3>
                  <span className="w-5 h-5 bg-amber-50 text-amber-700 text-xs rounded-full flex items-center justify-center font-bold">
                    {verificationRequests.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/ManagerAccountManagement")}
                  className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {verificationRequests.length === 0 ? (
                  <p className="text-sm text-[#8d95a3] text-center py-4">
                    Không có hồ sơ chờ xác minh
                  </p>
                ) : (
                  verificationRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-[#f0f2f4] rounded-lg hover:bg-[#f9fafb]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1a2332]">
                          {r.businessName ||
                            r.name ||
                            r.fullName ||
                            r.ownerName ||
                            "---"}
                        </p>
                        <p className="text-xs text-[#8d95a3]">
                          {r.type || "Đối tác mới"} · Gửi:{" "}
                          {r.submittedDate ||
                            r.submitted ||
                            r.createdAt ||
                            "---"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">
                          Chờ xử lý
                        </span>
                        <button
                          onClick={() => navigate("/ManagerAccountManagement")}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Services */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#1a2332]">
                    Dịch vụ chờ duyệt
                  </h3>
                  <span className="w-5 h-5 bg-orange-50 text-orange-700 text-xs rounded-full flex items-center justify-center font-bold">
                    {pendingServices.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/ManagerServiceApproval")}
                  className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {pendingServices.length === 0 ? (
                  <p className="text-sm text-[#8d95a3] text-center py-4">
                    Không có dịch vụ chờ duyệt
                  </p>
                ) : (
                  pendingServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 border border-[#f0f2f4] rounded-lg hover:bg-[#f9fafb]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1a2332]">
                          {s.service || s.name || s.serviceName || "---"}
                        </p>
                        <p className="text-xs text-[#8d95a3]">
                          {s.partner || s.partnerName || "---"} ·{" "}
                          {s.type || s.serviceType || "---"} ·{" "}
                          {s.submitted || s.submittedDate || "---"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate("/ManagerServiceApproval")}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                        >
                          Duyệt
                        </button>
                        <button className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
