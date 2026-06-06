import { useState, useEffect } from "react";
import {
  User,
  Building,
  Mail,
  Phone,
  Lock,
  Shield,
  Upload,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";
import { partnerService } from "../../services/partnerService";

export default function PartnerProfileEdit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    businessType: "tours",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, docsRes] = await Promise.allSettled([
        partnerService.getProfile(),
        partnerService.getDocuments(),
      ]);

      if (profileRes.status === "fulfilled") {
        const profile = profileRes.value?.data || profileRes.value || {};
        setFormData((prev) => ({
          ...prev,
          fullName: profile.fullName || profile.ownerName || profile.name || "",
          businessName: profile.businessName || profile.companyName || "",
          email: profile.email || "",
          phone: profile.phone || profile.phoneNumber || "",
          businessType: profile.businessType || "",
          bankName: profile.bankName || "",
          bankAccountNumber: profile.bankAccountNumber || "",
          bankAccountName: profile.bankAccountName || "",
        }));
        setVerificationStatus(profile.verificationStatus);
      }

      if (docsRes.status === "fulfilled") {
        const docs = docsRes.value?.data?.items || docsRes.value?.data || docsRes.value?.items || [];
        setDocuments(Array.isArray(docs) ? docs : []);
      }
    } catch (err) {
      console.error(err);
      setError("Không thể tải thông tin hồ sơ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        fullName: formData.fullName,
        businessName: formData.businessName,
        phoneNumber: formData.phone,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountName: formData.bankAccountName,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      await partnerService.updateProfile(payload);
      setSuccess("Cập nhật hồ sơ thành công!");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", docType);
      await partnerService.uploadDocument(fd);
      setSuccess("Tải tài liệu thành công!");
      const docsRes = await partnerService.getDocuments();
      const docs = docsRes?.data?.items || docsRes?.data || docsRes?.items || [];
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error(err);
      setError("Tải tài liệu thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const getDocStatus = (docType) => {
    const doc = documents.find(
      (d) => d.documentType === docType || d.type === docType || d.name === docType
    );
    if (!doc) return "not_verified";
    if (doc.status === "Approved" || doc.status === "verified" || doc.isVerified) return "verified";
    if (doc.status === "Pending" || doc.status === "pending") return "pending";
    return "not_verified";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã Xác Minh
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Đang Chờ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#f9fafb] text-[#5a6577]">
            <AlertCircle className="w-3 h-3 mr-1" />
            Chưa Xác Minh
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[#5a6577]">Đang tải hồ sơ...</p>
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
              Hồ Sơ Đối Tác
            </h1>
            <p className="text-[#5a6577] mt-1">
              Quản lý thông tin tài khoản và xác minh tài liệu
            </p>
          </div>
          <button
            onClick={fetchProfile}
            className="p-2 text-[#5a6577] hover:text-primary hover:bg-[#f9fafb] rounded-lg"
            title="Tải lại"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="px-6 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="px-6 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        </div>
      )}

      {/* Verification Status Banner */}
      <div className="px-6 mt-4">
        {verificationStatus === 1 ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Tài khoản đã được xác minh</p>
              <p className="text-sm text-green-600">Hồ sơ đối tác của bạn đã được phê duyệt. Bạn có thể tạo và quản lý dịch vụ.</p>
            </div>
          </div>
        ) : verificationStatus === 2 ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Hồ sơ bị từ chối</p>
              <p className="text-sm text-red-600">Vui lòng kiểm tra lại tài liệu và liên hệ quản trị viên để được hỗ trợ.</p>
            </div>
          </div>
        ) : verificationStatus === 0 ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-xl">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Đang chờ xác minh</p>
              <p className="text-sm text-amber-600">Hồ sơ của bạn đang được xem xét. Vui lòng tải lên đầy đủ giấy tờ xác minh bên dưới.</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Content */}
      <div className="p-6 pt-8 space-y-6">
        {/* Account Information */}
        <div className="bg-white rounded-xl border border-[#e8ecf0]">
          <div className="px-6 py-4 border-b border-[#f0f2f4]">
            <div className="flex items-center">
              <User className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-[#1a2332]">
                Thông Tin Tài Khoản
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Tên Doanh Nghiệp
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#8d95a3] absolute left-3 top-3" />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Địa Chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8d95a3] absolute left-3 top-3" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Số Điện Thoại
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8d95a3] absolute left-3 top-3" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Loại Hình Kinh Doanh
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="tours">Tour & Hoạt Động</option>
                  <option value="accommodation">Cho Thuê Nhà</option>
                  <option value="mixed">Nhiều Dịch Vụ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e8ecf0]">
          <div className="px-6 py-4 border-b border-[#f0f2f4]">
            <div className="flex items-center">
              <Building className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-[#1a2332]">
                Tài Khoản Nhận Thanh Toán
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Tên Ngân Hàng
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  placeholder="VD: Vietcombank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Số Tài Khoản
                </label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  placeholder="Nhập số tài khoản nhận tiền"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Tên Chủ Tài Khoản
                </label>
                <input
                  type="text"
                  name="bankAccountName"
                  value={formData.bankAccountName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  placeholder="Tên chủ tài khoản khớp với ngân hàng"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Password & Security */}
        <div className="bg-white rounded-xl border border-[#e8ecf0]">
          <div className="px-6 py-4 border-b border-[#f0f2f4]">
            <div className="flex items-center">
              <Lock className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-[#1a2332]">
                Mật Khẩu & Bảo Mật
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#5a6577] mb-2">
                  Mật Khẩu Hiện Tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pr-10 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-[#8d95a3] hover:text-[#5a6577]"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#5a6577] mb-2">
                    Mật Khẩu Mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-[#8d95a3] hover:text-[#5a6577]"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5a6577] mb-2">
                    Xác Nhận Mật Khẩu Mới
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-[#e8ecf0] rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      placeholder="Xác nhận mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-2.5 text-[#8d95a3] hover:text-[#5a6577]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Business Verification */}
        <div className="bg-white rounded-xl border border-[#e8ecf0]">
          <div className="px-6 py-4 border-b border-[#f0f2f4]">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-[#1a2332]">
                Xác Minh Kinh Doanh
              </h2>
            </div>
          </div>
          <div className="p-6">
            {/* Document Types - each with upload + preview */}
            <div className="space-y-6">
              {[
                { type: "houseRental", label: "Giấy phép cho thuê nhà", desc: "Giấy phép kinh doanh cho thuê nhà ở, homestay" },
                { type: "tours", label: "Giấy phép kinh doanh tour", desc: "Giấy phép kinh doanh lữ hành quốc tế/nội địa" },
                { type: "additional", label: "Chứng chỉ bổ sung", desc: "Các chứng chỉ, giấy tờ bổ sung khác (tùy chọn)" },
              ].map((item) => {
                const docs = documents.filter((d) => d.documentType === item.type);
                return (
                  <div key={item.type} className="border border-[#e8ecf0] rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-[#f9fafb] border-b border-[#e8ecf0] flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#1a2332]">{item.label}</h3>
                        <p className="text-xs text-[#8d95a3]">{item.desc}</p>
                      </div>
                      {docs.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3" /> {docs.length} tệp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f0f2f4] text-[#8d95a3]">
                          <AlertCircle className="w-3 h-3" /> Chưa có
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      {/* Preview uploaded files */}
                      {docs.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-4">
                          {docs.map((doc) => {
                            const url = doc.documentUrl || doc.url || "";
                            const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
                            return (
                              <a key={doc.id} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                                {isImage ? (
                                  <img src={url} alt={item.label} className="w-28 h-28 object-cover rounded-lg border border-[#e8ecf0] group-hover:opacity-80 transition-opacity" />
                                ) : (
                                  <div className="w-28 h-28 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center justify-center group-hover:bg-red-100 transition-colors">
                                    <span className="text-red-500 text-xl font-bold">PDF</span>
                                    <span className="text-xs text-red-400 mt-1">Nhấn để xem</span>
                                  </div>
                                )}
                                <p className="text-[10px] text-[#8d95a3] mt-1 text-center">
                                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("vi-VN") : ""}
                                </p>
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {/* Upload button */}
                      <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${docs.length > 0 ? "border-[#e8ecf0] hover:border-primary/40" : "border-[#e8ecf0] hover:border-primary/40"}`}>
                        <Upload className="w-4 h-4 text-[#8d95a3]" />
                        <span className="text-sm text-[#5a6577]">{uploading ? "Đang tải..." : docs.length > 0 ? "Thêm tệp" : "Chọn tệp tải lên"}</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, item.type)} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={fetchProfile}
            className="px-6 py-2 border bg-[#f4f6f8] border-[#e8ecf0] text-[#5a6577] rounded-xl hover:bg-[#f9fafb] font-medium transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-white rounded-xl hover:bg-primary-hover font-medium transition-colors flex items-center gap-2 disabled:opacity-60"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu Thay Đổi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
