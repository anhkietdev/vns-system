import { useState, useEffect } from "react";
import {
 Search,
 Plus,
 Edit3,
 Trash2,
 Eye,
 RefreshCw,
 Gift,
 Calendar,
 CheckCircle,
 Clock,
 PauseCircle,
 XCircle,
 DollarSign,
 Percent,
 Copy,
 TrendingUp,
 Users,
 Activity,
 Zap,
 Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { managerService } from "../../services/managerService";

const ManagerPromotion = () => {
 const navigate = useNavigate();
 const [filterStatus, setFilterStatus] = useState("all");
 const [sortBy, setSortBy] = useState("created");
 const [searchQuery, setSearchQuery] = useState("");
 const [promotions, setPromotions] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");

 useEffect(() => {
 fetchVouchers();
 }, []);

 const fetchVouchers = async () => {
 setLoading(true);
 setError("");
 try {
 const res = await managerService.getAllVouchers(1, 100);
 const raw = res?.data || res;
 const list = raw?.items || (Array.isArray(raw) ? raw : raw?.data || []);
 const mapped = (Array.isArray(list) ? list : []).map((v) => {
 const now = new Date();
 const endDate = new Date(v.endDate);
 const isExpired = endDate < now;
 const isUsedUp = v.usedQuantity >= v.totalQuantity;
 let status = "active";
 if (!v.isActive) status = "inactive";
 else if (isUsedUp) status = "expired";
 else if (isExpired) status = "expired";

 return {
 id: v.id,
 name: v.name || v.code,
 description: v.description || "",
 status,
 promoCode: v.code,
 discountType: v.voucherType === 0 ? "percentage" : "fixed",
 discountValue: v.discountValue,
 maxDiscountAmount: v.maxDiscountAmount ?? null,
 minOrderValue: v.minOrderAmount || 0,
 usageLimit: v.totalQuantity,
 usedCount: v.usedQuantity || 0,
 validFrom: v.startDate,
 validUntil: v.endDate,
 bookings: v.usedQuantity || 0,
 revenue: v.totalRevenue || ((v.usedQuantity || 0) * (v.discountValue || 0)),
  applicableServices:
  v.applicableServiceType === 0
  ? "Homestay"
  : v.applicableServiceType === 1
  ? "Tour"
  : v.applicableServiceType === 3
  ? "Combo"
  : "Tất cả dịch vụ",
 created: v.createdAt || v.startDate,
 views: v.viewCount ?? 0,
 customerSavings: v.totalSavings ?? 0,
 maxUsesPerCustomer: v.userUsageLimit ?? 0,
 };
 });
 setPromotions(mapped);
 } catch (err) {
 console.error(err);
 setError("Không thể tải danh sách khuyến mãi. Vui lòng thử lại.");
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (id) => {
 if (!window.confirm("Bạn có chắc muốn xóa voucher này?")) return;
 try {
 await managerService.deleteVoucher(id);
 setPromotions((prev) => prev.filter((p) => p.id !== id));
 } catch (err) {
 alert("Xóa voucher thất bại: " + (err.message || "Lỗi không xác định"));
 }
 };

 const formatPrice = (price) =>
 new Intl.NumberFormat("vi-VN").format(price) + " ₫";

 const getStatusColor = (status) => {
 switch (status) {
 case "active":
 return "bg-green-50 text-green-700";
 case "draft":
 case "inactive":
 return "bg-[#f0f2f4] text-[#1a2332]";
 case "paused":
 return "bg-amber-50 text-amber-700";
 case "expired":
 return "bg-red-50 text-red-700";
 default:
 return "bg-[#f0f2f4] text-[#1a2332]";
 }
 };

 const getStatusIcon = (status) => {
 switch (status) {
 case "active":
 return <CheckCircle className="w-4 h-4" />;
 case "draft":
 case "inactive":
 return <Clock className="w-4 h-4" />;
 case "paused":
 return <PauseCircle className="w-4 h-4" />;
 case "expired":
 return <XCircle className="w-4 h-4" />;
 default:
 return <Clock className="w-4 h-4" />;
 }
 };

 const getStatusLabel = (status) => {
 switch (status) {
 case "active":
 return "Đang hoạt động";
 case "draft":
 case "inactive":
 return "Bản nháp";
 case "paused":
 return "Tạm dừng";
 case "expired":
 return "Đã hết hạn";
 default:
 return status;
 }
 };

 const filtered = promotions
 .filter((p) => {
 const matchStatus = filterStatus === "all" || p.status === filterStatus;
 const matchSearch =
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.promoCode.toLowerCase().includes(searchQuery.toLowerCase());
 return matchStatus && matchSearch;
 })
 .sort((a, b) => {
 switch (sortBy) {
 case "created":
 return new Date(b.created) - new Date(a.created);
 case "bookings":
 return b.bookings - a.bookings;
 case "revenue":
 return b.revenue - a.revenue;
 default:
 return 0;
 }
 });

 const stats = {
 total: promotions.length,
 active: promotions.filter((p) => p.status === "active").length,
 totalBookings: promotions.reduce((s, p) => s + p.bookings, 0),
 totalRevenue: promotions.reduce((s, p) => s + p.revenue, 0),
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 <span className="ml-2 text-[#5a6577]">Đang tải khuyến mãi...</span>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#f4f6f8] p-6">
 <div>
 {/* Header */}
 <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
 <div>
 <h1 className="text-3xl font-bold text-[#1a2332] mb-2">
 Khuyến mãi
 </h1>
 <p className="text-[#5a6577]">Quản lý mã khuyến mãi toàn nền tảng</p>
 </div>
 <button
 onClick={() => navigate("/ManagerPromotion/create")}
 className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover flex items-center"
 >
 <Plus className="w-4 h-4 mr-2" />
 Tạo khuyến mãi
 </button>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
 {error}
 <button onClick={fetchVouchers} className="ml-2 underline font-medium">
 Thử lại
 </button>
 </div>
 )}

 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <div className="bg-white rounded-lg p-6 border border-[#e8ecf0]">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-blue-100 rounded-lg">
 <Gift className="w-5 h-5 text-blue-600" />
 </div>
 <Activity className="w-4 h-4 text-blue-400" />
 </div>
 <p className="text-sm font-medium text-[#5a6577] mb-1">
 Tổng khuyến mãi
 </p>
 <p className="text-2xl font-bold text-[#1a2332]">{stats.total}</p>
 <p className="text-xs text-[#5a6577] mt-1">
 {stats.active} đang hoạt động
 </p>
 </div>
 <div className="bg-white rounded-lg p-6 border border-[#e8ecf0]">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <DollarSign className="w-5 h-5 text-green-600" />
 </div>
 <TrendingUp className="w-4 h-4 text-green-400" />
 </div>
 <p className="text-sm font-medium text-[#5a6577] mb-1">
 Tổng doanh thu
 </p>
 <p className="text-2xl font-bold text-[#1a2332]">
 {formatPrice(stats.totalRevenue)}
 </p>
 </div>
 <div className="bg-white rounded-lg p-6 border border-[#e8ecf0]">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 <Users className="w-5 h-5 text-purple-600" />
 </div>
 </div>
 <p className="text-sm font-medium text-[#5a6577] mb-1">
 Tổng lượt sử dụng
 </p>
 <p className="text-2xl font-bold text-[#1a2332]">
 {stats.totalBookings}
 </p>
 </div>
 <div className="bg-white rounded-lg p-6 border border-[#e8ecf0]">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 bg-orange-100 rounded-lg">
 <Zap className="w-5 h-5 text-orange-600" />
 </div>
 </div>
 <p className="text-sm font-medium text-[#5a6577] mb-1">
 Đang hoạt động
 </p>
 <p className="text-2xl font-bold text-[#1a2332]">{stats.active}</p>
 </div>
 </div>

 {/* Search & Filter */}
 <div className="bg-white rounded-lg p-4 border border-[#e8ecf0] mb-6">
 <div className="flex flex-col md:flex-row gap-4">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8d95a3]" />
 <input
 type="text"
 placeholder="Tìm kiếm theo tên, mã khuyến mãi..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-[#e8ecf0] rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
 />
 </div>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-4 py-2 border border-[#e8ecf0] rounded-lg focus:ring-2 focus:ring-primary bg-white"
 >
 <option value="all">Tất cả trạng thái</option>
 <option value="active">Đang hoạt động</option>
 <option value="draft">Bản nháp</option>
 <option value="paused">Tạm dừng</option>
 <option value="expired">Đã hết hạn</option>
 </select>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="px-4 py-2 border border-[#e8ecf0] rounded-lg focus:ring-2 focus:ring-primary bg-white"
 >
 <option value="created">Mới nhất</option>
 <option value="bookings">Sử dụng nhiều nhất</option>
 <option value="revenue">Doanh thu cao nhất</option>
 </select>
 <button
 onClick={fetchVouchers}
 className="p-2 border border-[#e8ecf0] rounded-lg hover:bg-[#f9fafb]"
 >
 <RefreshCw className="w-5 h-5 text-[#5a6577]" />
 </button>
 </div>
 </div>

 {/* Cards */}
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {filtered.map((item) => (
 <div
 key={item.id}
 className="bg-white rounded-lg border border-[#e8ecf0] transition-all duration-200"
 >
 <div className="p-6 border-b border-[#f0f2f4]">
 <div className="flex items-center gap-2 mb-2">
 <span
 className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(item.status)}`}
 >
 {getStatusIcon(item.status)}
 {getStatusLabel(item.status)}
 </span>
 </div>
 <h3 className="text-lg font-semibold text-[#1a2332] mb-1 line-clamp-2">
 {item.name}
 </h3>
 <p className="text-sm text-[#5a6577] line-clamp-2 mb-4">
 {item.description}
 </p>

 {/* Promo Code */}
 <div className="flex items-center gap-2 mb-3">
 <code className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-mono font-semibold rounded">
 {item.promoCode}
 </code>
 <button
 onClick={() =>
 navigator.clipboard.writeText(item.promoCode)
 }
 className="p-1.5 text-[#8d95a3] hover:text-primary hover:bg-[#f0f2f4] rounded"
 title="Sao chép mã"
 >
 <Copy className="w-4 h-4" />
 </button>
 </div>

 {/* Discount */}
 <div className="flex items-center gap-3 text-sm">
 {item.discountType === "percentage" ? (
 <span className="flex items-center text-green-600 font-semibold">
 <Percent className="w-4 h-4 mr-1" />
 Giảm {item.discountValue}%
 </span>
 ) : (
 <span className="flex items-center text-green-600 font-semibold">
 <DollarSign className="w-4 h-4 mr-1" />
 Giảm {formatPrice(item.discountValue)}
 </span>
 )}
 {item.minOrderValue > 0 && (
 <span className="text-[#8d95a3] text-xs">
 Đơn tối thiểu {formatPrice(item.minOrderValue)}
 </span>
 )}
 </div>

 {/* Usage Progress */}
 <div className="mt-4">
 <div className="flex items-center justify-between text-xs text-[#5a6577] mb-1">
 <span>Đã sử dụng</span>
 <span className="font-medium">
 {item.usedCount}/{item.usageLimit}
 </span>
 </div>
 <div className="w-full bg-[#e8ecf0] rounded-full h-2">
 <div
 className={`h-2 rounded-full ${
 item.usageLimit > 0 && item.usedCount / item.usageLimit >= 0.9
 ? "bg-red-500"
 : item.usageLimit > 0 && item.usedCount / item.usageLimit >= 0.7
 ? "bg-yellow-500"
 : "bg-green-500"
 }`}
 style={{
 width: `${item.usageLimit > 0 ? (item.usedCount / item.usageLimit) * 100 : 0}%`,
 }}
 />
 </div>
 </div>
 </div>

 {/* Stats */}
 <div className="p-6 bg-[#f9fafb]">
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div className="text-center">
 <div className="text-lg font-bold text-[#1a2332]">
 {item.bookings}
 </div>
 <div className="text-xs text-[#5a6577]">Sử dụng</div>
 </div>
 <div className="text-center border-l border-[#e8ecf0]">
 <div className="text-sm font-bold text-primary">
 {formatPrice(item.revenue)}
 </div>
 <div className="text-xs text-[#5a6577]">Doanh thu</div>
 </div>
 </div>

 {/* Validity */}
 <div className="text-xs text-[#5a6577] mb-3">
 <div className="flex items-center gap-1 mb-1">
 <Calendar className="w-3 h-3" />
 <span>Hiệu lực:</span>
 </div>
 <div className="text-[#5a6577]">
 {new Date(item.validFrom).toLocaleDateString("vi-VN")} —{" "}
 {new Date(item.validUntil).toLocaleDateString("vi-VN")}
 </div>
 </div>

 <div className="text-xs text-[#5a6577] mb-1">
 Áp dụng:{" "}
 <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
 {item.applicableServices}
 </span>
 </div>
 </div>

 {/* Actions */}
 <div className="px-6 py-4 bg-white border-t border-[#e8ecf0] rounded-b-lg flex items-center justify-between">
 <div className="flex items-center gap-2">
 <button
 onClick={() =>
 navigate("/ManagerPromotion/detail", {
 state: { promotion: item },
 })
 }
 className="p-2 text-[#8d95a3] hover:text-primary hover:bg-[#f0f2f4] rounded"
 title="Xem chi tiết"
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 onClick={() =>
 navigate("/ManagerPromotion/edit", {
 state: { promotion: item },
 })
 }
 className="p-2 text-[#8d95a3] hover:text-primary hover:bg-[#f0f2f4] rounded"
 title="Chỉnh sửa"
 >
 <Edit3 className="w-4 h-4" />
 </button>
 </div>
 <button
 onClick={() => handleDelete(item.id)}
 className="p-2 text-[#8d95a3] hover:text-red-500 hover:bg-red-50 rounded"
 title="Xóa"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))}
 </div>

 {/* Empty State */}
 {filtered.length === 0 && !loading && (
 <div className="bg-white rounded-lg border border-[#e8ecf0] p-12 text-center">
 <div className="w-20 h-20 bg-[#f0f2f4] rounded-full flex items-center justify-center mx-auto mb-4">
 <Gift className="w-10 h-10 text-[#8d95a3]" />
 </div>
 <h3 className="text-xl font-semibold text-[#1a2332] mb-2">
 {searchQuery
 ? `Không tìm thấy kết quả cho "${searchQuery}"`
 : "Không có khuyến mãi nào"}
 </h3>
 <p className="text-[#5a6577] mb-6">
 {!searchQuery && "Tạo khuyến mãi đầu tiên để bắt đầu"}
 </p>
 {!searchQuery && (
 <button
 onClick={() => navigate("/ManagerPromotion/create")}
 className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover flex items-center mx-auto"
 >
 <Plus className="w-5 h-5 mr-2" />
 Tạo khuyến mãi
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

export default ManagerPromotion;
