import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bed,
  Calendar,
  Camera,
  Clock,
  Home,
  Image as ImageIcon,
  List,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ServiceLocationPicker from "../../components/ServiceLocationPicker";
import { useToast } from "../../feedback/FeedbackProvider";
import { reviewService } from "../../services/reviewService";
import { serviceService, SERVICE_TYPE } from "../../services/serviceService";
import { uploadService } from "../../services/uploadService";

const CANCELLATION_POLICIES = [
  {
    value: "0",
    label: "Linh hoạt",
    summary: "Hoàn 100% đến 24 giờ trước khi bắt đầu. Sau đó không hoàn.",
  },
  {
    value: "1",
    label: "Trung bình",
    summary:
      "Hoàn 100% đến 5 ngày trước khi bắt đầu. Sau đó hoàn 50% đến khi bắt đầu.",
  },
  {
    value: "2",
    label: "Chặt chẽ",
    summary:
      "Hoàn 100% đến 30 ngày trước khi bắt đầu. Hoàn 50% từ 30 đến 7 ngày trước khi bắt đầu.",
  },
  {
    value: "3",
    label: "Không hoàn tiền",
    summary: "Không hỗ trợ hoàn tiền.",
  },
];

const BED_TYPE_OPTIONS = [
  "Twin",
  "Twin XL",
  "Single",
  "Small Double",
  "Double",
  "Queen",
  "King",
  "California King",
  "Bunk Bed",
  "Sofa Bed",
  "Futon",
  "Floor Mattress",
];

const HOMESTAY_AMENITY_OPTIONS = [
  { value: "Wi-Fi", label: "Wi-Fi", icon: "wifi" },
  { value: "Parking", label: "Bãi đỗ xe", icon: "parking" },
  { value: "Kitchen", label: "Bếp", icon: "kitchen" },
  { value: "Pool", label: "Hồ bơi", icon: "pool" },
  { value: "BBQ area", label: "Khu BBQ", icon: "bbq" },
  {
    value: "Air conditioning",
    label: "Điều hòa",
    icon: "air-conditioning",
  },
  { value: "Laundry", label: "Giặt ủi", icon: "laundry" },
  { value: "TV/Entertainment", label: "TV/Giải trí", icon: "tv" },
];

const ROOM_AMENITY_OPTIONS = [
  { value: "Private bathroom", label: "Phòng tắm riêng", icon: "bathroom" },
  { value: "Hot water", label: "Nước nóng", icon: "hot-water" },
  { value: "Towels", label: "Khăn tắm", icon: "towels" },
  { value: "Bed linens", label: "Ga trải giường", icon: "linens" },
  { value: "Wardrobe/Hangers", label: "Tủ/Móc áo", icon: "wardrobe" },
  { value: "Hair dryer", label: "Máy sấy tóc", icon: "hair-dryer" },
  { value: "Toiletries", label: "Đồ vệ sinh", icon: "toiletries" },
  { value: "Desk/Workspace", label: "Bàn làm việc", icon: "workspace" },
  { value: "Mini fridge", label: "Tủ lạnh nhỏ", icon: "mini-fridge" },
  { value: "Balcony/View", label: "Ban công/Cảnh quan", icon: "view" },
];

const TOUR_ACTIVITY_TYPES = [
  { value: "transport", label: "Di chuyển" },
  { value: "visit", label: "Tham quan" },
  { value: "meal", label: "Ăn uống" },
  { value: "pickup", label: "Đón khách" },
  { value: "dropoff", label: "Trả khách" },
  { value: "free_time", label: "Thời gian tự do" },
];

const TOUR_DURATION_OPTIONS = [
  { value: "2 hours", label: "2 giờ" },
  { value: "3 hours", label: "3 giờ" },
  { value: "4 hours", label: "4 giờ" },
  { value: "6 hours", label: "6 giờ" },
  { value: "8 hours", label: "8 giờ" },
  { value: "12 hours", label: "12 giờ" },
  { value: "1 day", label: "1 ngày" },
  { value: "2 days 1 night", label: "2 ngày 1 đêm" },
  { value: "3 days 2 nights", label: "3 ngày 2 đêm" },
];

const EMPTY_LOCATION = {
  address: "",
  latitude: "",
  longitude: "",
  destinationId: "",
  destinationName: "",
  destinationDistanceKm: null,
};

const formatPrice = (value) =>
  value != null ? `${new Intl.NumberFormat("vi-VN").format(value)} đ` : "—";

const formatNumber = (value) =>
  value != null ? new Intl.NumberFormat("vi-VN").format(value) : "—";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
};

const formatTime = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 5);
};

function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDurationToMinutes(durationValue) {
  const normalized = String(durationValue || "")
    .trim()
    .toLowerCase();
  if (!normalized) return 0;

  let totalMinutes = 0;
  let hasDayUnit = false;
  const patterns = [
    {
      regex: /(\d+)\s*(day|days|ngay|ngày)/g,
      factor: 24 * 60,
      onMatch: () => {
        hasDayUnit = true;
      },
    },
    {
      regex: /(\d+)\s*(night|nights|dem|đêm)/g,
      factor: 24 * 60,
      skipIfHasDay: true,
    },
    { regex: /(\d+)\s*(hour|hours|hr|hrs|gio|giờ|h)/g, factor: 60 },
    {
      regex: /(\d+)\s*(minute|minutes|min|mins|phut|phút|m)(?![a-z])/g,
      factor: 1,
    },
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern.regex)) {
      if (pattern.skipIfHasDay && hasDayUnit) continue;
      totalMinutes += Number(match[1]) * pattern.factor;
      pattern.onMatch?.();
    }
  }

  return totalMinutes;
}

function calculateSessionRange(startDate, startTime, durationMinutes) {
  const minutes = Number(durationMinutes) || 0;
  if (!startDate || !startTime || !minutes) {
    return {
      endDate: startDate || "",
      endTime: "",
    };
  }

  const startAt = new Date(`${startDate}T${startTime || "00:00"}:00`);
  const endAt = new Date(startAt.getTime() + minutes * 60 * 1000);
  return {
    endDate: endAt.toISOString().slice(0, 10),
    endTime: endAt.toTimeString().slice(0, 5),
  };
}

function computePackageTimeline(pkg) {
  const itinerary = pkg.itinerary || pkg.itineraries || [];
  if (!itinerary.length) {
    return { dayCount: 0, nights: 0, totalMinutes: 0, isComplete: false, firstStartTime: null, lastEndTime: null };
  }

  const dayNumbers = [...new Set(itinerary.map((item) => item.dayNumber || 1))].sort((a, b) => a - b);
  const dayCount = dayNumbers.length;

  const byDay = {};
  for (const item of itinerary) {
    const dn = item.dayNumber || 1;
    if (!byDay[dn]) byDay[dn] = [];
    byDay[dn].push(item);
  }

  let firstStartTime = null;
  let lastEndTime = null;

  for (const dayNum of dayNumbers) {
    const activities = byDay[dayNum];
    const dayFirstStart = activities.find((a) => a.startTime)?.startTime;
    const reversed = [...activities].reverse();
    const dayLastEnd = reversed.find((a) => a.endTime)?.endTime;

    if (dayNum === dayNumbers[0] && dayFirstStart) firstStartTime = dayFirstStart;
    if (dayNum === dayNumbers[dayNumbers.length - 1] && dayLastEnd) lastEndTime = dayLastEnd;
  }

  const isComplete = !!firstStartTime && !!lastEndTime;
  let totalMinutes = 0;
  if (isComplete) {
    const [fh, fm] = String(firstStartTime).split(":").map(Number);
    const [lh, lm] = String(lastEndTime).split(":").map(Number);
    totalMinutes = Math.max(0, (dayCount - 1) * 24 * 60 + (lh * 60 + lm) - (fh * 60 + fm));
  }

  return { dayCount, nights: Math.max(0, dayCount - 1), totalMinutes, isComplete, firstStartTime, lastEndTime };
}

function getPackageDurationMinutes(pkg) {
  const timeline = computePackageTimeline(pkg);
  if (timeline.isComplete) return timeline.totalMinutes;
  if (timeline.dayCount > 0) {
    return (timeline.dayCount - 1) * 24 * 60 + 480;
  }
  return Number(pkg.estimatedDurationMinutes) || 0;
}

function getPackageDurationText(pkg) {
  const timeline = computePackageTimeline(pkg);
  if (timeline.dayCount > 0) {
    return `${timeline.dayCount} ngày / ${timeline.nights} đêm`;
  }
  return "1 ngày";
}

function getServiceData(response) {
  return response?.success ? response.data : response;
}

function getPolicy(policyValue) {
  return (
    CANCELLATION_POLICIES.find(
      (policy) => policy.value === String(policyValue),
    ) || CANCELLATION_POLICIES[1]
  );
}

function splitBulletLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);
}

function normalizeAmenityNames(items = []) {
  return items
    .map((item) => (typeof item === "string" ? item : item.name))
    .filter(Boolean);
}

function toAmenityPayload(names, options) {
  return (names || []).map((name) => {
    const option = options.find((item) => item.value === name);
    return { name, icon: option?.icon || null };
  });
}

function getRoomImages(room) {
  const images = Array.isArray(room.images) ? room.images : [];
  const urls = images
    .map((image) =>
      typeof image === "string" ? image : image.imageUrl || image.url,
    )
    .filter(Boolean);

  if (room.imageUrl && !urls.includes(room.imageUrl))
    urls.unshift(room.imageUrl);

  const coverUrl =
    images.find((image) => typeof image !== "string" && image.isCover)
      ?.imageUrl ||
    room.imageUrl ||
    urls[0] ||
    "";

  return urls.map((imageUrl, index) => ({
    imageUrl,
    displayOrder: index,
    isCover: imageUrl === coverUrl,
  }));
}

function imagePayload(images) {
  const cover = images.find((image) => image.isCover) || images[0];
  return images.map((image, index) => ({
    imageUrl: image.imageUrl,
    displayOrder: index,
    isCover: image.imageUrl === cover?.imageUrl,
  }));
}

function buildLocation(service) {
  return {
    ...EMPTY_LOCATION,
    address: service.address || "",
    latitude: service.latitude ?? "",
    longitude: service.longitude ?? "",
    destinationId: service.destinationId || "",
    destinationName: service.destinationName || "",
  };
}

function buildAvailabilityWindows(room) {
  const rows = [...(room.availability || [])]
    .map((item) => ({
      date: normalizeDateKey(item.date),
      availableCount: item.availableCount ?? 0,
      isBlocked: item.isBlocked || item.availableCount <= 0,
    }))
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!rows.length) {
    return [
      {
        startDate: "",
        endDate: "",
        availableCount: room.quantity || 1,
        isBlocked: false,
      },
    ];
  }

  const windows = [];
  for (const row of rows) {
    const last = windows[windows.length - 1];
    const canExtend =
      last &&
      addDays(last.endDate, 1) === row.date &&
      Number(last.availableCount) === Number(row.availableCount) &&
      Boolean(last.isBlocked) === Boolean(row.isBlocked);

    if (canExtend) {
      last.endDate = row.date;
    } else {
      windows.push({
        startDate: row.date,
        endDate: row.date,
        availableCount: row.availableCount,
        isBlocked: row.isBlocked,
      });
    }
  }
  return windows;
}

