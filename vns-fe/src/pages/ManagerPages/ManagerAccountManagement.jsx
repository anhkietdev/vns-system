import { useState, useEffect } from "react";
import {
 User,
 Building,
 Mail,
 Phone,
 Shield,
 Eye,
 CheckCircle,
 X,
 AlertCircle,
 Download,
 Clock,
 FileText,
 Search,
 Filter,
 Loader2,
} from "lucide-react";
import { managerService } from "../../services/managerService";

export default function ManagerAccountManagement() {
 const [selectedFilter, setSelectedFilter] = useState("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedPartner, setSelectedPartner] = useState(null);
 const [pendingVerifications, setPendingVerifications] = useState([]);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(null);

 const fetchPartners = async () => {
 try {
 setLoading(true);
 // Lấy TẤT CẢ partners, không chỉ pending
 const res = await managerService.getAllPartners(null, 1, 50);
 if (res) {
 const raw = res.data || res;
 const items = Array.isArray(raw)
 ? raw
 : raw.items || raw.data || [];
 setPendingVerifications(items);
 }
 } catch (error) {
 console.error("Lỗi tải danh sách đối tác:", error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchPartners();
 }, []);

 const getStatusBadge = (status) => {
 switch (status) {
 case "pending":
 return (
 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
 <Clock className="w-3 h-3 mr-1" />
 Chờ Xét Duyệt
 </span>
 );
 case "reviewing":
 return (
 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
 <Eye className="w-3 h-3 mr-1" />
 Đang Xem Xét
 </span>
 );
 case "approved":
 return (
 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
 <CheckCircle className="w-3 h-3 mr-1" />
 Đã Duyệt
 </span>
 );
 case "rejected":
 return (
 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
 <X className="w-3 h-3 mr-1" />
 Từ Chối
 </span>
 );
 default:
 return null;
 }
 };

 const getBusinessTypeText = (type) => {
 switch (type) {
 case "tours":
 return "Tour & Hoạt Động";
 case "accommodation":
 return "Cho Thuê Nhà";
 case "transportation":
 return "Cho Thuê Xe";
 case "mixed":
 return "Nhiều Dịch Vụ";
 default:
 return type || "---";
 }
 };

 const handleApprovePartner = async (partnerId) => {
 try {
 setActionLoading(partnerId);
 await managerService.verifyPartner(partnerId, { isApproved: true });
 setPendingVerifications((prev) =>
 prev.map((p) =>
 p.id === partnerId ? { ...p, status: "approved" } : p
 )
 );
 if (selectedPartner?.id === partnerId) {
 setSelectedPartner((p) => ({ ...p, status: "approved" }));
 }
 } catch (error) {
 console.error("Lỗi duyệt đối tác:", error);
 } finally {
 setActionLoading(null);
 }
 };

 const handleRejectPartner = async (partnerId) => {
 try {
 setActionLoading(partnerId);
 await managerService.verifyPartner(partnerId, { isApproved: false });
 setPendingVerifications((prev) =>
 prev.map((p) =>
 p.id === partnerId ? { ...p, status: "rejected" } : p
 )
 );
 if (selectedPartner?.id === partnerId) {
 setSelectedPartner((p) => ({ ...p, status: "rejected" }));
 }
 } catch (error) {
 console.error("Lỗi từ chối đối tác:", error);
 } finally {
 setActionLoading(null);
 }
 };

 const handleDownloadDocument = (fileName) => {
 console.log("Tải xuống tài liệu:", fileName);
 };

  const DOCUMENT_TYPE_LABELS = {
    houseRental: "Giấy phép cho thuê nhà",
    tours: "Giấy phép kinh doanh tour",
  };

  const verificationStatusMap = { 0: "pending", 1: "approved", 2: "rejected" };

    const filteredPartners = pendingVerifications.map((partner) => ({
        ...partner,
        status: partner.status || verificationStatusMap[partner.verificationStatus] || "pending",
        documents: partner.documents || [],
    })).filter((partner) => {
 const matchesSearch =
 (partner.fullName || partner.ownerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
 (partner.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
 (partner.email || "").toLowerCase().includes(searchQuery.toLowerCase());

 const matchesFilter =
 selectedFilter === "all" || partner.status === selectedFilter;

 return matchesSearch && matchesFilter;
 });

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

 return (
 <div className="min-h-screen bg-[#f4f6f8] p-6">
 {/* Header */}
 <div>
 <div className="flex justify-between items-center pt-6 px-6">
 <div>
 <h1 className="text-3xl font-bold text-[#1a2332] mb-2">
 Xác Minh Đối Tác
 </h1>
 <p className="text-[#5a6577] mt-1">
 Quản lý và xét duyệt hồ sơ đăng ký đối tác kinh doanh
 </p>
 </div>
 </div>
 </div>

 {/* Filters and Search */}
 <div className="p-6 pt-8">
 <div className="bg-white rounded-lg border border-[#f0f2f4] mb-6">
 <div className="p-6">
 <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
 <div className="relative flex-1 max-w-md">
 <Search className="w-4 h-4 text-[#8d95a3] absolute left-3 top-3" />
 <input
 type="text"
 placeholder="Tìm kiếm theo tên, doanh nghiệp, email..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-3 py-2 border border-[#e8ecf0] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>

 <div className="flex items-center space-x-4">
 <div className="flex items-center">
 <Filter className="w-4 h-4 text-[#8d95a3] mr-2" />
 <select
 value={selectedFilter}
 onChange={(e) => setSelectedFilter(e.target.value)}
 className="border border-[#e8ecf0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="all">Tất Cả</option>
 <option value="pending">Chờ Xét Duyệt</option>
 <option value="reviewing">Đang Xem Xét</option>
 <option value="approved">Đã Duyệt</option>
 <option value="rejected">Từ Chối</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Partners List */}
 <div className="space-y-6">
 {filteredPartners.map((partner) => (
 <div
 key={partner.id}
 className="bg-white rounded-lg border border-[#f0f2f4] transition-shadow duration-200"
 >
 {/* Partner Basic Info */}
 <div className="px-6 py-4 border-b border-[#f0f2f4]">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
 <User className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-[#1a2332]">
 {partner.fullName || partner.ownerName || "---"}
 </h3>
 <div className="flex items-center text-sm text-[#5a6577] mt-1">
 <Building className="w-4 h-4 mr-1" />
 {partner.businessName || "---"}
 </div>
 </div>
 </div>
 <div className="flex items-center space-x-3">
 {getStatusBadge(partner.status)}
 <button
 onClick={async () => {
 if (selectedPartner?.id === partner.id) {
 setSelectedPartner(null);
 } else {
 try {
 const detail = await managerService.getPartnerDetail(partner.id);
 const d = detail?.data || detail || partner;
 setSelectedPartner({ ...partner, ...d, documents: d.documents || [] });
 } catch {
 setSelectedPartner({ ...partner, documents: [] });
 }
 }
 }}
 className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
 >
 {selectedPartner?.id === partner.id
 ? "Thu Gọn"
 : "Xem Chi Tiết"}
 </button>
 </div>
 </div>
 </div>

 {/* Partner Details (Expandable) */}
 {selectedPartner?.id === partner.id && (
 <div className="p-6 space-y-6">
 {/* Contact Information */}
 <div>
 <h4 className="text-md font-semibold text-[#1a2332] mb-4">
 Thông Tin Liên Hệ
 </h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
 <div className="flex items-center">
 <Mail className="w-4 h-4 text-[#8d95a3] mr-2" />
 <span className="text-[#5a6577]">{partner.email || "---"}</span>
 </div>
 <div className="flex items-center">
 <Phone className="w-4 h-4 text-[#8d95a3] mr-2" />
 <span className="text-[#5a6577]">{partner.phone || partner.phoneNumber || "---"}</span>
 </div>
 <div className="flex items-center">
 <Building className="w-4 h-4 text-[#8d95a3] mr-2" />
 <span className="text-[#5a6577]">
 {selectedPartner?.id === partner.id && selectedPartner.businessLicense
 ? `GP: ${selectedPartner.businessLicense}`
 : selectedPartner?.id === partner.id && selectedPartner.description
 ? selectedPartner.description.substring(0, 50) + "..."
 : partner.businessName || "---"}
 </span>
 </div>
 </div>
 </div>

 {/* Documents */}
 <div>
 <h4 className="text-md font-semibold text-[#1a2332] mb-4 flex items-center">
 <Shield className="w-4 h-4 mr-2" />
 Tài Liệu Xác Minh
 </h4>
 {Array.isArray(selectedPartner?.documents) && selectedPartner.documents.length > 0 ? (
 <div className="space-y-5">
   {Object.entries(
   selectedPartner.documents.reduce((groups, doc) => {
   const rawType = doc.documentType || "Khác";
   if (rawType === "additional") return groups;
   if (!groups[rawType]) groups[rawType] = [];
   groups[rawType].push(doc);
   return groups;
   }, {})
   ).map(([rawType, docs]) => {
  const typeLabel = DOCUMENT_TYPE_LABELS[rawType] || rawType;
  return (
  <div key={rawType} className="border border-[#e8ecf0] rounded-xl overflow-hidden">
  <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e8ecf0]">
  <h5 className="text-sm font-semibold text-[#1a2332] flex items-center gap-2">
  <FileText className="w-4 h-4 text-primary" />
  {typeLabel}
  <span className="text-xs font-normal text-[#8d95a3]">({docs.length} tệp)</span>
  </h5>
  </div>
  <div className="p-4 flex flex-wrap gap-3">
  {docs.map((doc) => {
  const url = doc.documentUrl || doc.url || "";
  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
  return (
  <a key={doc.id} href={url} target="_blank" rel="noopener noreferrer" className="group block">
  {isImage ? (
  <div className="relative">
  <img src={url} alt={typeLabel} className="w-32 h-32 object-cover rounded-lg border border-[#e8ecf0] group-hover:opacity-80 transition-opacity" />
 <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
 {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("vi-VN") : ""}
 </span>
 </div>
 ) : (
 <div className="w-32 h-32 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center justify-center group-hover:bg-red-100 transition-colors">
 <span className="text-red-500 text-xl font-bold">PDF</span>
 <span className="text-xs text-red-400 mt-1">Nhấn để xem</span>
 <span className="text-[10px] text-[#8d95a3] mt-1">
 {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("vi-VN") : ""}
 </span>
 </div>
 )}
 </a>
 );
 })}
 </div>
  </div>
  );
  })}
  </div>
  ) : (
 <p className="text-sm text-[#8d95a3] italic">Đối tác chưa tải lên tài liệu nào</p>
 )}
 </div>

 {/* Action Buttons */}
 <div className="flex justify-between items-center pt-4 border-t border-[#f0f2f4]">
 <div className="text-sm text-[#5a6577]">
 Ngày nộp hồ sơ:{" "}
 {(partner.submittedDate || partner.createdAt)
 ? new Date(partner.submittedDate || partner.createdAt).toLocaleDateString("vi-VN")
 : "---"}
 </div>
 {partner.status === "pending" ? (
 <div className="flex space-x-3">
 <button
 onClick={() => handleRejectPartner(partner.id)}
 disabled={actionLoading === partner.id}
 className="px-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors flex items-center disabled:opacity-50"
 >
 <X className="w-4 h-4 mr-1" />
 Từ Chối
 </button>
 <button
 onClick={() => handleApprovePartner(partner.id)}
 disabled={actionLoading === partner.id}
 className="px-6 py-2 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center disabled:opacity-50"
 style={{ backgroundColor: "var(--color-primary, #10b981)" }}
 >
 <CheckCircle className="w-4 h-4 mr-1" />
 Duyệt Hồ Sơ
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2">
 {partner.status === "approved" && (
 <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
 <CheckCircle className="w-4 h-4" /> Đã duyệt
 </span>
 )}
 {partner.status === "rejected" && (
 <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
 <X className="w-4 h-4" /> Đã từ chối
 </span>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 ))}

 {filteredPartners.length === 0 && (
 <div className="bg-white rounded-lg border border-[#f0f2f4] p-12 text-center">
 <AlertCircle className="w-12 h-12 text-[#8d95a3] mx-auto mb-4" />
 <h3 className="text-lg font-medium text-[#1a2332] mb-2">
 Không tìm thấy hồ sơ nào
 </h3>
 <p className="text-[#5a6577]">
 Không có hồ sơ đối tác nào phù hợp với tiêu chí tìm kiếm của
 bạn.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
