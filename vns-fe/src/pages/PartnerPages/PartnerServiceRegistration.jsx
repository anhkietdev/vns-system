import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bed,
  Camera,
  X,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Compass,
  Copy,
  FileText,
  Home,
  List,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ServiceLocationPicker from "../../components/ServiceLocationPicker";
import { useToast } from "../../feedback/FeedbackProvider";
import { serviceService } from "../../services/serviceService";
import { uploadService } from "../../services/uploadService";

const HOMESTAY_STEPS = [
  { id: 1, title: "Cơ bản", icon: Home },
  { id: 2, title: "Phòng", icon: Bed },
  { id: 3, title: "Lịch trống", icon: Clock },
  { id: 4, title: "Xem lại", icon: CheckCircle },
];

const TOUR_STEPS = [
  { id: 1, title: "Thông tin cơ bản", icon: Compass },
  { id: 2, title: "Gói", icon: List },
  { id: 3, title: "Lịch", icon: Clock },
  { id: 4, title: "Xem lại", icon: CheckCircle },
];

const TOUR_TYPES = [
  { value: "0", label: "Văn hóa" },
  { value: "1", label: "Ẩm thực" },
  { value: "2", label: "Mạo hiểm" },
  { value: "3", label: "Thiên nhiên" },
  { value: "4", label: "Thành phố" },
];

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

const TOUR_ACTIVITY_TYPES = [
  { value: "transport", label: "Di chuyển", icon: Compass },
  { value: "visit", label: "Tham quan", icon: MapPin },
  { value: "meal", label: "Ăn uống", icon: Clock },
  { value: "pickup", label: "Đón khách", icon: ArrowRight },
  { value: "dropoff", label: "Trả khách", icon: ArrowLeft },
  { value: "free_time", label: "Thời gian tự do", icon: CalendarDays },
];

const TOUR_PRICING_MODE_OPTIONS = [
  { value: "0", label: "Một giá chung" },
  { value: "1", label: "Theo đối tượng khách" },
  { value: "2", label: "Theo quy mô nhóm" },
];

const TOUR_TIER_TYPE_OPTIONS = [
  { value: "0", label: "Chuẩn" },
  { value: "1", label: "Người lớn" },
  { value: "2", label: "Trẻ em" },
  { value: "3", label: "Em bé" },
  { value: "4", label: "Người cao tuổi" },
  { value: "5", label: "Khung nhóm" },
];

const BED_TYPE_OPTIONS = [
  { value: "Twin", label: "Twin" },
  { value: "Twin XL", label: "Twin XL" },
  { value: "Single", label: "Giường đơn" },
  { value: "Small Double", label: "Giường nhỏ đôi" },
  { value: "Double", label: "Giường đôi" },
  { value: "Queen", label: "Queen" },
  { value: "King", label: "King" },
  { value: "California King", label: "California King" },
  { value: "Bunk Bed", label: "Giường tầng" },
  { value: "Sofa Bed", label: "Giường sofa" },
  { value: "Futon", label: "Futon" },
  { value: "Floor Mattress", label: "Nệm trải sàn" },
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

const EMPTY_LOCATION = {
  address: "",
  latitude: "",
  longitude: "",
  destinationId: "",
  destinationName: "",
  destinationDistanceKm: null,
};

const MIN_ROOM_PRICE = 100000;
const MAX_ROOM_PRICE = 20000000;
const MAX_BULK_TOUR_SESSIONS = 120;

function getVietnamDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseCalendarDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString)
    .split("-")
    .map((value) => Number(value));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatCalendarDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysToDateString(dateString, days) {
  const date = parseCalendarDate(dateString);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return formatCalendarDateKey(date);
}

function toCalendarDateKey(date) {
  return formatCalendarDateKey(date);
}

function clampDateString(dateString, maxDateString) {
  return dateString > maxDateString ? maxDateString : dateString;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function validateRoomPricing(room, roomIndex) {
  const basePrice = Number(room.basePrice);
  const weekendPrice = Number(room.weekendPrice || room.basePrice);
  const holidayPrice = Number(
    room.holidayPrice || room.weekendPrice || room.basePrice,
  );

  if (
    !Number.isFinite(basePrice) ||
    basePrice < MIN_ROOM_PRICE ||
    basePrice > MAX_ROOM_PRICE
  ) {
    return `Phòng #${roomIndex + 1} giá cơ bản phải từ ${formatCurrency(MIN_ROOM_PRICE)}đ đến ${formatCurrency(MAX_ROOM_PRICE)}đ.`;
  }
  if (
    !Number.isFinite(weekendPrice) ||
    weekendPrice < MIN_ROOM_PRICE ||
    weekendPrice > MAX_ROOM_PRICE
  ) {
    return `Phòng #${roomIndex + 1} giá cuối tuần phải từ ${formatCurrency(MIN_ROOM_PRICE)}đ đến ${formatCurrency(MAX_ROOM_PRICE)}đ.`;
  }
  if (
    !Number.isFinite(holidayPrice) ||
    holidayPrice < MIN_ROOM_PRICE ||
    holidayPrice > MAX_ROOM_PRICE
  ) {
    return `Phòng #${roomIndex + 1} giá ngày lễ phải từ ${formatCurrency(MIN_ROOM_PRICE)}đ đến ${formatCurrency(MAX_ROOM_PRICE)}đ.`;
  }
  if (weekendPrice < basePrice) {
    return `Phòng #${roomIndex + 1} giá cuối tuần không thể thấp hơn giá cơ bản.`;
  }
  if (holidayPrice < weekendPrice) {
    return `Phòng #${roomIndex + 1} giá ngày lễ không thể thấp hơn giá cuối tuần.`;
  }
  return "";
}

function buildEmptyRoom() {
  return {
    roomName: "",
    roomDescription: "",
    bedType: "Queen",
    bedCount: 1,
    maxOccupancy: 2,
    numberOfRooms: 1,
    basePrice: "",
    weekendPrice: "",
    holidayPrice: "",
    images: [],
    coverImageUrl: "",
    amenities: [],
    availabilityWindows: [buildEmptyAvailabilityWindow()],
  };
}

function buildEmptyAvailabilityWindow() {
  return {
    startDate: "",
    endDate: "",
    availableCount: "",
  };
}

function _buildEmptySchedule() {
  return {
    tourDate: "",
    endDate: "",
    startTime: "08:00",
    endTime: "17:00",
    availableSlots: "20",
    meetingPoint: "",
  };
}

function buildEmptyTourPricingTier() {
  return {
    tempKey: buildTempId("tour-tier"),
    name: "",
    unitPrice: "",
  };
}

function normalizeTourPricingTier(tier = {}) {
  return {
    tempKey: tier.tempKey || buildTempId("tour-tier"),
    name: tier.name || "",
    unitPrice:
      tier.unitPrice === undefined || tier.unitPrice === null
        ? ""
        : String(tier.unitPrice),
  };
}

function buildTempId(prefix = "item") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSessionKey(session) {
  return `${session?.startDate || ""}|${session?.startTime || ""}`;
}

function sortSessions(left, right) {
  return `${left.startDate || ""}${left.startTime || ""}${left.tempKey || ""}`.localeCompare(
    `${right.startDate || ""}${right.startTime || ""}${right.tempKey || ""}`,
  );
}

function buildEmptyTourItineraryStep(dayNumber = 1, displayOrder = 0) {
  return {
    dayNumber,
    displayOrder,
    title: "",
    description: "",
    location: "",
    activityType: "visit",
    startTime: "",
    endTime: "",
    imageUrl: "",
  };
}

function buildEmptyTourPackage() {
  return {
    name: "",
    minParticipants: "1",
    maxParticipants: "10",
    meetingPoint: "",
    meetingPointLocation: { ...EMPTY_LOCATION },
    cancellationPolicyType: "1",
    cancellationPolicyNotes: "",
    includes: [],
    excludes: [],
    pricingTiers: [buildEmptyTourPricingTier()],
    itinerary: [buildEmptyTourItineraryStep(1)],
    sessions: [],
    generatedPreview: [],
    generationSummary: null,
    bulkSession: buildEmptyBulkSessionGenerator(),
  };
}

function buildEmptyBulkSessionGenerator() {
  return {
    startDate: "",
    endDate: "",
    repeatType: "weekdays",
    customDays: [],
    startTime: "08:00",
    runCount: "1",
  };
}

function buildRoomImageList(urls, preferredCoverUrl = "") {
  const coverUrl = preferredCoverUrl || urls[0] || "";
  return urls.map((imageUrl, index) => ({
    imageUrl,
    displayOrder: index,
    isCover: imageUrl === coverUrl,
  }));
}

function buildPolicyLabel(policyValue) {
  return (
    CANCELLATION_POLICIES.find((policy) => policy.value === String(policyValue))
      ?.label || "Trung bình"
  );
}

function buildPolicyPayload(policyValue, notes) {
  return notes?.trim() || null;
}

function joinBulletLines(items = []) {
  const normalized = items.map((item) => item.trim()).filter(Boolean);

  return normalized.map((item) => `- ${item}`).join("\n");
}

function getNonEmptyBulletCount(items = []) {
  return items.filter((item) => item.trim()).length;
}

function buildDateTimeIso(dateValue, timeValue = "00:00") {
  if (!dateValue) return "";
  return `${dateValue}T${timeValue || "00:00"}:00+07:00`;
}

function parseLocalDateTime(dateValue, timeValue = "00:00") {
  const date = parseCalendarDate(dateValue);
  if (!date) return null;
  const [hours, minutes] = String(timeValue || "00:00")
    .split(":")
    .map((value) => Number(value));
  date.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return date;
}

function _parseDurationToMinutes(durationValue) {
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

  if (!totalMinutes) {
    const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
      totalMinutes = Number(hhmm[1]) * 60 + Number(hhmm[2]);
    }
  }

  return totalMinutes;
}

function selectedRepeatDays(repeatType, customDays = []) {
  if (repeatType === "daily") return [1, 2, 3, 4, 5, 6, 7];
  if (repeatType === "weekdays") return [1, 2, 3, 4, 5];
  if (repeatType === "weekends") return [6, 7];
  return customDays;
}

function formatSessionRangeText(startDate, endDate, endTime, windowEndDate) {
  if (!startDate || !endTime)
    return "Chọn thời lượng hợp lệ để xem trước giờ kết thúc.";
  const generationEndDate = windowEndDate || startDate;
  const datePart = endDate && endDate !== startDate ? ` ${endDate}` : "";
  return `Mỗi lịch sẽ kết thúc lúc ${endTime}${datePart}. Các lịch sẽ được tạo từ ${startDate} đến ${generationEndDate} dựa trên thời lượng gói.`;
}

function calculateSessionRange(startDate, startTime, durationMinutes) {
  const minutes = Number(durationMinutes) || 0;
  const startAt = parseLocalDateTime(startDate, startTime);
  if (!startAt || !minutes) {
    return {
      endDate: startDate || "",
      endTime: "",
      durationMinutes: minutes,
    };
  }

  const endAt = new Date(startAt.getTime() + minutes * 60 * 1000);
  return {
    endDate: endAt.toISOString().slice(0, 10),
    endTime: endAt.toTimeString().slice(0, 5),
    durationMinutes: minutes,
  };
}

function normalizeSessionPricingOverrides(
  pricingOverrides = [],
  pricingTiers = [],
) {
  return pricingTiers.map((tier, index) => {
    const existing = (pricingOverrides || []).find(
      (item) =>
        item?.tierKey === tier.tempKey ||
        (!item?.tierKey && Number(item?.tierDisplayOrder) === index),
    );

    return {
      tierKey: tier.tempKey,
      tierDisplayOrder: index,
      customPrice:
        existing?.customPrice === undefined || existing?.customPrice === null
          ? ""
          : String(existing.customPrice),
    };
  });
}

function buildSessionPricingOverridePayload(session, pricingTiers = []) {
  const overrideMap = new Map(
    (session?.pricingOverrides || []).map((item) => [item.tierKey, item]),
  );

  return pricingTiers
    .map((tier, index) => {
      const override = overrideMap.get(tier.tempKey);
      return {
        tierDisplayOrder: index,
        customPrice:
          override?.customPrice === "" ||
          override?.customPrice === null ||
          override?.customPrice === undefined
            ? null
            : Number(override.customPrice),
      };
    })
    .filter((item) => item.customPrice !== null);
}

function syncPackageSessionsWithPricingTiers(pkg) {
  const pricingTiers = (pkg.pricingTiers || []).map(normalizeTourPricingTier);
  const participantBounds = getTourPackageParticipantBounds({
    ...pkg,
    pricingTiers,
  });
  const durationMinutes = getPackageDurationMinutes({
    ...pkg,
    pricingTiers,
  });

  return {
    ...pkg,
    pricingTiers,
    sessions: (pkg.sessions || []).map((session) =>
      buildTourSession(
        session,
        durationMinutes,
        session.origin || "manual",
        pricingTiers,
        participantBounds.maxParticipants,
      ),
    ),
    generatedPreview: (pkg.generatedPreview || []).map((session) =>
      buildTourSession(
        session,
        durationMinutes,
        session.origin || "generated",
        pricingTiers,
        participantBounds.maxParticipants,
      ),
    ),
  };
}

function buildTourSession(
  session = {},
  durationMinutes,
  origin = session.origin || "manual",
  pricingTiers = [],
  capacityPerRun = session.availableSlots,
) {
  const normalized = {
    tempKey: session.tempKey || buildTempId("tour-session"),
    origin,
    startDate: session.startDate || "",
    startTime: session.startTime || "08:00",
    runCount:
      session.runCount === undefined || session.runCount === null
        ? "1"
        : String(session.runCount),
    availableSlots:
      capacityPerRun === undefined || capacityPerRun === null
        ? "20"
        : String(capacityPerRun),
    pricingOverrides: normalizeSessionPricingOverrides(
      session.pricingOverrides,
      pricingTiers,
    ),
  };
  const range = calculateSessionRange(
    normalized.startDate,
    normalized.startTime,
    durationMinutes,
  );
  return {
    ...normalized,
    endDate: range.endDate,
    endTime: range.endTime,
  };
}

function buildEmptyTourSession(pricingTiers = []) {
  return buildTourSession(
    {
      startDate: "",
      startTime: "08:00",
      runCount: "1",
      availableSlots: "1",
    },
    0,
    "manual",
    pricingTiers,
  );
}

function syncTourSessionWithDuration(session, durationMinutes, pricingTiers = []) {
  return buildTourSession(
    session,
    durationMinutes,
    session.origin || "manual",
    pricingTiers,
  );
}

function getDateWeekday(dateValue) {
  const date = parseCalendarDate(dateValue);
  if (!date) return 0;
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
}

