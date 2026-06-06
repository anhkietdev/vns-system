import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Package,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useConfirm, useToast } from "../../feedback/FeedbackProvider";
import { partnerService } from "../../services/partnerService";
import { serviceService } from "../../services/serviceService";
import { normalizeError } from "../../utils/normalizeError";

const fmt = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ₫`;
const serviceTypeLabel = {
  0: "Homestay",
  1: "Tour",
};
const discountTypeLabel = {
  0: "Phần trăm giảm",
  1: "Giảm",
};
const dateDriverLabel = {
  0: "Khách chọn ngày ở trước",
  1: "Khách chọn lịch tour trước",
};

const createEmptyForm = () => ({
  name: "",
  description: "",
  discountType: 0,
  discountValue: "",
  dateDriver: 0,
  stayOffsetBeforeDays: 0,
  stayOffsetAfterDays: 0,
  preferredRoomId: "",
  preferredTourPackageId: "",
  serviceIds: [],
  search: "",
});

const unwrapApiData = (response) => response?.data ?? response;
const getServiceId = (service) => service?.id || service?.serviceId;
const getServicePrice = (service) =>
  Number(
    service?.fromPrice ?? service?.discountPrice ?? service?.basePrice ?? 0,
  );
const getBlockingReasons = (combo) =>
  Array.isArray(combo?.blockingReasons)
    ? combo.blockingReasons.filter(Boolean)
    : [];

const isBundleEligibleService = (service) => {
  if (!service) return false;
  const type = Number(service.serviceType);
  if (type !== 0 && type !== 1) return false;
  const status = service?.approvalStatus;
  if (status === undefined || status === null) return true;
  if (typeof status === "number") return status !== 2;
  if (typeof status === "string") return status.toLowerCase() !== "rejected";
  return true;
};

const calculateDiscountedPrice = (
  discountType,
  discountValue,
  originalPrice,
) => {
  const subtotal = Number(originalPrice || 0);
  const rawValue = Number(discountValue || 0);
  if (subtotal <= 0 || rawValue <= 0) return subtotal;
  if (Number(discountType) === 0) {
    return Math.max(0, subtotal - (subtotal * Math.min(rawValue, 100)) / 100);
  }
  return Math.max(0, subtotal - Math.min(rawValue, subtotal));
};

const getActiveRooms = (serviceDetail) =>
  (serviceDetail?.homestay?.rooms || []).filter(
    (room) => room?.isActive !== false,
  );

const getTourPackages = (serviceDetail) =>
  serviceDetail?.tourPackages ||
  (serviceDetail?.tour ? [serviceDetail.tour] : []);

const getTourPricingTiers = (serviceDetail) =>
  getTourPackages(serviceDetail).flatMap((pkg) =>
    (pkg?.pricingTiers || []).map((tier) => ({
      ...tier,
      packageId: pkg.id,
      packageName: pkg.name,
    })),
  );

const hasFutureActiveSchedule = (serviceDetail) =>
  getTourPackages(serviceDetail).some((pkg) =>
    (pkg?.schedules || []).some((schedule) => {
      const status = schedule?.status;
      const isActive =
        status === 0 || String(status || "").toLowerCase() === "active";
      return isActive && new Date(schedule?.startDate).getTime() > Date.now();
    }),
  );

function ServiceBadge({ service }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2">
      {service.thumbnailUrl ? (
        <img
          src={service.thumbnailUrl}
          alt=""
          className="h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2f6]">
          <Package className="h-4 w-4 text-[#8d95a3]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#1a2332]">
          {service.name}
        </p>
        <p className="text-xs text-[#8d95a3]">
          {serviceTypeLabel[service.serviceType] || "Dịch vụ"} •{" "}
          {fmt(getServicePrice(service))}
        </p>
      </div>
    </div>
  );
}

export default function PartnerCombo() {
  const [combos, setCombos] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState(createEmptyForm());
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [comboRes, serviceRes] = await Promise.all([
        partnerService.getCombos(),
        serviceService.getOwnServices({ pageSize: 100 }),
      ]);
      const comboData = unwrapApiData(comboRes);
      const serviceData = unwrapApiData(serviceRes);
      setCombos(Array.isArray(comboData) ? comboData : []);
      setServices(
        (Array.isArray(serviceData?.items)
          ? serviceData.items
          : Array.isArray(serviceData)
            ? serviceData
            : []
        ).filter(isBundleEligibleService),
      );
      setError("");
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu combo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredServices = useMemo(() => {
    const keyword = form.search.trim().toLowerCase();
    if (!keyword) return services;
    return services.filter((service) =>
      [service.name || "", serviceTypeLabel[service.serviceType] || ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [form.search, services]);

  const selectedServices = useMemo(
    () =>
      form.serviceIds
        .map((serviceId) =>
          services.find((service) => getServiceId(service) === serviceId),
        )
        .filter(Boolean),
    [form.serviceIds, services],
  );

  const selectedHomestay =
    selectedServices.find((service) => Number(service.serviceType) === 0) ||
    null;
  const selectedTour =
    selectedServices.find((service) => Number(service.serviceType) === 1) ||
    null;
  const selectedHomestayDetail = selectedHomestay
    ? selectedServiceDetails[getServiceId(selectedHomestay)]
    : null;
  const selectedTourDetail = selectedTour
    ? selectedServiceDetails[getServiceId(selectedTour)]
    : null;
  const activeRooms = useMemo(
    () => getActiveRooms(selectedHomestayDetail),
    [selectedHomestayDetail],
  );
  const availableTourPricingTiers = useMemo(
    () => getTourPricingTiers(selectedTourDetail),
    [selectedTourDetail],
  );
  const fromOriginalPrice = useMemo(() => {
    if (selectedServices.length === 0) return 0;
    return selectedServices.reduce((sum, service) => {
      const serviceId = getServiceId(service);
      const detail = selectedServiceDetails[serviceId];
      const serviceType = Number(service.serviceType);

      if (serviceType === 0 && detail) {
        const rooms = getActiveRooms(detail);
        if (form.preferredRoomId) {
          const preferredRoom = rooms.find((r) => r.id === form.preferredRoomId);
          if (preferredRoom) return sum + Number(preferredRoom.basePrice || 0);
        }
        const minRoomPrice = rooms.reduce((min, r) => Math.min(min, Number(r.basePrice || 0)), Infinity);
        if (minRoomPrice < Infinity) return sum + minRoomPrice;
      }

      if (serviceType === 1 && detail) {
        const packages = getTourPackages(detail);
        if (form.preferredTourPackageId) {
          const preferredPkg = packages.find((p) => p.id === form.preferredTourPackageId);
          if (preferredPkg) {
            const minTierPrice = (preferredPkg.pricingTiers || []).reduce(
              (min, t) => Math.min(min, Number(t.unitPrice || 0)), Infinity
            );
            if (minTierPrice < Infinity) return sum + minTierPrice;
          }
        }
        const minTierPrice = packages.reduce((min, pkg) => {
          const pkgMin = (pkg.pricingTiers || []).reduce((m, t) => Math.min(m, Number(t.unitPrice || 0)), Infinity);
          return Math.min(min, pkgMin);
        }, Infinity);
        if (minTierPrice < Infinity) return sum + minTierPrice;
      }

      return sum + getServicePrice(service);
    }, 0);
  }, [selectedServices, selectedServiceDetails, form.preferredRoomId, form.preferredTourPackageId]);
  const fromComboPrice = calculateDiscountedPrice(
    form.discountType,
    form.discountValue,
    fromOriginalPrice,
  );
  const discountAmount = Math.max(0, fromOriginalPrice - fromComboPrice);
  const discountPercent =
    fromOriginalPrice > 0
      ? Math.round((discountAmount / fromOriginalPrice) * 100)
      : 0;

  useEffect(() => {
    const serviceIds = form.serviceIds.filter(Boolean);
    if (!serviceIds.length) {
      setSelectedServiceDetails({});
      return;
    }

    let disposed = false;
    Promise.all(
      serviceIds.map((serviceId) =>
        serviceService.getOwnServiceDetail(serviceId),
      ),
    )
      .then((responses) => {
        if (disposed) return;
        const next = {};
        responses.forEach((response, index) => {
          next[serviceIds[index]] = unwrapApiData(response);
        });
        setSelectedServiceDetails(next);
      })
      .catch(() => {
        if (!disposed) setSelectedServiceDetails({});
      });

    return () => {
      disposed = true;
    };
  }, [form.serviceIds]);

  useEffect(() => {
    setForm((current) => {
      let changed = false;
      const next = { ...current };
      if (
        next.preferredRoomId &&
        !activeRooms.some((room) => room.id === next.preferredRoomId)
      ) {
        next.preferredRoomId = "";
        changed = true;
      }
      if (
        next.preferredTourPackageId &&
        !getTourPackages(selectedTourDetail).some(
          (pkg) => pkg.id === next.preferredTourPackageId,
        )
      ) {
        next.preferredTourPackageId = "";
        changed = true;
      }
      return changed ? next : current;
    });
  }, [activeRooms, availableTourPricingTiers]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setShowCreate(false);
  };

  const toggleService = (service) => {
    const serviceId = getServiceId(service);
    const serviceType = Number(service.serviceType);
    setForm((current) => {
      const alreadySelected = current.serviceIds.includes(serviceId);
      if (alreadySelected) {
        return {
          ...current,
          serviceIds: current.serviceIds.filter((id) => id !== serviceId),
        };
      }

      const nextServices = current.serviceIds
        .map((id) => services.find((item) => getServiceId(item) === id))
        .filter(Boolean)
        .filter((item) => Number(item.serviceType) !== serviceType);

      if (nextServices.length >= 2) return current;
      return {
        ...current,
        serviceIds: [
          ...nextServices.map((item) => getServiceId(item)),
          serviceId,
        ],
      };
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên combo.");
      return;
    }
    if (selectedServices.length !== 2 || !selectedHomestay || !selectedTour) {
      toast.error("Combo phải gồm đúng 1 homestay và 1 tour.");
      return;
    }
    if (!activeRooms.length) {
      toast.error(
        "Homestay trong combo phải có ít nhất 1 phòng đang hoạt động.",
      );
      return;
    }
    if (!hasFutureActiveSchedule(selectedTourDetail)) {
      toast.error(
        "Tour trong combo phải có ít nhất 1 lịch khởi hành hợp lệ trong tương lai.",
      );
      return;
    }

    const discountValue = Number(form.discountValue || 0);
    if (discountValue <= 0) {
      toast.error("Giá trị giảm giá không hợp lệ.");
      return;
    }
    if (Number(form.discountType) === 0 && discountValue > 100) {
      toast.error("Giảm theo phần trăm không được vượt quá 100%.");
      return;
    }

    const minNights = Number(selectedHomestayDetail?.homestay?.minNights || 1);
    const derivedStayLength =
      Number(form.stayOffsetBeforeDays || 0) +
      Number(form.stayOffsetAfterDays || 0) +
      1;
    if (Number(form.dateDriver) === 1 && derivedStayLength < minNights) {
      toast.error(`Combo theo lịch tour phải có ít nhất ${minNights} đêm.`);
      return;
    }

    setCreating(true);
    try {
      const items = [selectedHomestay, selectedTour].map((service, index) => ({
        serviceId: getServiceId(service),
        displayOrder: index,
        preferredRoomId:
          Number(service.serviceType) === 0
            ? form.preferredRoomId || null
            : null,
        preferredTourPackageId:
          Number(service.serviceType) === 1
            ? form.preferredTourPackageId || null
            : null,
      }));

      const response = await partnerService.createCombo({
        name: form.name.trim(),
        description: form.description.trim() || null,
        discountType: Number(form.discountType),
        discountValue,
        dateDriver: Number(form.dateDriver),
        stayOffsetBeforeDays: Number(form.stayOffsetBeforeDays || 0),
        stayOffsetAfterDays: Number(form.stayOffsetAfterDays || 0),
        thumbnailUrl:
          selectedHomestay?.thumbnailUrl || selectedTour?.thumbnailUrl || null,
        serviceIds: items.map((item) => item.serviceId),
        items,
      });
      const createdCombo = unwrapApiData(response);

      resetForm();
      await fetchData();
      if (createdCombo?.isPubliclyBookable === false) {
        const reasons = getBlockingReasons(createdCombo);
        setSuccessMsg("Đã tạo combo nhưng combo đang ở trạng thái tạm ẩn.");
        toast.warning(
          "Combo đã được tạo nhưng chưa sẵn sàng hiển thị cho người dùng.",
          {
            details: reasons,
          },
        );
        setTimeout(() => setSuccessMsg(""), 4000);
        return;
      }
      setSuccessMsg("Tạo combo thành công.");
      toast.success("Tạo combo thành công.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error(normalized.message, {
        title: normalized.title,
        details: normalized.details,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (comboId) => {
    const approved = await confirm({
      title: "Lưu trữ combo",
      message: "Bạn có chắc muốn lưu trữ combo này?",
      description:
        "Combo sẽ được chuyển sang trạng thái tạm ẩn và không còn hiển thị cho người dùng.",
      confirmLabel: "Lưu trữ",
      cancelLabel: "Hủy",
      tone: "warning",
    });
    if (!approved) return;

    try {
      await partnerService.deleteCombo(comboId);
      await fetchData();
      toast.success("Đã lưu trữ combo.");
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error(normalized.message, {
        title: normalized.title,
        details: normalized.details,
      });
    }
  };

  const openDetail = async (combo) => {
    try {
      const response = await partnerService.getComboDetail(combo.id);
      setViewItem(unwrapApiData(response));
    } catch {
      setViewItem(combo);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Combo ưu đãi</h1>
          <p className="mt-1 text-sm text-[#5a6577]">
            Ghép 1 homestay và 1 tour thành combo có thể đặt chỗ tự động.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Tạo combo
        </button>
      </div>

      {successMsg ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="ml-auto text-green-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {combos.length === 0 ? (
        <div className="rounded-xl border border-[#e8ecf0] bg-white p-12 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-[#8d95a3]" />
          <p className="mb-2 text-[#5a6577]">Chưa có combo nào</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="font-medium text-primary hover:underline"
          >
            Tạo combo đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white"
            >
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-blue-50">
                {combo.thumbnailUrl ? (
                  <img
                    src={combo.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-primary/40" />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 text-xs font-medium text-white">
                  {combo.serviceCount} dịch vụ
                </span>
                {combo.discountPercent > 0 ? (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-primary">
                    -{combo.discountPercent}%
                  </span>
                ) : null}
              </div>

              <div className="p-4">
                <h3 className="mb-1 line-clamp-1 font-semibold text-[#1a2332]">
                  {combo.name}
                </h3>
                {combo.description ? (
                  <p className="mb-2 line-clamp-2 text-xs text-[#8d95a3]">
                    {combo.description}
                  </p>
                ) : null}
                <p className="mb-2 text-xs font-medium text-[#5a6577]">
                  {dateDriverLabel[combo.dateDriver] || dateDriverLabel[0]}
                </p>
                <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span
                    className={`rounded-full px-2.5 py-1 ${combo.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {combo.isActive ? "Đang hiển thị" : "Tạm ẩn"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 ${combo.isPubliclyBookable ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700"}`}
                  >
                    {combo.isPubliclyBookable ? "Sẵn sàng đặt" : "Cần xử lý"}
                  </span>
                  {combo.hasBookings ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      Da co booking
                    </span>
                  ) : null}
                  {combo.hasActiveQuotes ? (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                      Co bao gia dang hieu luc
                    </span>
                  ) : null}
                </div>
                {!combo.isPubliclyBookable &&
                getBlockingReasons(combo).length > 0 ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {getBlockingReasons(combo)
                      .slice(0, 2)
                      .map((reason) => (
                        <p key={reason}>{reason}</p>
                      ))}
                  </div>
                ) : null}
                <div className="mb-3 space-y-2">
                  {(combo.services || []).map((service) => (
                    <div
                      key={service.serviceId}
                      className="flex items-center gap-2 text-xs text-[#5a6577]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="truncate">
                        {serviceTypeLabel[service.serviceType] || "Dịch vụ"}:{" "}
                        {service.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-primary">
                    Từ {fmt(combo.comboPrice)}
                  </span>
                  {combo.originalPrice > combo.comboPrice ? (
                    <span className="text-sm text-[#8d95a3] line-through">
                      {fmt(combo.originalPrice)}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(combo)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e8ecf0] py-2 text-sm text-[#5a6577] hover:bg-[#f9fafb]"
                  >
                    <Eye className="h-4 w-4" />
                    Chi tiết
                  </button>
                  {combo.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(combo.id)}
                      className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-[#e8ecf0] p-6">
              <div>
                <h2 className="text-xl font-bold text-[#1a2332]">
                  Tạo combo ưu đãi
                </h2>
                <p className="mt-1 text-sm text-[#8d95a3]">
                  Combo sẽ được đặt bằng báo giá tự động ở phía người dùng.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded p-1 hover:bg-[#f9fafb]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                    Tên combo *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                    Mô tả
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a2332]">
                        Chọn dịch vụ cho combo
                      </h3>
                      <p className="mt-1 text-xs text-[#8d95a3]">
                        Combo chỉ hỗ trợ đúng 1 homestay và 1 tour.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d95a3]" />
                      <input
                        type="text"
                        value={form.search}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            search: event.target.value,
                          }))
                        }
                        placeholder="Tìm theo tên dịch vụ"
                        className="w-full rounded-xl border border-[#e8ecf0] py-2 pl-9 pr-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid max-h-80 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-2">
                    {filteredServices.map((service) => {
                      const serviceId = getServiceId(service);
                      const selected = form.serviceIds.includes(serviceId);
                      const type = Number(service.serviceType);
                      const disabled =
                        !selected &&
                        ((type === 0 && !!selectedHomestay) ||
                          (type === 1 && !!selectedTour));
                      return (
                        <button
                          key={serviceId}
                          type="button"
                          onClick={() => toggleService(service)}
                          disabled={disabled}
                          className={`rounded-xl border p-3 text-left transition-colors ${
                            selected
                              ? "border-primary/30 bg-primary/5"
                              : disabled
                                ? "cursor-not-allowed border-[#e8ecf0] bg-white opacity-50"
                                : "border-[#e8ecf0] bg-white hover:bg-[#fdfefe]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 ${selected ? "border-primary bg-primary text-white" : "border-[#d0d5dd]"}`}
                            >
                              {selected ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : null}
                            </div>
                            {service.thumbnailUrl ? (
                              <img
                                src={service.thumbnailUrl}
                                alt=""
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eef2f6]">
                                <Package className="h-5 w-5 text-[#8d95a3]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#1a2332]">
                                {service.name}
                              </p>
                              <p className="text-xs text-[#8d95a3]">
                                {serviceTypeLabel[service.serviceType] ||
                                  "Dịch vụ"}{" "}
                                • {fmt(getServicePrice(service))}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-[#e8ecf0] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-[#1a2332]">
                      Quy tắc đặt combo
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                        Loại giảm giá
                      </label>
                      <select
                        value={form.discountType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            discountType: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value={0}>Phần trăm</option>
                        <option value={1}>Số tiền cố định</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                        Giá trị giảm{" "}
                        {Number(form.discountType) === 0 ? "(%)" : "(₫)"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.discountValue}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            discountValue: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                        Điều khiển ngày
                      </label>
                      <select
                        value={form.dateDriver}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            dateDriver: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value={0}>Khách chọn ngày ở trước</option>
                        <option value={1}>Khách chọn lịch tour trước</option>
                      </select>
                    </div>

                    {Number(form.dateDriver) === 1 ? (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                            Số ngày ở trước tour
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={form.stayOffsetBeforeDays || ""}
                            onChange={(event) => {
                              const raw = event.target.value;
                              setForm((current) => ({ ...current, stayOffsetBeforeDays: raw === "" ? 0 : Number(raw) }));
                            }}
                            className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                            Số ngày ở sau tour
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={form.stayOffsetAfterDays || ""}
                            onChange={(event) => {
                              const raw = event.target.value;
                              setForm((current) => ({ ...current, stayOffsetAfterDays: raw === "" ? 0 : Number(raw) }));
                            }}
                            className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-[#1a2332]">
                      Thiết lập sản phẩm
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                        Phòng ưu tiên
                      </label>
                      <select
                        value={form.preferredRoomId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            preferredRoomId: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">
                          Tự động chọn phòng phù hợp nhất
                        </option>
                        {activeRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} • {fmt(room.basePrice)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                        Gói tour ưu tiên
                      </label>
                      <select
                        value={form.preferredTourPackageId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            preferredTourPackageId: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Tự động chọn gói phù hợp</option>
                        {getTourPackages(selectedTourDetail).map((pkg) => {
                          const minPrice = (pkg.pricingTiers || []).reduce(
                            (min, t) => Math.min(min, Number(t.unitPrice || 0)),
                            Infinity,
                          );
                          return (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name}{minPrice < Infinity ? ` • ${fmt(minPrice)}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-[#1a2332]">
                      Xem trước giá
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#5a6577]">Giá gốc từ</span>
                      <span className="font-semibold text-[#1a2332]">
                        {fmt(fromOriginalPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#5a6577]">Giảm giá combo</span>
                      <span className="font-semibold text-green-600">
                        {discountAmount > 0
                          ? `- ${fmt(discountAmount)}`
                          : fmt(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e8ecf0] pt-3 text-sm">
                      <span className="font-medium text-[#5a6577]">
                        Giá combo từ
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {fmt(fromComboPrice)}
                      </span>
                    </div>
                    {discountPercent > 0 ? (
                      <p className="text-xs font-medium text-green-600">
                        Tiết kiệm khoảng {discountPercent}% so với mua lẻ.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-[#e8ecf0] py-2.5 text-[#5a6577] hover:bg-[#f9fafb]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 rounded-xl bg-primary py-2.5 font-medium text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    {creating ? "Đang tạo..." : "Tạo combo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {viewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-[#e8ecf0] p-6">
              <div>
                <h2 className="text-lg font-bold text-[#1a2332]">
                  {viewItem.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="rounded p-1 hover:bg-[#f9fafb]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {viewItem.description ? (
                <p className="text-sm text-[#5a6577]">{viewItem.description}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f9fafb] p-3 text-center">
                  <p className="text-xs text-[#8d95a3]">Giá gốc từ</p>
                  <p className="font-semibold text-[#1a2332]">
                    {fmt(viewItem.originalPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <p className="text-xs text-primary">Giá combo từ</p>
                  <p className="text-lg font-bold text-primary">
                    {fmt(viewItem.comboPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-700">Điều khiển ngày</p>
                  <p className="font-semibold text-green-700">
                    {dateDriverLabel[viewItem.dateDriver] || dateDriverLabel[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-[#5a6577]">
                <span className="font-medium">
                  {discountTypeLabel[viewItem.discountType] || "Giảm giá"}:
                </span>
                <span className="font-semibold text-green-600">
                  {viewItem.discountType === 0
                    ? `${viewItem.discountValue || 0}%`
                    : fmt(viewItem.discountValue || 0)}
                </span>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-[#1a2332]">
                  Dịch vụ trong combo
                </h4>
                <div className="space-y-3">
                  {(viewItem.services || []).map((service, index) => (
                    <div
                      key={service.serviceId}
                      className="flex items-start gap-3 rounded-lg bg-[#f9fafb] p-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#1a2332]">
                          {service.name}
                        </p>
                        {Number(service.serviceType) === 0 ? (
                          <>
                            <p className="mt-1 text-xs text-[#8d95a3]">
                              Phòng: {service.preferredRoomName || "Tự động"}
                              {service.preferredRoomPrice ? ` • ${fmt(service.preferredRoomPrice)}` : ""}
                            </p>
                            {Number(viewItem.dateDriver) === 1 ? (
                              <>
                                <p className="mt-1 text-xs text-[#8d95a3]">
                                  Ngày ở trước khi tour bắt đầu: {viewItem.stayOffsetBeforeDays || 0} ngày
                                </p>
                                <p className="text-xs text-[#8d95a3]">
                                  Ngày ở lại sau khi tour kết thúc: {viewItem.stayOffsetAfterDays || 0} ngày
                                </p>
                              </>
                            ) : null}
                          </>
                        ) : null}
                        {Number(service.serviceType) === 1 ? (
                          <>
                            <p className="mt-1 text-xs text-[#8d95a3]">
                              Gói tour: {service.preferredTourPackageName || "Tự động"}
                            </p>
                            {service.preferredTourPackagePricingTiers?.length > 0 ? (
                              <div className="mt-1 space-y-0.5">
                                {service.preferredTourPackagePricingTiers.map((tier, ti) => (
                                  <p key={ti} className="text-xs text-[#8d95a3]">
                                    {tier.name}: {fmt(tier.unitPrice)} / người
                                    {tier.minQuantity > 1 ? ` (tối thiểu ${tier.minQuantity})` : ""}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
