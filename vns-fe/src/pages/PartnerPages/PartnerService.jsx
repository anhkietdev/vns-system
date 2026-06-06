import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Star,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PartnerServiceModal from "../../components/PartnerServiceModal";
import { useNavigate, useLocation } from "react-router-dom";
import { useConfirm, useToast } from "../../feedback/FeedbackProvider";
import { serviceService, SERVICE_TYPE } from "../../services/serviceService";
import { partnerService } from "../../services/partnerService";
import { normalizeError } from "../../utils/normalizeError";

const PartnerService = () => {
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [successMsg, setSuccessMsg] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, "");
      const timer = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await serviceService.getOwnServices();
      const resData = res?.success ? res.data : res;
      const raw = Array.isArray(resData)
        ? resData
        : resData?.items || resData?.data || [];
      setServices(
        raw.map((s) => ({
          ...s,
          serviceId: s.serviceId || s.id,
          title: s.title || s.name,
          location: s.location || s.address || s.destinationName,
          price: s.discountPrice || s.basePrice || 0,
          basePrice: s.basePrice || 0,
          discountPrice: s.discountPrice || null,
          averageRating: s.averageRating ?? 0,
          reviewCount: s.reviewCount ?? s.totalReviews ?? 0,
          approvalStatus: s.approvalStatus,
          images: s.thumbnailUrl
            ? [{ imageUrl: s.thumbnailUrl }]
            : s.images || [],
          createdAt: s.createdAt || s.updatedAt || new Date().toISOString(),
        })),
      );
    } catch (err) {
      setError(err.message || "Không thể tải danh sách dịch vụ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    partnerService
      .getProfile()
      .then((res) => {
        if (res?.success && res.data) {
          setIsVerified(res.data.verificationStatus === 1);
        }
      })
      .catch(() => {});
  }, [fetchServices]);

  const getFilterKey = (serviceType) =>
    SERVICE_TYPE[serviceType]?.filterKey;

  const filterTabs = [
    { label: "Tất cả", key: "all" },
    { label: "Lưu trú", key: "homestay" },
    { label: "Tour", key: "tour" },
  ];

  const filteredServices = services.filter((s) => {
    const matchesFilter =
      activeFilter === "Tất cả" ||
      getFilterKey(s.serviceType) ===
        filterTabs.find((t) => t.label === activeFilter)?.key;

    const title = s.title || "";
    const locationValue = s.location || "";
    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      locationValue.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return (
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
        );
      case "rating":
        return (b.averageRating || 0) - (a.averageRating || 0);
      default:
        return 0;
    }
  });

  const stats = {
    total: services.length,
    active: services.filter(
      (s) => s.isActive || s.status === "active" || s.availability > 0,
    ).length,
    pending: services.filter(
      (s) => s.approvalStatus === 0 || s.approvalStatus === "Pending" || s.hasPendingChanges,
    ).length,
  };

  const getServiceStatus = (s) => {
    if (s.hasPendingChanges) return "reapproval";
    if (s.approvalStatus === 0 || s.approvalStatus === "Pending") return "pending";
    if (s.isActive === false || s.availability === 0) return "inactive";
    return "active";
  };

  const getStatusBadge = (status) =>
    ({
      active: {
        cls: "bg-green-50 text-green-700",
        icon: CheckCircle,
        text: "Đang hoạt động",
      },
      inactive: {
        cls: "bg-red-50 text-red-700",
        icon: XCircle,
        text: "Không hoạt động",
      },
      pending: {
        cls: "bg-amber-50 text-amber-700",
        icon: Clock,
        text: "Chờ duyệt",
      },
      reapproval: {
        cls: "bg-amber-50 text-amber-700",
        icon: Clock,
        text: "Chờ duyệt lại",
      },
      paused: {
        cls: "bg-[#f9fafb] text-[#5a6577]",
        icon: PauseCircle,
        text: "Tạm dừng",
      },
    })[status] || {
      cls: "bg-[#f9fafb] text-[#5a6577]",
      icon: PauseCircle,
      text: "—",
    };

  const formatPrice = (price) =>
    price != null ? new Intl.NumberFormat("vi-VN").format(price) + " ₫" : "—";

  const handleDelete = async (serviceId, e) => {
    e.stopPropagation();

    const approved = await confirm({
      title: "Ngừng hoạt động dịch vụ",
      message: "Bạn có chắc muốn ngừng hoạt động dịch vụ này?",
      description:
        "Dịch vụ sẽ chuyển sang trạng thái không hoạt động và không hiển thị với khách hàng. Bạn có thể kích hoạt lại sau.",
      confirmLabel: "Ngừng hoạt động",
      cancelLabel: "Hủy",
      tone: "warning",
    });

    if (!approved) return;

    try {
      await serviceService.deleteService(serviceId);
      setServices((prev) =>
        prev.map((s) =>
          s.serviceId === serviceId ? { ...s, isActive: false } : s,
        ),
      );
      setSuccessMsg("Đã ngừng hoạt động dịch vụ!");
      toast.success("Đã ngừng hoạt động dịch vụ.");
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error(normalized.message, {
        title: normalized.title,
        details: normalized.details,
      });
    }
  };

  const handleOpenDetail = (service) => {
    navigate("/PartnerService/detail", {
      state: { serviceId: service.serviceId, serviceType: service.serviceType },
    });
  };

  const tabCount = (key) => {
    if (key === "all") return services.length;
    return services.filter((s) => getFilterKey(s.serviceType) === key).length;
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div>
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {successMsg}
            <button
              onClick={() => setSuccessMsg("")}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1a2332] mb-2">
              Dịch vụ của tôi
            </h1>
            <p className="text-[#5a6577]">
              Quản lý lưu trú, tour du lịch và các dịch vụ khác
            </p>
          </div>
          <button
            onClick={() => isVerified && setIsModalOpen(true)}
            disabled={!isVerified}
            title={
              !isVerified
                ? "Vui lòng hoàn tất xác minh tài khoản trước khi đăng dịch vụ"
                : ""
            }
            className={`mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              isVerified
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-[#e8ecf0] text-[#8d95a3] cursor-not-allowed"
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm dịch vụ mới
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-[#e8ecf0]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1a2332] mb-1">
              {stats.active}/{stats.total}
            </div>
            <div className="text-sm text-[#5a6577]">Dịch vụ hoạt động</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#e8ecf0]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1a2332] mb-1">
              {stats.pending}
            </div>
            <div className="text-sm text-[#5a6577]">Chờ phê duyệt</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#e8ecf0]">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1a2332] mb-1">
              {stats.total}
            </div>
            <div className="text-sm text-[#5a6577]">Tổng dịch vụ</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-[#e8ecf0] mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8d95a3]" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, địa điểm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-[#5a6577]">
                Sắp xếp:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="recent">Mới nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
              <button
                onClick={fetchServices}
                className="p-2 text-[#5a6577] hover:bg-[#f9fafb] rounded-lg transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-[#e8ecf0]">
            <nav className="-mb-px flex space-x-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.label)}
                  className={`whitespace-nowrap pb-4 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeFilter === tab.label
                      ? "border-primary text-primary"
                      : "border-transparent text-[#5a6577] hover:text-[#1a2332] hover:border-[#e8ecf0]"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs bg-[#f9fafb] text-[#5a6577] px-1.5 py-0.5 rounded-full">
                    {tabCount(tab.key)}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#8d95a3]">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p>Đang tải dịch vụ...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-2">
                Không thể tải dữ liệu
              </p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={fetchServices}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm"
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : sortedServices.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-[#f9fafb] rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-[#8d95a3]" />
            </div>
            <h3 className="text-lg font-medium text-[#1a2332] mb-2">
              {searchQuery
                ? `Không tìm thấy kết quả cho "${searchQuery}"`
                : "Chưa có dịch vụ nào"}
            </h3>
            <p className="text-[#5a6577] mb-6">
              {!searchQuery &&
                "Bắt đầu bằng cách tạo dịch vụ đầu tiên của bạn."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => isVerified && setIsModalOpen(true)}
                disabled={!isVerified}
                title={
                  !isVerified
                    ? "Vui lòng hoàn tất xác minh tài khoản trước khi đăng dịch vụ"
                    : ""
                }
                className={`inline-flex items-center px-4 py-2 rounded-xl font-medium ${
                  isVerified
                    ? "bg-primary hover:bg-primary-hover text-white"
                    : "bg-[#e8ecf0] text-[#8d95a3] cursor-not-allowed"
                }`}
              >
                <Plus className="w-5 h-5 mr-2" />
                Tạo dịch vụ đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedServices.map((service) => {
              const status = getServiceStatus(service);
              const badge = getStatusBadge(status);
              const StatusIcon = badge.icon;
              const typeInfo =
                SERVICE_TYPE[service.serviceType] || {};
              const images = service.images || service.serviceImages || [];
              const coverImage =
                images[0]?.imageUrl || images[0]?.url || images[0] || null;
              const rating = service.averageRating || service.rating;

              return (
                <div
                  key={service.serviceId}
                  className="bg-white rounded-xl transition-all duration-300 border border-[#e8ecf0] hover:border-[#e8ecf0] transform hover:-translate-y-1 overflow-hidden cursor-pointer"
                  onClick={() => handleOpenDetail(service)}
                >
                  <div className="relative h-48 bg-[#f9fafb] overflow-hidden">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={service.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8d95a3]">
                        <MapPin className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.cls}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {badge.text}
                      </span>
                    </div>

                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-[#E6F3F4] text-[#008fa0] rounded-full text-sm font-medium">
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-semibold text-[#1a2332] mb-2 line-clamp-2">
                      {service.title}
                    </h3>

                    {service.location && (
                      <div className="flex items-center text-sm text-[#5a6577] mb-2">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{service.location}</span>
                      </div>
                    )}

                    {rating > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-semibold text-[#1a2332]">
                          {rating.toFixed(1)}
                        </span>
                        {service.reviewCount > 0 && (
                          <span className="text-sm text-[#5a6577]">
                            ({service.reviewCount})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mb-4 pb-4 border-b border-[#f0f2f4]">
                      <span className="text-lg font-bold text-[#1a2332]">
                        {formatPrice(service.price || 0)}
                      </span>
                      <span className="text-sm text-[#5a6577] ml-1">
                        {typeInfo.priceUnit}
                      </span>
                      {service.discountPrice > 0 &&
                        service.basePrice > 0 &&
                        service.discountPrice < service.basePrice && (
                          <span className="text-sm text-[#8d95a3] line-through ml-2">
                            {formatPrice(service.basePrice)}
                          </span>
                        )}
                    </div>

                    {service.availability != null && (
                      <div className="flex items-center justify-between text-sm text-[#5a6577] mb-4">
                        <span>Còn trống</span>
                        <span
                          className={`font-semibold ${service.availability > 0 ? "text-green-600" : "text-red-500"}`}
                        >
                          {service.availability}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(service);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Chi tiết
                      </button>

                      <button
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa dịch vụ"
                        onClick={(e) => handleDelete(service.serviceId, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <PartnerServiceModal
          isVerified={isVerified}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PartnerService;