function buildUniquePackageName(existingNames, baseName) {
  const normalizedNames = new Set(
    existingNames
      .map((name) =>
        String(name || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const stem = String(baseName || "Copied package").trim() || "Copied package";
  let candidate = `${stem} copy`;
  let suffix = 2;

  while (normalizedNames.has(candidate.trim().toLowerCase())) {
    candidate = `${stem} copy ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function cloneTourPackage(pkg, existingNames) {
  const pricingTiers = (pkg.pricingTiers || []).map((tier) =>
    normalizeTourPricingTier({ ...tier, tempKey: buildTempId("tour-tier") }),
  );

  return {
    ...pkg,
    name: buildUniquePackageName(existingNames, pkg.name || "Package"),
    meetingPointLocation: { ...(pkg.meetingPointLocation || EMPTY_LOCATION) },
    pricingTiers,
    itinerary: (pkg.itinerary || []).map((item) => ({
      ...item,
    })),
    sessions: (pkg.sessions || []).map((session) =>
      buildTourSession(
        { ...session, tempKey: buildTempId("tour-session") },
        getPackageDurationMinutes({ ...pkg, pricingTiers }),
        session.origin || "manual",
        pricingTiers,
      ),
    ),
    generatedPreview: (pkg.generatedPreview || []).map((session) =>
      buildTourSession(
        { ...session, tempKey: buildTempId("tour-session") },
        getPackageDurationMinutes({ ...pkg, pricingTiers }),
        session.origin || "generated",
        pricingTiers,
      ),
    ),
    generationSummary: null,
    bulkSession: { ...(pkg.bulkSession || buildEmptyBulkSessionGenerator()) },
  };
}

function getTourPackageParticipantBounds(pkg) {
  return {
    minParticipants: Math.max(Number(pkg.minParticipants) || 1, 1),
    maxParticipants: Math.max(
      Number(pkg.maxParticipants) || Number(pkg.minParticipants) || 1,
      Number(pkg.minParticipants) || 1,
    ),
  };
}

function matchesRepeatRule(dateValue, repeatType, customDays) {
  const weekday = getDateWeekday(dateValue);
  if (repeatType === "daily") return true;
  if (repeatType === "weekdays") return weekday >= 1 && weekday <= 5;
  if (repeatType === "weekends") return weekday === 6 || weekday === 7;
  return (customDays || []).includes(weekday);
}

function generateBulkSessions(
  generator,
  durationMinutes,
  existingSessions = [],
  { minDate = "", maxDate = "" } = {},
) {
  const summary = {
    createdCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    capped: false,
  };
  const minutes = Number(durationMinutes) || 0;
  if (
    !generator.startDate ||
    !generator.endDate ||
    !generator.startTime ||
    !minutes
  ) {
    return { sessions: [], summary };
  }
  if (generator.endDate < generator.startDate) {
    summary.invalidCount += 1;
    return { sessions: [], summary };
  }

  const sessionKeys = new Set(
    existingSessions.map((session) => buildSessionKey(session)),
  );
  const sessions = [];
  const endDate = parseCalendarDate(generator.endDate);
  const startDate = parseCalendarDate(generator.startDate);
  if (!startDate || !endDate) {
    summary.invalidCount += 1;
    return { sessions: [], summary };
  }
  for (
    let cursorDate = new Date(startDate), guard = 0;
    cursorDate <= endDate && guard < 370;
    cursorDate.setDate(cursorDate.getDate() + 1), guard += 1
  ) {
    const cursor = toCalendarDateKey(cursorDate);
    if ((minDate && cursor < minDate) || (maxDate && cursor > maxDate)) {
      summary.invalidCount += 1;
      continue;
    }
    if (
      !matchesRepeatRule(cursor, generator.repeatType, generator.customDays)
    ) {
      continue;
    }

    const key = `${cursor}|${generator.startTime}`;
    if (sessionKeys.has(key)) {
      summary.duplicateCount += 1;
      continue;
    }

    const nextSession = buildTourSession(
      {
        startDate: cursor,
        startTime: generator.startTime,
        runCount: generator.runCount || "1",
      },
      durationMinutes,
      "generated",
    );
    if (!nextSession.endTime) {
      summary.invalidCount += 1;
      continue;
    }
    sessions.push(nextSession);
    sessionKeys.add(key);
    if (sessions.length >= MAX_BULK_TOUR_SESSIONS) {
      summary.capped = true;
      break;
    }
  }

  summary.createdCount = sessions.length;
  return { sessions, summary };
}

function computePackageTimeline(pkg) {
  const itinerary = pkg.itinerary || [];
  if (!itinerary.length) {
    return { dayCount: 0, nights: 0, totalMinutes: 0, isComplete: false, firstStartTime: null, lastEndTime: null, warning: "" };
  }

  const dayNumbers = [...new Set(itinerary.map((item) => item.dayNumber))].sort((a, b) => a - b);
  const dayCount = dayNumbers.length;

  const byDay = {};
  for (const item of itinerary) {
    if (!byDay[item.dayNumber]) byDay[item.dayNumber] = [];
    byDay[item.dayNumber].push(item);
  }

  let firstStartTime = null;
  let lastEndTime = null;
  let allTimed = true;

  for (const dayNum of dayNumbers) {
    const activities = byDay[dayNum].sort((a, b) => a.displayOrder - b.displayOrder);
    const dayFirstStart = activities.find((a) => a.startTime)?.startTime;
    const reversed = [...activities].reverse();
    const dayLastEnd = reversed.find((a) => a.endTime)?.endTime;

    if (dayNum === dayNumbers[0] && dayFirstStart) {
      firstStartTime = dayFirstStart;
    }
    if (dayNum === dayNumbers[dayNumbers.length - 1] && dayLastEnd) {
      lastEndTime = dayLastEnd;
    }

    const hasTimed = activities.some((a) => a.startTime || a.endTime);
    if (!hasTimed) allTimed = false;
  }

  const isComplete = !!firstStartTime && !!lastEndTime;

  let totalMinutes = 0;
  if (isComplete) {
    const [fh, fm] = firstStartTime.split(":").map(Number);
    const [lh, lm] = lastEndTime.split(":").map(Number);
    totalMinutes = Math.max(0, (dayCount - 1) * 24 * 60 + (lh * 60 + lm) - (fh * 60 + fm));
  }

  return {
    dayCount,
    nights: Math.max(0, dayCount - 1),
    totalMinutes,
    isComplete,
    allTimed,
    firstStartTime,
    lastEndTime,
    warning: !isComplete
      ? "Chưa đủ dữ liệu thời gian để tính giờ kết thúc chính xác. Vui lòng thêm giờ cho hoạt động đầu tiên và cuối cùng."
      : "",
  };
}

function getPackageDurationMinutes(pkg) {
  const timeline = computePackageTimeline(pkg);
  if (timeline.isComplete) return timeline.totalMinutes;
  if (timeline.dayCount > 0) {
    return (timeline.dayCount - 1) * 24 * 60 + 480;
  }
  return Number(pkg.estimatedDurationMinutes) || 0;
}

function _getItineraryDurationSummary(pkg) {
  const packageMinutes = getPackageDurationMinutes(pkg);
  const stepMinutes = (pkg.itinerary || []).reduce(
    (total, item) => {
      const start = item.startTime ? item.startTime.split(":").map(Number) : null;
      const end = item.endTime ? item.endTime.split(":").map(Number) : null;
      if (start && end) {
        return total + (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      }
      return total;
    },
    0,
  );
  const timedSteps = (pkg.itinerary || []).filter(
    (item) => item.startTime || item.endTime,
  ).length;
  return {
    packageMinutes,
    stepMinutes,
    timedSteps,
    difference: packageMinutes - stepMinutes,
    exceeds: packageMinutes > 0 && stepMinutes > packageMinutes,
    matches: packageMinutes > 0 && stepMinutes === packageMinutes,
  };
}

function getPackageDurationText(pkg) {
  const timeline = computePackageTimeline(pkg);
  if (timeline.dayCount > 0) {
    return `${timeline.dayCount} ngày / ${timeline.nights} đêm`;
  }
  return "1 ngày";
}

function _formatMinutesAsClock(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatGenerationSummary(summary) {
  if (!summary) return "";
  return [
    `${summary.createdCount || 0} created`,
    `${summary.duplicateCount || 0} duplicates skipped`,
    `${summary.invalidCount || 0} invalid dates skipped`,
  ].join(" - ");
}

function PreviewSessionList({ sessions = [], durationMinutes = 0 }) {
  if (!sessions.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-[#d7e6ef] bg-[#f3fafc] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[#1a2332]">Xem trước lịch</p>
          <p className="text-sm text-[#5a6577]">
            Review these departures, then apply them to the package session
            list.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">
          {`${sessions.length} l\u1ECBch ch\u1EDD \u00E1p d\u1EE5ng`}
        </span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {sessions.map((session) => {
          const range = calculateSessionRange(
            session.startDate,
            session.startTime,
            durationMinutes,
          );
          return (
            <div
              key={session.tempKey || buildSessionKey(session)}
              className="flex flex-col gap-2 rounded-xl border border-white/80 bg-white px-3 py-2 text-sm text-[#1a2332] md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">
                  {session.startDate || "--"} {session.startTime || "--"} →{" "}
                  {range.endDate && range.endDate !== session.startDate ? `${range.endDate} ` : ""}
                  {range.endTime || "--"}
                </p>

              </div>
              <span className="rounded-full bg-[#eef7fb] px-2.5 py-1 text-xs font-medium text-primary">
                Generated
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingTierSummary({ tiers = [] }) {
  if (!tiers.length) return null;

  return (
    <div className="rounded-2xl border border-[#e8ecf0] bg-white p-4">
      <p className="text-sm font-medium text-[#1a2332]">Mức giá của gói</p>
      <div className="mt-3 space-y-2">
        {tiers.map((tier, index) => (
          <div
            key={`${tier.name || "tier"}-${index}`}
            className="flex flex-col gap-1 rounded-xl border border-[#edf1f4] bg-[#f9fafb] px-3 py-2 text-sm text-[#1a2332] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium">{tier.name || `Tier #${index + 1}`}</p>
            </div>
            <p className="font-medium text-primary">
              {Number(tier.unitPrice || 0).toLocaleString("vi-VN")} VND
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatParticipantRange(pkg) {
  return `${Number(pkg.minParticipants) || 1} - ${
    Number(pkg.maxParticipants) || Number(pkg.minParticipants) || 1
  } khách`;
}

function normalizeUploadUrls(response) {
  return response?.data?.urls || response?.urls || [];
}

function normalizeUploadUrl(response) {
  return response?.data?.url || response?.url || "";
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
  readOnly = false,
  onBlur,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        readOnly={readOnly}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AmenityChecklist({ label, options, selected, onChange }) {
  const selectedSet = new Set(selected || []);

  const toggleAmenity = (value) => {
    if (selectedSet.has(value)) {
      onChange((selected || []).filter((item) => item !== value));
      return;
    }
    onChange([...(selected || []), value]);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
              selectedSet.has(option.value)
                ? "border-primary bg-primary/10 text-primary"
                : "border-[#e8ecf0] bg-white text-[#5a6577] hover:border-primary/40"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedSet.has(option.value)}
              onChange={() => toggleAmenity(option.value)}
              className="h-4 w-4 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TagInput({ label, tags, onChange, placeholder, variant }) {
  const [input, setInput] = useState("");

  const isExclude = variant === "exclude";

  const addTag = () => {
    const value = input.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setInput("");
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm ${isExclude ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}
          >
            {tag}
            <button
              type="button"
              className={
                isExclude
                  ? "text-red-400 hover:text-red-700"
                  : "text-primary/70 hover:text-red-600"
              }
              onClick={() => onChange(tags.filter((item) => item !== tag))}
            >
              x
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
          className="flex-1 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
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

function BulletListInput({ label, items, onChange, placeholder }) {
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
              className="flex-1 rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
      >
        <Plus className="h-4 w-4" /> Add bullet
      </button>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function DestinationSelect({ value, onChange, destinations }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5a6577]">
        Destination
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Select destination</option>
        {destinations.map((destination) => (
          <option
            key={destination.id || destination.destinationId}
            value={destination.id || destination.destinationId}
          >
            {destination.name}
            {destination.province ? ` - ${destination.province}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function PolicySelector({ value, notes, onValueChange, onNotesChange }) {
  const activePolicy = useMemo(
    () =>
      CANCELLATION_POLICIES.find((policy) => policy.value === String(value)) ||
      CANCELLATION_POLICIES[1],
    [value],
  );

  return (
    <div className="space-y-3 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
      <FormSelect
        label="Mức chính sách hủy"
        value={value}
        onChange={onValueChange}
        options={CANCELLATION_POLICIES}
        required
      />
      <div className="rounded-xl border border-[#d9e7f2] bg-white px-4 py-3 text-sm text-[#31526f]">
        <p className="font-medium text-[#1a2332]">{activePolicy.label}</p>
        <p className="mt-1">{activePolicy.summary}</p>
      </div>
      <FormTextarea
        label="Ghi chú đối tác (không bắt buộc)"
        value={notes}
        onChange={onNotesChange}
        rows={3}
        placeholder="Thêm các trường hợp đặc biệt, quy tắc chặn hoặc ghi chú xem xét."
      />
    </div>
  );
}

function SingleImageUploadCard({
  label,
  imageUrl,
  onUpload,
  onClear,
  uploading = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#5a6577]">
        {label}
      </label>
      {imageUrl ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-3">
          <img
            src={imageUrl}
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div className="space-y-2">
            <p className="text-sm text-[#1a2332]">Đã tải ảnh</p>
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm hover:bg-white">
                Thay thế
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onUpload}
                  disabled={uploading}
                />
              </label>
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#dbe4ea] bg-[#f9fafb] px-4 py-8 text-center hover:border-primary/40">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Camera className="h-5 w-5 text-[#8d95a3]" />
          )}
          <span className="text-sm text-[#5a6577]">
            {uploading ? "Uploading image..." : "Choose an image"}
          </span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

function RoomGalleryField({
  room,
  onUpload,
  onSetCover,
  onRemoveImage,
  uploading = false,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#5a6577]">
            Room photos <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-[#8d95a3]">
            Upload at least one image and select exactly one cover image.
          </p>
        </div>
        <label className="cursor-pointer rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm font-medium text-[#1a2332] hover:bg-white">
          {uploading ? "Uploading..." : "Add photos"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {room.images.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {room.images.map((image) => (
            <div
              key={image.imageUrl}
              className="overflow-hidden rounded-2xl border border-[#e8ecf0] bg-white"
            >
              <img
                src={image.imageUrl}
                alt=""
                className="h-40 w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    image.isCover
                      ? "bg-green-50 text-green-700"
                      : "bg-[#f4f6f8] text-[#5a6577]"
                  }`}
                >
                  {image.isCover ? "Cover image" : "Gallery image"}
                </span>
                <div className="flex gap-2">
                  {!image.isCover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(image.imageUrl)}
                      className="rounded-xl border border-[#d7e6ef] px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]"
                    >
                      Set as cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(image.imageUrl)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dbe4ea] bg-white px-4 py-8 text-center text-sm text-[#8d95a3]">
          No room photos uploaded yet.
        </div>
      )}
    </div>
  );
}

function PackageGalleryField({
  label = "Package photos",
  helperText = "Upload at least one image and select exactly one cover image.",
  emptyMessage = "No photos uploaded yet.",
  images,
  onUpload,
  onSetCover,
  onRemoveImage,
  uploading = false,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#5a6577]">
            {label} <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-[#8d95a3]">{helperText}</p>
        </div>
        <label className="cursor-pointer rounded-xl border border-[#e8ecf0] px-3 py-2 text-sm font-medium text-[#1a2332] hover:bg-white">
          {uploading ? "Uploading..." : "Add photos"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {images.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.imageUrl}
              className="overflow-hidden rounded-2xl border border-[#e8ecf0] bg-white"
            >
              <img
                src={image.imageUrl}
                alt=""
                className="h-40 w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    image.isCover
                      ? "bg-green-50 text-green-700"
                      : "bg-[#f4f6f8] text-[#5a6577]"
                  }`}
                >
                  {image.isCover ? "Cover image" : "Gallery image"}
                </span>
                <div className="flex gap-2">
                  {!image.isCover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(image.imageUrl)}
                      className="rounded-xl border border-[#d7e6ef] px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]"
                    >
                      Set as cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveImage(image.imageUrl)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dbe4ea] bg-white px-4 py-8 text-center text-sm text-[#8d95a3]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function TourSessionCalendarPreview({ sessions = [], durationMinutes = 0 }) {
  const firstSession = sessions.find((session) => session.startDate);
  const anchorDate = firstSession?.startDate || getVietnamDate();
  const [visibleMonth, setVisibleMonth] = useState(anchorDate.slice(0, 7));

  useEffect(() => {
    setVisibleMonth(anchorDate.slice(0, 7));
  }, [anchorDate]);

  const monthStart = new Date(`${visibleMonth}-01T00:00:00+07:00`);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leadingDays);

  const sessionMap = new Map();
  for (const session of sessions) {
    if (!session.startDate) continue;
    const range = calculateSessionRange(
      session.startDate,
      session.startTime,
      durationMinutes,
    );
    sessionMap.set(session.startDate, {
      slots: Number(session.availableSlots || 0),
      startTime: session.startTime || "--:--",
      endTime: range.endTime || session.endTime || "--:--",
      endDate: range.endDate || session.endDate || "",
    });
  }

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toCalendarDateKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      session: sessionMap.get(key),
    };
  });

  return (
    <div className="rounded-2xl border border-[#e8ecf0] bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[#5a6577]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const previousMonth = new Date(
                `${visibleMonth}-01T00:00:00+07:00`,
              );
              previousMonth.setMonth(previousMonth.getMonth() - 1);
              setVisibleMonth(toCalendarDateKey(previousMonth).slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            {monthStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMonth = new Date(`${visibleMonth}-01T00:00:00+07:00`);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setVisibleMonth(toCalendarDateKey(nextMonth).slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Session date
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8d95a3]">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.key}
            className={`min-h-16 rounded-lg border px-1 py-1 text-xs ${
              day.session
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-[#edf1f4] bg-[#f9fafb] text-[#8d95a3]"
            } ${day.inMonth ? "" : "opacity-40"}`}
          >
            <p className="font-medium">{day.day}</p>
            {day.session ? (
              <>
                <p className="mt-1 text-[10px]">
                  {day.session.startTime} - {day.session.endTime}
                </p>
                {day.session.endDate !== day.key ? (
                  <p className="text-[10px] leading-tight text-[#8d95a3]">
                    Ends {day.session.endDate}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulkSessionGenerator({
  value,
  onChange,
  onGenerate,
  onApply,
  onDiscard,
  previewSessions,
  generationSummary,
  durationMinutes = 0,
  minDate,
  maxDate,
  defaultStartTime,
}) {
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const days = [
    { value: 1, label: "T2" },
    { value: 2, label: "T3" },
    { value: 3, label: "T4" },
    { value: 4, label: "T5" },
    { value: 5, label: "T6" },
    { value: 6, label: "T7" },
    { value: 7, label: "CN" },
  ];
  const effectiveStartTime = value.startTime || defaultStartTime || "08:00";
  const preview = calculateSessionRange(
    value.startDate,
    effectiveStartTime,
    durationMinutes,
  );
  const highlightedDays = selectedRepeatDays(
    value.repeatType,
    value.customDays,
  );

  return (
    <div className="space-y-4 rounded-2xl border border-[#dbe4ea] bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-[#1a2332]">Tạo lịch</p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-[#f3fafc] px-3 py-2 text-sm font-medium text-primary hover:bg-white"
        >
          <CalendarDays className="h-4 w-4" />
          Tạo lịch
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FormField
          label="Ngày bắt đầu"
          type="date"
          value={value.startDate}
          onChange={(next) => onChange({ ...value, startDate: next })}
          min={minDate}
          max={maxDate}
        />
        <FormField
          label="Ngày kết thúc"
          type="date"
          value={value.endDate}
          onChange={(next) => onChange({ ...value, endDate: next })}
          min={value.startDate || minDate || undefined}
          max={maxDate}
        />
        <FormField
          label="Giờ bắt đầu"
          type="time"
          value={defaultStartTime || value.startTime || ""}
          readOnly={!!defaultStartTime}
          onChange={(next) => onChange({ ...value, startTime: next })}
        />
        <FormField
          label={"S\u1ED1 l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh"}
          type="number"
          min="1"
          value={value.runCount}
          onChange={(next) => onChange({ ...value, runCount: next })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_1fr]">
        <div>
          <p className="mb-2 text-sm font-medium text-[#5a6577]">Lặp lại</p>
          <div className="space-y-2">
            {[
              { value: "daily", label: "Hàng ngày" },
              { value: "weekdays", label: "Ngày trong tuần" },
              { value: "weekends", label: "Cuối tuần" },
              { value: "custom", label: "Tùy chọn" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm text-[#1a2332]"
              >
                <input
                  type="radio"
                  className="h-4 w-4 accent-primary"
                  checked={value.repeatType === option.value}
                  onChange={() =>
                    onChange({ ...value, repeatType: option.value })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#5a6577]">
            Ngày đã chọn
          </p>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => {
              const selected = highlightedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const customDays = selected
                      ? (value.customDays || []).filter(
                          (item) => item !== day.value,
                        )
                      : [...(value.customDays || []), day.value].sort(
                          (left, right) => left - right,
                        );
                    onChange({ ...value, customDays });
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selected
                      ? "bg-primary text-white"
                      : "border border-[#e8ecf0] bg-white text-[#5a6577]"
                  }`}
                  disabled={value.repeatType !== "custom"}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#edf1f4] bg-[#f9fafb] px-3 py-2 text-xs text-[#5a6577]">
        {preview.durationMinutes
          ? formatSessionRangeText(
              value.startDate,
              preview.endDate,
              preview.endTime,
              value.endDate,
            )
          : "Thời lượng tour chưa được xác định. Vui lòng thêm giờ cho hoạt động đầu tiên và cuối cùng trong lịch trình ở bước 2."}
      </div>
      {generationSummary ? (
        <div className="rounded-xl border border-[#edf1f4] bg-white px-3 py-2 text-xs text-[#5a6577]">
          {formatGenerationSummary(generationSummary)}
          {generationSummary.capped
            ? ` Generation is capped at ${MAX_BULK_TOUR_SESSIONS} sessions at a time.`
            : ""}
        </div>
      ) : null}

      {previewSessions?.length ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setPreviewCollapsed((current) => !current)}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
          >
            {previewCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {previewCollapsed ? "Xem trước" : "Ẩn bớt"}
          </button>
          {previewCollapsed ? null : (
            <PreviewSessionList
              sessions={previewSessions}
              durationMinutes={durationMinutes}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <CheckCircle className="h-4 w-4" />
              Áp dụng
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-white px-4 py-2 text-sm font-medium text-[#1a2332] hover:bg-[#f9fafb]"
            >
              <Trash2 className="h-4 w-4" />
              Hủy bỏ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TourSessionPricingOverridesEditor({
  session,
  pricingTiers = [],
  onCustomPriceChange,
}) {
  const overrideMap = new Map(
    (session.pricingOverrides || []).map((item) => [item.tierKey, item]),
  );

  return (
    <details className="rounded-xl border border-[#e8ecf0] bg-[#fafcfd]">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#1a2332]">
        {"Gi\u00E1 theo l\u1ECBch kh\u1EDFi h\u00E0nh"}
      </summary>
      <div className="space-y-3 border-t border-[#e8ecf0] px-4 py-4">
        {pricingTiers.map((tier, tierIndex) => {
          const override = overrideMap.get(tier.tempKey);
          return (
            <div
              key={tier.tempKey || `tier-override-${tierIndex}`}
              className="grid gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div>
                  <p className="text-sm font-medium text-[#1a2332]">
                    {tier.name || `Tier #${tierIndex + 1}`}
                  </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-[#5a6577]">
                  {"Gi\u00E1 g\u00F3i m\u1EB7c \u0111\u1ECBnh"}
                </p>
                <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] px-3 py-2 text-sm text-[#1a2332]">
                  {tier.unitPrice ? `${formatCurrency(tier.unitPrice)}đ` : "—"}
                </div>
              </div>
              <FormField
                label={"Gi\u00E1 t\u00F9y ch\u1EC9nh"}
                value={override?.customPrice || ""}
                onChange={(value) => onCustomPriceChange(tier.tempKey, value)}
                type="number"
                min="0"
                placeholder={"B\u1ECF tr\u1ED1ng \u0111\u1EC3 d\u00F9ng gi\u00E1 g\u00F3i"}
              />
            </div>
          );
        })}
      </div>
    </details>
  );
}

function TourSessionCard({
  session,
  sessionIndex,
  packageIndex,
  pkg,
  minSessionDate,
  maxSessionDate,
  onSessionChange,
  onSessionCustomPriceChange,
  onRemoveSession,
  defaultStartTime,
}) {
  const sessionRange = calculateSessionRange(
    session.startDate,
    session.startTime,
    getPackageDurationMinutes(pkg),
  );

  return (
    <div className="space-y-3 rounded-xl border border-[#e8ecf0] bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label={"Ng\u00E0y b\u1EAFt \u0111\u1EA7u"}
          value={session.startDate}
          onChange={(value) =>
            onSessionChange(packageIndex, sessionIndex, "startDate", value)
          }
          type="date"
          min={minSessionDate}
          max={maxSessionDate}
          required
        />
        <FormField
          label={"Ng\u00E0y k\u1EBFt th\u00FAc"}
          value={sessionRange.endDate || ""}
          onChange={() => {}}
          type="date"
          readOnly
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <FormField
          label={"Giờ bắt đầu"}
          value={session.startTime || defaultStartTime || ""}
          onChange={(value) =>
            onSessionChange(packageIndex, sessionIndex, "startTime", value)
          }
          type="time"
        />
        <FormField
          label={"Giờ kết thúc"}
          value={sessionRange.endTime || ""}
          onChange={() => {}}
          type="time"
          readOnly
        />
        <FormField
          label={"S\u1ED1 l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh"}
          value={session.runCount}
          onChange={(value) =>
            onSessionChange(packageIndex, sessionIndex, "runCount", value)
          }
          type="number"
          min="1"
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FormField
            label={"Sức chứa mỗi lượt khởi hành"}
            value={String(
              Math.max(
                Number(getTourPackageParticipantBounds(pkg).maxParticipants) || 1,
                1,
              ),
            )}
            onChange={() => {}}
            type="number"
            readOnly
          />
        </div>
        <button
          type="button"
          onClick={() => onRemoveSession(packageIndex, sessionIndex)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <TourSessionPricingOverridesEditor
        session={session}
        pricingTiers={pkg.pricingTiers}
        onCustomPriceChange={(tierKey, value) =>
          onSessionCustomPriceChange(packageIndex, sessionIndex, tierKey, value)
        }
      />
    </div>
  );
}

function AvailabilityCalendarPreview({ room, minOpenDate }) {
  const firstWindow = (room.availabilityWindows || []).find(
    (window) => window.startDate && window.endDate,
  );
  const anchorDate = firstWindow?.startDate || minOpenDate || getVietnamDate();
  const [visibleMonth, setVisibleMonth] = useState(anchorDate.slice(0, 7));

  useEffect(() => {
    setVisibleMonth(anchorDate.slice(0, 7));
  }, [anchorDate]);

  const monthStart = new Date(`${visibleMonth}-01T00:00:00+07:00`);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leadingDays);

  const availabilityByDate = new Map();
  for (const window of room.availabilityWindows || []) {
    if (!window.startDate || !window.endDate) continue;
    const count = Number(window.availableCount || room.numberOfRooms || 1);
    for (
      let date = new Date(`${window.startDate}T00:00:00+07:00`);
      date <= new Date(`${window.endDate}T00:00:00+07:00`);
      date.setDate(date.getDate() + 1)
    ) {
      availabilityByDate.set(toCalendarDateKey(date), count);
    }
  }

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toCalendarDateKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      count: availabilityByDate.get(key),
    };
  });

  return (
    <div className="rounded-2xl border border-[#e8ecf0] bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-[#5a6577]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const previousMonth = new Date(
                `${visibleMonth}-01T00:00:00+07:00`,
              );
              previousMonth.setMonth(previousMonth.getMonth() - 1);
              setVisibleMonth(toCalendarDateKey(previousMonth).slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            {monthStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMonth = new Date(`${visibleMonth}-01T00:00:00+07:00`);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setVisibleMonth(toCalendarDateKey(nextMonth).slice(0, 7));
            }}
            className="rounded-lg border border-[#e8ecf0] p-1 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Có sẵn
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#dbe4ea]" /> Chưa đặt
          </span>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#8d95a3]">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.key}
            className={`min-h-12 rounded-lg border px-1 py-1 text-xs ${
              day.count
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-[#edf1f4] bg-[#f9fafb] text-[#8d95a3]"
            } ${day.inMonth ? "" : "opacity-40"}`}
          >
            <p className="font-medium">{day.day}</p>
            {day.count ? (
              <p className="mt-1 text-[10px]">{day.count} rooms</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="mb-8 flex items-center rounded-xl border border-[#e8ecf0] bg-white p-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isDone = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-1 flex-col items-center">
              <div
                className={`mb-1 flex h-10 w-10 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-primary text-white"
                      : "bg-[#f9fafb] text-[#8d95a3]"
                }`}
              >
                {isDone ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`hidden text-center text-xs md:block ${
                  isActive ? "font-medium text-primary" : "text-[#8d95a3]"
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  currentStep > step.id ? "bg-green-400" : "bg-[#e8ecf0]"
                }`}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}



function ConfirmPanel({ serviceType, homestayData, tourData, publishError }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-700" />
          <h3 className="font-semibold text-green-700">Sẵn sàng đăng tải</h3>
        </div>
      </div>
      <p className="text-sm text-[#5a6577]">
        Dịch vụ sẽ được gửi đi để xét duyệt trước khi hiển thị công khai.
      </p>
      {serviceType === "homestay" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
            <h4 className="mb-2 font-semibold text-[#1a2332]">
              Thông tin cơ bản
            </h4>
            <div className="space-y-1.5 text-sm text-[#5a6577]">
              <p>
                <span className="font-medium">Tên homestay:</span>{" "}
                {homestayData.title || "--"}
              </p>
              <p>
                <span className="font-medium">Số điện thoại:</span>{" "}
                {homestayData.phoneNumber || "--"}
              </p>
              <p>
                <span className="font-medium">Giờ hoạt động:</span>{" "}
                {homestayData.openingHours || "--"}
              </p>
              <p>
                <span className="font-medium">Nhận phòng:</span>{" "}
                {homestayData.checkInTime || "--"}
              </p>
              <p>
                <span className="font-medium">Trả phòng:</span>{" "}
                {homestayData.checkOutTime || "--"}
              </p>
              <p>
                <span className="font-medium">Địa chỉ:</span>{" "}
                {homestayData.location.address || "--"}
              </p>
            </div>
            {homestayData.description ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                  Mô tả
                </p>
                <p className="text-sm text-[#5a6577]">
                  {homestayData.description}
                </p>
              </div>
            ) : null}
            {homestayData.amenities.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                  Tiện nghi
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {homestayData.amenities.map((name) => {
                    const option = HOMESTAY_AMENITY_OPTIONS.find(
                      (o) => o.value === name,
                    );
                    return (
                      <span
                        key={name}
                        className="rounded-full bg-white px-2.5 py-0.5 text-xs text-[#5a6577]"
                      >
                        {option?.label || name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {homestayData.houseRules ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                  Nội quy
                </p>
                <p className="text-sm text-[#5a6577]">
                  {homestayData.houseRules}
                </p>
              </div>
            ) : null}
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                Chính sách hủy
              </p>
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">
                {buildPolicyLabel(homestayData.cancellationPolicyType)}
              </span>
              {homestayData.cancellationPolicyNotes ? (
                <p className="mt-1 text-sm text-[#5a6577]">
                  {homestayData.cancellationPolicyNotes}
                </p>
              ) : null}
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                Ảnh
              </p>
              <p className="text-sm text-[#5a6577]">
                {homestayData.thumbnailUrl
                  ? "Đã có ảnh bìa"
                  : "Chưa có ảnh bìa"}
                {homestayData.images.length > 0
                  ? ` • ${homestayData.images.length} ảnh thư viện`
                  : ""}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-[#1a2332]">Phòng</h4>
            {homestayData.rooms.map((room, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
              >
                <h5 className="mb-2 font-medium text-[#1a2332]">
                  {room.roomName || `Loại phòng #${index + 1}`}
                </h5>
                <div className="grid gap-3 text-sm text-[#5a6577] md:grid-cols-2">
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Loại giường:</span>{" "}
                      {room.bedType || "--"}
                    </p>
                    <p>
                      <span className="font-medium">Số giường:</span>{" "}
                      {room.bedCount || "--"}
                    </p>
                    <p>
                      <span className="font-medium">Khách tối đa:</span>{" "}
                      {room.maxOccupancy || "--"}
                    </p>
                    <p>
                      <span className="font-medium">Số phòng:</span>{" "}
                      {room.numberOfRooms || "--"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Giá cơ bản:</span>{" "}
                      {room.basePrice
                        ? `${formatCurrency(room.basePrice)}đ`
                        : "--"}
                    </p>
                    <p>
                      <span className="font-medium">Giá cuối tuần:</span>{" "}
                      {room.weekendPrice
                        ? `${formatCurrency(room.weekendPrice)}đ`
                        : "--"}
                    </p>
                    <p>
                      <span className="font-medium">Giá ngày lễ:</span>{" "}
                      {room.holidayPrice
                        ? `${formatCurrency(room.holidayPrice)}đ`
                        : "--"}
                    </p>
                  </div>
                </div>
                {room.amenities.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                      Tiện nghi phòng
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities.map((name) => {
                        const option = ROOM_AMENITY_OPTIONS.find(
                          (o) => o.value === name,
                        );
                        return (
                          <span
                            key={name}
                            className="rounded-full bg-white px-2.5 py-0.5 text-xs text-[#5a6577]"
                          >
                            {option?.label || name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {room.roomDescription ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                      Mô tả phòng
                    </p>
                    <p className="text-sm text-[#5a6577]">
                      {room.roomDescription}
                    </p>
                  </div>
                ) : null}
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                    Ảnh phòng
                  </p>
                  <p className="text-sm text-[#5a6577]">
                    {room.coverImageUrl ? "Đã có ảnh bìa" : "Chưa có ảnh bìa"}
                    {room.images && room.images.length > 0
                      ? ` • ${room.images.length} ảnh`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
            <h4 className="mb-2 font-semibold text-[#1a2332]">Lịch trống</h4>
            <p className="mb-3 text-sm text-[#5a6577]">
              <span className="font-medium">Số đêm tối thiểu:</span>{" "}
              {homestayData.availMinNights || "1"}
            </p>
            {homestayData.rooms.map((room, roomIndex) => {
              const windows = room.availabilityWindows || [];
              return (
                <div key={roomIndex} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-sm font-medium text-[#1a2332]">
                    {room.roomName || `Loại phòng #${roomIndex + 1}`}
                  </p>
                  {windows.length > 0 ? (
                    <div className="space-y-2">
                      {windows.map((window, windowIndex) => (
                        <div
                          key={windowIndex}
                          className="rounded-xl border border-[#e8ecf0] bg-white p-3 text-sm text-[#5a6577]"
                        >
                          {window.startDate || window.endDate ? (
                            <p>
                              {window.startDate || "—"} →{" "}
                              {window.endDate || "—"}
                            </p>
                          ) : (
                            <p className="italic text-[#8d95a3]">
                              Chưa thiết lập
                            </p>
                          )}
                          <p>Số phòng mở: {window.availableCount || "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-[#8d95a3]">
                      Chưa có khung ngày nào
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {serviceType === "tour" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
            <h4 className="mb-2 font-semibold text-[#1a2332]">Điểm nổi bật</h4>
            {getNonEmptyBulletCount(tourData.descriptionBullets) ? (
              <ul className="space-y-1 text-sm text-[#5a6577]">
                {tourData.descriptionBullets
                  .filter((item) => item.trim())
                  .map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm italic text-[#8d95a3]">
                Chưa thêm điểm nổi bật.
              </p>
            )}
          </div>

          {(tourData.packages || []).map((pkg, packageIndex) => (
            <div
              key={`${pkg.name}-${packageIndex}`}
              className="space-y-4 rounded-xl border border-[#e8ecf0] bg-[#f9fafb] p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="font-semibold text-[#1a2332]">
                    {pkg.name || `Package #${packageIndex + 1}`}
                  </h4>
                  <p className="text-sm text-[#5a6577]">
                    {formatParticipantRange(pkg)}
                  </p>
                  {pkg.meetingPoint ? (
                    <p className="mt-1 text-sm text-[#5a6577]">
                      Meeting point: {pkg.meetingPoint}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">
                  {buildPolicyLabel(pkg.cancellationPolicyType)}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                    Bảng giá theo cấp
                  </p>
                  <div className="space-y-2">
                    {pkg.pricingTiers.map((tier, tierIndex) => (
                      <div
                        key={`${tier.name}-${tierIndex}`}
                        className="rounded-xl border border-[#e8ecf0] bg-white p-3"
                      >
                        <p className="font-medium text-[#1a2332]">
                          {tier.name || `Tier #${tierIndex + 1}`} •{" "}
                          {formatCurrency(tier.unitPrice)}đ
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                    Lịch trình
                  </p>
                  <div className="space-y-2">
                    {pkg.sessions.map((session, sessionIndex) => (
                      <div
                        key={`${session.startDate}-${sessionIndex}`}
                        className="rounded-xl border border-[#e8ecf0] bg-white p-3 text-sm text-[#5a6577]"
                      >
                        <p className="font-medium text-[#1a2332]">
                          {session.startDate || "—"} {session.startTime || ""}{" "}
                          đến {session.endDate || "—"} {session.endTime || ""}
                        </p>
                        <p>
                          {`S\u1ED1 l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh: ${session.runCount || 1}`}
                        </p>
                        <p>
                          {`S\u1EE9c ch\u1EE9a m\u1ED7i l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh: ${
                            getTourPackageParticipantBounds(pkg).maxParticipants || 1
                          }`}
                        </p>
                        <p>
                          {`T\u1ED5ng s\u1EE9c ch\u1EE9a c\u1EE7a l\u1ECBch: ${
                            (Number(session.runCount) || 1) *
                            (getTourPackageParticipantBounds(pkg).maxParticipants || 1)
                          }`}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                          {(pkg.pricingTiers || []).map((tier, tierIndex) => {
                            const override = (session.pricingOverrides || []).find(
                              (item) =>
                                item.tierKey === tier.tempKey ||
                                Number(item.tierDisplayOrder) === tierIndex,
                            );
                            return (
                              <p key={tier.tempKey || `review-tier-${tierIndex}`}>
                                <span className="font-medium text-[#1a2332]">
                                  {tier.name || `Tier #${tierIndex + 1}`}:
                                </span>{" "}
                                {override?.customPrice
                                  ? `${formatCurrency(override.customPrice)}đ`
                                  : "dùng giá mặc định của gói"}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                    Bao gồm
                  </p>
                  {pkg.includes.length ? (
                    <ul className="space-y-1 text-sm text-[#5a6577]">
                      {pkg.includes.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm italic text-[#8d95a3]">
                      Không có mục nào được bao gồm.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                    Không bao gồm
                  </p>
                  {pkg.excludes.length ? (
                    <ul className="space-y-1 text-sm text-[#5a6577]">
                      {pkg.excludes.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm italic text-[#8d95a3]">
                      Không có mục nào bị loại trừ.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8d95a3]">
                  Lịch trình
                </p>
                {(() => {
                  const dayNumbers = [...new Set((pkg.itinerary || []).map((item) => item.dayNumber))].sort((a, b) => a - b);
                  if (!dayNumbers.length) return <p className="text-sm italic text-[#8d95a3]">Chưa có lịch trình.</p>;
                  return dayNumbers.map((dayNum) => {
                    const dayActivities = (pkg.itinerary || []).filter((item) => item.dayNumber === dayNum);
                    return (
                      <div key={dayNum} className="mb-3">
                        <p className="mb-1.5 text-sm font-semibold text-[#1a2332]">Ngày {dayNum}</p>
                        <div className="space-y-2">
                          {dayActivities.map((item, itemIndex) => (
                            <div
                              key={`${item.title}-${itemIndex}`}
                              className="rounded-xl border border-[#e8ecf0] bg-white p-3"
                            >
                              <p className="font-medium text-[#1a2332]">
                                {item.title || "—"}
                              </p>
                              <p className="mt-1 text-sm text-[#5a6577]">
                                {item.description || "—"}
                              </p>
                              <p className="mt-1 text-xs text-[#8d95a3]">
                                {[
                                  item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime || item.endTime,
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
            </div>
          ))}
        </div>
      ) : null}
      <ErrorBanner message={publishError} />
    </div>
  );
}

function PriceAlertModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="fixed right-4 top-4 z-50 animate-slide-in">
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-2xl">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="font-medium text-red-700">Kiểm tra giá</p>
          <p className="mt-1 text-sm text-red-600">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1 text-[#8d95a3] hover:bg-[#f4f6f8]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HomestayForm({
  step,
  data,
  destinations,
  onChange,
  onRoomChange,
  onAddRoom,
  onRemoveRoom,
  onRoomImagesUpload,
  onSetRoomCover,
  onRemoveRoomImage,
  onImagesUpload,
  onSetCover,
  onRemoveImage,
  onAvailabilityChange,
  onAddAvailabilityWindow,
  onRemoveAvailabilityWindow,
  onOpenNextMonth,
  minOpenDate,
  maxOpenDate,
  uploadingRooms,
  uploadingImages,
}) {
  if (step === 1) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Tên homestay"
            value={data.title}
            onChange={(value) => onChange("title", value)}
            placeholder="Sapa Cloud Homestay"
            required
          />
          <FormField
            label="Số điện thoại liên hệ"
            value={data.phoneNumber}
            onChange={(value) => onChange("phoneNumber", value)}
            placeholder="+84..."
          />
          <FormField
            label="Giờ hoạt động"
            value={data.openingHours}
            onChange={(value) => onChange("openingHours", value)}
            placeholder="24/7"
          />
          <div className="md:col-span-2">
            <PackageGalleryField
              label="Ảnh dịch vụ"
              helperText="Tải lên ít nhất một ảnh và chọn chính xác một ảnh bìa."
              emptyMessage="Chưa có ảnh nào."
              images={data.images || []}
              onUpload={onImagesUpload}
              onSetCover={onSetCover}
              onRemoveImage={onRemoveImage}
              uploading={uploadingImages}
            />
          </div>
          <FormField
            label="Giờ nhận phòng"
            value={data.checkInTime}
            onChange={(value) => onChange("checkInTime", value)}
            type="time"
          />
          <FormField
            label="Giờ trả phòng"
            value={data.checkOutTime}
            onChange={(value) => onChange("checkOutTime", value)}
            type="time"
          />
        </div>

        <ServiceLocationPicker
          label="Vị trí bất động sản"
          value={data.location}
          onChange={(location) => onChange("location", location)}
          destinations={destinations}
          required
        />

        <FormTextarea
          label="Mô tả"
          value={data.description}
          onChange={(value) => onChange("description", value)}
          placeholder="Mô tả không gian lưu trú, không khí và trải nghiệm của khách."
          rows={4}
          required
        />

        <AmenityChecklist
          label="Tiện nghi homestay"
          options={HOMESTAY_AMENITY_OPTIONS}
          selected={data.amenities}
          onChange={(value) => onChange("amenities", value)}
        />

        <FormTextarea
          label="Nội quy"
          value={data.houseRules}
          onChange={(value) => onChange("houseRules", value)}
          placeholder="Hút thuốc, giờ yên tĩnh, thú cưng, tiệc tùng..."
          rows={3}
        />

        <PolicySelector
          value={data.cancellationPolicyType}
          notes={data.cancellationPolicyNotes}
          onValueChange={(value) => onChange("cancellationPolicyType", value)}
          onNotesChange={(value) => onChange("cancellationPolicyNotes", value)}
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        {data.rooms.map((room, index) => (
          <div
            key={index}
            className="space-y-4 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-5"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-[#1a2332]">
                Loại phòng #{index + 1}
              </h4>
              {data.rooms.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveRoom(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <RoomGalleryField
              room={room}
              uploading={uploadingRooms > 0}
              onUpload={(event) => onRoomImagesUpload(index, event)}
              onSetCover={(url) => onSetRoomCover(index, url)}
              onRemoveImage={(url) => onRemoveRoomImage(index, url)}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField
                label="Tên phòng"
                value={room.roomName}
                onChange={(value) => onRoomChange(index, "roomName", value)}
                placeholder="Deluxe Garden View"
                required
              />
              <FormSelect
                label="Loại giường"
                value={room.bedType}
                onChange={(value) => onRoomChange(index, "bedType", value)}
                options={BED_TYPE_OPTIONS}
                required
              />
              <FormField
                label="Số giường"
                value={room.bedCount}
                onChange={(value) => onRoomChange(index, "bedCount", value)}
                type="number"
                min="1"
              />
              <FormField
                label="Khách tối đa"
                value={room.maxOccupancy}
                onChange={(value) => onRoomChange(index, "maxOccupancy", value)}
                type="number"
                min="1"
              />
              <FormField
                label="Số phòng"
                value={room.numberOfRooms}
                onChange={(value) =>
                  onRoomChange(index, "numberOfRooms", value)
                }
                type="number"
                min="1"
              />
              <FormField
                label="Giá cơ bản (VNĐ / đêm)"
                value={room.basePrice}
                onChange={(value) => onRoomChange(index, "basePrice", value)}
                type="number"
                min={String(MIN_ROOM_PRICE)}
                max={String(MAX_ROOM_PRICE)}
                required
              />
              <FormField
                label="Giá cuối tuần (VNĐ / đêm)"
                value={room.weekendPrice}
                onChange={(value) => onRoomChange(index, "weekendPrice", value)}
                type="number"
                min={String(MIN_ROOM_PRICE)}
                max={String(MAX_ROOM_PRICE)}
              />
              <FormField
                label="Giá ngày lễ (VNĐ / đêm)"
                value={room.holidayPrice}
                onChange={(value) => onRoomChange(index, "holidayPrice", value)}
                type="number"
                min={String(MIN_ROOM_PRICE)}
                max={String(MAX_ROOM_PRICE)}
              />
            </div>

            <AmenityChecklist
              label="Tiện nghi phòng"
              options={ROOM_AMENITY_OPTIONS}
              selected={room.amenities}
              onChange={(value) => onRoomChange(index, "amenities", value)}
            />

            <FormTextarea
              label="Mô tả phòng"
              value={room.roomDescription}
              onChange={(value) =>
                onRoomChange(index, "roomDescription", value)
              }
              placeholder="Bố trí, tầm nhìn và điểm nổi bật cho khách."
              rows={3}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={onAddRoom}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <Plus className="h-4 w-4" /> Thêm loại phòng khác
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#d9e7f2] bg-[#f8fbfd] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-[#1a2332]">Mở ngày đặt chỗ</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FormField
              label="Số đêm tối thiểu"
              value={data.availMinNights}
              onChange={(value) => onChange("availMinNights", value)}
              type="number"
              min="1"
              max="30"
            />
            <FormField
              label="Số đêm tối đa"
              value={data.availMaxNights}
              onChange={(value) => onChange("availMaxNights", value)}
              type="number"
              min="1"
              max="30"
              onBlur={(e) => {
                if (e.target.value === "") onChange("availMaxNights", "30");
              }}
            />
          </div>
        </div>

        {data.rooms.map((room, roomIndex) => {
          const title =
            data.rooms.length === 1
              ? "Lịch khả dụng Homestay"
              : `Lịch ${room.roomName || `Loại phòng #${roomIndex + 1}`}`;

          return (
            <div
              key={roomIndex}
              className="space-y-4 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-medium text-[#1a2332]">{title}</h4>
                  <p className="text-sm text-[#5a6577]">
                    Mở cửa sổ ngày và giới hạn khả dụng cho loại phòng này.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenNextMonth(roomIndex)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-[#f3fafc]"
                >
                  <CalendarDays className="h-4 w-4" />
                  Mở tháng tiếp theo
                </button>
              </div>

              <AvailabilityCalendarPreview
                room={room}
                minOpenDate={minOpenDate}
              />

              <div className="space-y-3">
                {(room.availabilityWindows || []).map((window, windowIndex) => (
                  <div
                    key={windowIndex}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-[#e8ecf0] bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <FormField
                      label="Ngày bắt đầu"
                      value={window.startDate}
                      onChange={(value) =>
                        onAvailabilityChange(
                          roomIndex,
                          windowIndex,
                          "startDate",
                          value,
                        )
                      }
                      type="date"
                      min={minOpenDate}
                      max={maxOpenDate}
                      required
                    />
                    <FormField
                      label="Ngày kết thúc"
                      value={window.endDate}
                      onChange={(value) =>
                        onAvailabilityChange(
                          roomIndex,
                          windowIndex,
                          "endDate",
                          value,
                        )
                      }
                      type="date"
                      min={window.startDate || minOpenDate}
                      max={maxOpenDate}
                      required
                    />
                    <FormField
                      label="Số phòng mở"
                      value={window.availableCount}
                      onChange={(value) =>
                        onAvailabilityChange(
                          roomIndex,
                          windowIndex,
                          "availableCount",
                          value,
                        )
                      }
                      type="number"
                      min="1"
                      max={String(Number(room.numberOfRooms) || 1)}
                      placeholder={String(Number(room.numberOfRooms) || 1)}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveAvailabilityWindow(roomIndex, windowIndex)
                        }
                        disabled={(room.availabilityWindows || []).length <= 1}
                        className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onAddAvailabilityWindow(roomIndex)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
              >
                <Plus className="h-4 w-4" /> Add date window
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function TourForm({
  step,
  data,
  destinations,
  minSessionDate,
  maxSessionDate,
  onChange,
  onTourImagesUpload,
  onSetTourCover,
  onRemoveTourImage,
  onPackageChange,
  onAddPackage,
  onDuplicatePackage,
  onRemovePackage,
  onTierChange,
  onAddTier,
  onRemoveTier,
  onSessionChange,
  onSessionCustomPriceChange,
  onAddSession,
  onGenerateSessions,
  onApplyGeneratedSessions,
  onDiscardGeneratedSessions,
  onRemoveSession,
  onItineraryChange,
  onAddItineraryStep,
  onAddItineraryDay,
  onRemoveItineraryStep,
  onItineraryImageUpload,
  tourAssetsUploading,
}) {
  const [collapsedPackages, setCollapsedPackages] = useState({});
  const [collapsedSessions, setCollapsedSessions] = useState({});
  const toggleCollapsedPackage = (packageIndex) => {
    setCollapsedPackages((previous) => ({
      ...previous,
      [packageIndex]: !previous[packageIndex],
    }));
  };
  const toggleCollapsedSessionList = (packageIndex) => {
    setCollapsedSessions((previous) => ({
      ...previous,
      [packageIndex]: !previous[packageIndex],
    }));
  };

  if (step === 1) {
    return (
      <div className="space-y-5">
        <FormField
          label="Tên dịch vụ tour"
          value={data.title}
          onChange={(value) => onChange("title", value)}
          placeholder="VD: Tour Vịnh Hạ Long qua đêm"
          required
        />
        <ServiceLocationPicker
          label="Điểm hẹn"
          value={data.location}
          onChange={(location) => onChange("location", location)}
          destinations={destinations}
          required
        />
        <PackageGalleryField
          label="Ảnh tour"
          helperText="Tải ảnh bìa và thư viện cho toàn bộ dịch vụ tour tại đây. Các gói không cần bộ ảnh riêng."
          emptyMessage="Chưa có ảnh tour nào."
          images={data.images || []}
          onUpload={onTourImagesUpload}
          onSetCover={onSetTourCover}
          onRemoveImage={onRemoveTourImage}
          uploading={tourAssetsUploading > 0}
        />
        <BulletListInput
          label="Điểm nổi bật"
          items={data.descriptionBullets}
          onChange={(value) => onChange("descriptionBullets", value)}
          placeholder="Thêm một điểm nổi bật ngắn"
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        {data.packages.map((pkg, packageIndex) => (
          <div
            key={packageIndex}
            className="space-y-5 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="font-medium text-[#1a2332]">
                  {pkg.name?.trim() || `Gói #${packageIndex + 1}`}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCollapsedPackage(packageIndex)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-white px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]"
                >
                  {collapsedPackages[packageIndex] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                  {collapsedPackages[packageIndex] ? "Mở rộng" : "Thu gọn"}
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicatePackage(packageIndex)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-white px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]"
                >
                  <Copy className="h-4 w-4" />
                  Nhân đôi
                </button>
                {data.packages.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemovePackage(packageIndex)}
                    className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {collapsedPackages[packageIndex] ? null : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <FormField
                      label="Tên gói"
                      value={pkg.name}
                      onChange={(value) =>
                        onPackageChange(packageIndex, "name", value)
                      }
                      placeholder="VD: Suite cao cấp"
                      required
                    />
                  </div>
                  <div className="xl:col-span-1">
                    <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                      Số khách tối thiểu <User className="inline h-4 w-4" />{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={pkg.minParticipants}
                      onChange={(e) =>
                        onPackageChange(
                          packageIndex,
                          "minParticipants",
                          e.target.value,
                        )
                      }
                      min="1"
                      className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="xl:col-span-1">
                    <label className="mb-1 block text-sm font-medium text-[#5a6577]">
                      Số khách tối đa <User className="inline h-4 w-4" />{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={pkg.maxParticipants}
                      onChange={(e) =>
                        onPackageChange(
                          packageIndex,
                          "maxParticipants",
                          e.target.value,
                        )
                      }
                      min="1"
                      className="w-full rounded-xl border border-[#e8ecf0] bg-white px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-6">
                    <ServiceLocationPicker
                      label="Điểm hẹn"
                      value={pkg.meetingPointLocation || EMPTY_LOCATION}
                      onChange={(value) =>
                        onPackageChange(
                          packageIndex,
                          "meetingPointLocation",
                          value,
                        )
                      }
                      destinations={destinations}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#5a6577]">
                        Bảng giá theo cấp
                      </p>
                      <p className="text-xs text-[#8d95a3]">
                        Khai báo tên mức giá và giá bán cho từng đối tượng khách.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {pkg.pricingTiers.map((tier, tierIndex) => (
                      <div
                        key={tierIndex}
                        className="grid grid-cols-1 gap-3 rounded-xl border border-[#e8ecf0] bg-white p-4 md:grid-cols-5"
                      >
                        <div className="md:col-span-2">
                          <FormField
                            label="Tên mức giá"
                            value={tier.name}
                            onChange={(value) =>
                              onTierChange(
                                packageIndex,
                                tierIndex,
                                "name",
                                value,
                              )
                            }
                            placeholder="Người lớn"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FormField
                            label="Giá (VND)"
                            value={tier.unitPrice}
                            onChange={(value) =>
                              onTierChange(
                                packageIndex,
                                tierIndex,
                                "unitPrice",
                                value,
                              )
                            }
                            type="number"
                            min="0"
                            required
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              onRemoveTier(packageIndex, tierIndex)
                            }
                            disabled={pkg.pricingTiers.length <= 1}
                            className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddTier(packageIndex)}
                    className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    <Plus className="h-4 w-4" /> Thêm mức giá
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <TagInput
                    label="Bao gồm"
                    tags={pkg.includes}
                    onChange={(value) =>
                      onPackageChange(packageIndex, "includes", value)
                    }
                    placeholder="Thêm một mục bao gồm"
                  />
                  <TagInput
                    label="Không bao gồm"
                    tags={pkg.excludes}
                    onChange={(value) =>
                      onPackageChange(packageIndex, "excludes", value)
                    }
                    placeholder="Thêm một mục không bao gồm"
                    variant="exclude"
                  />
                </div>

                <PolicySelector
                  value={pkg.cancellationPolicyType}
                  notes={pkg.cancellationPolicyNotes}
                  onValueChange={(value) =>
                    onPackageChange(
                      packageIndex,
                      "cancellationPolicyType",
                      value,
                    )
                  }
                  onNotesChange={(value) =>
                    onPackageChange(
                      packageIndex,
                      "cancellationPolicyNotes",
                      value,
                    )
                  }
                />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#5a6577]">
                        Lịch trình theo ngày
                      </p>
                    </div>
                  </div>

                  {/* Computed summary banner */}
                  {(() => {
                    const timeline = computePackageTimeline(pkg);
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
                    const dayNumbers = [...new Set((pkg.itinerary || []).map((item) => item.dayNumber))].sort((a, b) => a - b);
                    if (!dayNumbers.length) return null;

                    return dayNumbers.map((dayNum) => {
                      const dayActivities = (pkg.itinerary || [])
                        .filter((item) => item.dayNumber === dayNum)
                        .sort((a, b) => a.displayOrder - b.displayOrder);

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
                            {dayActivities.map((item, itemIndex) => {
                              const globalIndex = pkg.itinerary.indexOf(item);
                              const activityOption =
                                TOUR_ACTIVITY_TYPES.find(
                                  (option) => option.value === item.activityType,
                                ) || TOUR_ACTIVITY_TYPES[1];
                              const ActivityIcon = activityOption.icon;

                              return (
                                <div
                                  key={itemIndex}
                                  className="space-y-3 rounded-xl border border-[#e8ecf0] bg-white p-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 text-xs text-[#5a6577]">
                                        <ActivityIcon className="h-3.5 w-3.5" />
                                        {activityOption.label}
                                      </span>
                                      {item.startTime || item.endTime ? (
                                        <span className="text-xs text-[#8d95a3]">
                                          {item.startTime || "--:--"} - {item.endTime || "--:--"}
                                        </span>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onRemoveItineraryStep(packageIndex, globalIndex)
                                      }
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
                                        onItineraryChange(
                                          packageIndex,
                                          globalIndex,
                                          "title",
                                          value,
                                        )
                                      }
                                      placeholder="Đón từ khách sạn"
                                      required
                                    />
                                    <FormField
                                      label="Giờ bắt đầu (không bắt buộc)"
                                      value={item.startTime}
                                      onChange={(value) =>
                                        onItineraryChange(
                                          packageIndex,
                                          globalIndex,
                                          "startTime",
                                          value,
                                        )
                                      }
                                      type="time"
                                    />
                                    <FormField
                                      label="Giờ kết thúc (không bắt buộc)"
                                      value={item.endTime}
                                      onChange={(value) =>
                                        onItineraryChange(
                                          packageIndex,
                                          globalIndex,
                                          "endTime",
                                          value,
                                        )
                                      }
                                      type="time"
                                    />
                                    <FormField
                                      label="Địa điểm (không bắt buộc)"
                                      value={item.location}
                                      onChange={(value) =>
                                        onItineraryChange(
                                          packageIndex,
                                          globalIndex,
                                          "location",
                                          value,
                                        )
                                      }
                                      placeholder="Sảnh khách sạn"
                                    />
                                    <FormSelect
                                      label="Loại hoạt động"
                                      value={item.activityType}
                                      onChange={(value) =>
                                        onItineraryChange(
                                          packageIndex,
                                          globalIndex,
                                          "activityType",
                                          value,
                                        )
                                      }
                                      options={TOUR_ACTIVITY_TYPES}
                                    />
                                  </div>
                                  <FormTextarea
                                    label="Mô tả"
                                    value={item.description}
                                    onChange={(value) =>
                                      onItineraryChange(
                                        packageIndex,
                                        globalIndex,
                                        "description",
                                        value,
                                      )
                                    }
                                    placeholder="Hoạt động này diễn ra như thế nào?"
                                    rows={3}
                                    required
                                  />
                                  <SingleImageUploadCard
                                    label="Hình ảnh (không bắt buộc)"
                                    imageUrl={item.imageUrl}
                                    onUpload={(event) =>
                                      onItineraryImageUpload(
                                        packageIndex,
                                        globalIndex,
                                        event,
                                      )
                                    }
                                    onClear={() =>
                                      onItineraryChange(
                                        packageIndex,
                                        globalIndex,
                                        "imageUrl",
                                        "",
                                      )
                                    }
                                    uploading={tourAssetsUploading > 0}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddItineraryStep(packageIndex, dayNum)}
                            className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                          >
                            <Plus className="h-4 w-4" /> Thêm hoạt động cho ngày {dayNum}
                          </button>
                        </div>
                      );
                    });
                  })()}

                  {/* Fallback end time input when timing incomplete */}
                  {(() => {
                    const timeline = computePackageTimeline(pkg);
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
                              Thời lượng tour không thể tự động tính do thiếu giờ bắt đầu hoặc kết thúc. Vui lòng thêm giờ cho hoạt động đầu tiên (Ngày 1) và cuối cùng (Ngày cuối), hoặc nhập thời lượng ước tính bên dưới.
                            </p>
                            <div className="mt-3 flex flex-wrap items-end gap-3">
                              <div className="w-28">
                                <FormField
                                  label="Giờ"
                                  value={pkg.estimatedDurationMinutes ? String(Math.floor(Number(pkg.estimatedDurationMinutes) / 60)) : ""}
                                  onChange={(value) => {
                                    const hours = Number(value) || 0;
                                    const mins = Number(pkg.estimatedDurationMinutes || 0) % 60;
                                    onPackageChange(packageIndex, "estimatedDurationMinutes", String(hours * 60 + mins));
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
                                    onPackageChange(packageIndex, "estimatedDurationMinutes", String(hours * 60 + mins));
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
                    onClick={() => onAddItineraryDay(packageIndex)}
                    className="mt-2 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    <Plus className="h-4 w-4" /> Thêm ngày mới
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAddPackage}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <Plus className="h-4 w-4" /> Thêm gói tour khác
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        {data.packages.map((pkg, packageIndex) => (
          <div
            key={packageIndex}
            className="space-y-4 rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="font-medium text-[#1a2332]">
                  {pkg.name || `Package #${packageIndex + 1}`}
                </h4>
                <p className="text-sm text-[#5a6577]">
                  {
                    "Ng\u00E0y/gi\u1EDD k\u1EBFt th\u00FAc \u0111\u01B0\u1EE3c t\u00EDnh t\u1EF1 \u0111\u1ED9ng t\u1EEB l\u1ECBch tr\u00ECnh. M\u1ED7i phi\u00EAn kh\u1EDFi h\u00E0nh c\u00F3 s\u1ED1 l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh, s\u1EE9c ch\u1EE9a m\u1ED7i l\u01B0\u1EE3t v\u00E0 gi\u00E1 t\u00F9y ch\u1EC9nh theo t\u1EEBng b\u1EADc gi\u00E1."
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCollapsedPackage(packageIndex)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6ef] bg-white px-3 py-2 text-sm text-[#1a2332] hover:bg-[#f9fafb]"
              >
                {collapsedPackages[packageIndex] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {collapsedPackages[packageIndex] ? "M\u1EDF r\u1ED9ng" : "Thu g\u1ECDn"}
              </button>
            </div>
            {collapsedPackages[packageIndex] ? null : (
              <>
                {(() => {
                  const timeline = computePackageTimeline(pkg);
                  const firstStartTime = timeline.firstStartTime;
                  const baseBulk = pkg.bulkSession || buildEmptyBulkSessionGenerator();
                  const syncedBulk = { ...baseBulk, startTime: firstStartTime || baseBulk.startTime };
                  return (
                    <BulkSessionGenerator
                      value={syncedBulk}
                      previewSessions={pkg.generatedPreview || []}
                      generationSummary={pkg.generationSummary}
                      durationMinutes={getPackageDurationMinutes(pkg)}
                      minDate={minSessionDate}
                      maxDate={maxSessionDate}
                      defaultStartTime={firstStartTime}
                      onChange={(value) =>
                        onPackageChange(packageIndex, "bulkSession", value)
                      }
                      onGenerate={() => onGenerateSessions(packageIndex)}
                      onApply={() => onApplyGeneratedSessions(packageIndex)}
                      onDiscard={() => onDiscardGeneratedSessions(packageIndex)}
                    />
                  );
                })()}

                <TourSessionCalendarPreview
                  sessions={pkg.sessions}
                  durationMinutes={getPackageDurationMinutes(pkg)}
                />
                {(() => {
                  const timeline = computePackageTimeline(pkg);
                  const firstStartTime = timeline.firstStartTime;
                  const hasSessions = (pkg.sessions || []).length > 0;
                  return (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => toggleCollapsedSessionList(packageIndex)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        {collapsedSessions[packageIndex] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                        {hasSessions ? `Danh sách lịch (${pkg.sessions.length})` : "Danh sách lịch"}
                      </button>
                      {collapsedSessions[packageIndex] ? null : (
                        <div className="space-y-3">
                          {hasSessions ? (
                            (pkg.sessions || []).map((session, sessionIndex) => (
                              <TourSessionCard
                                key={session.tempKey || sessionIndex}
                                session={session}
                                sessionIndex={sessionIndex}
                                packageIndex={packageIndex}
                                pkg={pkg}
                                minSessionDate={minSessionDate}
                                maxSessionDate={maxSessionDate}
                                onSessionChange={onSessionChange}
                                onSessionCustomPriceChange={
                                  onSessionCustomPriceChange
                                }
                                onRemoveSession={onRemoveSession}
                                defaultStartTime={firstStartTime}
                              />
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-[#dbe4ea] bg-white px-4 py-8 text-center text-sm text-[#8d95a3]">
                              Chưa có lịch nào. Hãy dùng trình tạo hoặc thêm lịch.
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onAddSession(packageIndex)}
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover"
                          >
                            <Plus className="h-4 w-4" /> Thêm lịch
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function isDevMode() {
  try {
    return new URLSearchParams(window.location.search).get("dev") === "1";
  } catch {
    return false;
  }
}

function getDevTourPackage() {
  const pkg = buildEmptyTourPackage();
  pkg.name = "Gói Tiêu Chuẩn";
  pkg.minParticipants = "2";
  pkg.maxParticipants = "15";
  pkg.meetingPoint = "Trung tâm thành phố";
  pkg.cancellationPolicyType = "1";
  pkg.pricingTiers = [
    { tempKey: buildTempId("tour-tier"), name: "Người lớn", unitPrice: "1500000" },
    { tempKey: buildTempId("tour-tier"), name: "Trẻ em", unitPrice: "900000" },
  ];
  return pkg;
}

function getDevHomestayData() {
  const room = buildEmptyRoom();
  room.roomName = "Phòng Deluxe";
  room.bedType = "Queen";
  room.bedCount = 1;
  room.maxOccupancy = 2;
  room.numberOfRooms = "5";
  room.basePrice = "500000";
  room.weekendPrice = "700000";
  room.holidayPrice = "900000";
  room.roomDescription = "Phòng thoáng mát, có ban công nhìn ra thành phố";
  return {
    title: "Homestay Test Đà Lạt",
    description: "Homestay ấm cúng tại trung tâm thành phố, gần các địa điểm du lịch nổi tiếng",
    location: { ...EMPTY_LOCATION },
    phoneNumber: "0901234567",
    openingHours: "24/7",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    cancellationPolicyType: "1",
    cancellationPolicyNotes: "",
    houseRules: "Không hút thuốc trong phòng\nGiữ yên tĩnh sau 22h",
    availStartDate: "",
    availEndDate: "",
    availMinNights: "1",
    availMaxNights: "30",
    thumbnailUrl: "",
    images: [],
    rooms: [room],
    amenities: ["Wi-Fi", "Parking", "Kitchen"],
  };
}

function getDevTourData() {
  return {
    title: "Tour Test Đà Lạt 3N2Đ",
    descriptionBullets: [
      "Khám phá thành phố ngàn hoa",
      "Tham quan hồ Xuân Hương, Thung lũng Tình Yêu",
      "Ẩm thực đặc sắc địa phương",
    ],
    location: { ...EMPTY_LOCATION },
    images: [],
    thumbnailUrl: "",
    packages: [getDevTourPackage()],
  };
}

export default function PartnerServiceRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const dev = useMemo(() => isDevMode(), []);
  const typeFromQuery = useMemo(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("type");
      if (t === "tour" || t === "homestay") return t;
    } catch {}
    return null;
  }, []);
  const [serviceType] = useState(location.state?.type || typeFromQuery || null);
  const [currentStep, setCurrentStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [stepError, setStepError] = useState("");
  const [priceAlert, setPriceAlert] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [uploadingRooms, setUploadingRooms] = useState(0);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingTourAssets, setUploadingTourAssets] = useState(0);
  const minOpenDate = useMemo(() => getVietnamDate(), []);
  const maxOpenDate = useMemo(
    () => addDaysToDateString(minOpenDate, 365),
    [minOpenDate],
  );

  const [homestayData, setHomestayData] = useState(() =>
    dev ? getDevHomestayData() : {
      title: "",
      description: "",
      location: { ...EMPTY_LOCATION },
      phoneNumber: "",
      openingHours: "24/7",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      cancellationPolicyType: "1",
      cancellationPolicyNotes: "",
      houseRules: "",
      availStartDate: "",
      availEndDate: "",
      availMinNights: "1",
      thumbnailUrl: "",
      images: [],
      rooms: [buildEmptyRoom()],
      amenities: [],
    }
  );

  const [tourData, setTourData] = useState(() =>
    dev ? getDevTourData() : {
      title: "",
      descriptionBullets: [""],
      location: { ...EMPTY_LOCATION },
      images: [],
      thumbnailUrl: "",
      packages: [buildEmptyTourPackage()],
    }
  );



  useEffect(() => {
    if (!serviceType) {
      navigate("/PartnerService", { replace: true });
    }
  }, [navigate, serviceType]);

  useEffect(() => {
    serviceService
      .getDestinations()
      .then((response) => {
        const data = response?.data || response;
        setDestinations(Array.isArray(data) ? data : data.items || []);
      })
      .catch(() => setDestinations([]));
  }, []);

  const steps = serviceType === "homestay" ? HOMESTAY_STEPS : TOUR_STEPS;
  const isLastStep = currentStep === steps.length;
  const typeLabel = serviceType === "homestay" ? "Homestay" : "Tour";

  const updateHomestay = (field, value) => {
    setHomestayData((previous) => ({ ...previous, [field]: value }));
    setStepError("");
  };

  const updateTour = (field, value) => {
    setTourData((previous) => ({ ...previous, [field]: value }));
    setStepError("");
  };



  const updateHomestayRoom = (roomIndex, field, value) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const nextRoom = { ...rooms[roomIndex], [field]: value };
      if (field === "numberOfRooms") {
        const maxCount = Number(value) || 1;
        nextRoom.availabilityWindows = (nextRoom.availabilityWindows || []).map(
          (window) => ({
            ...window,
            availableCount: window.availableCount
              ? String(
                  Math.min(Number(window.availableCount) || maxCount, maxCount),
                )
              : window.availableCount,
          }),
        );
      }
      rooms[roomIndex] = nextRoom;
      return { ...previous, rooms };
    });
    setStepError("");
  };

  const addHomestayRoom = () => {
    setHomestayData((previous) => ({
      ...previous,
      rooms: [...previous.rooms, buildEmptyRoom()],
    }));
  };

  const removeHomestayRoom = (roomIndex) => {
    setHomestayData((previous) => ({
      ...previous,
      rooms: previous.rooms.filter((_, index) => index !== roomIndex),
    }));
  };

  const updateAvailabilityWindow = (roomIndex, windowIndex, field, value) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      const windows = [
        ...(room.availabilityWindows || [buildEmptyAvailabilityWindow()]),
      ];
      windows[windowIndex] = { ...windows[windowIndex], [field]: value };
      rooms[roomIndex] = { ...room, availabilityWindows: windows };
      return { ...previous, rooms };
    });
    setStepError("");
  };

  const addAvailabilityWindow = (roomIndex) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      rooms[roomIndex] = {
        ...room,
        availabilityWindows: [
          ...(room.availabilityWindows || []),
          buildEmptyAvailabilityWindow(),
        ],
      };
      return { ...previous, rooms };
    });
  };

  const removeAvailabilityWindow = (roomIndex, windowIndex) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      const windows = (room.availabilityWindows || []).filter(
        (_, index) => index !== windowIndex,
      );
      rooms[roomIndex] = {
        ...room,
        availabilityWindows: windows.length
          ? windows
          : [buildEmptyAvailabilityWindow()],
      };
      return { ...previous, rooms };
    });
  };

  const openNextMonth = (roomIndex) => {
    const startDate = minOpenDate;
    const tentativeEnd = addDaysToDateString(startDate, 30);
    const endDate = clampDateString(tentativeEnd, maxOpenDate);
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      rooms[roomIndex] = {
        ...room,
        availabilityWindows: [
          {
            startDate,
            endDate,
            availableCount: String(Number(room.numberOfRooms) || 1),
          },
        ],
      };
      return { ...previous, rooms };
    });
    toast.success("Đã mở tháng tiếp theo cho đặt chỗ.");
    setStepError("");
  };

  const updateTourPackage = (packageIndex, field, value) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) =>
        index === packageIndex
          ? (() => {
              const rawNextPackage =
                field === "meetingPointLocation"
                  ? {
                      ...pkg,
                      meetingPointLocation: value,
                      meetingPoint: value?.address || "",
                    }
                  : { ...pkg, [field]: value };
              const nextPackage = rawNextPackage;
              const durationMinutes = getPackageDurationMinutes(nextPackage);
              const resetPreview = field === "bulkSession";
              const nextPreview = resetPreview
                ? []
                : (pkg.generatedPreview || []).map((session) =>
                    syncTourSessionWithDuration(
                      session,
                      durationMinutes,
                      nextPackage.pricingTiers,
                    ),
                  );
              return {
                ...nextPackage,
                sessions: pkg.sessions.map((session) =>
                  syncTourSessionWithDuration(
                    session,
                    durationMinutes,
                    nextPackage.pricingTiers,
                  ),
                ),
                generatedPreview: nextPreview,
                generationSummary: resetPreview ? null : pkg.generationSummary,
              };
            })()
          : pkg,
      ),
    }));
    setStepError("");
  };

  const addTourPackage = () => {
    setTourData((previous) => ({
      ...previous,
      packages: [...previous.packages, buildEmptyTourPackage()],
    }));
    setStepError("");
  };

  const duplicateTourPackage = (packageIndex) => {
    setTourData((previous) => {
      const pkg = previous.packages[packageIndex];
      const duplicate = cloneTourPackage(
        pkg,
        previous.packages.map((item) => item.name),
      );
      return {
        ...previous,
        packages: [...previous.packages, duplicate],
      };
    });
    setStepError("");
    toast.success("Đã nhân đôi gói");
  };

  const removeTourPackage = (packageIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.filter((_, index) => index !== packageIndex),
    }));
    setStepError("");
  };

  const updateTourPricingTier = (packageIndex, tierIndex, field, value) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          pricingTiers: pkg.pricingTiers.map((tier, currentTierIndex) =>
            currentTierIndex === tierIndex ? { ...tier, [field]: value } : tier,
          ),
        };
      }),
    }));
    setStepError("");
  };

  const addTourPricingTier = (packageIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const nextPackage = {
          ...pkg,
          pricingTiers: [...pkg.pricingTiers, buildEmptyTourPricingTier()],
        };
        return syncPackageSessionsWithPricingTiers(nextPackage);
      }),
    }));
    setStepError("");
  };

  const removeTourPricingTier = (packageIndex, tierIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const pricingTiers = pkg.pricingTiers.filter(
          (_, currentTierIndex) => currentTierIndex !== tierIndex,
        );
        const nextPackage = {
          ...pkg,
          pricingTiers: pricingTiers.length
            ? pricingTiers
            : [buildEmptyTourPricingTier()],
        };
        return syncPackageSessionsWithPricingTiers(nextPackage);
      }),
    }));
    setStepError("");
  };

  const updateTourSession = (packageIndex, sessionIndex, field, value) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        return {
          ...pkg,
          sessions: pkg.sessions.map((session, currentSessionIndex) =>
            currentSessionIndex === sessionIndex
              ? syncTourSessionWithDuration(
                  { ...session, [field]: value },
                  getPackageDurationMinutes(pkg),
                  pkg.pricingTiers,
                )
              : session,
          ),
        };
      }),
    }));
    setStepError("");
  };

  const addTourSession = (packageIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) =>
        index === packageIndex
          ? {
              ...pkg,
              sessions: [
                ...pkg.sessions,
                syncTourSessionWithDuration(
                  {
                    ...buildEmptyTourSession(pkg.pricingTiers),
                    origin: "manual",
                  },
                  getPackageDurationMinutes(pkg),
                  pkg.pricingTiers,
                ),
              ],
            }
          : pkg,
      ),
    }));
    setStepError("");
  };

  const updateTourSessionCustomPrice = (
    packageIndex,
    sessionIndex,
    tierKey,
    value,
  ) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;

        return {
          ...pkg,
          sessions: pkg.sessions.map((session, currentSessionIndex) => {
            if (currentSessionIndex !== sessionIndex) return session;

            const pricingOverrides = (session.pricingOverrides || []).map(
              (item) =>
                item.tierKey === tierKey ? { ...item, customPrice: value } : item,
            );

            return syncTourSessionWithDuration(
              { ...session, pricingOverrides },
              getPackageDurationMinutes(pkg),
              pkg.pricingTiers,
            );
          }),
        };
      }),
    }));
    setStepError("");
  };

  const generateTourSessions = (packageIndex) => {
    let summary = null;

    setTourData((previous) => {
      const packages = previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const timeline = computePackageTimeline(pkg);
        const effectiveStartTime = timeline.firstStartTime || pkg.bulkSession?.startTime || "08:00";
        const generator = { ...(pkg.bulkSession || buildEmptyBulkSessionGenerator()), startTime: effectiveStartTime };
        const result = generateBulkSessions(
          generator,
          getPackageDurationMinutes(pkg),
          pkg.sessions,
          {
            minDate: minOpenDate,
            maxDate: maxOpenDate,
          },
        );
        summary = result.summary;
        return {
          ...pkg,
          generatedPreview: result.sessions.map((session) =>
            buildTourSession(
              session,
              getPackageDurationMinutes(pkg),
              session.origin || "generated",
              pkg.pricingTiers,
            ),
          ),
          generationSummary: result.summary,
        };
      });

      return { ...previous, packages };
    });

    if (summary?.createdCount) {
      toast.success(`Đã xem trước ${summary.createdCount} lịch.`);
      if (summary?.duplicateCount) {
        toast.info(`${summary.duplicateCount} lịch trùng đã được bỏ qua.`);
      }
      if (summary?.invalidCount) {
        toast.info(
          `${summary.invalidCount} ngày không hợp lệ đã được bỏ qua do vượt quá thời lượng gói hoặc phạm vi cho phép.`,
        );
      }
    } else if (summary?.duplicateCount) {
      toast.info("Tất cả lịch đã tồn tại trong gói này.");
    } else if (summary?.invalidCount) {
      toast.info(
        "Không có lịch nào được tạo do ngày đã chọn hoặc thời lượng gói không hợp lệ.",
      );
    } else {
      toast.info(
        "Không có lịch mới nào được tạo. Kiểm tra khoảng ngày, quy tắc lặp lại và thời lượng gói.",
      );
    }
    if (summary?.capped) {
      toast.info(
        `Giới hạn tạo ${MAX_BULK_TOUR_SESSIONS} lịch mỗi lần để giữ trang phản hồi nhanh.`,
      );
    }
    setStepError("");
  };

  const applyGeneratedTourSessions = (packageIndex) => {
    let appliedCount = 0;
    let duplicateCount = 0;

    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;

        const existingKeys = new Set(
          (pkg.sessions || []).map((session) => buildSessionKey(session)),
        );
        const nextSessions = [...(pkg.sessions || [])];
        for (const session of pkg.generatedPreview || []) {
          const key = buildSessionKey(session);
          if (
            !session.startDate ||
            !session.startTime ||
            existingKeys.has(key)
          ) {
            duplicateCount += 1;
            continue;
          }
          existingKeys.add(key);
          nextSessions.push(
            buildTourSession(
              { ...session, origin: "generated" },
              getPackageDurationMinutes(pkg),
              "generated",
              pkg.pricingTiers,
            ),
          );
          appliedCount += 1;
        }

        return {
          ...pkg,
          sessions: nextSessions.sort(sortSessions),
          generatedPreview: [],
          generationSummary: null,
        };
      }),
    }));

    if (appliedCount) {
      toast.success(`Đã áp dụng ${appliedCount} lịch đã sinh.`);
    } else {
      toast.info("Không có lịch nào được áp dụng.");
    }
    if (duplicateCount) {
      toast.info(`${duplicateCount} lịch đã bị bỏ qua vì đã tồn tại.`);
    }
    setStepError("");
  };

  const discardGeneratedTourSessions = (packageIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) =>
        index === packageIndex
          ? { ...pkg, generatedPreview: [], generationSummary: null }
          : pkg,
      ),
    }));
    toast.info("Đã hủy xem trước lịch.");
    setStepError("");
  };

  const removeTourSession = (packageIndex, sessionIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const sessions = pkg.sessions.filter(
          (_, currentSessionIndex) => currentSessionIndex !== sessionIndex,
        );
        return {
          ...pkg,
          sessions,
        };
      }),
    }));
    setStepError("");
  };

  const updateTourItinerary = (packageIndex, itineraryIndex, field, value) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const nextPackage = {
          ...pkg,
          itinerary: pkg.itinerary.map((item, currentItineraryIndex) =>
            currentItineraryIndex === itineraryIndex
              ? { ...item, [field]: value }
              : item,
          ),
        };
        const durationMinutes = getPackageDurationMinutes(nextPackage);
        return {
          ...nextPackage,
          sessions: pkg.sessions.map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
          generatedPreview: (pkg.generatedPreview || []).map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
        };
      }),
    }));
    setStepError("");
  };

  const addTourItineraryStep = (packageIndex, dayNumber) => {
    const targetDay = dayNumber || 1;
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const currentMaxDisplay = (pkg.itinerary || [])
          .filter((item) => item.dayNumber === targetDay)
          .reduce((max, item) => Math.max(max, item.displayOrder || 0), -1);
        const nextPackage = {
          ...pkg,
          itinerary: [
            ...pkg.itinerary,
            buildEmptyTourItineraryStep(targetDay, currentMaxDisplay + 1),
          ],
        };
        const durationMinutes = getPackageDurationMinutes(nextPackage);
        return {
          ...nextPackage,
          sessions: pkg.sessions.map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
          generatedPreview: (pkg.generatedPreview || []).map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
        };
      }),
    }));
    setStepError("");
  };

  const addTourItineraryDay = (packageIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const maxDay = (pkg.itinerary || []).reduce(
          (max, item) => Math.max(max, item.dayNumber || 0),
          0,
        );
        const newDay = maxDay + 1;
        const nextPackage = {
          ...pkg,
          itinerary: [
            ...pkg.itinerary,
            buildEmptyTourItineraryStep(newDay, 0),
          ],
        };
        const durationMinutes = getPackageDurationMinutes(nextPackage);
        return {
          ...nextPackage,
          sessions: pkg.sessions.map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
          generatedPreview: (pkg.generatedPreview || []).map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
        };
      }),
    }));
    setStepError("");
  };

  const removeTourItineraryStep = (packageIndex, itineraryIndex) => {
    setTourData((previous) => ({
      ...previous,
      packages: previous.packages.map((pkg, index) => {
        if (index !== packageIndex) return pkg;
        const itinerary = pkg.itinerary.filter(
          (_, currentItineraryIndex) => currentItineraryIndex !== itineraryIndex,
        );
        const trimmed = itinerary.length
          ? itinerary
          : [buildEmptyTourItineraryStep(1, 0)];
        const nextPackage = { ...pkg, itinerary: trimmed };
        const durationMinutes = getPackageDurationMinutes(nextPackage);
        return {
          ...nextPackage,
          sessions: pkg.sessions.map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
          generatedPreview: (pkg.generatedPreview || []).map((session) =>
            syncTourSessionWithDuration(
              session,
              durationMinutes,
              nextPackage.pricingTiers,
            ),
          ),
        };
      }),
    }));
    setStepError("");
  };

  const uploadSingleImage = async (file, folder) => {
    const response = await uploadService.uploadImage(file, folder);
    const url = normalizeUploadUrl(response);
    if (!url) {
      throw new Error("Không có đường dẫn tải lên");
    }
    return url;
  };



  const handleHomestayThumbnailUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingThumbnail(true);
    try {
      const url = await uploadSingleImage(file, "vns/homestays");
      updateHomestay("thumbnailUrl", url);
      toast.success("Đã tải ảnh bìa homestay");
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh");
    } finally {
      setUploadingThumbnail(false);
      event.target.value = "";
    }
  };

  const handleHomestayImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingTourAssets((count) => count + 1);
    try {
      const response = await uploadService.uploadImages(files, "vns/homestays");
      const urls = normalizeUploadUrls(response);
      if (!urls.length) {
        throw new Error("Không có đường dẫn ảnh");
      }

      setHomestayData((previous) => ({
        ...previous,
        images: buildRoomImageList(
          [...(previous.images || []).map((image) => image.imageUrl), ...urls],
          previous.thumbnailUrl || urls[0],
        ),
        thumbnailUrl: previous.thumbnailUrl || urls[0],
      }));
      toast.success("Đã tải ảnh homestay");
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh");
    } finally {
      setUploadingTourAssets((count) => Math.max(0, count - 1));
      event.target.value = "";
    }
  };

  const setHomestayCover = (coverUrl) => {
    setHomestayData((previous) => ({
      ...previous,
      images: buildRoomImageList(
        (previous.images || []).map((image) => image.imageUrl),
        coverUrl,
      ),
      thumbnailUrl: coverUrl,
    }));
    setStepError("");
  };

  const removeHomestayImage = (imageUrl) => {
    setHomestayData((previous) => ({
      ...previous,
      images: buildRoomImageList(
        (previous.images || [])
          .map((image) => image.imageUrl)
          .filter((url) => url !== imageUrl),
        previous.thumbnailUrl === imageUrl
          ? (previous.images || [])
              .map((image) => image.imageUrl)
              .filter((url) => url !== imageUrl)[0] || ""
          : previous.thumbnailUrl,
      ),
      thumbnailUrl:
        previous.thumbnailUrl === imageUrl
          ? (previous.images || [])
              .map((image) => image.imageUrl)
              .filter((url) => url !== imageUrl)[0] || ""
          : previous.thumbnailUrl,
    }));
    setStepError("");
  };

  const handleTourImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingTourAssets((count) => count + 1);
    try {
      const response = await uploadService.uploadImages(files, "vns/tours");
      const urls = normalizeUploadUrls(response);
      if (!urls.length) {
        throw new Error("Không có đường dẫn ảnh tour");
      }

      setTourData((previous) => ({
        ...previous,
        images: buildRoomImageList(
          [...(previous.images || []).map((image) => image.imageUrl), ...urls],
          previous.thumbnailUrl || urls[0],
        ),
        thumbnailUrl: previous.thumbnailUrl || urls[0],
      }));
      toast.success("Đã tải ảnh tour");
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh tour");
    } finally {
      setUploadingTourAssets((count) => Math.max(0, count - 1));
      event.target.value = "";
    }
  };

  const setTourCover = (coverUrl) => {
    setTourData((previous) => ({
      ...previous,
      images: buildRoomImageList(
        (previous.images || []).map((image) => image.imageUrl),
        coverUrl,
      ),
      thumbnailUrl: coverUrl,
    }));
    setStepError("");
  };

  const removeTourImage = (imageUrl) => {
    setTourData((previous) => ({
      ...previous,
      images: buildRoomImageList(
        (previous.images || [])
          .map((image) => image.imageUrl)
          .filter((url) => url !== imageUrl),
        previous.thumbnailUrl === imageUrl
          ? (previous.images || [])
              .map((image) => image.imageUrl)
              .filter((url) => url !== imageUrl)[0] || ""
          : previous.thumbnailUrl,
      ),
      thumbnailUrl:
        previous.thumbnailUrl === imageUrl
          ? (previous.images || [])
              .map((image) => image.imageUrl)
              .filter((url) => url !== imageUrl)[0] || ""
          : previous.thumbnailUrl,
    }));
    setStepError("");
  };

  const handleItineraryImageUpload = async (
    packageIndex,
    itineraryIndex,
    event,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingTourAssets((count) => count + 1);
    try {
      const url = await uploadSingleImage(file, "vns/tours");
      updateTourItinerary(packageIndex, itineraryIndex, "imageUrl", url);
      toast.success("Đã tải ảnh lịch trình");
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh lịch trình");
    } finally {
      setUploadingTourAssets((count) => Math.max(0, count - 1));
      event.target.value = "";
    }
  };

  const handleRoomImagesUpload = async (roomIndex, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingRooms((count) => count + 1);
    try {
      const response = await uploadService.uploadImages(files, "vns/rooms");
      const urls = normalizeUploadUrls(response);
      if (!urls.length) {
        throw new Error("Không có đường dẫn ảnh phòng");
      }

      setHomestayData((previous) => {
        const rooms = [...previous.rooms];
        const room = rooms[roomIndex];
        const nextUrls = [
          ...room.images.map((image) => image.imageUrl),
          ...urls,
        ];
        const coverUrl = room.coverImageUrl || urls[0];
        rooms[roomIndex] = {
          ...room,
          images: buildRoomImageList(nextUrls, coverUrl),
          coverImageUrl: coverUrl,
        };
        return { ...previous, rooms };
      });
      toast.success("Đã tải ảnh phòng");
    } catch (error) {
      toast.error(error.message || "Không thể tải ảnh phòng");
    } finally {
      setUploadingRooms((count) => Math.max(0, count - 1));
      event.target.value = "";
    }
  };

  const setRoomCover = (roomIndex, coverUrl) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      const nextUrls = room.images.map((image) => image.imageUrl);
      rooms[roomIndex] = {
        ...room,
        images: buildRoomImageList(nextUrls, coverUrl),
        coverImageUrl: coverUrl,
      };
      return { ...previous, rooms };
    });
  };

  const removeRoomImage = (roomIndex, imageUrl) => {
    setHomestayData((previous) => {
      const rooms = [...previous.rooms];
      const room = rooms[roomIndex];
      const nextUrls = room.images
        .map((image) => image.imageUrl)
        .filter((url) => url !== imageUrl);
      const nextCover =
        room.coverImageUrl === imageUrl
          ? nextUrls[0] || ""
          : room.coverImageUrl;
      rooms[roomIndex] = {
        ...room,
        images: buildRoomImageList(nextUrls, nextCover),
        coverImageUrl: nextCover,
      };
      return { ...previous, rooms };
    });
  };

  const validateHomestayStep = (step) => {
    if (step === 1) {
      if (!homestayData.title.trim()) return "Vui lòng nhập tên homestay.";
      if (!homestayData.location.latitude || !homestayData.location.longitude) {
        return "Vui lòng đánh dấu vị trí homestay trên bản đồ.";
      }
      if (!homestayData.description.trim())
        return "Vui lòng thêm mô tả homestay.";
      return "";
    }

    if (step === 2) {
      for (const [index, room] of homestayData.rooms.entries()) {
        if (!room.roomName.trim()) return `Phòng #${index + 1} cần có tên.`;
        if ((Number(room.bedCount) || 0) < 1)
          return `Phòng #${index + 1} cần ít nhất 1 giường.`;
        if (!room.basePrice || Number(room.basePrice) <= 0) {
          return `Phòng #${index + 1} cần có giá cơ bản hợp lệ.`;
        }
        const pricingError = validateRoomPricing(room, index);
        if (pricingError) return pricingError;
        if (!room.images.length) {
          return `Phòng #${index + 1} cần ít nhất một ảnh.`;
        }
        const coverCount = room.images.filter((image) => image.isCover).length;
        if (coverCount !== 1) {
          return `Phòng #${index + 1} phải có chính xác một ảnh bìa.`;
        }
      }
      return "";
    }

    if (step === 3) {
      const minNights = Number(homestayData.availMinNights);
      if (!Number.isFinite(minNights) || minNights < 1 || minNights > 30) {
        return "Số đêm tối thiểu phải từ 1 đến 30.";
      }

      for (const [roomIndex, room] of homestayData.rooms.entries()) {
        const windows = room.availabilityWindows || [];
        if (!windows.length)
          return `Phòng #${roomIndex + 1} cần ít nhất một khung ngày mở.`;

        const orderedWindows = [];
        for (const [windowIndex, window] of windows.entries()) {
          if (!window.startDate || !window.endDate) {
            return `Khung #${windowIndex + 1} của phòng #${roomIndex + 1} cần ngày bắt đầu và kết thúc.`;
          }
          if (window.startDate < minOpenDate) {
            return `Khung #${windowIndex + 1} của phòng #${roomIndex + 1} không thể bắt đầu trong quá khứ.`;
          }
          if (window.endDate > maxOpenDate) {
            return `Khung #${windowIndex + 1} của phòng #${roomIndex + 1} không thể vượt quá 1 năm.`;
          }
          if (window.endDate < window.startDate) {
            return `Khung #${windowIndex + 1} của phòng #${roomIndex + 1} kết thúc trước khi bắt đầu.`;
          }
          const availableCount = Number(
            window.availableCount || room.numberOfRooms,
          );
          const roomCount = Number(room.numberOfRooms) || 1;
          if (
            !Number.isFinite(availableCount) ||
            availableCount < 1 ||
            availableCount > roomCount
          ) {
            return `Số phòng mở cho phòng #${roomIndex + 1} phải từ 1 đến ${roomCount}.`;
          }
          orderedWindows.push(window);
        }

        orderedWindows.sort((a, b) => a.startDate.localeCompare(b.startDate));
        for (let i = 1; i < orderedWindows.length; i += 1) {
          if (orderedWindows[i].startDate <= orderedWindows[i - 1].endDate) {
            return `Phòng #${roomIndex + 1} có các khung ngày bị chồng lấp.`;
          }
        }
      }
      return "";
    }

    return "";
  };

  const validateTourStep = (step) => {
    if (step === 1) {
      if (!tourData.title.trim()) return "Vui lòng nhập tên tour.";
      if (!tourData.location.latitude || !tourData.location.longitude) {
        return "Vui lòng đánh dấu vị trí tour trên bản đồ.";
      }
      if (!tourData.images.length) {
        return "Vui lòng tải lên ít nhất một ảnh tour.";
      }
      if (tourData.images.filter((image) => image.isCover).length !== 1) {
        return "Tour cần có chính xác một ảnh bìa.";
      }
      if (getNonEmptyBulletCount(tourData.descriptionBullets) === 0) {
        return "Vui lòng thêm ít nhất một điểm nổi bật.";
      }
      return "";
    }

    if (step === 2) {
      if (!tourData.packages.length) {
        return "Vui lòng thêm ít nhất một gói.";
      }

      const packageNames = new Set();
      for (const [packageIndex, pkg] of tourData.packages.entries()) {
        const trimmedName = pkg.name.trim().toLowerCase();
        if (!trimmedName) return `Gói #${packageIndex + 1} cần có tên.`;
        if (packageNames.has(trimmedName)) {
          return `Tên gói "${pkg.name}" bị trùng lặp.`;
        }
        packageNames.add(trimmedName);

        const minParticipants = Number(pkg.minParticipants);
        const maxParticipants = Number(pkg.maxParticipants);
        if (!Number.isFinite(minParticipants) || minParticipants < 1) {
          return `Gói "${pkg.name}" cần ít nhất 1 khách tối thiểu.`;
        }
        if (
          !Number.isFinite(maxParticipants) ||
          maxParticipants < minParticipants
        ) {
          return `Gói "${pkg.name}" cần số khách tối đa lớn hơn hoặc bằng số khách tối thiểu.`;
        }
        if (
          !pkg.meetingPointLocation?.latitude ||
          !pkg.meetingPointLocation?.longitude
        ) {
          return `Gói "${pkg.name}" cần có điểm hẹn.`;
        }
        if (!pkg.pricingTiers.length) {
          return `Gói "${pkg.name}" cần ít nhất một mức giá.`;
        }

        const tierNames = new Set();
        for (const [tierIndex, tier] of pkg.pricingTiers.entries()) {
          const tierName = tier.name.trim().toLowerCase();
          if (!tierName) {
            return `Mức giá #${tierIndex + 1} trong gói "${pkg.name}" cần có tên.`;
          }
          if (tierNames.has(tierName)) {
            return `Mức giá "${tier.name}" bị trùng lặp trong gói "${pkg.name}".`;
          }
          tierNames.add(tierName);

          const unitPrice = Number(tier.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            return `Mức giá "${tier.name}" trong gói "${pkg.name}" cần có giá hợp lệ.`;
          }
        }
        if (!pkg.itinerary.length) {
          return `Gói "${pkg.name}" cần ít nhất một bước lịch trình.`;
        }
        for (const [itineraryIndex, item] of pkg.itinerary.entries()) {
          if (!item.title.trim()) {
            return `Hoạt động #${itineraryIndex + 1} trong gói "${pkg.name}" cần có tiêu đề.`;
          }
          if (!item.description.trim()) {
            return `Hoạt động #${itineraryIndex + 1} trong gói "${pkg.name}" cần có mô tả.`;
          }
        }
        const timeline = computePackageTimeline(pkg);
        if (!timeline.dayCount) {
          return `Gói "${pkg.name}" cần có ít nhất một ngày trong lịch trình.`;
        }
      }
      return "";
    }

    if (step === 3) {
      for (const [packageIndex, pkg] of tourData.packages.entries()) {
        if ((pkg.generatedPreview || []).length) {
          return `Gói "${pkg.name || `#${packageIndex + 1}`}" có lịch đã sinh đang chờ áp dụng hoặc hủy bỏ.`;
        }
        if (!pkg.sessions.length) {
          return `Gói "${pkg.name || `#${packageIndex + 1}`}" cần ít nhất một lịch.`;
        }

        const sessionKeys = new Set();
        for (const [sessionIndex, session] of pkg.sessions.entries()) {
          if (!session.startDate) {
            return `Lịch #${sessionIndex + 1} trong gói "${pkg.name || `#${packageIndex + 1}`}" cần có ngày bắt đầu.`;
          }
          if (!session.startTime) {
            return `Lịch #${sessionIndex + 1} trong gói "${pkg.name || `#${packageIndex + 1}`}" cần có giờ bắt đầu.`;
          }
          if (session.startDate < minOpenDate) {
            return `Lịch #${sessionIndex + 1} trong gói "${pkg.name || `#${packageIndex + 1}`}" không thể bắt đầu trong quá khứ.`;
          }
          if (session.startDate > maxOpenDate) {
            return `Lịch #${sessionIndex + 1} trong gói "${pkg.name || `#${packageIndex + 1}`}" không thể vượt quá 1 năm.`;
          }
          const range = calculateSessionRange(
            session.startDate,
            session.startTime,
            getPackageDurationMinutes(pkg),
          );
          const startAt = parseLocalDateTime(
            session.startDate,
            session.startTime,
          );
          const endAt = parseLocalDateTime(range.endDate, range.endTime);
          if (!startAt || !endAt || endAt < startAt) {
            return `Lịch #${sessionIndex + 1} trong gói "${pkg.name || `#${packageIndex + 1}`}" kết thúc trước khi bắt đầu.`;
          }
          if (!session.runCount || Number(session.runCount) <= 0) {
            return `L\u1ECBch #${sessionIndex + 1} trong g\u00F3i "${pkg.name || `#${packageIndex + 1}`}" c\u1EA7n c\u00F3 s\u1ED1 l\u01B0\u1EE3t kh\u1EDFi h\u00E0nh h\u1EE3p l\u1EC7.`;
          }
          for (const override of session.pricingOverrides || []) {
            if (
              override.customPrice !== "" &&
              override.customPrice !== null &&
              override.customPrice !== undefined &&
              Number(override.customPrice) <= 0
            ) {
              return `L\u1ECBch #${sessionIndex + 1} trong g\u00F3i "${pkg.name || `#${packageIndex + 1}`}" c\u1EA7n gi\u00E1 t\u00F9y ch\u1EC9nh l\u1EDBn h\u01A1n 0 ho\u1EB7c \u0111\u1EC3 tr\u1ED1ng \u0111\u1EC3 d\u00F9ng gi\u00E1 g\u00F3i.`;
            }
          }
          const sessionKey = buildSessionKey(session);
          if (sessionKeys.has(sessionKey)) {
            return `Gói "${pkg.name || `#${packageIndex + 1}`}" có lịch trùng ngày và giờ bắt đầu.`;
          }
          sessionKeys.add(sessionKey);
        }
      }
      return "";
    }

    return "";
  };

  const validateCurrentStep = () => {
    return serviceType === "homestay"
      ? validateHomestayStep(currentStep)
      : validateTourStep(currentStep);
  };

  const validateBeforePublish = () => {
    if (serviceType === "homestay") {
      return (
        validateHomestayStep(1) ||
        validateHomestayStep(2) ||
        validateHomestayStep(3)
      );
    }

    return validateTourStep(1) || validateTourStep(2) || validateTourStep(3);
  };

  const goToNextStep = () => {
    const error = validateCurrentStep();
    if (error) {
      setStepError(error);
      const isPricingError =
        error.includes("giá cơ bản") ||
        error.includes("giá cuối tuần") ||
        error.includes("giá ngày lễ") ||
        error.includes("giá");
      if (isPricingError) {
        setPriceAlert(error);
      } else {
        toast.error(error);
      }
      return;
    }

    setStepError("");
    setPriceAlert("");
    setCurrentStep((step) => step + 1);
  };

  const handlePublish = async () => {
    const validationError = validateBeforePublish();
    if (validationError) {
      setPublishError(validationError);
      toast.error(validationError);
      return;
    }

    if (uploadingRooms > 0) {
      setPublishError("Vui lòng đợi tất cả ảnh phòng tải lên hoàn tất.");
      toast.error("Vui lòng đợi tất cả ảnh phòng tải lên hoàn tất.");
      return;
    }

    if (uploadingTourAssets > 0) {
      setPublishError("Vui lòng đợi tất cả tài nguyên tour tải lên hoàn tất.");
      toast.error("Vui lòng đợi tất cả tài nguyên tour tải lên hoàn tất.");
      return;
    }

    setPublishing(true);
    setPublishError("");

    try {
      if (serviceType === "tour") {
        await serviceService.createTour({
          name: tourData.title,
          description: joinBulletLines(tourData.descriptionBullets),
          serviceType: 1,
          destinationId: tourData.location.destinationId || undefined,
          address: tourData.location.address || "",
          latitude: Number(tourData.location.latitude) || null,
          longitude: Number(tourData.location.longitude) || null,
          basePrice: 0,
          discountPrice: null,
          thumbnailUrl: tourData.thumbnailUrl || null,
          cancellationPolicyType:
            Number(
              tourData.packages.reduce(
                (highest, pkg) =>
                  Number(pkg.cancellationPolicyType) > highest
                    ? Number(pkg.cancellationPolicyType)
                    : highest,
                0,
              ),
            ) || 0,
          cancellationPolicyDescription: null,
          imageUrls: (tourData.images || []).map((image) => image.imageUrl),
          duration: getPackageDurationText(tourData.packages[0]) || "1 day",
          maxParticipants:
            getTourPackageParticipantBounds(tourData.packages[0]).maxParticipants || 1,
          minParticipants:
            getTourPackageParticipantBounds(tourData.packages[0]).minParticipants || 1,
          bookingCutoffHours: 24,
          schedules: [],
          itineraries: [],
          packages: tourData.packages.map((pkg, packageIndex) => ({
            name: pkg.name.trim(),
            duration: getPackageDurationText(pkg),
            maxParticipants: getTourPackageParticipantBounds(pkg).maxParticipants,
            minParticipants: getTourPackageParticipantBounds(pkg).minParticipants,
            bookingCutoffHours: 24,
            meetingPoint: (
              pkg.meetingPointLocation?.address ||
              pkg.meetingPoint ||
              ""
            ).trim(),
            cancellationPolicyType: Number(pkg.cancellationPolicyType) || 0,
            cancellationPolicyDescription: buildPolicyPayload(
              pkg.cancellationPolicyType,
              pkg.cancellationPolicyNotes,
            ),
            includes: pkg.includes.map((item) => item.trim()).filter(Boolean),
            excludes: pkg.excludes.map((item) => item.trim()).filter(Boolean),
            images: [],
            pricingTiers: pkg.pricingTiers.map((tier, tierIndex) => ({
              name: tier.name.trim(),
              unitPrice: Number(tier.unitPrice) || 0,
              displayOrder: tierIndex,
            })),
            sessions: pkg.sessions
              .filter((session) => session.startDate)
              .map((session) => {
                const range = calculateSessionRange(
                  session.startDate,
                  session.startTime,
                  getPackageDurationMinutes(pkg),
                );
                return {
                  startDate: buildDateTimeIso(
                    session.startDate,
                    session.startTime,
                  ),
                  endDate: buildDateTimeIso(range.endDate, range.endTime),
                  runCount: Number(session.runCount) || 1,
                  availableSlots:
                    getTourPackageParticipantBounds(pkg).maxParticipants || 1,
                  priceOverride: null,
                  pricingOverrides: buildSessionPricingOverridePayload(
                    session,
                    pkg.pricingTiers,
                  ),
                };
              }),
            itinerary: pkg.itinerary.map((item, itineraryIndex) => ({
              dayNumber: item.dayNumber || 1,
              displayOrder: item.displayOrder ?? itineraryIndex,
              title: item.title.trim(),
              description: item.description.trim(),
              startTime: item.startTime ? `${item.startTime}:00` : null,
              endTime: item.endTime ? `${item.endTime}:00` : null,
              location: item.location.trim() || null,
              activityType: item.activityType || null,
              imageUrl: item.imageUrl || null,
            })),
            displayOrder: packageIndex,
          })),
        });
      } else if (serviceType === "homestay") {
        const roomsWithPrice = homestayData.rooms.filter(
          (room) => room.basePrice,
        );
        const serviceBasePrice =
          roomsWithPrice.length > 0 ? Number(roomsWithPrice[0].basePrice) : 0;
        const availabilityWindows = homestayData.rooms.flatMap((room) =>
          (room.availabilityWindows || [])
            .filter((window) => window.startDate && window.endDate)
            .map((window) => ({
              roomKey: room.roomName,
              startDate: window.startDate,
              endDate: window.endDate,
              availableCount:
                Number(window.availableCount || room.numberOfRooms) || 1,
            })),
        );
        const allStartDates = availabilityWindows
          .map((window) => window.startDate)
          .sort();
        const allEndDates = availabilityWindows
          .map((window) => window.endDate)
          .sort();

        await serviceService.createHomestay({
          name: homestayData.title,
          description: homestayData.description,
          destinationId: homestayData.location.destinationId || undefined,
          address: homestayData.location.address || "",
          latitude: Number(homestayData.location.latitude) || null,
          longitude: Number(homestayData.location.longitude) || null,
          basePrice: serviceBasePrice,
          discountPrice: null,
          thumbnailUrl: homestayData.thumbnailUrl || null,
          cancellationPolicyType:
            Number(homestayData.cancellationPolicyType) || 0,
          cancellationPolicyDescription: buildPolicyPayload(
            homestayData.cancellationPolicyType,
            homestayData.cancellationPolicyNotes,
          ),
          imageUrls: (homestayData.images || []).map((image) => image.imageUrl),
          checkInTime: homestayData.checkInTime || "14:00:00",
          checkOutTime: homestayData.checkOutTime || "12:00:00",
          minNights: Number(homestayData.availMinNights) || 1,
          maxNights: Number(homestayData.availMaxNights) || 30,
          availableFrom: allStartDates[0] || null,
          availableTo: allEndDates[allEndDates.length - 1] || null,
          availabilityWindows,
          rooms: homestayData.rooms
            .filter((room) => room.roomName && room.basePrice)
            .map((room) => ({
              name: room.roomName,
              description: room.roomDescription || "",
              bedType: room.bedType || null,
              bedCount: Number(room.bedCount) || 1,
              maxGuests: Number(room.maxOccupancy) || 2,
              quantity: Number(room.numberOfRooms) || 1,
              basePrice: Number(room.basePrice),
              weekendPrice: Number(room.weekendPrice) || Number(room.basePrice),
              holidayPrice:
                Number(room.holidayPrice) ||
                Number(room.weekendPrice) ||
                Number(room.basePrice),
              imageUrl: room.coverImageUrl || null,
              images: room.images.map((image, index) => ({
                imageUrl: image.imageUrl,
                displayOrder: index,
                isCover: image.isCover,
              })),
              amenities: (room.amenities || []).map((name) => {
                const option = ROOM_AMENITY_OPTIONS.find(
                  (item) => item.value === name,
                );
                return { name, icon: option?.icon || null };
              }),
            })),
          amenities: (homestayData.amenities || []).map((name) => {
            const option = HOMESTAY_AMENITY_OPTIONS.find(
              (item) => item.value === name,
            );
            return { name, icon: option?.icon || null };
          }),
        });
      }

      navigate("/PartnerService", {
        state: {
          message:
            "Đã đăng dịch vụ thành công! Chúng tôi sẽ xem xét và phê duyệt dịch vụ của bạn trong vòng 24-48 giờ.",
        },
      });
    } catch (error) {
      setPublishError(error.message || "Publishing failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (!serviceType) return null;

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) navigate("/PartnerService");
              else setCurrentStep((step) => step - 1);
            }}
            className="rounded-xl p-2 text-[#5a6577] hover:bg-[#f9fafb] hover:text-[#1a2332]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332]">
              Đăng ký dịch vụ mới
              {dev ? (
                <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  DEV
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-[#5a6577]">
              {typeLabel} - Bước {currentStep}/{steps.length}
            </p>
          </div>
        </div>

        <StepIndicator steps={steps} currentStep={currentStep} />

        <div className="rounded-xl border border-[#e8ecf0] bg-white p-6">
          {isLastStep ? (
            <ConfirmPanel
              serviceType={serviceType}
              homestayData={homestayData}
              tourData={tourData}
              publishError={publishError}
            />
          ) : serviceType === "homestay" ? (
            <HomestayForm
              step={currentStep}
              data={homestayData}
              destinations={destinations}
              onChange={updateHomestay}
              onRoomChange={updateHomestayRoom}
              onAddRoom={addHomestayRoom}
              onRemoveRoom={removeHomestayRoom}
              onRoomImagesUpload={handleRoomImagesUpload}
              onSetRoomCover={setRoomCover}
              onRemoveRoomImage={removeRoomImage}
              onThumbnailUpload={handleHomestayThumbnailUpload}
              onImagesUpload={handleHomestayImagesUpload}
              onSetCover={setHomestayCover}
              onRemoveImage={removeHomestayImage}
              onAvailabilityChange={updateAvailabilityWindow}
              onAddAvailabilityWindow={addAvailabilityWindow}
              onRemoveAvailabilityWindow={removeAvailabilityWindow}
              onOpenNextMonth={openNextMonth}
              minOpenDate={minOpenDate}
              maxOpenDate={maxOpenDate}
              uploadingRooms={uploadingRooms}
              uploadingThumbnail={uploadingThumbnail}
              uploadingImages={uploadingTourAssets > 0}
              priceAlert={priceAlert}
              onDismissPriceAlert={() => setPriceAlert("")}
            />
          ) : (
            <TourForm
              step={currentStep}
              data={tourData}
              destinations={destinations}
              minSessionDate={minOpenDate}
              maxSessionDate={maxOpenDate}
              onChange={updateTour}
              onTourImagesUpload={handleTourImagesUpload}
              onSetTourCover={setTourCover}
              onRemoveTourImage={removeTourImage}
              onPackageChange={updateTourPackage}
              onAddPackage={addTourPackage}
              onDuplicatePackage={duplicateTourPackage}
              onRemovePackage={removeTourPackage}
              onTierChange={updateTourPricingTier}
              onAddTier={addTourPricingTier}
              onRemoveTier={removeTourPricingTier}
              onSessionChange={updateTourSession}
              onSessionCustomPriceChange={updateTourSessionCustomPrice}
              onAddSession={addTourSession}
              onGenerateSessions={generateTourSessions}
              onApplyGeneratedSessions={applyGeneratedTourSessions}
              onDiscardGeneratedSessions={discardGeneratedTourSessions}
              onRemoveSession={removeTourSession}
              onItineraryChange={updateTourItinerary}
               onAddItineraryStep={addTourItineraryStep}
               onAddItineraryDay={addTourItineraryDay}
               onRemoveItineraryStep={removeTourItineraryStep}
              onItineraryImageUpload={handleItineraryImageUpload}
              tourAssetsUploading={uploadingTourAssets}
            />
          )}

          {!isLastStep ? <ErrorBanner message={stepError} /> : null}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) navigate("/PartnerService");
              else setCurrentStep((step) => step - 1);
            }}
            className="flex items-center gap-2 rounded-xl border border-[#e8ecf0] px-5 py-2.5 text-[#5a6577] hover:bg-[#f9fafb]"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 1 ? "Cancel" : "Trở về"}
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={
                publishing ||
                uploadingRooms > 0 ||
                uploadingThumbnail ||
                uploadingTourAssets > 0
              }
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {publishing ? "Publishing..." : "Gửi duyệt"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-white hover:bg-primary-hover"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <PriceAlertModal message={priceAlert} onClose={() => setPriceAlert("")} />
    </div>
  );
}

