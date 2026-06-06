import { useState, useEffect } from "react";
import {
 Star,
 Search,
 Eye,
 CheckCircle,
 MessageSquare,
 ThumbsUp,
 ThumbsDown,
 User,
 Building,
 Home,
 Car,
 Compass,
 X,
 AlertCircle,
 BarChart3,
 Loader2,
} from "lucide-react";
import { managerService } from "../../services/managerService";

const STATUS_CONFIG = {
 new: { label: "Mới", color: "bg-blue-100 text-blue-700" },
 reviewed: { label: "Đã xem", color: "bg-yellow-100 text-yellow-700" },
 actioned: { label: "Đã xử lý", color: "bg-green-100 text-green-700" },
};

const SERVICE_ICON = { Homestay: Home, Tour: Compass, "Car Rental": Car };

function StarRating({ rating, size = "sm" }) {
 const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
 return (
 <div className="flex gap-0.5">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 className={`${sz} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-[#8d95a3]"}`}
 />
 ))}
 </div>
 );
}

export default function ManagerFeedback() {
 const [feedbacks, setFeedbacks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [filterType, setFilterType] = useState("all");
 const [filterService, setFilterService] = useState("all");
 const [filterStatus, setFilterStatus] = useState("all");
 const [filterRating, setFilterRating] = useState("all");
 const [sortBy, setSortBy] = useState("date");
 const [viewItem, setViewItem] = useState(null);
 const [actionLoading, setActionLoading] = useState(false);

 const fetchFeedbacks = async () => {
 setLoading(true);
 try {
 const res = await managerService.getFeedback(1, 100);
 const data = res?.data || res;
 const items = Array.isArray(data) ? data : data?.items || data?.data || [];
 const mapped = items.map((item) => ({
 id: item.id || "",
 type: item.type || "user",
 authorName: item.authorName || item.userName || "",
 authorEmail: item.authorEmail || item.email || "",
 targetName: item.targetName || item.serviceName || "",
 targetPartner: item.targetPartner || item.partnerName || null,
 serviceType: item.serviceType || null,
 rating: item.rating || 0,
 comment: item.comment || item.content || "",
 date: item.date || item.createdAt || "",
 status: item.adminStatus || item.status || "new",
 helpful: item.helpful || 0,
 notHelpful: item.notHelpful || 0,
 tags: item.tags || [],
 }));
 setFeedbacks(mapped);
 } catch (err) {
 console.error("Lỗi tải phản hồi:", err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchFeedbacks();
 }, []);

 const updateStatus = async (id, newStatus) => {
 setActionLoading(true);
 try {
 await managerService.toggleFeedbackVisibility(id, { isVisible: true, status: newStatus });
 setFeedbacks((prev) =>
 prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)),
 );
 if (viewItem?.id === id) setViewItem((v) => ({ ...v, status: newStatus }));
 } catch (err) {
 console.error("Lỗi cập nhật trạng thái:", err);
 } finally {
 setActionLoading(false);
 }
 };

 const avgRating =
 feedbacks.length > 0
 ? (
 feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
 ).toFixed(1)
 : 0;

 const newCount = feedbacks.filter((f) => f.status === "new").length;
 const userCount = feedbacks.filter((f) => f.type === "user").length;
 const partnerCount = feedbacks.filter((f) => f.type === "partner").length;
 const lowRatingCount = feedbacks.filter((f) => f.rating <= 2).length;

 const metrics = [
 {
 label: "Phản hồi mới",
 value: newCount,
 color: "bg-blue-100 text-blue-600",
 icon: AlertCircle,
 },
 {
 label: "Đánh giá trung bình",
 value: `${avgRating} / 5`,
 color: "bg-amber-100 text-amber-600",
 icon: Star,
 },
 {
 label: "Người dùng / Đối tác",
 value: `${userCount} / ${partnerCount}`,
 color: "bg-purple-100 text-purple-600",
 icon: BarChart3,
 },
 {
 label: "Đánh giá thấp ",
 value: lowRatingCount,
 color: "bg-red-100 text-red-600",
 icon: ThumbsDown,
 },
 ];

 const filtered = feedbacks
 .filter((f) => {
 if (search) {
 const q = search.toLowerCase();
 if (
 !(f.authorName || "").toLowerCase().includes(q) &&
 !(f.comment || "").toLowerCase().includes(q) &&
 !(f.targetName || "").toLowerCase().includes(q)
 )
 return false;
 }
 if (filterType !== "all" && f.type !== filterType) return false;
 if (filterService !== "all" && f.serviceType !== filterService)
 return false;
 if (filterStatus !== "all" && f.status !== filterStatus) return false;
 if (filterRating !== "all" && f.rating !== parseInt(filterRating))
 return false;
 return true;
 })
 .sort((a, b) => {
 if (sortBy === "date") return new Date(b.date) - new Date(a.date);
 if (sortBy === "rating_asc") return a.rating - b.rating;
 if (sortBy === "rating_desc") return b.rating - a.rating;
 if (sortBy === "helpful") return b.helpful - a.helpful;
 return 0;
 });

 if (loading) {
 return (
 <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 <span className="ml-2 text-[#5a6577]">Đang tải dữ liệu...</span>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#f4f6f8] p-6">
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-[#1a2332] mb-1">
 Quản Lý Phản Hồi
 </h1>
 <p className="text-[#5a6577] text-sm">
 Theo dõi và phân tích phản hồi từ người dùng và đối tác để cải thiện
 dịch vụ
 </p>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {metrics.map((m) => {
 const Icon = m.icon;
 return (
 <div
 key={m.label}
 className="bg-white rounded-xl border border-[#e8ecf0] p-5 relative"
 >
 {m.alert && (
 <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full" />
 )}
 <div className="flex items-center justify-between mb-3">
 <div className={`p-2 rounded-lg ${m.color}`}>
 <Icon className="w-5 h-5" />
 </div>
 </div>
 <p className="text-sm text-[#5a6577] mb-1">{m.label}</p>
 <p className="text-xl font-bold text-[#1a2332]">{m.value}</p>
 <p className="text-xs text-[#8d95a3] mt-1">{m.sub}</p>
 </div>
 );
 })}
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
 <h3 className="font-semibold text-[#1a2332] mb-4">Bộ lọc</h3>
 <div className="flex flex-wrap gap-3">
 <div className="relative flex-1 min-w-[200px]">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d95a3] w-4 h-4" />
 <input
 className="w-full pl-9 pr-3 py-2 border border-[#e8ecf0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 placeholder="Tìm theo tên, nội dung..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <select
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 >
 <option value="all">Tất cả loại</option>
 <option value="user">Người dùng</option>
 <option value="partner">Đối tác</option>
 </select>
 <select
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 value={filterService}
 onChange={(e) => setFilterService(e.target.value)}
 >
 <option value="all">Tất cả dịch vụ</option>
 <option value="Homestay">Homestay</option>
 <option value="Tour">Tour</option>
 <option value="Car Rental">Cho thuê xe</option>
 </select>
 <select
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 >
 <option value="all">Tất cả trạng thái</option>
 <option value="new">Mới</option>
 <option value="reviewed">Đã xem</option>
 <option value="actioned">Đã xử lý</option>
 </select>
 <select
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 value={filterRating}
 onChange={(e) => setFilterRating(e.target.value)}
 >
 <option value="all">Tất cả sao</option>
 {[5, 4, 3, 2, 1].map((r) => (
 <option key={r} value={r}>
 {r} sao
 </option>
 ))}
 </select>
 <select
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 >
 <option value="date">Mới nhất</option>
 <option value="rating_asc">Sao tăng dần</option>
 <option value="rating_desc">Sao giảm dần</option>
 <option value="helpful">Hữu ích nhất</option>
 </select>
 </div>
 </div>

 {/* Feedback list */}
 <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-[#1a2332]">
 Danh sách phản hồi
 </h3>
 <span className="w-5 h-5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center justify-center font-bold">
 {filtered.length}
 </span>
 </div>
 </div>

 {filtered.length === 0 ? (
 <div className="py-12 text-center">
 <MessageSquare className="w-10 h-10 text-[#8d95a3] mx-auto mb-3" />
 <p className="text-[#5a6577] text-sm">
 Không có phản hồi nào phù hợp
 </p>
 </div>
 ) : (
 <div className="space-y-2">
 {filtered.map((fb) => {
 const ServiceIcon = fb.serviceType
 ? SERVICE_ICON[fb.serviceType]
 : Building;
 const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
 return (
 <div
 key={fb.id}
 className="flex items-start gap-4 p-3 border border-[#f0f2f4] rounded-lg hover:bg-[#f9fafb] transition-colors"
 >
 {/* Avatar */}
 <div
 className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
 fb.type === "user"
 ? "bg-blue-100 text-blue-600"
 : "bg-purple-100 text-purple-600"
 }`}
 >
 {fb.type === "user" ? (
 <User className="w-4 h-4" />
 ) : (
 <Building className="w-4 h-4" />
 )}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <span className="text-sm font-medium text-[#1a2332]">
 {fb.authorName}
 </span>
 <span
 className={`text-xs px-2 py-0.5 rounded-full font-medium ${
 fb.type === "user"
 ? "bg-blue-50 text-blue-700"
 : "bg-purple-50 text-purple-700"
 }`}
 >
 {fb.type === "user" ? "Người dùng" : "Đối tác"}
 </span>
 {fb.serviceType && (
 <span className="text-xs px-2 py-0.5 rounded-full bg-[#f0f2f4] text-[#5a6577] flex items-center gap-1">
 <ServiceIcon className="w-3 h-3" />
 {fb.serviceType}
 </span>
 )}
 <span
 className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}
 >
 {statusCfg.label}
 </span>
 <span className="text-xs text-[#8d95a3] ml-auto">
 {fb.date ? new Date(fb.date).toLocaleDateString("vi-VN") : ""}
 </span>
 </div>

 <div className="flex items-center gap-2 mb-1">
 <StarRating rating={fb.rating} />
 <span className="text-xs text-[#5a6577]">
 về{" "}
 <span className="text-primary font-medium">
 {fb.targetName}
 </span>
 </span>
 </div>

 <p className="text-sm text-[#3d4654] line-clamp-1 mb-2">
 {fb.comment}
 </p>

 <div className="flex items-center gap-4">
 <span className="text-xs text-[#8d95a3] flex items-center gap-1">
 <ThumbsUp className="w-3 h-3" /> {fb.helpful}
 </span>
 <div className="flex gap-2 ml-auto">
 <button
 onClick={() => setViewItem(fb)}
 className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
 >
 <Eye className="w-3.5 h-3.5" /> Xem
 </button>
 {fb.status === "new" && (
 <button
 onClick={() => updateStatus(fb.id, "reviewed")}
 disabled={actionLoading}
 className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-medium disabled:opacity-50"
 >
 Đánh dấu đã xem
 </button>
 )}
 {fb.status !== "actioned" && (
 <button
 onClick={() => updateStatus(fb.id, "actioned")}
 disabled={actionLoading}
 className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium disabled:opacity-50"
 >
 Đã xử lý
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Detail Modal */}
 {viewItem && (
 <div
 className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
 onClick={() => setViewItem(null)}
 >
 <div
 className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="p-6">
 {/* Modal header */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-2">
 <MessageSquare className="w-5 h-5 text-primary" />
 <h2 className="text-lg font-bold text-[#1a2332]">
 Chi tiết phản hồi
 </h2>
 </div>
 <button
 onClick={() => setViewItem(null)}
 className="p-1.5 rounded-lg hover:bg-[#f0f2f4] text-[#5a6577]"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Author info */}
 <div className="flex items-center gap-3 mb-5 p-4 border border-[#f0f2f4] rounded-lg bg-[#f9fafb]">
 <div
 className={`w-11 h-11 rounded-full flex items-center justify-center ${
 viewItem.type === "user"
 ? "bg-blue-100 text-blue-600"
 : "bg-purple-100 text-purple-600"
 }`}
 >
 {viewItem.type === "user" ? (
 <User className="w-5 h-5" />
 ) : (
 <Building className="w-5 h-5" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-[#1a2332]">
 {viewItem.authorName}
 </p>
 <p className="text-sm text-[#5a6577]">
 {viewItem.authorEmail}
 </p>
 <p className="text-xs text-[#8d95a3] mt-0.5">
 {viewItem.type === "user" ? "Người dùng" : "Đối tác"} ·{" "}
 {viewItem.date ? new Date(viewItem.date).toLocaleDateString("vi-VN") : ""}
 </p>
 </div>
 <span
 className={`text-xs px-2.5 py-1 rounded-full font-medium ${(STATUS_CONFIG[viewItem.status] || STATUS_CONFIG.new).color}`}
 >
 {(STATUS_CONFIG[viewItem.status] || STATUS_CONFIG.new).label}
 </span>
 </div>

 {/* Service */}
 <div className="mb-4 p-3 border border-[#f0f2f4] rounded-lg">
 <p className="text-xs text-[#8d95a3] mb-1 uppercase tracking-wide">
 Đối tượng phản hồi
 </p>
 <p className="font-medium text-[#1a2332]">
 {viewItem.targetName}
 </p>
 {viewItem.targetPartner && (
 <p className="text-sm text-[#5a6577] flex items-center gap-1 mt-0.5">
 <Building className="w-3.5 h-3.5" />{" "}
 {viewItem.targetPartner}
 </p>
 )}
 {viewItem.serviceType && (
 <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 mt-2 bg-[#f0f2f4] text-[#5a6577] rounded-full">
 {(() => {
 const Icon = SERVICE_ICON[viewItem.serviceType] || Building;
 return <Icon className="w-3 h-3" />;
 })()}
 {viewItem.serviceType}
 </span>
 )}
 </div>

 {/* Rating */}
 <div className="mb-4">
 <p className="text-xs text-[#8d95a3] mb-1.5 uppercase tracking-wide">
 Đánh giá
 </p>
 <div className="flex items-center gap-2">
 <StarRating rating={viewItem.rating} size="lg" />
 <span className="text-lg font-bold text-[#1a2332]">
 {viewItem.rating}
 </span>
 <span className="text-[#8d95a3] text-sm">/ 5</span>
 </div>
 </div>

 {/* Comment */}
 <div className="mb-4">
 <p className="text-xs text-[#8d95a3] mb-1.5 uppercase tracking-wide">
 Nội dung
 </p>
 <p className="text-sm text-[#3d4654] leading-relaxed p-3 bg-[#f9fafb] border border-[#f0f2f4] rounded-lg">
 {viewItem.comment}
 </p>
 </div>

 {/* Tags */}
 {viewItem.tags && viewItem.tags.length > 0 && (
 <div className="mb-4">
 <p className="text-xs text-[#8d95a3] mb-1.5 uppercase tracking-wide">
 Từ khóa
 </p>
 <div className="flex flex-wrap gap-1.5">
 {viewItem.tags.map((tag) => (
 <span
 key={tag}
 className="text-xs px-2.5 py-1 bg-blue-50 text-primary rounded-full font-medium"
 >
 #{tag}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Helpful */}
 <div className="flex gap-4 mb-5 p-3 bg-[#f9fafb] border border-[#f0f2f4] rounded-lg">
 <span className="text-sm text-[#5a6577] flex items-center gap-1.5">
 <ThumbsUp className="w-4 h-4 text-green-500" />
 <span className="font-semibold">{viewItem.helpful}</span> hữu
 ích
 </span>
 <span className="text-sm text-[#5a6577] flex items-center gap-1.5">
 <ThumbsDown className="w-4 h-4 text-red-400" />
 <span className="font-semibold">
 {viewItem.notHelpful}
 </span>{" "}
 không hữu ích
 </span>
 </div>

 {/* Actions */}
 <div className="flex gap-2 justify-end">
 {viewItem.status === "new" && (
 <button
 onClick={() => updateStatus(viewItem.id, "reviewed")}
 disabled={actionLoading}
 className="px-4 py-2 rounded-lg border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
 >
 <Eye className="w-4 h-4" /> Đánh dấu đã xem
 </button>
 )}
 {viewItem.status !== "actioned" && (
 <button
 onClick={() => updateStatus(viewItem.id, "actioned")}
 disabled={actionLoading}
 className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
 >
 <CheckCircle className="w-4 h-4" /> Đã xử lý
 </button>
 )}
 <button
 onClick={() => setViewItem(null)}
 className="px-4 py-2 rounded-lg border border-[#e8ecf0] text-[#5a6577] hover:bg-[#f9fafb] text-sm font-medium"
 >
 Đóng
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
