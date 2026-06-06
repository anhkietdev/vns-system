import { useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Trash2,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  Gift,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Eye,
  Copy,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { managerService } from "../../services/managerService";

const ManagerPromotionDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedPromotion = location.state?.promotion;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!passedPromotion) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#8d95a3] mx-auto mb-4" />
          <p className="text-[#5a6577] mb-4">Không tìm thấy thông tin khuyến mãi.</p>
          <button
            onClick={() => navigate("/ManagerPromotion")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({ ...passedPromotion });

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + " ₫";

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-700";
      case "draft":
      case "inactive": return "bg-[#f0f2f4] text-[#3d4654]";
      case "paused": return "bg-amber-50 text-amber-700";
      case "expired": return "bg-red-50 text-red-700";
      default: return "bg-[#f0f2f4] text-[#3d4654]";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4" />;
      case "draft":
      case "inactive": return <Clock className="w-4 h-4" />;
      case "paused": return <PauseCircle className="w-4 h-4" />;
      case "expired": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active": return "Đang hoạt động";
      case "draft":
      case "inactive": return "Tạm tắt";
      case "paused": return "Tạm dừng";
      case "expired": return "Đã hết hạn";
      default: return status;
    }
  };

  const usagePercent = formData.usageLimit > 0
    ? (formData.usedCount / formData.usageLimit) * 100
    : 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    let applicableServiceType = null;
    if (formData.applicableServices === "Homestay" || formData.applicableServices === "Tất cả phòng và villa")
      applicableServiceType = 0;
    else if (formData.applicableServices === "Tour" || formData.applicableServices === "Tour và lưu trú")
      applicableServiceType = 1;
    else if (formData.applicableServices === "Combo" || formData.applicableServices === "Combo dịch vụ")
      applicableServiceType = 3;

    const payload = {
      code: formData.promoCode,
      name: formData.name,
      description: formData.description || null,
      voucherType: formData.discountType === "percentage" ? 0 : 1,
      discountValue: Number(formData.discountValue),
      minOrderAmount: formData.minOrderValue ? Number(formData.minOrderValue) : null,
      totalQuantity: Number(formData.usageLimit),
      userUsageLimit: Number(formData.maxUsesPerCustomer) || 1,
      startDate: new Date(formData.validFrom).toISOString(),
      endDate: new Date(formData.validUntil).toISOString(),
      isActive: formData.status === "active",
      applicableServiceType,
    };

    try {
      await managerService.updateVoucher(formData.id, payload);
      setSuccessMsg("Cập nhật khuyến mãi thành công!");
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa khuyến mãi này? Hành động không thể hoàn tác.")) return;
    setDeleting(true);
    setError("");
    try {
      await managerService.deleteVoucher(formData.id);
      navigate("/ManagerPromotion");
    } catch (err) {
      console.error(err);
      setError(err.message || "Xóa thất bại.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/ManagerPromotion")}
              className="p-2 text-[#5a6577] hover:text-[#3d4654] hover:bg-[#f0f2f4] rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1a2332]">
                {editing ? "Chỉnh sửa khuyến mãi" : "Chi tiết khuyến mãi"}
              </h1>
              <p className="text-[#5a6577] text-sm">
                Xem và quản lý thông tin khuyến mãi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setFormData({ ...passedPromotion });
                    setEditing(false);
                    setError("");
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-[#e8ecf0] text-[#3d4654] rounded-lg hover:bg-[#f9fafb]"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={async () => {
                    const newActive = formData.status !== "active";
                    try {
                      await managerService.updateVoucher(formData.id, { isActive: newActive });
                      setFormData((prev) => ({ ...prev, status: newActive ? "active" : "inactive" }));
                      setSuccessMsg(newActive ? "Đã kích hoạt khuyến mãi!" : "Đã tạm dừng khuyến mãi.");
                    } catch (err) { setError(err.message || "Thao tác thất bại."); }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    formData.status === "active"
                      ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {formData.status === "active" ? (
                    <><PauseCircle className="w-4 h-4" /> Tạm dừng</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Kích hoạt</>
                  )}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                >
                  <Edit3 className="w-4 h-4" />
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Đang xóa..." : "Xóa"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-6">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#1a2332]">
                  Thông tin cơ bản
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(formData.status)}`}
                >
                  {getStatusIcon(formData.status)}
                  {getStatusLabel(formData.status)}
                </span>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Tên khuyến mãi
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Mô tả
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => update("description", e.target.value)}
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => update("status", e.target.value)}
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="draft">Bản nháp</option>
                      <option value="paused">Tạm dừng</option>
                      <option value="expired">Đã hết hạn</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold text-[#1a2332] mb-2">
                    {formData.name}
                  </h3>
                  <p className="text-[#5a6577] text-sm">{formData.description}</p>
                </div>
              )}
            </div>

            {/* Promo Code & Discount */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h2 className="text-base font-semibold text-[#1a2332] mb-4">
                Mã & Ưu đãi
              </h2>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Mã khuyến mãi
                    </label>
                    <input
                      type="text"
                      value={formData.promoCode}
                      onChange={(e) =>
                        update("promoCode", e.target.value.toUpperCase())
                      }
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Hình thức giảm
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => update("discountType", e.target.value)}
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed">Số tiền cố định (₫)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Giá trị giảm
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) =>
                          update("discountValue", Number(e.target.value))
                        }
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Giá trị đơn tối thiểu (₫)
                    </label>
                    <input
                      type="number"
                      value={formData.minOrderValue}
                      onChange={(e) =>
                        update("minOrderValue", Number(e.target.value))
                      }
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <code className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-base font-mono font-bold rounded-lg">
                      {formData.promoCode}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(formData.promoCode)
                      }
                      className="p-2 text-[#8d95a3] hover:text-primary hover:bg-[#f0f2f4] rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {formData.discountType === "percentage" ? (
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <Percent className="w-4 h-4" />
                        Giảm {formData.discountValue}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        Giảm {formatPrice(formData.discountValue)}
                      </span>
                    )}
                    {formData.minOrderValue > 0 && (
                      <span className="text-sm text-[#5a6577]">
                        Đơn tối thiểu {formatPrice(formData.minOrderValue)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scope & Validity */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h2 className="text-base font-semibold text-[#1a2332] mb-4">
                Phạm vi & Thời hạn
              </h2>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3d4654] mb-1">
                      Dịch vụ áp dụng
                    </label>
                    <select
                      value={formData.applicableServices}
                      onChange={(e) =>
                        update("applicableServices", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="Tất cả dịch vụ">Tất cả dịch vụ</option>
                      <option value="Tất cả phòng và villa">
                        Tất cả phòng và villa
                      </option>
                      <option value="Tour và lưu trú">Tour và lưu trú</option>
                      <option value="Phòng Deluxe và Suite">
                        Phòng Deluxe và Suite
                      </option>
                      <option value="Combo dịch vụ">Combo dịch vụ</option>
                      <option value="Thuê xe">Thuê xe</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Ngày bắt đầu
                      </label>
                      <input
                        type="date"
                        value={formData.validFrom ? formData.validFrom.substring(0, 10) : ""}
                        onChange={(e) => update("validFrom", e.target.value)}
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Ngày kết thúc
                      </label>
                      <input
                        type="date"
                        value={formData.validUntil ? formData.validUntil.substring(0, 10) : ""}
                        onChange={(e) => update("validUntil", e.target.value)}
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Tổng lượt sử dụng tối đa
                      </label>
                      <input
                        type="number"
                        value={formData.usageLimit}
                        onChange={(e) =>
                          update("usageLimit", Number(e.target.value))
                        }
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3d4654] mb-1">
                        Tối đa mỗi khách
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.maxUsesPerCustomer}
                        onChange={(e) =>
                          update("maxUsesPerCustomer", Number(e.target.value))
                        }
                        className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-[#8d95a3]" />
                    <span className="text-[#5a6577]">Áp dụng cho:</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {formData.applicableServices}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <Calendar className="w-4 h-4 text-[#8d95a3]" />
                    <span>
                      {new Date(formData.validFrom).toLocaleDateString("vi-VN")}{" "}
                      —{" "}
                      {new Date(formData.validUntil).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <Users className="w-4 h-4 text-[#8d95a3]" />
                    <span>
                      Tối đa {formData.maxUsesPerCustomer} lần/khách hàng
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Usage */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h2 className="text-base font-semibold text-[#1a2332] mb-4">
                Mức độ sử dụng
              </h2>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#5a6577]">Đã sử dụng</span>
                  <span className="font-semibold">
                    {formData.usedCount}/{formData.usageLimit}
                  </span>
                </div>
                <div className="w-full bg-[#e8ecf0] rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      usagePercent >= 90
                        ? "bg-red-500"
                        : usagePercent >= 70
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[#5a6577] mt-1">
                  {usagePercent.toFixed(1)}% đã sử dụng
                </p>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h2 className="text-base font-semibold text-[#1a2332] mb-4">
                Hiệu suất
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <Users className="w-4 h-4" />
                    Lượt đặt
                  </div>
                  <span className="font-semibold text-[#1a2332]">
                    {formData.bookings || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <DollarSign className="w-4 h-4" />
                    Doanh thu
                  </div>
                  <span className="font-semibold text-primary">
                    {formatPrice(formData.revenue || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <Eye className="w-4 h-4" />
                    Lượt xem
                  </div>
                  <span className="font-semibold text-[#1a2332]">
                    {(formData.views || 0).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#5a6577]">
                    <Gift className="w-4 h-4" />
                    KH tiết kiệm
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatPrice(formData.customerSavings || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Created */}
            <div className="bg-white rounded-xl border border-[#e8ecf0] p-6">
              <h2 className="text-base font-semibold text-[#1a2332] mb-3">
                Thông tin tạo
              </h2>
              <p className="text-sm text-[#5a6577]">
                Ngày tạo:{" "}
                <span className="font-medium text-[#1a2332]">
                  {formData.created
                    ? new Date(formData.created).toLocaleDateString("vi-VN")
                    : "—"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerPromotionDetails;
