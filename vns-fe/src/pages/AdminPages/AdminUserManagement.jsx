import { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Users,
  Building,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  Edit3,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Key,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { adminService } from "../../services/adminService";

const roleConfig = {
  user: { label: "Người dùng", color: "bg-blue-50 text-blue-700", icon: Users },
  partner: { label: "Đối tác", color: "bg-green-50 text-green-700", icon: Building },
  manager: { label: "Quản lý", color: "bg-purple-50 text-purple-700", icon: Shield },
};

const statusConfig = {
  active: { label: "Hoạt động", color: "bg-green-50 text-green-700", icon: CheckCircle },
  pending: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-700", icon: Clock },
  banned: { label: "Đã khóa", color: "bg-red-50 text-red-700", icon: XCircle },
  inactive: { label: "Ngừng HĐ", color: "bg-[#f0f2f4] text-[#5a6577]", icon: Clock },
};

const PAGE_SIZE = 10;

const AdminUserManagement = () => {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("manager");
  const [filterStatus, setFilterStatus] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newManager, setNewManager] = useState({ name: "", email: "", region: "" });
  const [actionLoading, setActionLoading] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [counts, setCounts] = useState({ user: 0, partner: 0, manager: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const res = await adminService.getUsers(null, null, 1, 1000);
      const data = res.data || res;
      const items = Array.isArray(data) ? data : data.items || data.users || [];

      const roleMap = { 0: "admin", 1: "manager", 2: "partner", 3: "user" };

      const mapped = items.map((u) => {
        let role;
        if (typeof u.role === "number") {
          role = roleMap[u.role] || "user";
        } else if (Array.isArray(u.role)) {
          role = (u.role[0] || "user").toString().toLowerCase();
        } else if (typeof u.role === "string") {
          role = u.role.toLowerCase();
        } else {
          role = (u.roleName || "user").toLowerCase();
        }
        return role;
      });

      setCounts({
        user: mapped.filter((r) => r === "user").length,
        partner: mapped.filter((r) => r === "partner").length,
        manager: mapped.filter((r) => r === "manager").length,
      });
    } catch (err) {
      console.error("Lỗi tải số lượng người dùng:", err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const role = filterRole === "all" ? null : filterRole;
      const searchQuery = search.trim() || null;
      const res = await adminService.getUsers(role, searchQuery, page, PAGE_SIZE);

      const data = res.data || res;
      const items = Array.isArray(data) ? data : data.items || data.users || [];

      const roleMap = { 0: "admin", 1: "manager", 2: "partner", 3: "user" };

      const mapped = items.map((u) => {
        let role;
        if (typeof u.role === "number") {
          role = roleMap[u.role] || "user";
        } else if (Array.isArray(u.role)) {
          role = (u.role[0] || "user").toString().toLowerCase();
        } else if (typeof u.role === "string") {
          role = u.role.toLowerCase();
        } else {
          role = (u.roleName || "user").toLowerCase();
        }

        return {
          id: u.id || u.userId,
          name: u.fullName || u.name || u.userName || "—",
          email: u.email || "—",
          role,
          status: u.status || (u.isActive === false ? "banned" : "active"),
          joined: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("vi-VN")
            : u.joined || "—",
          bookings: u.totalBookings ?? u.bookingCount ?? u.bookings ?? null,
          services: u.totalServices ?? u.TotalServices ?? u.serviceCount ?? u.services ?? null,
        };
      });

      setUsers(mapped);
      setTotalPages(data.totalPages || Math.ceil((data.totalCount || items.length) / PAGE_SIZE) || 1);
      setTotalCount(data.totalCount || items.length);
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
      setError(err.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [filterRole, search, page]);

  useEffect(() => {
    // Fetch counts once when component mounts
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterStatus, search]);

  const toggleBan = async (user) => {
    try {
      setActionLoading(user.id);
      const isBanned = user.status === "banned";
      const newIsActive = isBanned;
      await adminService.toggleUserStatus(user.id, { isActive: newIsActive });
      const newStatus = newIsActive ? "active" : "banned";
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: newStatus } : u
        )
      );
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái:", err);
      alert("Không thể cập nhật trạng thái: " + (err.message || "Lỗi không xác định"));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${user.name}"?`)) return;
    try {
      setActionLoading(user.id);
      await adminService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      // Update counts when user is deleted
      setCounts((prev) => ({
        ...prev,
        [user.role]: Math.max(0, (prev[user.role] || 0) - 1),
      }));
    } catch (err) {
      console.error("Lỗi xóa tài khoản:", err);
      alert("Không thể xóa tài khoản: " + (err.message || "Lỗi không xác định"));
    } finally {
      setActionLoading(null);
    }
  };

  const createManager = async () => {
    if (!newManager.name.trim() || !newManager.email.trim()) {
      alert("Vui lòng nhập đầy đủ họ tên và email");
      return;
    }
    try {
      setCreateLoading(true);
      const res = await adminService.createManager({
        fullName: newManager.name,
        email: newManager.email,
        region: newManager.region || null,
      });
      const data = res.data || res;
      alert(`Tạo tài khoản thành công!\nEmail: ${newManager.email}\nMật khẩu mặc định: ${data.defaultPassword || "Manager@123"}`);
      setShowAddModal(false);
      setNewManager({ name: "", email: "", region: "" });
      // Update manager count
      setCounts((prev) => ({
        ...prev,
        manager: (prev.manager || 0) + 1,
      }));
      fetchUsers();
    } catch (err) {
      console.error("Lỗi tạo tài khoản:", err);
      alert("Không thể tạo tài khoản: " + (err.message || "Lỗi không xác định"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword.trim()) {
      alert("Vui lòng nhập mật khẩu mới");
      return;
    }
    try {
      setResetPasswordLoading(true);
      await adminService.resetUserPassword(resetPasswordUser.id, { newPassword });
      alert(`Đặt lại mật khẩu thành công!\nMật khẩu mới: ${newPassword}`);
      setShowResetPasswordModal(false);
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (err) {
      console.error("Lỗi reset mật khẩu:", err);
      alert("Không thể reset mật khẩu: " + (err.message || "Lỗi không xác định"));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!editUser || !editRole) return;
    const roleMap = { user: 3, partner: 2, manager: 1, admin: 0 };
    try {
      setEditLoading(true);
      await adminService.updateUserRole(editUser.id, { role: roleMap[editRole] ?? 3 });
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, role: editRole } : u))
      );
      // Update counts when role changes
      const oldRole = editUser.role;
      setCounts((prev) => ({
        ...prev,
        [oldRole]: Math.max(0, (prev[oldRole] || 0) - 1),
        [editRole]: (prev[editRole] || 0) + 1,
      }));
      setShowEditModal(false);
      setEditUser(null);
      alert("Cập nhật vai trò thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật vai trò:", err);
      alert("Không thể cập nhật vai trò: " + (err.message || "Lỗi không xác định"));
    } finally {
      setEditLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2332] mb-1">Quản lý người dùng</h1>
            <p className="text-[#5a6577] text-sm">Quản lý tất cả tài khoản trên nền tảng</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo tài khoản Quản lý
          </button>
        </div>

        {/* Role summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(roleConfig).map(([role, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`bg-white rounded-xl border p-4 text-left transition-all ${filterRole === role ? "border-primary ring-1 ring-primary" : "border-[#e8ecf0]"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cfg.color}`}><Icon className="w-4 h-4" /></div>
                  <div>
                    <p className="text-lg font-bold text-[#1a2332]">{counts[role] || 0}</p>
                    <p className="text-xs text-[#5a6577]">{cfg.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#e8ecf0] p-4 mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d95a3]" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">Người dùng</option>
            <option value="partner">Đối tác</option>
            <option value="manager">Quản lý</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="pending">Chờ duyệt</option>
            <option value="banned">Đã khóa</option>
          </select>
          <button
            onClick={fetchUsers}
            className="p-2 border border-[#e8ecf0] rounded-xl hover:bg-[#f9fafb]"
          >
            <RefreshCw className={`w-4 h-4 text-[#5a6577] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchUsers} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">
              Thử lại
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#e8ecf0] p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-[#5a6577]">Đang tải danh sách người dùng...</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e8ecf0] flex items-center justify-between">
                <p className="text-sm text-[#5a6577]">Hiển thị <span className="font-medium text-[#1a2332]">{filtered.length}</span> kết quả (tổng {totalCount})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f9fafb] border-b border-[#e8ecf0]">
                    <tr>
                      {(() => {
                        const cols = ["Mã", "Tên / Email", "Vai trò", "Trạng thái", "Ngày tham gia"];
                        if (filterRole === "partner") cols.push("Tổng dịch vụ");
                        else if (filterRole !== "manager") cols.push("Đặt chỗ");
                        cols.push("Hành động");
                        return cols.map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#5a6577] uppercase">{h}</th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f4]">
                    {filtered.length > 0 ? (
                      filtered.map((u) => {
                        const rc = roleConfig[u.role] || roleConfig.user;
                        const sc = statusConfig[u.status] || statusConfig.active;
                        const RIcon = rc.icon;
                        const SIcon = sc.icon;
                        const isActionLoading = actionLoading === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-[#f9fafb]">
                            <td className="px-5 py-4 font-mono text-xs text-[#8d95a3]">{u.id}</td>
                            <td className="px-5 py-4">
                              <p className="font-medium text-[#1a2332]">{u.name}</p>
                              <p className="text-xs text-[#8d95a3]">{u.email}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rc.color}`}>
                                <RIcon className="w-3 h-3" /> {rc.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                                <SIcon className="w-3 h-3" /> {sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-[#5a6577]">{u.joined}</td>
                            {filterRole !== "manager" ? (
                              <td className="px-5 py-4 text-[#3d4654] font-medium">
                                {filterRole === "partner"
                                  ? (u.services !== null ? u.services : "—")
                                  : (u.bookings !== null ? u.bookings : "—")}
                              </td>
                            ) : null}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                {isActionLoading ? (
                                  <Loader2 className="w-4 h-4 text-[#8d95a3] animate-spin" />
                                ) : (
                                  <>
                                    <button
                                      onClick={() => toggleBan(u)}
                                      className={`p-1.5 rounded hover:bg-[#f0f2f4] ${u.status === "banned" ? "text-green-500" : "text-orange-500"}`}
                                      title={u.status === "banned" ? "Mở khóa" : "Khóa tài khoản"}
                                    >
                                      {u.status === "banned" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={() => { setEditUser(u); setEditRole(u.role); setShowEditModal(true); }}
                                      className="p-1.5 text-[#8d95a3] hover:text-primary hover:bg-[#f0f2f4] rounded"
                                      title="Chỉnh sửa vai trò"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => { setResetPasswordUser(u); setNewPassword(""); setShowResetPasswordModal(true); }}
                                      className="p-1.5 text-[#8d95a3] hover:text-amber-500 hover:bg-amber-50 rounded"
                                      title="Reset mật khẩu"
                                    >
                                      <Key className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteUser(u)}
                                      className="p-1.5 text-[#8d95a3] hover:text-red-500 hover:bg-red-50 rounded"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={filterRole === "manager" ? 6 : 7} className="px-5 py-12 text-center text-[#8d95a3]">
                          Không tìm thấy người dùng nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[#e8ecf0] flex items-center justify-between">
                  <p className="text-sm text-[#5a6577]">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[#e8ecf0] rounded-lg hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[#e8ecf0] rounded-lg hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Manager Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e8ecf0] w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[#1a2332] mb-5">Tạo tài khoản Quản lý mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3d4654] mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newManager.name}
                  onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d4654] mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  placeholder="manager@vns.vn"
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d4654] mb-1">Khu vực phụ trách</label>
                <select
                  value={newManager.region}
                  onChange={(e) => setNewManager({ ...newManager, region: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">Chọn khu vực</option>
                  <option>Hà Nội</option>
                  <option>TP.HCM</option>
                  <option>Đà Nẵng</option>
                  <option>Toàn quốc</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setNewManager({ name: "", email: "", region: "" }); }}
                className="flex-1 px-4 py-2 border border-[#e8ecf0] text-[#3d4654] rounded-lg hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                onClick={createManager}
                disabled={createLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium disabled:opacity-50"
              >
                {createLoading ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e8ecf0] w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[#1a2332] mb-5">Reset mật khẩu</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#5a6577] mb-1">Tài khoản</p>
                <p className="font-medium text-[#1a2332]">{resetPasswordUser.name}</p>
                <p className="text-xs text-[#8d95a3]">{resetPasswordUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d4654] mb-1">Mật khẩu mới</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowResetPasswordModal(false); setResetPasswordUser(null); setNewPassword(""); }}
                className="flex-1 px-4 py-2 border border-[#e8ecf0] text-[#3d4654] rounded-lg hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50"
              >
                {resetPasswordLoading ? "Đang reset..." : "Reset mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#e8ecf0] w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-[#1a2332] mb-5">Thay đổi vai trò</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#5a6577] mb-1">Tài khoản</p>
                <p className="font-medium text-[#1a2332]">{editUser.name}</p>
                <p className="text-xs text-[#8d95a3]">{editUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3d4654] mb-1">Vai trò mới</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="user">Người dùng</option>
                  <option value="partner">Đối tác</option>
                  <option value="manager">Quản lý</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditUser(null); }}
                className="flex-1 px-4 py-2 border border-[#e8ecf0] text-[#3d4654] rounded-lg hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                onClick={handleEditRole}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-medium disabled:opacity-50"
              >
                {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
