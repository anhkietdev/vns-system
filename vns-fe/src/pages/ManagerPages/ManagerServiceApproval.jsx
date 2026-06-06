import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Compass,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Plus,
  GitCompare,
} from "lucide-react";
import { managerService } from "../../services/managerService";
import { useConfirm, useToast } from "../../feedback/FeedbackProvider";

const fmt = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ₫`;

const PAGE_SIZE = 20;

const getResponseData = (response) => (response?.success ? response.data : response);

const typeConfig = {
  homestay: { label: "Homestay", icon: Home, color: "bg-blue-100 text-blue-700" },
  tour: { label: "Tour", icon: Compass, color: "bg-green-100 text-green-700" },
};

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-700", icon: Clock },
  approved: { label: "Đã duyệt", color: "bg-green-50 text-green-700", icon: CheckCircle },
  rejected: { label: "Từ chối", color: "bg-red-50 text-red-700", icon: XCircle },
};

const kindConfig = {
  all: { label: "Tất cả", icon: null, color: "bg-gray-50 text-gray-700" },
  NewRegistration: { label: "Đăng ký mới", icon: Plus, color: "bg-blue-50 text-blue-700" },
  Reapproval: { label: "Cập nhật", icon: FileEdit, color: "bg-amber-50 text-amber-700" },
};

const cancellationLabels = {
  0: "Linh hoạt",
  1: "Trung bình",
  2: "Chặt chẽ",
  3: "Không hoàn tiền",
};

function normalizeType(serviceType) {
  if (typeof serviceType === "number") {
    return ["homestay", "tour"][serviceType] || "tour";
  }
  const value = String(serviceType || "").toLowerCase();
  if (value.includes("home")) return "homestay";
  return "tour";
}

function normalizeStatus(approvalStatus) {
  if (typeof approvalStatus === "number") {
    return ["pending", "approved", "rejected"][approvalStatus] || "pending";
  }
  return String(approvalStatus || "pending").toLowerCase();
}

function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function splitBulletLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">{label}</p>
      <p className="text-sm font-medium text-[#1a2332]">{value || "—"}</p>
    </div>
  );
}

function ChangedBadge({ fields }) {
  if (!fields?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <GitCompare className="h-3.5 w-3.5 text-amber-600" />
      <span className="text-xs font-medium text-amber-700">Thay đổi: {fields.length} mục</span>
      <div className="flex flex-wrap gap-1">
        {fields.map((f) => (
          <span key={f} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            {fieldLabel(f)}
          </span>
        ))}
      </div>
    </div>
  );
}

function fieldLabel(key) {
  const map = {
    name: "Tên",
    description: "Mô tả",
    address: "Địa chỉ",
    destination: "Điểm đến",
    thumbnailUrl: "Ảnh đại diện",
    basePrice: "Giá cơ bản",
    discountPrice: "Giá khuyến mãi",
    cancellationPolicyType: "Chính sách hủy",
    cancellationPolicyDescription: "Ghi chú hủy",
    stayPolicy: "Chính sách lưu trú",
    amenities: "Tiện nghi",
    rooms: "Phòng",
    availabilityWindows: "Lịch trống",
    tourPackages: "Gói tour",
  };
  return map[key] || key;
}

function AvailabilityCalendar({ availability = [] }) {
  const anchor = normalizeDateKey(availability[0]?.date) || new Date().toISOString().slice(0, 10);
  const [visibleMonth, setVisibleMonth] = useState(anchor.slice(0, 7));

  useEffect(() => {
    setVisibleMonth(anchor.slice(0, 7));
  }, [anchor]);

  const [year, month] = visibleMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(monthStart.getUTCDate() - leadingDays);
  const rowsByDate = new Map(availability.map((item) => [normalizeDateKey(item.date), item]));

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const row = rowsByDate.get(key);
    return { key, day: date.getUTCDate(), inMonth: date.getUTCMonth() === monthStart.getUTCMonth(), row };
  });

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[#5a6577]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { const p = new Date(Date.UTC(year, month - 2, 1)); setVisibleMonth(p.toISOString().slice(0, 7)); }} className="rounded-lg border border-[#e8ecf0] px-2 py-1 hover:bg-[#f9fafb]">‹</button>
          <span>{monthStart.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</span>
          <button type="button" onClick={() => { const n = new Date(Date.UTC(year, month, 1)); setVisibleMonth(n.toISOString().slice(0, 7)); }} className="rounded-lg border border-[#e8ecf0] px-2 py-1 hover:bg-[#f9fafb]">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8d95a3]">
        {["T2","T3","T4","T5","T6","T7","CN"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const blocked = day.row?.isBlocked || day.row?.availableCount <= 0;
          const available = day.row && !blocked;
          return (
            <div key={day.key} className={`min-h-12 rounded-lg border px-1 py-1 text-xs ${available ? "border-green-200 bg-green-50 text-green-700" : blocked ? "border-red-200 bg-red-50 text-red-700" : "border-[#edf1f4] bg-[#f9fafb] text-[#8d95a3]"} ${day.inMonth ? "" : "opacity-35"}`}>
              <p className="font-medium">{day.day}</p>
              {day.row ? <p className="mt-1 text-[10px]">{blocked ? "Khóa" : `${day.row.availableCount} phòng`}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomApprovalCard({ room }) {
  const images = Array.isArray(room.images) && room.images.length > 0 ? room.images : room.imageUrl ? [{ imageUrl: room.imageUrl, isCover: true }] : [];
  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[#1a2332]">{room.name}</h4>
          {room.description ? <p className="mt-1 text-sm leading-6 text-[#5a6577]">{room.description}</p> : null}
        </div>
      </div>
      {images.length ? (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((img, i) => {
            const url = typeof img === "string" ? img : img.imageUrl;
            return url ? <div key={url || i} className="relative overflow-hidden rounded-xl"><img src={url} alt="" className="h-24 w-full object-cover" />{img.isCover ? <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">Cover</span> : null}</div> : null;
          })}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoBlock label="Giá thường" value={fmt(room.basePrice)} />
        <InfoBlock label="Giá cuối tuần" value={fmt(room.weekendPrice)} />
        <InfoBlock label="Giá ngày lễ" value={fmt(room.holidayPrice)} />
        <InfoBlock label="Tổng phòng" value={`${room.quantity || 1} phòng`} />
        <InfoBlock label="Khách tối đa" value={`${room.maxGuests || 1} người`} />
        <InfoBlock label="Loại giường" value={room.bedType || "—"} />
        <InfoBlock label="Số giường" value={`${room.bedCount || 1} giường`} />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Tiện nghi phòng</p>
        {room.amenities?.length ? (
          <div className="flex flex-wrap gap-2">{room.amenities.map((a) => <span key={a.id || a.name} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{a.name}</span>)}</div>
        ) : <p className="text-sm italic text-[#8d95a3]">Chưa có tiện nghi phòng.</p>}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Lịch trống</p>
        <AvailabilityCalendar availability={room.availability || []} />
      </div>
    </div>
  );
}

function TourPackageApprovalCard({ pkg, index }) {
  const images = pkg.images || [];
  const includes = pkg.includedItems || [];
  const excludes = pkg.excludedItems || [];
  const policyLabel = cancellationLabels[pkg.cancellationPolicyType] || "Trung bình";
  return (
    <div className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="font-semibold text-[#1a2332]">{pkg.name || `Gói #${index + 1}`}</h4>
          <p className="mt-1 text-sm text-[#5a6577]">{pkg.duration || "—"} • {pkg.minParticipants || 1} - {pkg.maxParticipants || 1} khách</p>
          {pkg.meetingPoint ? <p className="mt-1 text-sm text-[#5a6577]">Điểm đón: {pkg.meetingPoint}</p> : null}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">{policyLabel}</span>
      </div>
      {pkg.cancellationPolicyDescription ? (
        <div className="rounded-xl border border-[#d9e7f2] bg-white p-3 text-sm text-[#31526f]">{pkg.cancellationPolicyDescription}</div>
      ) : null}
      {images.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.id || img.imageUrl || i} className="relative overflow-hidden rounded-xl">
              <img src={img.imageUrl} alt="" className="h-24 w-full object-cover" />
              {img.isCover ? <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">Cover</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Mức giá</p>
          <div className="space-y-2">{(pkg.pricingTiers || []).map((tier, ti) => <div key={tier.id || ti} className="rounded-xl border border-[#e8ecf0] bg-white p-3"><p className="font-semibold text-[#1a2332]">{tier.name || `Mức giá #${ti + 1}`}</p><p className="text-sm text-green-700">{fmt(tier.unitPrice)}</p>{tier.description ? <p className="text-sm text-[#5a6577]">{tier.description}</p> : null}</div>)}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Bao gồm</p>
            {includes.length ? <div className="flex flex-wrap gap-2">{includes.map((item) => <span key={item} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">{item}</span>)}</div> : <p className="text-sm italic text-[#8d95a3]">Chưa khai báo.</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Không bao gồm</p>
            {excludes.length ? <div className="flex flex-wrap gap-2">{excludes.map((item) => <span key={item} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{item}</span>)}</div> : <p className="text-sm italic text-[#8d95a3]">Chưa khai báo.</p>}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Lịch trình</p>
        {(pkg.itineraries || []).length ? (
          <div className="space-y-3">
            {(() => {
              const items = pkg.itineraries || [];
              const days = [...new Set(items.map((item) => item.dayNumber || 1))].sort((a, b) => a - b);
              return days.map((dayNum) => (
                <div key={dayNum}>
                  <p className="mb-1.5 text-sm font-semibold text-[#1a2332]">Ngày {dayNum}</p>
                  <div className="space-y-2">{items.filter((item) => (item.dayNumber || 1) === dayNum).map((step, si) => (
                    <div key={step.id || si} className="rounded-xl border border-[#e8ecf0] bg-white p-3">
                      <p className="font-semibold text-[#1a2332]">{step.title || "—"}</p>
                      <p className="mt-1 text-sm text-[#5a6577]">{step.description || "—"}</p>
                      <p className="mt-1 text-xs text-[#8d95a3]">{[step.startTime && step.endTime ? `${step.startTime} - ${step.endTime}` : step.startTime || step.endTime, step.location, step.activityType].filter(Boolean).join(" • ") || "—"}</p>
                      {step.imageUrl ? <img src={step.imageUrl} alt="" className="mt-3 h-24 w-full rounded-xl object-cover md:w-56" /> : null}
                    </div>
                  ))}</div>
                </div>
              ));
            })()}
          </div>
        ) : <p className="text-sm italic text-[#8d95a3]">Chưa có lịch trình.</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Lịch khởi hành</p>
        {(pkg.schedules || []).length ? (
          <div className="space-y-2">
            {pkg.schedules.map((schedule, si) => (
              <div key={schedule.id || si} className="rounded-xl border border-[#e8ecf0] bg-white p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoBlock label="Bắt đầu" value={formatDate(schedule.startDate)} />
                  <InfoBlock label="Kết thúc" value={formatDate(schedule.endDate)} />
                  <InfoBlock label="Slot còn" value={`${(schedule.availableSlots || 0) - (schedule.bookedSlots || 0)}/${schedule.availableSlots || 0}`} />
                </div>
                {(schedule.pricingOverrides || []).length ? (
                  <details className="mt-3 rounded-xl border border-[#e8ecf0] bg-[#fafcfd]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#1a2332]">Giá theo lịch khởi hành</summary>
                    <div className="space-y-3 border-t border-[#e8ecf0] px-4 py-4">
                      {(pkg.pricingTiers || []).map((tier, ti) => {
                        const override = (schedule.pricingOverrides || []).find((o) => o.tierDisplayOrder === tier.displayOrder || o.tourPricingTierId === tier.id);
                        return (
                          <div key={tier.id || `o-${ti}`} className="grid gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-[1.2fr_1fr_1fr]">
                            <p className="text-sm font-medium text-[#1a2332]">{tier.name || `Mức giá #${ti + 1}`}</p>
                            <div><p className="mb-1 text-sm font-medium text-[#5a6577]">Giá gói mặc định</p><div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] px-3 py-2 text-sm">{fmt(tier.unitPrice)}</div></div>
                            <div><p className="mb-1 text-sm font-medium text-[#5a6577]">Giá tùy chỉnh</p><div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] px-3 py-2 text-sm">{override ? fmt(override.customPrice) : "—"}</div></div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        ) : <p className="text-sm italic text-[#8d95a3]">Chưa có lịch khởi hành.</p>}
      </div>
    </div>
  );
}

const ManagerServiceApproval = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterKind, setFilterKind] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchServices = useCallback(async (targetPage) => {
    setLoading(true);
    try {
      const params = { page: targetPage, pageSize: PAGE_SIZE };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterKind !== "all") params.kind = filterKind;
      if (search.trim()) params.keyword = search.trim();
      if (filterType !== "all") params.serviceType = filterType === "homestay" ? 0 : 1;

      const response = await managerService.getPendingServices(params);
      const payload = getResponseData(response);
      const rawItems = Array.isArray(payload) ? payload : payload?.items || payload?.Items || [];
      setList(
        rawItems.map((item) => ({
          id: item.id || item.serviceId,
          approvalTargetId: item.approvalTargetId || item.id || item.serviceId,
          serviceId: item.serviceId || item.id,
          approvalKind: item.approvalKind || "Service",
          partner: item.partnerName || "",
          name: item.name || "",
          type: normalizeType(item.serviceType),
          submitted: item.createdAt || item.submittedDate,
          status: normalizeStatus(item.approvalStatus),
          location: item.address || item.destinationName || "",
          thumbnailUrl: item.thumbnailUrl || "",
          description: item.description || "",
          rejectReason: item.rejectionReason || item.rejectReason || "",
        })),
      );
      if (payload?.totalCount !== undefined) {
        setTotalPages(Math.ceil(payload.totalCount / PAGE_SIZE) || 1);
      }
      if (payload?.stats) setStats(payload.stats);
    } catch (error) {
      toast.error(error.message || "Không thể tải danh sách dịch vụ chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterKind, search, filterType, toast]);

  useEffect(() => {
    setPage(1);
    fetchServices(1);
  }, [filterStatus, filterKind, filterType, search]);

  useEffect(() => {
    if (page > 1) fetchServices(page);
  }, [page]);

  const filtered = useMemo(
    () =>
      list.filter((item) => {
        const matchSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.partner.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === "all" || item.type === filterType;
        const matchStatus = filterStatus === "all" || item.status === filterStatus;
        return matchSearch && matchType && matchStatus;
      }),
    [filterStatus, filterType, list, search],
  );

  const loadDetail = async (serviceItem) => {
    if (selected?.approvalTargetId === serviceItem.approvalTargetId) {
      setSelected(null);
      return;
    }

    setDetailLoading(true);
    try {
      const response = await managerService.getApprovalDetail(serviceItem.approvalTargetId);
      const detail = getResponseData(response);
      setSelected({ ...serviceItem, detail });
    } catch (error) {
      toast.error(error.message || "Không thể tải chi tiết yêu cầu duyệt.");
      setSelected({ ...serviceItem, detail: null });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (approvalTargetId, name) => {
    const ok = await confirm({
      title: "Xác nhận phê duyệt",
      message: `Bạn có chắc muốn phê duyệt "${name || "dịch vụ này"}"?`,
      description: selected?.approvalKind === "ChangeRequest"
        ? "Các thay đổi sẽ được áp dụng ngay lập tức lên dịch vụ đang hoạt động."
        : "Dịch vụ sẽ được kích hoạt và hiển thị cho khách hàng.",
      confirmLabel: "Phê duyệt",
      cancelLabel: "Hủy",
      tone: "primary",
    });
    if (!ok) return;

    setActionLoading(approvalTargetId);
    try {
      await managerService.approveService(approvalTargetId, {});
      toast.success("Phê duyệt dịch vụ thành công.");
      setSelected(null);
      await fetchServices(page);
    } catch (error) {
      toast.error(error.message || "Không thể phê duyệt dịch vụ.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approvalTargetId, reason) => {
    setActionLoading(approvalTargetId);
    try {
      await managerService.rejectService(approvalTargetId, { reason });
      toast.success("Đã từ chối dịch vụ.");
      setShowRejectModal(false);
      setRejectReason("");
      setRejectTarget(null);
      setSelected(null);
      await fetchServices(page);
    } catch (error) {
      toast.error(error.message || "Không thể từ chối dịch vụ.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-[#5a6577]">Đang tải dịch vụ...</span>
      </div>
    );
  }

  const detail = selected?.detail;
  const detailData = detail?.approvalKind === "ChangeRequest"
    ? (detail?.preview || detail?.current)
    : detail?.current;
  const changedFields = detail?.changedFields || [];
  const isChangeRequest = detail?.approvalKind === "ChangeRequest";
  const selectedStatus = selected ? statusConfig[selected.status] || statusConfig.pending : null;
  const selectedType = selected ? typeConfig[selected.type] || typeConfig.tour : null;
  const SelectedTypeIcon = selectedType?.icon;
  const SelectedStatusIcon = selectedStatus?.icon;
  const homestay = detailData?.homestay;
  const rooms = homestay?.rooms || [];
  const tourPackages = detailData?.tourPackages?.length ? detailData.tourPackages : detailData?.tour ? [detailData.tour] : [];
  const policyLabel = cancellationLabels[detailData?.cancellationPolicyType] ?? "Trung bình";

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a2332]">Duyệt dịch vụ</h1>
        <p className="mt-1 text-sm text-[#5a6577]">
          Xem xét cả dịch vụ mới lẫn yêu cầu cập nhật từ đối tác.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Chờ duyệt", count: stats.pending, tab: "pending", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
          { label: "Đã duyệt", count: stats.approved, tab: "approved", color: "bg-green-50 border-green-200 text-green-800" },
          { label: "Từ chối", count: stats.rejected, tab: "rejected", color: "bg-red-50 border-red-200 text-red-800" },
        ].map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => { setFilterStatus(item.tab); setPage(1); }}
            className={`rounded-xl border p-4 text-left ${item.color} ${filterStatus === item.tab ? "ring-2 ring-current ring-offset-1" : ""}`}
          >
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-sm font-medium">{item.label}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-[#e8ecf0] bg-white p-4">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d95a3]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên dịch vụ, đối tác..."
            className="w-full rounded-lg border border-[#e8ecf0] py-2 pl-9 pr-4 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          className="rounded-lg border border-[#e8ecf0] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
        >
          <option value="all">Tất cả loại</option>
          <option value="homestay">Homestay</option>
          <option value="tour">Tour</option>
        </select>



        <button
          type="button"
          onClick={() => fetchServices(page)}
          className="rounded-lg border border-[#e8ecf0] p-2 hover:bg-[#f9fafb]"
        >
          <RefreshCw className="h-4 w-4 text-[#5a6577]" />
        </button>
      </div>

      <div className={`grid gap-6 ${selected ? "grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]" : "grid-cols-1"}`}>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#e8ecf0] bg-white p-12 text-center text-[#8d95a3]">
              Không tìm thấy dịch vụ nào.
            </div>
          ) : null}

          {filtered.map((item) => {
            const typeInfo = typeConfig[item.type] || typeConfig.tour;
            const statusInfo = statusConfig[item.status] || statusConfig.pending;
            const kindInfo = kindConfig[item.approvalKind] || kindConfig.NewRegistration;
            const TypeIcon = typeInfo.icon;
            const StatusIcon = statusInfo.icon;
            const KindIcon = kindInfo.icon;

            return (
              <button
                key={item.approvalTargetId}
                type="button"
                onClick={() => loadDetail(item)}
                className={`w-full rounded-xl border bg-white p-4 text-left transition-all cursor-pointer ${
                  selected?.approvalTargetId === item.approvalTargetId
                    ? "border-primary ring-1 ring-primary"
                    : "border-[#e8ecf0]"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                    <TypeIcon className="h-3 w-3" />
                    {typeInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </span>
                </div>

                <p className="font-semibold text-[#1a2332]">{item.name}</p>
                <p className="mt-0.5 text-xs text-[#5a6577]">{item.partner}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#8d95a3]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.location || "Chưa có địa chỉ"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.submitted ? new Date(item.submitted).toLocaleDateString("vi-VN") : "—"}
                  </span>
                </div>
              </button>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-[#e8ecf0] px-3 py-2 text-sm text-[#5a6577] hover:bg-[#f9fafb] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <span className="text-sm text-[#5a6577]">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-[#e8ecf0] px-3 py-2 text-sm text-[#5a6577] hover:bg-[#f9fafb] disabled:opacity-40"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="sticky top-6 space-y-5 rounded-xl border border-[#e8ecf0] bg-white p-6 h-fit max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1a2332]">Chi tiết yêu cầu duyệt</h3>
                <p className="text-sm text-[#5a6577]">
                  {isChangeRequest ? "Bản xem trước sau khi cập nhật" : "Bản đăng ký dịch vụ"}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-[#8d95a3] hover:text-[#5a6577]">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {isChangeRequest ? <ChangedBadge fields={changedFields} /> : null}

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : detailData ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${selectedType.color}`}>
                    {SelectedTypeIcon ? <SelectedTypeIcon className="h-3 w-3" /> : null}
                    {selectedType.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${selectedStatus.color}`}>
                    {SelectedStatusIcon ? <SelectedStatusIcon className="h-3 w-3" /> : null}
                    {selectedStatus.label}
                  </span>

                </div>

                {detailData.thumbnailUrl ? (
                  <img src={detailData.thumbnailUrl} alt={detailData.name} className="h-48 w-full rounded-xl object-cover" />
                ) : null}

                {detailData.images?.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {detailData.images.map((image, index) => {
                      const url = typeof image === "string" ? image : image.imageUrl;
                      return url ? <img key={url || index} src={url} alt="" className="h-24 w-full rounded-xl object-cover" /> : null;
                    })}
                  </div>
                ) : null}

                <div>
                  <h2 className="text-xl font-bold text-[#1a2332]">{detailData.name}</h2>
                  {splitBulletLines(detailData.description).length && selected.type === "tour" ? (
                    <ul className="mt-2 space-y-1 text-sm text-[#5a6577]">
                      {splitBulletLines(detailData.description).map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-[#5a6577]">{detailData.description || "Chưa có mô tả."}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock label="Đối tác" value={detailData.partnerName || selected.partner} />
                  <InfoBlock label="Ngày gửi" value={detailData.createdAt ? new Date(detailData.createdAt).toLocaleDateString("vi-VN") : "—"} />
                  <InfoBlock label="Địa chỉ" value={detailData.address || "—"} />
                  <InfoBlock label="Chính sách hủy" value={policyLabel} />
                </div>

                {detailData.cancellationPolicyDescription ? (
                  <div className="rounded-xl border border-[#d9e7f2] bg-[#f8fbfd] p-4 text-sm text-[#31526f]">
                    <p className="font-medium text-[#1a2332]">Ghi chú chính sách hủy</p>
                    <p className="mt-1">{detailData.cancellationPolicyDescription}</p>
                  </div>
                ) : null}

                {homestay ? (
                  <div className="space-y-5 border-t border-[#e8ecf0] pt-5">
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-[#1a2332]">Thông tin homestay</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <InfoBlock label="Nhận phòng" value={String(homestay.checkInTime || "—")} />
                        <InfoBlock label="Trả phòng" value={String(homestay.checkOutTime || "—")} />
                        <InfoBlock label="Tối thiểu" value={`${homestay.minNights || 1} đêm`} />
                        <InfoBlock label="Tối đa" value={`${homestay.maxNights || 30} đêm`} />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">Tiện nghi homestay</p>
                      {homestay.amenities?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {homestay.amenities.map((amenity) => (
                            <span key={amenity.id || amenity.name} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {amenity.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm italic text-[#8d95a3]">Chưa có tiện nghi homestay.</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-[#1a2332]">Loại phòng ({rooms.length})</p>
                      <div className="space-y-4">
                        {rooms.map((room) => (
                          <RoomApprovalCard key={room.id} room={room} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {!homestay && tourPackages.length ? (
                  <div className="space-y-5 border-t border-[#e8ecf0] pt-5">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-[#1a2332]">Gói tour ({tourPackages.length})</p>
                      <div className="space-y-4">
                        {tourPackages.map((pkg, index) => (
                          <TourPackageApprovalCard key={pkg.id || index} pkg={pkg} index={index} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {selected.rejectReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-700">Lý do từ chối</p>
                    <p className="mt-1 text-sm text-red-600">{selected.rejectReason}</p>
                  </div>
                ) : null}

                {selected.status === "pending" ? (
                  <div className="flex gap-3 border-t border-[#e8ecf0] pt-4">
                    <button
                      type="button"
                      onClick={() => handleApprove(selected.approvalTargetId, detailData.name)}
                      disabled={actionLoading === selected.approvalTargetId}
                      className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {actionLoading === selected.approvalTargetId ? "Đang duyệt..." : "Phê duyệt"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectTarget(selected);
                        setShowRejectModal(true);
                      }}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Từ chối
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="py-8 text-sm text-[#8d95a3]">Không thể tải chi tiết yêu cầu này.</p>
            )}
          </div>
        ) : null}
      </div>

      {showRejectModal && rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-semibold text-[#1a2332]">Từ chối dịch vụ</h3>
            <p className="mt-1 text-sm text-[#5a6577]">
              Dịch vụ: <span className="font-medium text-[#1a2332]">{rejectTarget.name}</span>
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Nhập lý do từ chối để đối tác điều chỉnh..."
              className="mt-4 w-full rounded-xl border border-[#e8ecf0] px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setRejectTarget(null);
                }}
                className="flex-1 rounded-xl border border-[#e8ecf0] px-4 py-2.5 text-[#3d4654] hover:bg-[#f9fafb]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectTarget.approvalTargetId, rejectReason)}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget.approvalTargetId}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading === rejectTarget.approvalTargetId ? "Đang gửi..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ManagerServiceApproval;
