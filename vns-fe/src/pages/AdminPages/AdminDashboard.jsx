import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Activity,
  Loader2,
  PackageCheck,
  Undo2,
} from "lucide-react";
import { adminService } from "../../services/adminService";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const quickActions = [
  {
    label: "Quản lý người dùng",
    path: "/AdminUserManagement",
    icon: Users,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    label: "Tài chính",
    path: "/AdminFinance",
    icon: DollarSign,
    color: "bg-green-50 text-green-700 border-green-200",
  },
];


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, usersRes] = await Promise.all([
          adminService.getDashboard(),
          adminService.getUsers("manager", null, 1, 10),
        ]);

        if (dashboardRes.success) {
          const data = dashboardRes.data || dashboardRes;
          setPlatformStats(data);
        }

        if (usersRes.success) {
          const usersData = usersRes.data || usersRes;
          const managerList = Array.isArray(usersData) ? usersData : usersData.items || usersData.users || [];
          setManagers(managerList.map((m) => {
            const roleMap = { 0: "admin", 1: "manager", 2: "partner", 3: "user" };
            return {
              ...m,
              role: typeof m.role === "number" ? roleMap[m.role] || "user" : m.role,
            };
          }));
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu dashboard:", err);
        setError(err.message || "Không thể tải dữ liệu");
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
          <p className="text-sm text-[#5a6577]">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[#1a2332] mb-2">Lỗi tải dữ liệu</h3>
          <p className="text-sm text-[#5a6577] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const stats = platformStats || {};

  const metrics = [
    {
      label: "Người dùng",
      value: (stats.totalUsers || 0).toLocaleString("vi-VN"),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      path: "/AdminUserManagement",
    },
    {
      label: "Đối tác",
      value: stats.totalPartners || 0,
      icon: Building,
      color: "bg-green-100 text-green-600",
      path: "/AdminDashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#1a2332]">
                Bảng điều khiển Quản trị
              </h1>
            </div>
            <p className="text-[#5a6577] text-sm">
              Toàn quyền quản lý nền tảng VietNamSea
            </p>
          </div>
        </div>

        {/* Metrics */}
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
          {/* Left */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <h3 className="font-semibold text-[#1a2332] mb-4">Tác vụ nhanh</h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.path)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity ${a.color}`}
                    >
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

          {/* Right */}
          <div className="lg:col-span-2 space-y-6">
            {/* Manager accounts */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1a2332]">
                  Tài khoản Quản lý
                </h3>
                <button
                  onClick={() => navigate("/AdminUserManagement")}
                  className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                >
                  Quản lý <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                {managers.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0f2f4]">
                        <th className="text-left pb-3 text-xs font-medium text-[#5a6577] uppercase">
                          Tên
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#5a6577] uppercase hidden md:table-cell">
                          Email
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#5a6577] uppercase">
                          Điện thoại
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-[#5a6577] uppercase">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4]">
                      {managers.map((m) => (
                        <tr key={m.id} className="hover:bg-[#f9fafb]">
                          <td className="py-3 font-medium text-[#1a2332]">
                            {m.fullName || m.name || m.userName || "—"}
                          </td>
                          <td className="py-3 text-[#5a6577] hidden md:table-cell">
                            {m.email || "—"}
                          </td>
                          <td className="py-3 text-[#5a6577]">{m.phoneNumber || m.region || m.address || "—"}</td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                m.status === "active" || m.isActive
                                  ? "bg-green-50 text-green-700"
                                  : "bg-[#f0f2f4] text-[#5a6577]"
                              }`}
                            >
                              {m.status === "active" || m.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3" /> Hoạt động
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" /> Ngừng hoạt động
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[#8d95a3] text-center py-4">Chưa có tài khoản quản lý nào</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