function windowsToAvailability(room) {
  const rows = [];
  for (const window of room.availabilityWindows || []) {
    if (!window.startDate || !window.endDate) continue;
    for (
      let date = window.startDate;
      date <= window.endDate;
      date = addDays(date, 1)
    ) {
      rows.push({
        date,
        availableCount: Number(window.availableCount) || 0,
        isBlocked: window.isBlocked,
      });
    }
  }
  return rows;
}

function validateAvailabilityRooms(rooms = []) {
  for (const room of rooms) {
    const quantity = Number(room.quantity) || 1;
    const orderedWindows = [...(room.availabilityWindows || [])]
      .filter((window) => window.startDate && window.endDate)
      .sort((left, right) => left.startDate.localeCompare(right.startDate));

    for (let index = 0; index < orderedWindows.length; index += 1) {
      const window = orderedWindows[index];
      if (window.endDate < window.startDate) {
        return `${room.name || "Loại phòng"} có khung ngày kết thúc trước ngày bắt đầu.`;
      }

      const availableCount = Number(window.availableCount);
      if (
        !window.isBlocked &&
        (!Number.isFinite(availableCount) ||
          availableCount < 1 ||
          availableCount > quantity)
      ) {
        return `${room.name || "Loại phòng"} phải mở từ 1 đến ${quantity} phòng trong mỗi khung ngày.`;
      }

      if (window.isBlocked && availableCount > quantity) {
        return `${room.name || "Loại phòng"} đang có số phòng vượt quá tổng số phòng.`;
      }

      if (index > 0 && window.startDate <= orderedWindows[index - 1].endDate) {
        return `${room.name || "Loại phòng"} có các khung ngày đang bị chồng lấp.`;
      }
    }
  }

  return "";
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-[#5a6577]">{label}</p>
      <p className="font-semibold text-[#1a2332]">{value ?? "—"}</p>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", min, max, onBlur }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <input
        type={type}
        min={min}
        max={max}
        value={value ?? ""}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function AmenityChips({ items, emptyText = "Chưa chọn tiện nghi." }) {
  const names = normalizeAmenityNames(items);
  if (!names.length)
    return <p className="text-sm italic text-[#8d95a3]">{emptyText}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => (
        <span
          key={name}
          className="rounded-full bg-[#eef7fb] px-3 py-1 text-xs font-medium text-[#24637f]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function AmenityChecklist({ options, selected, onChange }) {
  const selectedSet = new Set(selected || []);
  const toggle = (value) => {
    onChange(
      selectedSet.has(value)
        ? selected.filter((item) => item !== value)
        : [...(selected || []), value],
    );
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            selectedSet.has(option.value)
              ? "border-primary bg-primary/10 text-primary"
              : "border-[#e8ecf0] bg-white text-[#5a6577]"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedSet.has(option.value)}
            onChange={() => toggle(option.value)}
            className="h-4 w-4 accent-primary"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function TabHeader({
  title,
  editing,
  canEdit,
  saving,
  onEdit,
  onCancel,
  onSave,
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold text-[#1a2332]">{title}</h2>
      {editing ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <X className="h-4 w-4" /> Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Pencil className="h-4 w-4" /> Chỉnh sửa
        </button>
      )}
    </div>
  );
}

function AvailabilityCalendar({ room }) {
  const availability = room.availability || [];
  const anchor =
    normalizeDateKey(availability[0]?.date) ||
    new Date().toISOString().slice(0, 10);
  const [visibleMonth, setVisibleMonth] = useState(anchor.slice(0, 7));

  useEffect(() => {
    setVisibleMonth(anchor.slice(0, 7));
  }, [anchor]);

  const [year, month] = visibleMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(monthStart.getUTCDate() - leadingDays);
  const rowsByDate = new Map(
    availability.map((item) => [normalizeDateKey(item.date), item]),
  );

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const row = rowsByDate.get(key);
    return {
      key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthStart.getUTCMonth(),
      row,
    };
  });

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[#5a6577]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const previousMonth = new Date(Date.UTC(year, month - 2, 1));
              setVisibleMonth(previousMonth.toISOString().slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            {monthStart.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMonth = new Date(Date.UTC(year, month, 1));
              setVisibleMonth(nextMonth.toISOString().slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
        <span className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Còn
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Khóa
          </span>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8d95a3]">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const blocked = day.row?.isBlocked || day.row?.availableCount <= 0;
          const available = day.row && !blocked;
          return (
            <div
              key={day.key}
              className={`min-h-12 rounded-lg border px-1 py-1 text-xs ${
                available
                  ? "border-green-200 bg-green-50 text-green-700"
                  : blocked
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-[#edf1f4] bg-[#f9fafb] text-[#8d95a3]"
              } ${day.inMonth ? "" : "opacity-35"}`}
            >
              <p className="font-medium">{day.day}</p>
              {day.row ? (
                <p className="mt-1 text-[10px]">
                  {blocked ? "Khóa" : `${day.row.availableCount} phòng`}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewsSection({ service, reviews }) {
  const items = reviews.items || reviews.Items || [];
  const total =
    reviews.totalCount ?? reviews.TotalCount ?? service.totalReviews ?? 0;

  return (
    <div className="border-t border-[#e8ecf0] pt-5">
      <h3 className="mb-3 font-semibold text-[#1a2332]">Đánh giá khách hàng</h3>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <InfoItem
          label="Tổng đặt chỗ"
          value={`${formatNumber(service.totalBookings ?? 0)} lượt`}
        />
        <InfoItem label="Đánh giá" value={`${formatNumber(total)} lượt`} />
      </div>
      {!items.length ? (
        <p className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4 text-sm text-[#5a6577]">
          Dịch vụ chưa được đánh giá
        </p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 4).map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium text-[#1a2332]">
                  {review.userName || "Khách hàng"}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                  <Star className="h-4 w-4 fill-current" /> {review.rating}
                </span>
              </div>
              <p className="text-sm leading-6 text-[#5a6577]">
                {review.comment || "Không có nội dung đánh giá."}
              </p>
              {review.createdAt ? (
                <p className="mt-2 text-xs text-[#8d95a3]">
                  {formatDate(review.createdAt)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewDisplay({ service, homestay, images, reviews, isHomestay }) {
  const policy = getPolicy(service.cancellationPolicyType);
  const descriptionLines = !isHomestay
    ? splitBulletLines(service.description)
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 font-semibold text-[#1a2332]">Mô tả</h3>
        {descriptionLines.length ? (
          <ul className="space-y-1 text-sm leading-6 text-[#5a6577]">
            {descriptionLines.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-[#5a6577]">
            {service.description || "Chưa có mô tả."}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoItem
          label="Địa điểm"
          value={service.address || service.destinationName || "—"}
        />
        <InfoItem label="Chính sách hủy" value={policy.label} />
      </div>
      <p className="rounded-xl border border-[#d9e7f2] bg-[#f8fbfd] p-3 text-sm text-[#31526f]">
        {policy.summary}
        {service.cancellationPolicyDescription
          ? ` Ghi chú: ${service.cancellationPolicyDescription}`
          : ""}
      </p>

      {isHomestay ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoItem
              label="Nhận phòng"
              value={formatTime(homestay.checkInTime)}
            />
            <InfoItem
              label="Trả phòng"
              value={formatTime(homestay.checkOutTime)}
            />
            <InfoItem
              label="Số đêm tối thiểu"
              value={homestay.minNights ? `${homestay.minNights} đêm` : "—"}
            />
            <InfoItem
              label="Số đêm tối đa"
              value={homestay.maxNights ? `${homestay.maxNights} đêm` : "—"}
            />
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-[#1a2332]">
              Tiện nghi homestay
            </h3>
            <AmenityChips items={homestay.amenities || []} />
          </div>
        </>
      ) : null}

      <div>
        <h3 className="mb-2 font-semibold text-[#1a2332]">Hình ảnh dịch vụ</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.length ? (
            images.map((image, index) => {
              const url =
                typeof image === "string" ? image : image.imageUrl || image.url;
              if (!url) return null;
              return (
                <img
                  key={url || index}
                  src={url}
                  alt=""
                  className="h-28 w-full rounded-xl object-cover"
                />
              );
            })
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-[#dbe4ea] bg-[#f9fafb] p-6 text-center text-sm text-[#8d95a3]">
              Chưa có ảnh dịch vụ
            </div>
          )}
        </div>
      </div>

      <ReviewsSection service={service} reviews={reviews} />
    </div>
  );
}

function OverviewEdit({
  editData,
  setEditData,
  destinations,
  onUpload,
  uploading,
}) {
  const policy = getPolicy(editData.cancellationPolicyType);

  return (
    <div className="space-y-5">
      <FormField
        label="Tên dịch vụ"
        value={editData.name}
        onChange={(value) => setEditData((p) => ({ ...p, name: value }))}
      />
      <FormTextarea
        label="Mô tả"
        rows={4}
        value={editData.description}
        onChange={(value) => setEditData((p) => ({ ...p, description: value }))}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[#5a6577]">
          Ảnh đại diện homestay
        </label>
        {editData.thumbnailUrl ? (
          <img
            src={editData.thumbnailUrl}
            alt=""
            className="mb-3 h-36 w-full max-w-md rounded-xl object-cover"
          />
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Đang tải..." : "Tải ảnh"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <ServiceLocationPicker
        label="Địa chỉ homestay"
        value={editData.location}
        destinations={destinations}
        onChange={(location) => setEditData((p) => ({ ...p, location }))}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#5a6577]">
            Chính sách hủy
          </label>
          <select
            value={editData.cancellationPolicyType}
            onChange={(event) =>
              setEditData((p) => ({
                ...p,
                cancellationPolicyType: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {CANCELLATION_POLICIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <FormTextarea
          label="Ghi chú chính sách"
          rows={2}
          value={editData.cancellationPolicyNotes}
          onChange={(value) =>
            setEditData((p) => ({ ...p, cancellationPolicyNotes: value }))
          }
        />
      </div>
      <p className="rounded-xl border border-[#d9e7f2] bg-[#f8fbfd] p-3 text-sm text-[#31526f]">
        {policy.summary}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Giờ nhận phòng"
          type="time"
          value={editData.checkInTime}
          onChange={(value) => setEditData((p) => ({ ...p, checkInTime: value }))}
        />
        <FormField
          label="Giờ trả phòng"
          type="time"
          value={editData.checkOutTime}
          onChange={(value) => setEditData((p) => ({ ...p, checkOutTime: value }))}
        />
        <FormField
          label="Số đêm tối thiểu"
          type="number"
          min="1"
          max="30"
          value={editData.minNights}
          onChange={(value) => setEditData((p) => ({ ...p, minNights: value }))}
        />
        <FormField
          label="Số đêm tối đa"
          type="number"
          min="1"
          max="30"
          value={editData.maxNights}
          onChange={(value) => setEditData((p) => ({ ...p, maxNights: value }))}
          onBlur={(e) => {
            if (e.target.value === "") setEditData((p) => ({ ...p, maxNights: "30" }));
          }}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#5a6577]">
          Tiện nghi homestay
        </label>
        <AmenityChecklist
          options={HOMESTAY_AMENITY_OPTIONS}
          selected={editData.amenities}
          onChange={(amenities) => setEditData((p) => ({ ...p, amenities }))}
        />
      </div>
    </div>
  );
}

function RoomGalleryEditor({
  room,
  roomIndex,
  onUpload,
  onSetCover,
  onRemoveImage,
  uploading,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#5a6577]">
          Hình ảnh loại phòng
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 text-sm hover:bg-[#f9fafb]">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Đang tải..." : "Tải ảnh"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => onUpload(roomIndex, event)}
            disabled={uploading}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {room.images.length ? (
          room.images.map((image) => (
            <div
              key={image.imageUrl}
              className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white"
            >
              <img
                src={image.imageUrl}
                alt=""
                className="h-28 w-full object-cover"
              />
              <div className="space-y-2 p-2">
                <span
                  className={`text-xs font-medium ${image.isCover ? "text-green-700" : "text-[#8d95a3]"}`}
                >
                  {image.isCover ? "Ảnh bìa" : "Ảnh thư viện"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {!image.isCover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(roomIndex, image.imageUrl)}
                      className="text-xs text-primary"
                    >
                      Đặt làm bìa
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(roomIndex, image.imageUrl)}
                    className="text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-[#dbe4ea] bg-white p-5 text-center text-sm text-[#8d95a3]">
            Chưa có ảnh cho loại phòng này.
          </div>
        )}
      </div>
    </div>
  );
}

function RoomsDisplay({ rooms }) {
  if (!rooms.length)
    return (
      <p className="text-sm italic text-[#8d95a3]">Chưa có loại phòng nào.</p>
    );

  return (
    <div className="space-y-4">
      {rooms.map((room) => {
        const images = getRoomImages(room);
        return (
          <div
            key={room.id}
            className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#1a2332]">{room.name}</h3>
                {room.description ? (
                  <p className="mt-1 text-sm leading-6 text-[#5a6577]">
                    {room.description}
                  </p>
                ) : null}
              </div>
              <p className="text-right text-sm font-semibold text-green-700">
                {formatPrice(room.basePrice)}
              </p>
            </div>
            {images.length ? (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((image) => (
                  <img
                    key={image.imageUrl}
                    src={image.imageUrl}
                    alt=""
                    className="h-24 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoItem
                label="Giá thường"
                value={formatPrice(room.basePrice)}
              />
              <InfoItem
                label="Giá cuối tuần"
                value={formatPrice(room.weekendPrice)}
              />
              <InfoItem
                label="Giá ngày lễ"
                value={formatPrice(room.holidayPrice)}
              />
              <InfoItem
                label="Tổng phòng"
                value={`${room.quantity || 1} phòng`}
              />
              <InfoItem
                label="Khách tối đa"
                value={`${room.maxGuests || 1} người`}
              />
              <InfoItem label="Loại giường" value={room.bedType || "—"} />
              <InfoItem
                label="Số giường"
                value={`${room.bedCount || 1} giường`}
              />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs text-[#5a6577]">Tiện nghi phòng</p>
              <AmenityChips
                items={room.amenities || []}
                emptyText="Chưa chọn tiện nghi phòng."
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoomsEdit({
  editData,
  setEditData,
  onRoomImagesUpload,
  onSetRoomCover,
  onRemoveRoomImage,
  uploadingRoomIndex,
}) {
  const updateRoom = (roomIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) =>
        index === roomIndex ? { ...room, ...patch } : room,
      ),
    }));
  };

  return (
    <div className="space-y-5">
      {editData.rooms.map((room, roomIndex) => (
        <div
          key={room.id || roomIndex}
          className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <RoomGalleryEditor
            room={room}
            roomIndex={roomIndex}
            uploading={uploadingRoomIndex === roomIndex}
            onUpload={onRoomImagesUpload}
            onSetCover={onSetRoomCover}
            onRemoveImage={onRemoveRoomImage}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              label="Tên phòng"
              value={room.name}
              onChange={(value) => updateRoom(roomIndex, { name: value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                Loại giường
              </label>
              <select
                value={room.bedType || ""}
                onChange={(event) =>
                  updateRoom(roomIndex, { bedType: event.target.value })
                }
                className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {BED_TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Số giường"
              type="number"
              min="1"
              value={room.bedCount || 1}
              onChange={(value) => updateRoom(roomIndex, { bedCount: value })}
            />
            <FormField
              label="Khách tối đa"
              type="number"
              min="1"
              value={room.maxGuests}
              onChange={(value) => updateRoom(roomIndex, { maxGuests: value })}
            />
            <FormField
              label="Tổng phòng"
              type="number"
              min="1"
              value={room.quantity}
              onChange={(value) => updateRoom(roomIndex, { quantity: value })}
            />
            <FormField
              label="Giá thường (VNĐ)"
              type="number"
              value={room.basePrice}
              onChange={(value) => updateRoom(roomIndex, { basePrice: value })}
            />
            <FormField
              label="Giá cuối tuần (VNĐ)"
              type="number"
              value={room.weekendPrice}
              onChange={(value) =>
                updateRoom(roomIndex, { weekendPrice: value })
              }
            />
            <FormField
              label="Giá ngày lễ (VNĐ)"
              type="number"
              value={room.holidayPrice}
              onChange={(value) =>
                updateRoom(roomIndex, { holidayPrice: value })
              }
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5a6577]">
              Tiện nghi phòng
            </label>
            <AmenityChecklist
              options={ROOM_AMENITY_OPTIONS}
              selected={room.amenities}
              onChange={(amenities) => updateRoom(roomIndex, { amenities })}
            />
          </div>
          <FormTextarea
            label="Mô tả phòng"
            rows={3}
            value={room.description}
            onChange={(value) => updateRoom(roomIndex, { description: value })}
          />
        </div>
      ))}
    </div>
  );
}

function AvailabilityDisplay({ rooms }) {
  if (!rooms.length)
    return (
      <p className="text-sm italic text-[#8d95a3]">Chưa có loại phòng nào.</p>
    );

  return (
    <div className="space-y-5">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Bed className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-[#1a2332]">{room.name}</h3>
          </div>
          <AvailabilityCalendar room={room} />
        </div>
      ))}
    </div>
  );
}

function AvailabilityEdit({ editData, setEditData }) {
  const updateWindow = (roomIndex, windowIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) => {
        if (index !== roomIndex) return room;
        return {
          ...room,
          availabilityWindows: room.availabilityWindows.map((window, wIndex) =>
            wIndex === windowIndex ? { ...window, ...patch } : window,
          ),
        };
      }),
    }));
  };

  const addWindow = (roomIndex) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) =>
        index === roomIndex
          ? {
              ...room,
              availabilityWindows: [
                ...room.availabilityWindows,
                {
                  startDate: "",
                  endDate: "",
                  availableCount: room.quantity || 1,
                  isBlocked: false,
                },
              ],
            }
          : room,
      ),
    }));
  };

  const removeWindow = (roomIndex, windowIndex) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) => {
        if (index !== roomIndex) return room;
        const windows = room.availabilityWindows.filter(
          (_, wIndex) => wIndex !== windowIndex,
        );
        return {
          ...room,
          availabilityWindows: windows.length
            ? windows
            : [
                {
                  startDate: "",
                  endDate: "",
                  availableCount: room.quantity || 1,
                  isBlocked: false,
                },
              ],
        };
      }),
    }));
  };

  return (
    <div className="space-y-5">
      {editData.rooms.map((room, roomIndex) => (
        <div
          key={room.id}
          className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1a2332]">{room.name}</h3>
            <button
              type="button"
              onClick={() => addWindow(roomIndex)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              <Plus className="h-4 w-4" /> Thêm khoảng ngày
            </button>
          </div>
          <AvailabilityCalendar
            room={{ ...room, availability: windowsToAvailability(room) }}
          />
          <div className="space-y-3">
            {room.availabilityWindows.map((window, windowIndex) => (
              <div
                key={windowIndex}
                className="grid gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]"
              >
                <FormField
                  label="Từ ngày"
                  type="date"
                  value={window.startDate}
                  onChange={(value) =>
                    updateWindow(roomIndex, windowIndex, { startDate: value })
                  }
                />
                <FormField
                  label="Đến ngày"
                  type="date"
                  value={window.endDate}
                  onChange={(value) =>
                    updateWindow(roomIndex, windowIndex, { endDate: value })
                  }
                />
                <FormField
                  label="Số phòng mở"
                  type="number"
                  min="0"
                  max={room.quantity}
                  value={window.availableCount}
                  onChange={(value) =>
                    updateWindow(roomIndex, windowIndex, {
                      availableCount: value,
                    })
                  }
                />
                <label className="flex items-end gap-2 pb-2 text-sm text-[#5a6577]">
                  <input
                    type="checkbox"
                    checked={Boolean(window.isBlocked)}
                    onChange={(event) =>
                      updateWindow(roomIndex, windowIndex, {
                        isBlocked: event.target.checked,
                        availableCount: event.target.checked
                          ? 0
                          : room.quantity || 1,
                      })
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  Khóa
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeWindow(roomIndex, windowIndex)}
                    className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TourGalleryEditor({
  images,
  onUpload,
  onSetCover,
  onRemoveImage,
  uploading,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#5a6577]">Hình ảnh gói tour</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 text-sm hover:bg-[#f9fafb]">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Đang tải..." : "Tải ảnh"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.length ? (
          images.map((image) => (
            <div
              key={image.imageUrl}
              className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white"
            >
              <img
                src={image.imageUrl}
                alt=""
                className="h-28 w-full object-cover"
              />
              <div className="space-y-2 p-2">
                <span
                  className={`text-xs font-medium ${image.isCover ? "text-green-700" : "text-[#8d95a3]"}`}
                >
                  {image.isCover ? "Ảnh bìa" : "Ảnh thư viện"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {!image.isCover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(image.imageUrl)}
                      className="text-xs text-primary"
                    >
                      Đặt làm bìa
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(image.imageUrl)}
                    className="text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-[#dbe4ea] bg-white p-5 text-center text-sm text-[#8d95a3]">
            Chưa có ảnh cho gói tour này.
          </div>
        )}
      </div>
    </div>
  );
}

function BulletListEditor({ label, items, onChange, placeholder = "" }) {
  const updateItem = (index, value) => {
    onChange(
      items.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  };

  const addItem = () => onChange([...(items || []), ""]);
  const removeItem = (index) =>
    onChange(items.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <div className="space-y-2">
        {(items || []).map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="pt-2 text-[#8d95a3]">•</span>
            <input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={(items || []).length <= 1}
              className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <Plus className="h-4 w-4" /> Thêm dòng
      </button>
    </div>
  );
}

function TagEditor({ label, tags, onChange, placeholder = "" }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const value = input.trim();
    if (!value || tags.includes(value)) return;
    onChange([...(tags || []), value]);
    setInput("");
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        {(tags || []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((item) => item !== tag))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-[#e8ecf0] px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-xl border border-[#e8ecf0] px-3 py-2 hover:bg-[#f9fafb]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TourPackagesTab({ packages }) {
  if (!packages?.length) {
    return (
      <p className="text-sm italic text-[#8d95a3]">Chưa có gói tour nào.</p>
    );
  }

  return (
    <div className="space-y-5">
      {packages.map((pkg, packageIndex) => {
        const policy = getPolicy(pkg.cancellationPolicyType);
        const includes = pkg.includedItems || [];
        const excludes = pkg.excludedItems || [];

        return (
          <div
            key={pkg.id || packageIndex}
            className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
          >
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#1a2332]">
                  {pkg.name || `Gói #${packageIndex + 1}`}
                </h3>
                <p className="mt-1 text-sm text-[#5a6577]">
                  Từ {pkg.minParticipants || 1} - {pkg.maxParticipants || 1}{" "}
                  khách
                </p>
                {pkg.bookingCutoffHours ? (
                  <p className="mt-1 text-sm text-[#5a6577]">
                    Đặt trước tối thiểu: {pkg.bookingCutoffHours}h
                  </p>
                ) : null}
                {pkg.meetingPoint ? (
                  <p className="mt-1 text-sm text-[#5a6577]">
                    Điểm đón: {pkg.meetingPoint}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[#d9e7f2] bg-[#f8fbfd] p-3 text-sm text-[#31526f]">
              {policy.summary}
              {pkg.cancellationPolicyDescription
                ? ` Ghi chú: ${pkg.cancellationPolicyDescription}`
                : ""}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                  Mức giá
                </p>
                <div className="space-y-2">
                  {(pkg.pricingTiers || []).map((tier, tierIndex) => (
                    <div
                      key={tier.id || tierIndex}
                      className="rounded-xl border border-[#e8ecf0] bg-white p-3"
                    >
                      <p className="font-semibold text-[#1a2332]">
                        {tier.name || `Mức giá #${tierIndex + 1}`}
                      </p>
                      <p className="text-sm text-green-700">
                        {formatPrice(tier.unitPrice)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {(pkg.schedules?.length || pkg.sessions?.length) ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                Lịch khởi hành
              </p>
              <div className="space-y-2">
                {(pkg.schedules || pkg.sessions || []).map((session, index) => (
                  <div
                    key={session.id || index}
                    className="rounded-xl border border-[#e8ecf0] bg-white p-3 text-sm text-[#5a6577]"
                  >
                    <p className="font-medium text-[#1a2332]">
                      {session.startDate
                        ? `${formatDate(session.startDate)} ${session.startTime || ""}`
                        : "—"}
                    </p>
                    <p>{"Số lượt khởi hành: "}{session.runCount || 1}</p>
                    <p>{"Sức chứa: "}{session.availableSlots || 0} chỗ</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(pkg.itineraries?.length || pkg.itinerary?.length) ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                Lịch trình
              </p>
              {(() => {
                const items = pkg.itineraries || pkg.itinerary || [];
                const dayNumbers = [...new Set(items.map((item) => item.dayNumber || 1))].sort((a, b) => a - b);
                return dayNumbers.map((dayNum) => {
                  const dayActivities = items.filter((item) => (item.dayNumber || 1) === dayNum);
                  return (
                    <div key={dayNum} className="mb-3">
                      <p className="mb-1.5 text-sm font-semibold text-[#1a2332]">Ngày {dayNum}</p>
                      <div className="space-y-2">
                        {dayActivities.map((item, itemIndex) => (
                          <div
                            key={item.id || itemIndex}
                            className="rounded-xl border border-[#e8ecf0] bg-white p-3"
                          >
                            <p className="font-medium text-[#1a2332]">{item.title || "—"}</p>
                            {item.description ? (
                              <p className="mt-1 text-sm text-[#5a6577]">{item.description}</p>
                            ) : null}
                            <p className="mt-1 text-xs text-[#8d95a3]">
                              {[
                                item.startTime && item.endTime
                                  ? `${item.startTime} - ${item.endTime}`
                                  : item.startTime || item.endTime,
                                item.location,
                                item.activityType && TOUR_ACTIVITY_TYPES.find((t) => t.value === item.activityType)?.label,
                              ]
                                .filter(Boolean)
                                .join(" • ") || ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : null}
        </div>
      );
    })}
    </div>
  );
}

function TourOverviewEdit({ editData, setEditData, destinations }) {
  return (
    <div className="space-y-5">
      <FormField
        label="Tên dịch vụ tour"
        value={editData.name}
        onChange={(value) =>
          setEditData((previous) => ({ ...previous, name: value }))
        }
      />
      <ServiceLocationPicker
        label="Địa chỉ tour"
        value={editData.location}
        destinations={destinations}
        onChange={(location) =>
          setEditData((previous) => ({ ...previous, location }))
        }
        required
      />
      <BulletListEditor
        label="Điểm nổi bật của tour"
        items={editData.descriptionBullets || [""]}
        onChange={(descriptionBullets) =>
          setEditData((previous) => ({ ...previous, descriptionBullets }))
        }
        placeholder="Mỗi dòng là một điểm nổi bật"
      />
    </div>
  );
}

function TourImagesSection({
  images,
  editing,
  canEdit,
  saving,
  onEdit,
  onCancel,
  onSave,
  uploadingTourImages,
  onTourImagesUpload,
  onSetTourCover,
  onRemoveTourImage,
}) {
  if (!editing && (!images || !images.length)) return null;

  return (
    <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
      <TabHeader
        title="Hình ảnh tour"
        editing={editing}
        canEdit={canEdit}
        saving={saving}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
      />
      {editing ? (
        <TourGalleryEditor
          images={images}
          uploading={uploadingTourImages}
          onUpload={onTourImagesUpload}
          onSetCover={onSetTourCover}
          onRemoveImage={onRemoveTourImage}
        />
      ) : images.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id || image.imageUrl || index}
              className="relative overflow-hidden rounded-xl"
            >
              <img
                src={image.imageUrl}
                alt=""
                className="h-28 w-full object-cover"
              />
              {image.isCover ? (
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                  Ảnh bìa
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TourPackagesEdit({
  editData,
  setEditData,
  destinations,
  uploadingPackageImageIndex,
  uploadingItineraryImageKey,
  onPackageImagesUpload,
  onSetPackageCover,
  onRemovePackageImage,
  onItineraryImageUpload,
}) {
  const updatePackage = (packageIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) =>
        index === packageIndex ? { ...pkg, ...patch } : pkg,
      ),
    }));
  };

  const updateTier = (packageIndex, tierIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          pricingTiers: pkg.pricingTiers.map((tier, currentTierIndex) =>
            currentTierIndex === tierIndex ? { ...tier, ...patch } : tier,
          ),
        };
      }),
    }));
  };

  const updateSession = (packageIndex, sessionIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          sessions: pkg.sessions.map((session, currentSessionIndex) =>
            currentSessionIndex === sessionIndex
              ? { ...session, ...patch }
              : session,
          ),
        };
      }),
    }));
  };

  const updateItinerary = (packageIndex, itineraryIndex, patch) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          itinerary: pkg.itinerary.map((item, currentItineraryIndex) =>
            currentItineraryIndex === itineraryIndex
              ? { ...item, ...patch }
              : item,
          ),
        };
      }),
    }));
  };

  const addItineraryStep = (packageIndex, dayNumber) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const currentDayMaxOrder = Math.max(
          ...pkg.itinerary
            .filter((item) => item.dayNumber === dayNumber)
            .map((item) => item.displayOrder || 0),
          -1,
        );
        return {
          ...pkg,
          itinerary: [
            ...pkg.itinerary,
            {
              dayNumber,
              displayOrder: currentDayMaxOrder + 1,
              title: "",
              description: "",
              startTime: "",
              endTime: "",
              location: "",
              activityType: "visit",
              imageUrl: "",
            },
          ],
        };
      }),
    }));
  };

  const addItineraryDay = (packageIndex) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const maxDay = Math.max(...pkg.itinerary.map((item) => item.dayNumber || 0), 0);
        const newDay = maxDay + 1;
        return {
          ...pkg,
          itinerary: [
            ...pkg.itinerary,
            {
              dayNumber: newDay,
              displayOrder: 0,
              title: "",
              description: "",
              startTime: "",
              endTime: "",
              location: "",
              activityType: "visit",
              imageUrl: "",
            },
          ],
        };
      }),
    }));
  };

  const removeItineraryStep = (packageIndex, itineraryIndex) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const remaining = pkg.itinerary.filter(
          (_, currentIndex) => currentIndex !== itineraryIndex,
        );
        return {
          ...pkg,
          itinerary: remaining.length ? remaining : pkg.itinerary,
        };
      }),
    }));
  };

  const updateSessionCustomPrice = (packageIndex, sessionIndex, tierKey, value) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          sessions: pkg.sessions.map((session, currentSessionIndex) => {
            if (currentSessionIndex !== sessionIndex) return session;
            const overrides = [...(session.pricingOverrides || [])];
            const existingIndex = overrides.findIndex(
              (item) => item.tierKey === tierKey,
            );
            const patch = { tierKey, customPrice: value || "" };
            if (existingIndex >= 0) {
              overrides[existingIndex] = { ...overrides[existingIndex], ...patch };
            } else {
              overrides.push(patch);
            }
            return { ...session, pricingOverrides: overrides };
          }),
        };
      }),
    }));
  };

  const addSession = (packageIndex) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          sessions: [
            ...pkg.sessions,
            {
              startDate: "",
              startTime: "08:00",
              runCount: "1",
              availableSlots: String(pkg.maxParticipants || 10),
              pricingOverrides: [],
            },
          ],
        };
      }),
    }));
  };

  const removeSession = (packageIndex, sessionIndex) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const remaining = pkg.sessions.filter(
          (_, currentIndex) => currentIndex !== sessionIndex,
        );
        return {
          ...pkg,
          sessions: remaining.length ? remaining : pkg.sessions,
        };
      }),
    }));
  };

  return (
    <div className="space-y-5">
      {editData.packages.map((pkg, packageIndex) => (
        <div
          key={pkg.id || packageIndex}
          className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FormField
              label="Tên gói"
              value={pkg.name}
              onChange={(value) => updatePackage(packageIndex, { name: value })}
            />
            <FormField
              label="Khách tối thiểu"
              type="number"
              min="1"
              value={pkg.minParticipants}
              onChange={(value) =>
                updatePackage(packageIndex, { minParticipants: value })
              }
            />
            <FormField
              label="Khách tối đa"
              type="number"
              min="1"
              value={pkg.maxParticipants}
              onChange={(value) =>
                updatePackage(packageIndex, { maxParticipants: value })
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FormField
              label="Giờ cắt đặt"
              type="number"
              min="0"
              max="72"
              value={pkg.bookingCutoffHours}
              onChange={(value) =>
                updatePackage(packageIndex, { bookingCutoffHours: value })
              }
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ServiceLocationPicker
              label="Điểm đón"
              value={pkg.meetingPointLocation || { ...EMPTY_LOCATION }}
              destinations={destinations}
              onChange={(location) =>
                updatePackage(packageIndex, {
                  meetingPointLocation: location,
                  meetingPoint: location.address,
                })
              }
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                Chính sách hủy
              </label>
              <select
                value={pkg.cancellationPolicyType}
                onChange={(event) =>
                  updatePackage(packageIndex, {
                    cancellationPolicyType: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {CANCELLATION_POLICIES.map((policy) => (
                  <option key={policy.value} value={policy.value}>
                    {policy.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormTextarea
            label="Ghi chú chính sách"
            rows={2}
            value={pkg.cancellationPolicyDescription}
            onChange={(value) =>
              updatePackage(packageIndex, {
                cancellationPolicyDescription: value,
              })
            }
          />

          <div className="rounded-xl border border-[#d9e7f2] bg-[#f8fbfd] p-3 text-sm text-[#31526f]">
            {
              (
                CANCELLATION_POLICIES.find(
                  (p) => p.value === String(pkg.cancellationPolicyType),
                ) || CANCELLATION_POLICIES[1]
              ).summary
            }
          </div>

          {false && (
            <TourGalleryEditor
              images={pkg.images}
              uploading={uploadingPackageImageIndex === packageIndex}
              onUpload={(event) => onPackageImagesUpload(packageIndex, event)}
              onSetCover={(imageUrl) =>
                onSetPackageCover(packageIndex, imageUrl)
              }
              onRemoveImage={(imageUrl) =>
                onRemovePackageImage(packageIndex, imageUrl)
              }
            />
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <TagEditor
              label="Bao gồm"
              tags={pkg.includedItems}
              onChange={(includedItems) =>
                updatePackage(packageIndex, { includedItems })
              }
              placeholder="Ví dụ: Vé tham quan"
            />
            <TagEditor
              label="Không bao gồm"
              tags={pkg.excludedItems}
              onChange={(excludedItems) =>
                updatePackage(packageIndex, { excludedItems })
              }
              placeholder="Ví dụ: Chi tiêu cá nhân"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#5a6577]">Mức giá</p>
            <div className="space-y-3">
              {pkg.pricingTiers.map((tier, tierIndex) => (
                <div
                  key={tier.id || tierIndex}
                  className="grid gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-5"
                >
                  <div className="md:col-span-2">
                    <FormField
                      label="Tên mức giá"
                      value={tier.name}
                      onChange={(value) =>
                        updateTier(packageIndex, tierIndex, { name: value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      label="Giá"
                      type="number"
                      min="0"
                      value={tier.unitPrice}
                      onChange={(value) =>
                        updateTier(packageIndex, tierIndex, { unitPrice: value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#5a6577]">
              Lịch khởi hành
            </p>
            <div className="space-y-3">
              {pkg.sessions.map((session, sessionIndex) => (
                <div
                  key={session.id || sessionIndex}
                  className="space-y-3 rounded-xl border border-[#e8ecf0] bg-white p-3"
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FormField
                      label="Ngày bắt đầu"
                      type="date"
                      value={session.startDate}
                      onChange={(value) =>
                        updateSession(packageIndex, sessionIndex, {
                          startDate: value,
                        })
                      }
                    />
                    <FormField
                      label="Giờ bắt đầu"
                      type="time"
                      value={session.startTime}
                      onChange={(value) =>
                        updateSession(packageIndex, sessionIndex, {
                          startTime: value,
                        })
                      }
                    />
                    <FormField
                      label="Số lượt khởi hành"
                      type="number"
                      min="1"
                      value={session.runCount}
                      onChange={(value) =>
                        updateSession(packageIndex, sessionIndex, {
                          runCount: value,
                        })
                      }
                    />
                    <FormField
                      label="Số chỗ"
                      type="number"
                      min="1"
                      value={session.availableSlots}
                      onChange={(value) =>
                        updateSession(packageIndex, sessionIndex, {
                          availableSlots: value,
                        })
                      }
                    />
                  </div>
                  <details className="rounded-xl border border-[#e8ecf0] bg-[#fafcfd]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#1a2332]">
                      {"Giá theo lịch khởi hành"}
                    </summary>
                    <div className="space-y-3 border-t border-[#e8ecf0] px-4 py-4">
                      {pkg.pricingTiers.map((tier, tierIndex) => {
                        const overrideMap = new Map(
                          (session.pricingOverrides || []).map((item) => [item.tierKey, item]),
                        );
                        const override = overrideMap.get(tier.tempKey || tier.id);
                        return (
                          <div
                            key={tier.id || tier.tempKey || `tier-override-${tierIndex}`}
                            className="grid gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
                          >
                            <div>
                              <p className="text-sm font-medium text-[#1a2332]">
                                {tier.name || `Mức giá #${tierIndex + 1}`}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1 text-sm font-medium text-[#5a6577]">
                                {"Giá gói mặc định"}
                              </p>
                              <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] px-3 py-2 text-sm text-[#1a2332]">
                                {tier.unitPrice ? `${formatPrice(tier.unitPrice)}` : "—"}
                              </div>
                            </div>
                            <FormField
                              label={"Giá tùy chỉnh"}
                              value={override?.customPrice || ""}
                              onChange={(value) =>
                                updateSessionCustomPrice(packageIndex, sessionIndex, tier.tempKey || tier.id, value)
                              }
                              type="number"
                              min="0"
                              placeholder={"Bỏ trống để dùng giá gói"}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </details>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeSession(packageIndex, sessionIndex)}
                      disabled={pkg.sessions.length <= 1}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" /> Xóa lịch
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addSession(packageIndex)}
              className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              <Plus className="h-4 w-4" /> Thêm lịch khởi hành
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#5a6577]">
                Lịch trình theo ngày
              </p>
            </div>

            {/* Computed duration summary */}
            {(() => {
              const timeline = computePackageTimeline({ ...pkg, itinerary: pkg.itinerary });
              if (timeline.dayCount === 0) return null;
              return (
                <div className="mb-4 rounded-xl border border-[#d9e7f2] bg-[#f0f7fc] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-[#1a2332]">
                      {timeline.dayCount} ngày / {timeline.nights} đêm
                    </span>
                    {timeline.firstStartTime ? (
                      <span className="text-[#5a6577]">
                        Đón: {timeline.firstStartTime} (Ngày 1)
                      </span>
                    ) : null}
                    {timeline.lastEndTime ? (
                      <span className="text-[#5a6577]">
                        Kết thúc: {timeline.lastEndTime} (Ngày {timeline.dayCount})
                      </span>
                    ) : null}
                    {!timeline.isComplete ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        Chưa đủ giờ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Đã xác định thời gian
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Day-by-day itinerary */}
            {(() => {
              const dayNumbers = [...new Set((pkg.itinerary || []).map((item) => item.dayNumber || 1))].sort((a, b) => a - b);
              if (!dayNumbers.length) return null;

              return dayNumbers.map((dayNum) => {
                const dayActivities = (pkg.itinerary || [])
                  .filter((item) => (item.dayNumber || 1) === dayNum)
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                return (
                  <div key={dayNum} className="mb-4 rounded-xl border border-[#e8ecf0] bg-[#fafcfe] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="flex items-center gap-2 font-semibold text-[#1a2332]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                          {dayNum}
                        </span>
                        Ngày {dayNum}
                      </h5>
                    </div>

                    <div className="space-y-3">
                      {dayActivities.map((item) => {
                        const globalIndex = pkg.itinerary.indexOf(item);

                        return (
                          <div
                            key={item.id || globalIndex}
                            className="space-y-3 rounded-xl border border-[#e8ecf0] bg-white p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs text-[#5a6577]">
                                  {item.startTime || item.endTime ? (
                                    <span className="text-xs text-[#8d95a3]">
                                      {item.startTime || "--:--"} - {item.endTime || "--:--"}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItineraryStep(packageIndex, globalIndex)}
                                disabled={pkg.itinerary.length <= 1}
                                className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <FormField
                                label="Tiêu đề"
                                value={item.title}
                                onChange={(value) =>
                                  updateItinerary(packageIndex, globalIndex, { title: value })
                                }
                                placeholder="Đón từ khách sạn"
                                required
                              />
                              <FormField
                                label="Giờ bắt đầu"
                                type="time"
                                value={item.startTime}
                                onChange={(value) =>
                                  updateItinerary(packageIndex, globalIndex, { startTime: value })
                                }
                              />
                              <FormField
                                label="Giờ kết thúc"
                                type="time"
                                value={item.endTime}
                                onChange={(value) =>
                                  updateItinerary(packageIndex, globalIndex, { endTime: value })
                                }
                              />
                              <FormField
                                label="Địa điểm"
                                value={item.location}
                                onChange={(value) =>
                                  updateItinerary(packageIndex, globalIndex, { location: value })
                                }
                                placeholder="Sảnh khách sạn"
                              />
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                                  Loại hoạt động
                                </label>
                                <select
                                  value={item.activityType}
                                  onChange={(event) =>
                                    updateItinerary(packageIndex, globalIndex, { activityType: event.target.value })
                                  }
                                  className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                  {TOUR_ACTIVITY_TYPES.map((activity) => (
                                    <option key={activity.value} value={activity.value}>
                                      {activity.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <FormTextarea
                              label="Mô tả"
                              value={item.description}
                              onChange={(value) =>
                                updateItinerary(packageIndex, globalIndex, { description: value })
                              }
                              placeholder="Hoạt động này diễn ra như thế nào?"
                              rows={3}
                              required
                            />
                            <div>
                              <label className="mb-2 block text-sm font-medium text-[#5a6577]">
                                Hình ảnh
                              </label>
                              {item.imageUrl ? (
                                <div className="mb-3 flex items-center gap-3">
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="h-20 w-20 rounded-xl object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItinerary(packageIndex, globalIndex, { imageUrl: "" })
                                    }
                                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Xóa ảnh
                                  </button>
                                </div>
                              ) : null}
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 text-sm hover:bg-[#f9fafb]">
                                {uploadingItineraryImageKey === `${packageIndex}-${globalIndex}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Camera className="h-4 w-4" />
                                )}
                                {uploadingItineraryImageKey === `${packageIndex}-${globalIndex}`
                                  ? "Đang tải..."
                                  : "Tải ảnh"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => onItineraryImageUpload(packageIndex, globalIndex, event)}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => addItineraryStep(packageIndex, dayNum)}
                      className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      <Plus className="h-4 w-4" /> Thêm hoạt động cho ngày {dayNum}
                    </button>
                  </div>
                );
              });
            })()}

            {/* Estimated duration fallback when timing incomplete */}
            {(() => {
              const timeline = computePackageTimeline({ ...pkg, itinerary: pkg.itinerary });
              if (timeline.isComplete) return null;
              return (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Thông tin thời gian chưa đầy đủ
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        Thời lượng tour không thể tự động tính. Vui lòng thêm giờ cho hoạt động đầu tiên và cuối cùng, hoặc nhập thời lượng ước tính bên dưới.
                      </p>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="w-28">
                          <FormField
                            label="Giờ"
                            value={pkg.estimatedDurationMinutes ? String(Math.floor(Number(pkg.estimatedDurationMinutes) / 60)) : ""}
                            onChange={(value) => {
                              const hours = Number(value) || 0;
                              const mins = Number(pkg.estimatedDurationMinutes || 0) % 60;
                              updatePackage(packageIndex, { estimatedDurationMinutes: String(hours * 60 + mins) });
                            }}
                            type="number"
                            min="1"
                            placeholder="VD: 48"
                          />
                        </div>
                        <div className="w-28">
                          <FormField
                            label="Phút"
                            value={pkg.estimatedDurationMinutes ? String(Number(pkg.estimatedDurationMinutes) % 60) : ""}
                            onChange={(value) => {
                              const hours = Math.floor(Number(pkg.estimatedDurationMinutes || 0) / 60);
                              const mins = Number(value) || 0;
                              updatePackage(packageIndex, { estimatedDurationMinutes: String(hours * 60 + mins) });
                            }}
                            type="number"
                            min="0"
                            max="59"
                            placeholder="VD: 0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => addItineraryDay(packageIndex)}
              className="mt-2 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              <Plus className="h-4 w-4" /> Thêm ngày mới
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TourCompactDetails({
  service,
  images,
  tourPackages,
  reviews,
  canEdit,
  editingTab,
  saving,
  editData,
  setEditData,
  destinations,
  onEdit,
  onCancel,
  onSaveOverview,
  onSavePackages,
  onSaveImages,
  uploadingPackageImageIndex,
  uploadingItineraryImageKey,
  uploadingTourImages,
  onTourImagesUpload,
  onSetTourCover,
  onRemoveTourImage,
  onPackageImagesUpload,
  onSetPackageCover,
  onRemovePackageImage,
  onItineraryImageUpload,
}) {
  const descriptionLines = splitBulletLines(service.description);
  const coverImages = (images || [])
    .filter((image) => image?.imageUrl)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
        <TabHeader
          title="Tổng quan tour"
          editing={editingTab === "overview"}
          canEdit={canEdit}
          saving={saving}
          onEdit={() => onEdit("overview")}
          onCancel={onCancel}
          onSave={onSaveOverview}
        />
        {editingTab === "overview" ? (
          <TourOverviewEdit
            editData={editData}
            setEditData={setEditData}
            destinations={destinations}
          />
        ) : descriptionLines.length ? (
          <ul className="space-y-1 text-sm leading-6 text-[#5a6577]">
            {descriptionLines.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-[#5a6577]">Chưa có mô tả.</p>
        )}
      </div>

      <TourImagesSection
        images={coverImages}
        editing={editingTab === "images"}
        canEdit={canEdit}
        saving={saving}
        onEdit={() => (editingTab === "images" ? null : onEdit("images"))}
        onCancel={onCancel}
        onSave={onSaveImages || (() => {})}
        uploadingTourImages={uploadingTourImages}
        onTourImagesUpload={onTourImagesUpload}
        onSetTourCover={onSetTourCover}
        onRemoveTourImage={onRemoveTourImage}
      />

      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
        <TabHeader
          title="Chi tiết gói tour"
          editing={editingTab === "packages"}
          canEdit={canEdit}
          saving={saving}
          onEdit={() => onEdit("packages")}
          onCancel={onCancel}
          onSave={onSavePackages}
        />
        {editingTab === "packages" ? (
          <TourPackagesEdit
            editData={editData}
            setEditData={setEditData}
            destinations={destinations}
            uploadingPackageImageIndex={uploadingPackageImageIndex}
            uploadingItineraryImageKey={uploadingItineraryImageKey}
            onPackageImagesUpload={onPackageImagesUpload}
            onSetPackageCover={onSetPackageCover}
            onRemovePackageImage={onRemovePackageImage}
            onItineraryImageUpload={onItineraryImageUpload}
          />
        ) : (
          <TourPackagesTab packages={tourPackages} />
        )}
      </div>

      <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
        <ReviewsSection service={service} reviews={reviews} />
      </div>
    </div>
  );
}

function ItineraryTab({ itinerary }) {
  if (!itinerary?.length)
    return <p className="text-sm italic text-[#8d95a3]">Chưa có lịch trình.</p>;
  return (
    <div className="space-y-4">
      {itinerary.map((step, index) => (
        <div
          key={step.id || index}
          className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <p className="font-semibold text-[#1a2332]">
            Ngày {step.dayNumber || index + 1}: {step.title || step.activity}
          </p>
          {step.location ? (
            <p className="mt-1 text-sm text-[#5a6577]">{step.location}</p>
          ) : null}
          {step.description ? (
            <p className="mt-2 text-sm leading-6 text-[#5a6577]">
              {step.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SchedulesTab({ schedules }) {
  if (!schedules?.length)
    return (
      <p className="text-sm italic text-[#8d95a3]">Chưa có lịch khởi hành.</p>
    );
  return (
    <div className="space-y-4">
      {schedules.map((schedule, index) => (
        <div
          key={schedule.id || schedule.scheduleId || index}
          className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoItem label="Bắt đầu" value={formatDate(schedule.startDate)} />
            <InfoItem label="Kết thúc" value={formatDate(schedule.endDate)} />
            <InfoItem
              label="Slot còn"
              value={`${(schedule.availableSlots || 0) - (schedule.bookedSlots || 0)}/${schedule.availableSlots || 0}`}
            />
            <InfoItem
              label="Giá riêng"
              value={
                schedule.priceOverride != null
                  ? formatPrice(schedule.priceOverride)
                  : "—"
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PartnerServiceDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { serviceId, serviceType } = location.state || {};

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState({ items: [], totalCount: 0 });
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingTab, setEditingTab] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingOverview, setUploadingOverview] = useState(false);
  const [uploadingRoomIndex, setUploadingRoomIndex] = useState(null);
  const [uploadingPackageImageIndex, setUploadingPackageImageIndex] =
    useState(null);
  const [uploadingItineraryImageKey, setUploadingItineraryImageKey] =
    useState(null);
  const [uploadingTourImages, setUploadingTourImages] = useState(false);
  const [tourImages, setTourImages] = useState([]);

  const refreshService = async () => {
    const response = await serviceService.getOwnServiceDetail(serviceId);
    const data = getServiceData(response);
    setService(data);
    return data;
  };

  useEffect(() => {
    if (!serviceId) {
      setPageError("Không tìm thấy mã dịch vụ.");
      setLoading(false);
      return;
    }

    Promise.allSettled([
      serviceService.getOwnServiceDetail(serviceId),
      reviewService.getServiceReviews(serviceId, 1, 6, "newest"),
      serviceService.getDestinations(),
    ])
      .then(([serviceResult, reviewResult, destinationResult]) => {
        if (serviceResult.status === "fulfilled") {
          setService(getServiceData(serviceResult.value));
        } else {
          throw serviceResult.reason;
        }

        if (reviewResult.status === "fulfilled") {
          setReviews(
            getServiceData(reviewResult.value) || { items: [], totalCount: 0 },
          );
        }

        if (destinationResult.status === "fulfilled") {
          const data = getServiceData(destinationResult.value);
          setDestinations(
            Array.isArray(data) ? data : data?.items || data?.Items || [],
          );
        }
      })
      .catch((error) => setPageError(error.message || "Không thể tải dịch vụ."))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const svcType = service?.serviceType ?? serviceType;
  const typeInfo = SERVICE_TYPE[svcType] || SERVICE_TYPE[1];
  const isHomestay = svcType === 0;
  const homestay = service?.homestay || {};
  const rooms = useMemo(
    () => homestay.rooms || service?.rooms || [],
    [homestay.rooms, service?.rooms],
  );
  const tourPackages = useMemo(
    () =>
      service?.tourPackages?.length
        ? service.tourPackages
        : service?.tour
          ? [service.tour]
          : [],
    [service],
  );
  const images = useMemo(() => {
    const directImages = service?.images || service?.serviceImages || [];
    if (directImages.length || isHomestay) return directImages;

    const seen = new Set();
    return tourPackages
      .flatMap((pkg) => pkg.images || [])
      .filter((image) => {
        const url =
          typeof image === "string" ? image : image.imageUrl || image.url;
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      });
  }, [isHomestay, service, tourPackages]);
  const isInactive = service?.isActive === false && service?.approvalStatus === 1;
  const approvalStatusLabel =
    isInactive
      ? "Không hoạt động"
      : service?.hasPendingChanges
        ? "Chờ duyệt lại"
        : typeof service?.approvalStatus === "number"
          ? ["Chờ duyệt", "Đã duyệt", "Từ chối"][service.approvalStatus]
          : service?.approvalStatus;
  const canEdit = service?.approvalStatus !== 0 && !service?.hasPendingChanges && !isInactive;

  const descriptionLines = splitBulletLines(service?.description || "");
  const coverImages = (images || [])
    .filter((image) => image?.imageUrl)
    .slice(0, 8);

  const tabs = isHomestay
    ? [
        { id: "overview", label: "Tổng quan", icon: Home },
        { id: "rooms", label: "Loại phòng", icon: Bed },
        { id: "availability", label: "Lịch trống", icon: Calendar },
      ]
    : [
        { id: "overview", label: "Tổng quan tour", icon: Home },
        { id: "packages", label: "Chi tiết gói tour", icon: List },
      ];

  const startEdit = (tab) => {
    if (!canEdit) {
      toast.info(
        "Dịch vụ đang chờ duyệt hoặc có thay đổi chờ duyệt nên chưa thể chỉnh sửa.",
      );
      return;
    }

    if (tab === "overview") {
      setEditData({
        name: service.name || "",
        description: service.description || "",
        thumbnailUrl: service.thumbnailUrl || "",
        location: buildLocation(service),
        cancellationPolicyType: String(service.cancellationPolicyType ?? 1),
        cancellationPolicyNotes: service.cancellationPolicyDescription || "",
        amenities: normalizeAmenityNames(homestay.amenities || []),
        checkInTime: homestay.checkInTime
          ? String(homestay.checkInTime).slice(0, 5)
          : "14:00",
        checkOutTime: homestay.checkOutTime
          ? String(homestay.checkOutTime).slice(0, 5)
          : "12:00",
        minNights: String(homestay.minNights ?? 1),
        maxNights: String(homestay.maxNights ?? 30),
      });
    }

    if (tab === "rooms") {
      setEditData({
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name || "",
          description: room.description || "",
          bedType: room.bedType || "Queen",
          bedCount: room.bedCount || 1,
          maxGuests: room.maxGuests || 1,
          quantity: room.quantity || 1,
          basePrice: room.basePrice || 0,
          weekendPrice: room.weekendPrice || room.basePrice || 0,
          holidayPrice:
            room.holidayPrice || room.weekendPrice || room.basePrice || 0,
          images: getRoomImages(room),
          amenities: normalizeAmenityNames(room.amenities || []),
        })),
      });
    }

    if (tab === "availability") {
      setEditData({
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name || "",
          quantity: room.quantity || 1,
          availability: room.availability || [],
          availabilityWindows: buildAvailabilityWindows(room),
        })),
      });
    }

    if (!isHomestay && tab === "overview") {
      setEditData({
        name: service.name || "",
        location: buildLocation(service),
        descriptionBullets: splitBulletLines(service.description || ""),
      });
    }

    if (tab === "images") {
      setEditData({
        images: (images || []).map((image) => ({
          imageUrl:
            typeof image === "string" ? image : image.imageUrl || image.url,
          displayOrder: image.displayOrder || 0,
          isCover: Boolean(image.isCover),
        })),
      });
      setTourImages(images || []);
    }

    if (!isHomestay && tab === "packages") {
      setEditData({
        packages: tourPackages.map((pkg) => {
          const hasLocationFields =
            pkg.meetingPoint &&
            !pkg.meetingPointLocation?.address;
          const meetingPointLocation = hasLocationFields
            ? {
                ...EMPTY_LOCATION,
                address: pkg.meetingPoint || "",
              }
            : pkg.meetingPointLocation
              ? { ...EMPTY_LOCATION, ...pkg.meetingPointLocation }
              : { ...EMPTY_LOCATION };
          return {
            id: pkg.id,
            name: pkg.name || "",
            minParticipants: String(pkg.minParticipants || 1),
            maxParticipants: String(pkg.maxParticipants || 1),
            bookingCutoffHours: String(pkg.bookingCutoffHours ?? 24),
            meetingPoint: pkg.meetingPoint || "",
            meetingPointLocation,
            cancellationPolicyType: String(pkg.cancellationPolicyType ?? 1),
            cancellationPolicyDescription:
              pkg.cancellationPolicyDescription || "",
            includedItems: [...(pkg.includedItems || [])],
            excludedItems: [...(pkg.excludedItems || [])],
            images: (pkg.images || []).map((image) => ({
              imageUrl: image.imageUrl,
              displayOrder: image.displayOrder || 0,
              isCover: Boolean(image.isCover),
            })),
            pricingTiers: (pkg.pricingTiers || []).map((tier) => ({
              id: tier.id,
              name: tier.name || "",
              description: tier.description || "",
              unitPrice: String(tier.unitPrice || 0),
            })),
            sessions: (pkg.schedules || []).map((session) => ({
              id: session.id,
              startDate: normalizeDateKey(session.startDate),
              startTime: session.startDate
                ? new Date(session.startDate).toISOString().slice(11, 16)
                : "08:00",
              runCount: String(session.runCount || 1),
              availableSlots: String(session.availableSlots || 0),
              pricingOverrides: (session.pricingOverrides || []).map(
                (override) => ({
                  tierKey: override.tourPricingTierId || "",
                  tierDisplayOrder: override.tierDisplayOrder || 0,
                  customPrice: String(override.customPrice || ""),
                }),
              ),
            })),
            itinerary: (pkg.itineraries || []).map((item) => ({
              id: item.id,
              dayNumber: item.dayNumber || 1,
              displayOrder: item.displayOrder || 0,
              title: item.title || "",
              description: item.description || "",
              startTime: item.startTime ? String(item.startTime).slice(0, 5) : "",
              endTime: item.endTime ? String(item.endTime).slice(0, 5) : "",
              location: item.location || "",
              activityType: item.activityType || "visit",
              imageUrl: item.imageUrl || "",
            })),
            estimatedDurationMinutes: String(pkg.estimatedDurationMinutes || ""),
          };
        }),
      });
    }

    setEditingTab(tab);
  };

  const cancelEdit = () => {
    setEditingTab(null);
    setEditData({});
    setTourImages([]);
  };

  const saveOverview = async () => {
    setSaving(true);
    try {
      const locationValue = editData.location || EMPTY_LOCATION;
      await serviceService.updatePartnerService(serviceId, {
        name: editData.name || null,
        description: editData.description || null,
        thumbnailUrl: editData.thumbnailUrl || null,
        destinationId: locationValue.destinationId || null,
        address: locationValue.address || null,
        latitude: locationValue.latitude
          ? Number(locationValue.latitude)
          : null,
        longitude: locationValue.longitude
          ? Number(locationValue.longitude)
          : null,
        cancellationPolicyType: Number(editData.cancellationPolicyType),
        cancellationPolicyDescription: editData.cancellationPolicyNotes || null,
        amenities: toAmenityPayload(
          editData.amenities,
          HOMESTAY_AMENITY_OPTIONS,
        ),
        checkInTime: editData.checkInTime
          ? `${editData.checkInTime}:00`
          : null,
        checkOutTime: editData.checkOutTime
          ? `${editData.checkOutTime}:00`
          : null,
        minNights: editData.minNights
          ? Number(editData.minNights)
          : null,
        maxNights: editData.maxNights
          ? Number(editData.maxNights)
          : null,
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Tổng quan thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Tổng quan thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveRooms = async () => {
    setSaving(true);
    try {
      await serviceService.updatePartnerService(serviceId, {
        rooms: editData.rooms.map((room) => {
          const imagesPayload = imagePayload(room.images || []);
          const cover =
            imagesPayload.find((image) => image.isCover) || imagesPayload[0];
          return {
            id: room.id,
            name: room.name,
            description: room.description || null,
            bedType: room.bedType || null,
            bedCount: Number(room.bedCount) || 1,
            maxGuests: Number(room.maxGuests) || 1,
            quantity: Number(room.quantity) || 1,
            basePrice: Number(room.basePrice) || 0,
            weekendPrice:
              Number(room.weekendPrice) || Number(room.basePrice) || 0,
            holidayPrice:
              Number(room.holidayPrice) ||
              Number(room.weekendPrice) ||
              Number(room.basePrice) ||
              0,
            imageUrl: cover?.imageUrl || null,
            images: imagesPayload,
            amenities: toAmenityPayload(room.amenities, ROOM_AMENITY_OPTIONS),
          };
        }),
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Loại phòng thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Loại phòng thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    const validationError = validateAvailabilityRooms(editData.rooms);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await serviceService.updatePartnerService(serviceId, {
        availabilityWindows: editData.rooms.flatMap((room) =>
          (room.availabilityWindows || [])
            .filter((window) => window.startDate && window.endDate)
            .map((window) => ({
              roomId: room.id,
              startDate: window.startDate,
              endDate: window.endDate,
              availableCount: window.isBlocked
                ? 0
                : Number(window.availableCount) || 0,
              isBlocked: Boolean(window.isBlocked),
            })),
        ),
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Lịch trống thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Lịch trống thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveTourOverview = async () => {
    setSaving(true);
    try {
      const locationValue = editData.location || EMPTY_LOCATION;
      await serviceService.updatePartnerService(serviceId, {
        name: editData.name || null,
        description: (editData.descriptionBullets || [])
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `- ${item}`)
          .join("\n"),
        destinationId: locationValue.destinationId || null,
        address: locationValue.address || null,
        latitude: locationValue.latitude
          ? Number(locationValue.latitude)
          : null,
        longitude: locationValue.longitude
          ? Number(locationValue.longitude)
          : null,
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Tổng quan tour thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Tổng quan tour thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveTourImages = async () => {
    setSaving(true);
    try {
      const imagesPayload = imagePayload(tourImages);
      await serviceService.updatePartnerService(serviceId, {
        images: imagesPayload,
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Hình ảnh tour thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Hình ảnh tour thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveTourPackages = async () => {
    setSaving(true);
    try {
      await serviceService.updatePartnerService(serviceId, {
        tourPackages: editData.packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          duration: getPackageDurationText(pkg),
          maxParticipants: Number(pkg.maxParticipants) || 1,
          minParticipants: Number(pkg.minParticipants) || 1,
          bookingCutoffHours: Number(pkg.bookingCutoffHours) || 24,
          meetingPoint: pkg.meetingPoint || null,
          cancellationPolicyType: Number(pkg.cancellationPolicyType) || 0,
          cancellationPolicyDescription:
            pkg.cancellationPolicyDescription || null,
          includes: (pkg.includedItems || []).filter(Boolean),
          excludes: (pkg.excludedItems || []).filter(Boolean),
          images: (pkg.images || []).map((img, imgIndex) => ({
            imageUrl: img.imageUrl,
            displayOrder: img.displayOrder ?? imgIndex,
            isCover: Boolean(img.isCover),
          })),
          pricingTiers: (pkg.pricingTiers || []).map((tier, tierIndex) => ({
            id: tier.id,
            name: tier.name,
            description: tier.description || null,
            unitPrice: Number(tier.unitPrice) || 0,
            displayOrder: tierIndex,
          })),
          sessions: (pkg.sessions || []).map((session) => {
            const range = calculateSessionRange(
              session.startDate,
              session.startTime || "08:00",
              getPackageDurationMinutes(pkg),
            );
            return {
              id: session.id,
              startDate: `${session.startDate}T${session.startTime || "08:00"}:00`,
              endDate: `${range.endDate || session.startDate}T${range.endTime || "17:00"}:00`,
              runCount: Number(session.runCount) || 1,
              availableSlots: Number(session.availableSlots) || 0,
              priceOverride: null,
              pricingOverrides: (session.pricingOverrides || [])
                .filter((override) => override.customPrice !== "" && override.customPrice != null)
                .map((override, index) => ({
                  tierDisplayOrder: override.tierDisplayOrder ?? index,
                  customPrice: Number(override.customPrice) || 0,
                })),
            };
          }),
          itinerary: (pkg.itinerary || []).map((item, index) => ({
            id: item.id,
            dayNumber: item.dayNumber || index + 1,
            displayOrder: item.displayOrder ?? index,
            title: item.title,
            description: item.description,
            startTime: item.startTime ? `${item.startTime}:00` : null,
            endTime: item.endTime ? `${item.endTime}:00` : null,
            location: item.location || null,
            activityType: item.activityType || null,
            imageUrl: item.imageUrl || null,
          })),
        })),
      });
      await refreshService();
      cancelEdit();
      toast.success("Chỉnh sửa Gói tour thành công");
    } catch (error) {
      toast.error(error.message || "Chỉnh sửa Gói tour thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleOverviewImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingOverview(true);
    try {
      const response = await uploadService.uploadImage(file, "vns/services");
      const url = response?.data?.url || response?.url;
      if (url) setEditData((previous) => ({ ...previous, thumbnailUrl: url }));
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh homestay");
    } finally {
      setUploadingOverview(false);
      event.target.value = "";
    }
  };

  const handleRoomImagesUpload = async (roomIndex, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingRoomIndex(roomIndex);
    try {
      const response = await uploadService.uploadImages(files, "vns/rooms");
      const urls = response?.data?.urls || response?.urls || [];
      setEditData((previous) => ({
        ...previous,
        rooms: previous.rooms.map((room, index) => {
          if (index !== roomIndex) return room;
          const existingUrls = room.images.map((image) => image.imageUrl);
          const nextUrls = [...existingUrls, ...urls];
          const coverUrl =
            room.images.find((image) => image.isCover)?.imageUrl ||
            nextUrls[0] ||
            "";
          return {
            ...room,
            images: nextUrls.map((imageUrl, imageIndex) => ({
              imageUrl,
              displayOrder: imageIndex,
              isCover: imageUrl === coverUrl,
            })),
          };
        }),
      }));
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh phòng");
    } finally {
      setUploadingRoomIndex(null);
      event.target.value = "";
    }
  };

  const setRoomCover = (roomIndex, imageUrl) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) =>
        index === roomIndex
          ? {
              ...room,
              images: room.images.map((image) => ({
                ...image,
                isCover: image.imageUrl === imageUrl,
              })),
            }
          : room,
      ),
    }));
  };

  const removeRoomImage = (roomIndex, imageUrl) => {
    setEditData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, index) => {
        if (index !== roomIndex) return room;
        const remaining = room.images.filter(
          (image) => image.imageUrl !== imageUrl,
        );
        const hasCover = remaining.some((image) => image.isCover);
        return {
          ...room,
          images: remaining.map((image, imageIndex) => ({
            ...image,
            displayOrder: imageIndex,
            isCover: hasCover ? image.isCover : imageIndex === 0,
          })),
        };
      }),
    }));
  };

  const handlePackageImagesUpload = async (packageIndex, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingPackageImageIndex(packageIndex);
    try {
      const response = await uploadService.uploadImages(files, "vns/tours");
      const urls = response?.data?.urls || response?.urls || [];
      setEditData((previous) => ({
        ...previous,
        packages: previous.packages.map((pkg, index) => {
          if (index !== packageIndex) return pkg;
          const existingUrls = pkg.images.map((image) => image.imageUrl);
          const nextUrls = [...existingUrls, ...urls];
          const coverUrl =
            pkg.images.find((image) => image.isCover)?.imageUrl ||
            nextUrls[0] ||
            "";
          return {
            ...pkg,
            images: nextUrls.map((imageUrl, imageIndex) => ({
              imageUrl,
              displayOrder: imageIndex,
              isCover: imageUrl === coverUrl,
            })),
          };
        }),
      }));
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh gói tour");
    } finally {
      setUploadingPackageImageIndex(null);
      event.target.value = "";
    }
  };

  const setPackageCover = (packageIndex, imageUrl) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) =>
        index === packageIndex
          ? {
              ...pkg,
              images: pkg.images.map((image) => ({
                ...image,
                isCover: image.imageUrl === imageUrl,
              })),
            }
          : pkg,
      ),
    }));
  };

  const removePackageImage = (packageIndex, imageUrl) => {
    setEditData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const remaining = pkg.images.filter(
          (image) => image.imageUrl !== imageUrl,
        );
        const hasCover = remaining.some((image) => image.isCover);
        return {
          ...pkg,
          images: remaining.map((image, imageIndex) => ({
            ...image,
            displayOrder: imageIndex,
            isCover: hasCover ? image.isCover : imageIndex === 0,
          })),
        };
      }),
    }));
  };

  const handleTourImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingTourImages(true);
    try {
      const response = await uploadService.uploadImages(files, "vns/tours");
      const urls = response?.data?.urls || response?.urls || [];
      const existingUrls = tourImages.map((image) =>
        typeof image === "string" ? image : image.imageUrl || image.url,
      );
      const nextUrls = [...existingUrls, ...urls];
      const coverUrl =
        tourImages.find((image) => image.isCover)?.imageUrl ||
        nextUrls[0] ||
        "";
      const updated = nextUrls.map((imageUrl, imageIndex) => ({
        imageUrl,
        displayOrder: imageIndex,
        isCover: imageUrl === coverUrl,
      }));
      setTourImages(updated);
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh tour");
    } finally {
      setUploadingTourImages(false);
      event.target.value = "";
    }
  };

  const setTourCover = (imageUrl) => {
    setTourImages((prev) =>
      prev.map((image) => ({
        ...image,
        isCover: image.imageUrl === imageUrl,
      })),
    );
  };

  const removeTourImage = (imageUrl) => {
    setTourImages((prev) => {
      const remaining = prev.filter((image) => image.imageUrl !== imageUrl);
      const hasCover = remaining.some((image) => image.isCover);
      return remaining.map((image, imageIndex) => ({
        ...image,
        displayOrder: imageIndex,
        isCover: hasCover ? image.isCover : imageIndex === 0,
      }));
    });
  };

  const handleItineraryImageUpload = async (
    packageIndex,
    itineraryIndex,
    event,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingItineraryImageKey(`${packageIndex}-${itineraryIndex}`);
    try {
      const response = await uploadService.uploadImage(file, "vns/tours");
      const url = response?.data?.url || response?.url;
      if (!url) throw new Error("Không có đường dẫn ảnh được trả về.");

      setEditData((previous) => ({
        ...previous,
        packages: previous.packages.map((pkg, index) => {
          if (index !== packageIndex) return pkg;
          return {
            ...pkg,
            itinerary: pkg.itinerary.map((item, currentIndex) =>
              currentIndex === itineraryIndex
                ? { ...item, imageUrl: url }
                : item,
            ),
          };
        }),
      }));
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh hoạt động");
    } finally {
      setUploadingItineraryImageKey(null);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (pageError || !service) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-red-600">
            {pageError || "Không tìm thấy dịch vụ."}
          </p>
          <button
            onClick={() => navigate("/PartnerService")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <button
          onClick={() => navigate("/PartnerService")}
          className="flex items-center gap-2 text-sm text-[#5a6577] hover:text-[#1a2332]"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại dịch vụ
        </button>

        <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="md:w-72">
              {service.thumbnailUrl || images.length ? (
                <img
                  src={
                    service.thumbnailUrl ||
                    (typeof images[0] === "string"
                      ? images[0]
                      : images[0]?.imageUrl)
                  }
                  alt={service.name}
                  className="h-48 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[#dbe4ea] bg-[#f9fafb] text-sm text-[#8d95a3]">
                  Chưa có ảnh
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {typeInfo.label}
                </span>
                {approvalStatusLabel ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isInactive
                        ? "bg-red-50 text-red-700"
                        : service.hasPendingChanges || service.approvalStatus === 0
                          ? "bg-amber-50 text-amber-700"
                          : service.approvalStatus === 2
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                    }`}
                  >
                    {approvalStatusLabel}
                  </span>
                ) : null}
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">
                {service.name || service.title}
              </h1>
              {service.destinationName || service.address ? (
                <p className="mt-2 flex items-start gap-1 text-sm text-[#5a6577]">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    {service.destinationName}
                    {service.address ? ` - ${service.address}` : ""}
                  </span>
                </p>
              ) : null}
              {service.rejectionReason ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">Lý do từ chối</p>
                  <p className="mt-1">{service.rejectionReason}</p>
                </div>
              ) : null}
              {!canEdit ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Dịch vụ đang chờ duyệt hoặc có thay đổi chờ duyệt nên chưa thể
                  chỉnh sửa.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {isHomestay ? (
          <div className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white">
            <div className="border-b border-[#e8ecf0] px-5">
              <nav className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (editingTab && editingTab !== tab.id) cancelEdit();
                      }}
                      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-[#5a6577] hover:text-[#1a2332]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-5">
              {activeTab === "overview" && (
                <>
                  <TabHeader
                    title="Tổng quan"
                    editing={editingTab === "overview"}
                    canEdit={canEdit}
                    saving={saving}
                    onEdit={() => startEdit("overview")}
                    onCancel={cancelEdit}
                    onSave={saveOverview}
                  />
                  {editingTab === "overview" ? (
                    <OverviewEdit
                      editData={editData}
                      setEditData={setEditData}
                      destinations={destinations}
                      onUpload={handleOverviewImageUpload}
                      uploading={uploadingOverview}
                    />
                  ) : (
                    <OverviewDisplay
                      service={service}
                      homestay={homestay}
                      images={images}
                      reviews={reviews}
                      isHomestay={isHomestay}
                    />
                  )}
                </>
              )}

              {activeTab === "rooms" && (
                <>
                  <TabHeader
                    title="Loại phòng"
                    editing={editingTab === "rooms"}
                    canEdit={canEdit}
                    saving={saving}
                    onEdit={() => startEdit("rooms")}
                    onCancel={cancelEdit}
                    onSave={saveRooms}
                  />
                  {editingTab === "rooms" ? (
                    <RoomsEdit
                      editData={editData}
                      setEditData={setEditData}
                      onRoomImagesUpload={handleRoomImagesUpload}
                      onSetRoomCover={setRoomCover}
                      onRemoveRoomImage={removeRoomImage}
                      uploadingRoomIndex={uploadingRoomIndex}
                    />
                  ) : (
                    <RoomsDisplay rooms={rooms} />
                  )}
                </>
              )}

              {activeTab === "availability" && (
                <>
                  <TabHeader
                    title="Lịch trống"
                    editing={editingTab === "availability"}
                    canEdit={canEdit}
                    saving={saving}
                    onEdit={() => startEdit("availability")}
                    onCancel={cancelEdit}
                    onSave={saveAvailability}
                  />
                  {editingTab === "availability" ? (
                    <AvailabilityEdit
                      editData={editData}
                      setEditData={setEditData}
                    />
                  ) : (
                    <AvailabilityDisplay rooms={rooms} />
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#e8ecf0] bg-white">
            <div className="border-b border-[#e8ecf0] px-5">
              <nav className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (editingTab && editingTab !== tab.id) cancelEdit();
                      }}
                      className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-[#5a6577] hover:text-[#1a2332]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-5">
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
                    <TabHeader
                      title="Tổng quan tour"
                      editing={editingTab === "overview"}
                      canEdit={canEdit}
                      saving={saving}
                      onEdit={() => startEdit("overview")}
                      onCancel={cancelEdit}
                      onSave={saveTourOverview}
                    />
                    {editingTab === "overview" ? (
                      <TourOverviewEdit
                        editData={editData}
                        setEditData={setEditData}
                        destinations={destinations}
                      />
                    ) : descriptionLines.length ? (
                      <ul className="space-y-1 text-sm leading-6 text-[#5a6577]">
                        {descriptionLines.map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-6 text-[#5a6577]">
                        Chưa có mô tả.
                      </p>
                    )}
                  </div>

                  <TourImagesSection
                    images={coverImages}
                    editing={editingTab === "images"}
                    canEdit={canEdit}
                    saving={saving}
                    onEdit={() =>
                      editingTab === "images" ? null : startEdit("images")
                    }
                    onCancel={cancelEdit}
                    onSave={saveTourImages || (() => {})}
                    uploadingTourImages={uploadingTourImages}
                    onTourImagesUpload={handleTourImagesUpload}
                    onSetTourCover={setTourCover}
                    onRemoveTourImage={removeTourImage}
                  />

                  <div className="rounded-xl border border-[#e8ecf0] bg-white p-5">
                    <ReviewsSection service={service} reviews={reviews} />
                  </div>
                </div>
              )}

              {activeTab === "packages" && (
                <>
                  <TabHeader
                    title="Chi tiết gói tour"
                    editing={editingTab === "packages"}
                    canEdit={canEdit}
                    saving={saving}
                    onEdit={() => startEdit("packages")}
                    onCancel={cancelEdit}
                    onSave={saveTourPackages}
                  />
                  {editingTab === "packages" ? (
                    <TourPackagesEdit
                      editData={editData}
                      setEditData={setEditData}
                      destinations={destinations}
                      uploadingPackageImageIndex={uploadingPackageImageIndex}
                      uploadingItineraryImageKey={uploadingItineraryImageKey}
                      onPackageImagesUpload={handlePackageImagesUpload}
                      onSetPackageCover={setPackageCover}
                      onRemovePackageImage={removePackageImage}
                      onItineraryImageUpload={handleItineraryImageUpload}
                    />
                  ) : (
                    <TourPackagesTab packages={tourPackages} />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerServiceDetails;
