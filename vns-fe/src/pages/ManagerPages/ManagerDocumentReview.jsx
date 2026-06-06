import { useState, useEffect } from "react";
import {
 Search,
 RefreshCw,
 CheckCircle,
 XCircle,
 Eye,
 Clock,
 FileText,
 Download,
 Building,
 User,
 Loader2,
} from "lucide-react";
import { managerService } from "../../services/managerService";

const statusConfig = {
 pending: {
 label: "Chờ xét duyệt",
 color: "bg-amber-50 text-amber-700",
 icon: Clock,
 },
 approved: {
 label: "Đã duyệt",
 color: "bg-green-50 text-green-700",
 icon: CheckCircle,
 },
 rejected: {
 label: "Từ chối",
 color: "bg-red-50 text-red-700",
 icon: XCircle,
 },
};

const typeConfig = {
 new_partner: { label: "Đối tác mới", color: "bg-blue-100 text-blue-700" },
 update: { label: "Cập nhật hồ sơ", color: "bg-purple-100 text-purple-700" },
};

const ManagerDocumentReview = () => {
 const [search, setSearch] = useState("");
 const [filterStatus, setFilterStatus] = useState("pending");
 const [selected, setSelected] = useState(null);
 const [list, setList] = useState([]);
 const [notes, setNotes] = useState("");
 const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectReason, setRejectReason] = useState("");
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);

 const fetchData = async () => {
 setLoading(true);
 try {
 const res = await managerService.getPendingVerifications(1, 100);
 const data = res?.data || res;
 const items = Array.isArray(data) ? data : data?.items || data?.data || [];
 const mapped = items.map((item) => ({
 id: item.id || item.partnerId || "",
 partner: item.businessName || item.fullName || item.ownerName || "",
 partnerId: item.partnerId || item.id || "",
 email: item.email || "",
 phone: item.phone || item.phoneNumber || "",
 submitted: item.submittedDate
 ? new Date(item.submittedDate).toLocaleDateString("vi-VN")
 : item.createdAt
 ? new Date(item.createdAt).toLocaleDateString("vi-VN")
 : "",
 status: item.status || (typeof item.verificationStatus === "number" ? ({ 0: "pending", 1: "approved", 2: "rejected" })[item.verificationStatus] : null) || "pending",
 type: item.type || "new_partner",
 docs: item.documents || item.docs || [],
 notes: item.notes || "",
 }));
 setList(mapped);
 } catch (err) {
 console.error("Lỗi tải danh sách hồ sơ:", err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const filtered = list.filter((d) => {
 const matchSearch =
 (d.partner || "").toLowerCase().includes(search.toLowerCase()) ||
 String(d.id).toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === "all" || d.status === filterStatus;
 return matchSearch && matchStatus;
 });

 const approve = async (id) => {
 setActionLoading(true);
 try {
 await managerService.verifyPartner(id, { isApproved: true, note: notes });
 setList((prev) =>
 prev.map((d) => (d.id === id ? { ...d, status: "approved", notes } : d)),
 );
 if (selected?.id === id)
 setSelected((d) => ({ ...d, status: "approved", notes }));
 } catch (err) {
 console.error("Lỗi phê duyệt:", err);
 } finally {
 setActionLoading(false);
 }
 };

 const reject = async (id, reason) => {
 setActionLoading(true);
 try {
 await managerService.verifyPartner(id, { isApproved: false, note: reason });
 setList((prev) =>
 prev.map((d) =>
 d.id === id ? { ...d, status: "rejected", notes: reason } : d,
 ),
 );
 if (selected?.id === id)
 setSelected((d) => ({ ...d, status: "rejected", notes: reason }));
 setShowRejectModal(false);
 setRejectReason("");
 } catch (err) {
 console.error("Lỗi từ chối:", err);
 } finally {
 setActionLoading(false);
 }
 };

 const toggleDoc = (docIndex) => {
 if (!selected) return;
 const updated = {
 ...selected,
 docs: (selected.docs || []).map((doc, i) =>
 i === docIndex ? { ...doc, verified: !doc.verified } : doc,
 ),
 };
 setSelected(updated);
 setList((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
 };

 const counts = {
 pending: list.filter((d) => d.status === "pending").length,
 approved: list.filter((d) => d.status === "approved").length,
 rejected: list.filter((d) => d.status === "rejected").length,
 };

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
 <div>
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-[#1a2332] mb-1">
 Xét duyệt tài liệu
 </h1>
 <p className="text-[#5a6577] text-sm">
 Xem xét hồ sơ và tài liệu đăng ký của đối tác
 </p>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 {[
 {
 label: "Chờ xét duyệt",
 count: counts.pending,
 color: "bg-yellow-50 border-yellow-200 text-yellow-800",
 tab: "pending",
 },
 {
 label: "Đã phê duyệt",
 count: counts.approved,
 color: "bg-green-50 border-green-200 text-green-800",
 tab: "approved",
 },
 {
 label: "Từ chối",
 count: counts.rejected,
 color: "bg-red-50 border-red-200 text-red-800",
 tab: "rejected",
 },
 ].map((c) => (
 <button
 key={c.tab}
 onClick={() => setFilterStatus(c.tab)}
 className={`p-4 rounded-xl border text-left transition-all ${c.color} ${filterStatus === c.tab ? "ring-2 ring-offset-1 ring-current" : ""}`}
 >
 <p className="text-2xl font-bold">{c.count}</p>
 <p className="text-sm font-medium mt-0.5">{c.label}</p>
 </button>
 ))}
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl border border-[#e8ecf0] p-4 mb-6 flex flex-wrap gap-3">
 <div className="relative flex-1 min-w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d95a3]" />
 <input
 type="text"
 placeholder="Tìm theo tên đối tác, mã hồ sơ..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-[#e8ecf0] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
 />
 </div>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-3 py-2 border border-[#e8ecf0] rounded-lg text-sm focus:ring-2 focus:ring-primary bg-white"
 >
 <option value="all">Tất cả trạng thái</option>
 <option value="pending">Chờ xét duyệt</option>
 <option value="approved">Đã phê duyệt</option>
 <option value="rejected">Từ chối</option>
 </select>
 <button
 onClick={fetchData}
 className="p-2 border border-[#e8ecf0] rounded-lg hover:bg-[#f9fafb]"
 >
 <RefreshCw className="w-4 h-4 text-[#5a6577]" />
 </button>
 </div>

 <div
 className={`grid gap-6 ${selected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
 >
 {/* List */}
 <div className="space-y-3">
 {filtered.length === 0 && (
 <div className="bg-white rounded-xl border border-[#e8ecf0] p-12 text-center text-[#8d95a3]">
 Không tìm thấy hồ sơ nào
 </div>
 )}
 {filtered.map((doc) => {
 const sc = statusConfig[doc.status] || statusConfig.pending;
 const tc = typeConfig[doc.type] || typeConfig.new_partner;
 const StatusIcon = sc.icon;
 const docs = doc.docs || [];
 const verifiedCount = docs.filter((d) => d.verified).length;
 return (
 <div
 key={doc.id}
 onClick={() => {
 setSelected(doc);
 setNotes(doc.notes || "");
 }}
 className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
 selected?.id === doc.id
 ? "border-primary ring-1 ring-primary"
 : "border-[#e8ecf0]"
 }`}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1.5 flex-wrap">
 <span
 className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.color}`}
 >
 {tc.label}
 </span>
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}
 >
 <StatusIcon className="w-3 h-3" /> {sc.label}
 </span>
 </div>
 <p className="font-semibold text-[#1a2332]">
 {doc.partner}
 </p>
 <div className="flex items-center gap-3 mt-1.5 text-xs text-[#8d95a3] flex-wrap">
 <span className="flex items-center gap-1">
 <User className="w-3 h-3" />
 {doc.email}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {doc.submitted}
 </span>
 <span className="flex items-center gap-1">
 <FileText className="w-3 h-3" />
 {verifiedCount}/{docs.length} tài liệu đã xác nhận
 </span>
 </div>
 </div>
 {doc.status === "pending" && (
 <div className="flex gap-2 flex-shrink-0">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelected(doc);
 setNotes("");
 approve(doc.id);
 }}
 disabled={actionLoading}
 className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 disabled:opacity-50"
 >
 Duyệt
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelected(doc);
 setShowRejectModal(true);
 }}
 disabled={actionLoading}
 className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
 >
 Từ chối
 </button>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {/* Detail panel */}
 {selected && (
 <div className="bg-white rounded-xl border border-[#e8ecf0] p-6 space-y-5 h-fit sticky top-6">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-[#1a2332]">Chi tiết hồ sơ</h3>
 <button
 onClick={() => setSelected(null)}
 className="text-[#8d95a3] hover:text-[#5a6577]"
 >
 <XCircle className="w-5 h-5" />
 </button>
 </div>

 {/* Partner info */}
 <div className="p-3 bg-[#f9fafb] rounded-lg space-y-2">
 <div className="flex items-center gap-2">
 <Building className="w-4 h-4 text-[#8d95a3]" />
 <div>
 <p className="text-xs text-[#8d95a3]">Đối tác</p>
 <p className="text-sm font-semibold text-[#1a2332]">
 {selected.partner}
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2 text-xs text-[#5a6577]">
 <span>{selected.email}</span>
 <span>{selected.phone}</span>
 </div>
 </div>

 {/* Documents checklist */}
 {selected.docs && selected.docs.length > 0 && (
 <div>
 <p className="text-xs font-medium text-[#5a6577] uppercase mb-3">
 Tài liệu đính kèm (
 {selected.docs.filter((d) => d.verified).length}/
 {selected.docs.length} đã xác nhận)
 </p>
 <div className="space-y-2">
 {selected.docs.map((doc, i) => (
 <div
 key={i}
 className={`flex items-center justify-between p-3 rounded-lg border ${doc.verified ? "border-green-200 bg-green-50" : "border-[#e8ecf0] bg-[#f9fafb]"}`}
 >
 <div className="flex items-center gap-2">
 <button
 onClick={() => toggleDoc(i)}
 className="flex-shrink-0"
 >
 {doc.verified ? (
 <CheckCircle className="w-4 h-4 text-green-600" />
 ) : (
 <div className="w-4 h-4 border-2 border-[#e8ecf0] rounded-full" />
 )}
 </button>
 <div>
 <p className="text-xs font-medium text-[#1a2332]">
 {doc.name || doc.fileName || "Tài liệu"}
 </p>
 <p className="text-xs text-[#8d95a3]">{doc.size || ""}</p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 <button className="p-1 text-[#8d95a3] hover:text-primary rounded">
 <Eye className="w-4 h-4" />
 </button>
 <button className="p-1 text-[#8d95a3] hover:text-primary rounded">
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Notes */}
 <div>
 <label className="block text-xs font-medium text-[#5a6577] uppercase mb-2">
 Ghi chú
 </label>
 <textarea
 rows={3}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Thêm ghi chú về hồ sơ này..."
 className="w-full px-3 py-2 border border-[#e8ecf0] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
 disabled={selected.status !== "pending"}
 />
 </div>

 {selected.status === "rejected" && selected.notes && (
 <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
 <p className="text-xs font-medium text-red-700 mb-1">
 Lý do từ chối:
 </p>
 <p className="text-xs text-red-600">{selected.notes}</p>
 </div>
 )}

 {selected.status === "pending" && (
 <div className="flex gap-3">
 <button
 onClick={() => approve(selected.id)}
 disabled={actionLoading}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50"
 >
 <CheckCircle className="w-4 h-4" /> Phê duyệt
 </button>
 <button
 onClick={() => setShowRejectModal(true)}
 disabled={actionLoading}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50"
 >
 <XCircle className="w-4 h-4" /> Từ chối
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Reject Modal */}
 {showRejectModal && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl w-full max-w-md p-6">
 <h3 className="text-lg font-semibold text-[#1a2332] mb-1">
 Từ chối hồ sơ
 </h3>
 <p className="text-sm text-[#5a6577] mb-4">
 Đối tác:{" "}
 <span className="font-medium text-[#3d4654]">
 {selected?.partner}
 </span>
 </p>
 <div>
 <label className="block text-sm font-medium text-[#3d4654] mb-1">
 Lý do từ chối <span className="text-red-500">*</span>
 </label>
 <textarea
 rows={4}
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="Nêu rõ tài liệu còn thiếu hoặc sai sót để đối tác bổ sung..."
 className="w-full px-4 py-2 border border-[#e8ecf0] rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
 />
 </div>
 <div className="flex gap-3 mt-5">
 <button
 onClick={() => {
 setShowRejectModal(false);
 setRejectReason("");
 }}
 className="flex-1 px-4 py-2 border border-[#e8ecf0] text-[#3d4654] rounded-lg hover:bg-[#f9fafb]"
 >
 Hủy
 </button>
 <button
 onClick={() =>
 rejectReason.trim() && reject(selected?.id, rejectReason)
 }
 disabled={!rejectReason.trim() || actionLoading}
 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
 >
 Xác nhận từ chối
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default ManagerDocumentReview;
