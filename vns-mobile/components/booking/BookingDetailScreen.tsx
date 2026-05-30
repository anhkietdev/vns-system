import { bookingService } from "@/api/booking.service";
import { comboService } from "@/api/combo.service";
import { reviewService } from "@/api/review.service";
import { serviceService } from "@/api/service.service";
import {
  useAppConfirm,
  useAppSnackbar,
} from "@/components/feedback/AppFeedbackProvider";
import { normalizeError } from "@/utils/normalizeError";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type BookingLine = {
  id: string;
  roomName: string | null;
  tourPackageName: string | null;
  tourPricingTierName: string | null;
  tourScheduleInfo: string | null;
  startDate: string | null;
  endDate: string | null;
  quantity: number;
  unitPrice: number;
  subTotal: number;
};

type ComboBookingItem = {
  id: string;
  comboItemId: string | null;
  displayOrder: number;
  serviceId: string;
  serviceName: string;
  serviceType: number;
  thumbnailUrl: string | null;
  roomId: string | null;
  roomName: string | null;
  tourScheduleId: string | null;
  tourScheduleInfo: string | null;
  tourPricingTierId: string | null;
  tourPricingTierName: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  startDate: string | null;
  endDate: string | null;
  quantity: number;
  unitPrice: number;
  subTotal: number;
};

type RefundPreviewComponent = {
  serviceName: string;
  serviceType: number;
  baseAmount: number;
  refundPercent: number;
  refundAmount: number;
  policyType: number;
  referenceDate: string | null;
};

type BookingDetail = {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceName: string;
  serviceType: number;
  thumbnailUrl: string | null;
  address: string | null;
  status: number;
  commercialStatus: number;
  fulfillmentStatus: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  numberOfGuests: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  startDate: string | null;
  endDate: string | null;
  bookingDate: string | null;
  partnerId: string | null;
  partnerName: string | null;
  voucherCode: string | null;
  comboId: string | null;
  comboName: string | null;
  comboOriginalAmount: number | null;
  comboBundleDiscountAmount: number | null;
  canCancel: boolean;
  canRefund: boolean;
  refundEligibleAmount: number;
  refundEligibilityMessage: string | null;
  refundComponents: RefundPreviewComponent[];
  refundSummary: {
    id: string;
    status: number | string;
    requestedAmount: number;
    approvedAmount: number | null;
    reason: string;
    adminNote: string | null;
    requestedAt: string | null;
    processedAt: string | null;
  } | null;
  payment: {
    id: string;
    amount: number;
    walletAmount: number;
    vnPayAmount: number;
    paymentMethod: number | string;
    paymentStatus: number | string;
    paidAt: string | null;
  } | null;
  details: BookingLine[];
  comboItems: ComboBookingItem[];
};

type TourPackage = {
  id: string;
  name: string;
  duration: string;
  meetingPoint: string;
  includedItems: string[];
  excludedItems: string[];
  cancellationPolicyType: number | null;
  cancellationPolicyDescription: string;
  pricingTiers: { id: string; name: string; unitPrice: number }[];
  schedules: { id: string; startDate: string; endDate: string }[];
  itineraries: {
    id: string;
    dayNumber: number;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    activityType: string;
  }[];
};

type NormalizedServiceDetail = {
  id: string;
  name: string;
  serviceType: number;
  address: string;
  destinationName: string;
  thumbnailUrl: string;
  cancellationPolicyType: number | null;
  cancellationPolicyDescription: string;
  tourPackages: TourPackage[];
  homestay: {
    checkInTime: string;
    checkOutTime: string;
    rooms: {
      id: string;
      name: string;
      bedType: string;
      maxGuests: number;
      basePrice: number;
    }[];
  } | null;
};

type ComboDetail = {
  id: string;
  name: string;
  description: string;
  comboPrice: number;
  originalPrice: number;
  thumbnailUrl: string;
  services: {
    serviceId: string;
    name: string;
    serviceType: number;
    basePrice: number;
    discountPrice: number | null;
    thumbnailUrl: string;
    description: string;
    destinationName: string;
  }[];
};

const PRIMARY_COLOR = "#008fa0";

function getBookingStatusInfo(status: number, commercialStatus: number, fulfillmentStatus: number): { label: string; color: string; backgroundColor: string } {
  const baseLabel = (s: number) => {
    switch (s) {
      case 0: return { label: "Chờ thanh toán", color: "#c2410c", backgroundColor: "#ffedd5" };
      case 1: return { label: "Đã xác nhận", color: "#0369a1", backgroundColor: "#e0f2fe" };
      case 2: return { label: "Hoàn thành", color: "#15803d", backgroundColor: "#dcfce7" };
      case 3: return { label: "Đã hủy", color: "#dc2626", backgroundColor: "#fee2e2" };
      case 4: return { label: "Đã hoàn tiền", color: "#6d28d9", backgroundColor: "#ede9fe" };
      case 5: return { label: "Chờ hoàn tiền", color: "#c2410c", backgroundColor: "#ffedd5" };
      case 7: return { label: "Hết hạn", color: "#64748b", backgroundColor: "#f1f5f9" };
      case 8: return { label: "Chờ hoàn tiền", color: "#c2410c", backgroundColor: "#ffedd5" };
      default: return { label: "Không xác định", color: "#64748b", backgroundColor: "#f1f5f9" };
    }
  };
  if (commercialStatus === 0 && fulfillmentStatus === 0 && status === 0) {
    return { label: "Chờ thanh toán", color: "#c2410c", backgroundColor: "#ffedd5" };
  }
  if (commercialStatus === 1 && fulfillmentStatus === 0) {
    return { label: "Đã thanh toán", color: "#0369a1", backgroundColor: "#e0f2fe" };
  }
  if (fulfillmentStatus === 3 && commercialStatus === 3) {
    return { label: "Đã hoàn tiền", color: "#6d28d9", backgroundColor: "#ede9fe" };
  }
  if (fulfillmentStatus === 3 && commercialStatus === 2) {
    return { label: "Chờ hoàn tiền", color: "#c2410c", backgroundColor: "#ffedd5" };
  }
  return baseLabel(status);
}

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  0: "VNPay",
  1: "Ví VNS",
  2: "Ví VNS + VNPay",
};

const CANCELLATION_POLICY_SUMMARIES: Record<number, string> = {
  0: "Hoàn tiền 100% nếu hủy trước 24 giờ. Không hoàn tiền sau đó.",
  1: "Hoàn tiền 100% nếu hủy trước 5 ngày. Hoàn 50% từ 5 ngày đến giờ khởi hành.",
  2: "Hoàn tiền 100% nếu hủy trước 30 ngày. Hoàn 50% từ 30 đến 7 ngày trước khởi hành.",
  3: "Không được hoàn tiền.",
};

const SERVICE_TYPE_LABELS: Record<number, string> = {
  0: "L\u01b0u tr\u00fa",
  1: "Tour",
  2: "Ho\u1ea1t \u0111\u1ed9ng",
  3: "Combo",
};

const cancellationPolicyLabels: Record<number, string> = {
  0: "Linh hoạt",
  1: "Vừa phải",
  2: "Chặt chẽ",
  3: "Không hoàn tiền",
};

function getItineraryIcon(
  activityType: string,
): "car" | "camera" | "restaurant" | "bus" | "flag" | "time" | "ellipse" {
  switch (activityType) {
    case "transport":
      return "car";
    case "visit":
      return "camera";
    case "meal":
      return "restaurant";
    case "pickup":
      return "bus";
    case "dropoff":
      return "flag";
    case "free_time":
      return "time";
    default:
      return "ellipse";
  }
}

function formatCurrency(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Không có dữ liệu";
  return new Date(value).toLocaleString("vi-VN");
}

function formatDate(value?: string | null) {
  if (!value) return "Không có dữ liệu";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Không có dữ liệu";
  return new Date(value).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatShortTime(value?: string | null) {
  if (!value) return "";
  if (value.includes("T")) {
    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return value.slice(0, 5);
}

function formatDateWithClock(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue) return "Không có dữ liệu";
  const date = formatDate(dateValue);
  const time = formatShortTime(timeValue);
  return time ? `${date} • ${time}` : date;
}

function calculateNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function parseScheduleStart(line?: string | null) {
  if (!line) return null;
  const first = line.split(" - ")[0]?.trim();
  if (!first) return null;
  const [day, month, year] = first.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

function getPolicySummary(policyType?: number | null) {
  if (policyType == null) return "";
  return CANCELLATION_POLICY_SUMMARIES[policyType] || "";
}

function resolvePolicyText(
  description?: string | null,
  policyType?: number | null,
) {
  return description || getPolicySummary(policyType) || "";
}

function getPolicyDisplayValue(
  description?: string | null,
  policyType?: number | null,
) {
  return resolvePolicyText(description, policyType) || "Không có dữ liệu";
}

function getRefundSummaryStatusLabel(status?: number | string | null) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "3" || normalized === "processed") return "Đã hoàn tiền";
  return "";
}

function normalizeBooking(data: any): BookingDetail {
  const raw = data?.data || data || {};
  return {
    id: String(raw.id || raw.Id || ""),
    bookingCode: raw.bookingCode || raw.BookingCode || "",
    serviceId: String(raw.serviceId || raw.ServiceId || ""),
    serviceName: raw.serviceName || raw.ServiceName || "",
    serviceType: raw.serviceType ?? raw.ServiceType ?? 0,
    thumbnailUrl: raw.thumbnailUrl || raw.ThumbnailUrl || null,
    address: raw.address || raw.Address || null,
    status: raw.status ?? raw.Status ?? 0,
    commercialStatus: raw.commercialStatus ?? raw.CommercialStatus ?? 0,
    fulfillmentStatus: raw.fulfillmentStatus ?? raw.FulfillmentStatus ?? 0,
    totalAmount: Number(raw.totalAmount ?? raw.TotalAmount ?? 0),
    discountAmount: Number(raw.discountAmount ?? raw.DiscountAmount ?? 0),
    finalAmount: Number(raw.finalAmount ?? raw.FinalAmount ?? 0),
    numberOfGuests: Number(raw.numberOfGuests ?? raw.NumberOfGuests ?? 0),
    contactName: raw.contactName || raw.ContactName || "",
    contactPhone: raw.contactPhone || raw.ContactPhone || "",
    contactEmail: raw.contactEmail || raw.ContactEmail || "",
    specialRequests: raw.specialRequests || raw.SpecialRequests || null,
    checkInDate: raw.checkInDate || raw.CheckInDate || null,
    checkOutDate: raw.checkOutDate || raw.CheckOutDate || null,
    startDate: raw.startDate || raw.StartDate || raw.checkInDate || raw.CheckInDate || null,
    endDate: raw.endDate || raw.EndDate || raw.checkOutDate || raw.CheckOutDate || null,
    bookingDate: raw.bookingDate || raw.BookingDate || null,
    partnerId: raw.partnerId || raw.PartnerId || null,
    partnerName: raw.partnerName || raw.PartnerName || null,
    voucherCode: raw.voucherCode || raw.VoucherCode || null,
    comboId: raw.comboId || raw.ComboId || null,
    comboName: raw.comboName || raw.ComboName || null,
    comboOriginalAmount:
      raw.comboOriginalAmount == null && raw.ComboOriginalAmount == null
        ? null
        : Number(raw.comboOriginalAmount ?? raw.ComboOriginalAmount ?? 0),
    comboBundleDiscountAmount:
      raw.comboBundleDiscountAmount == null && raw.ComboBundleDiscountAmount == null
        ? null
        : Number(raw.comboBundleDiscountAmount ?? raw.ComboBundleDiscountAmount ?? 0),
    canCancel: Boolean(raw.canCancel ?? raw.CanCancel ?? false),
    canRefund: Boolean(raw.canRefund ?? raw.CanRefund ?? false),
    refundEligibleAmount: Number(raw.refundEligibleAmount ?? raw.RefundEligibleAmount ?? 0),
    refundEligibilityMessage:
      raw.refundEligibilityMessage || raw.RefundEligibilityMessage || null,
    refundComponents: (raw.refundComponents || raw.RefundComponents || []).map((item: any) => ({
      serviceName: item.serviceName || item.ServiceName || "",
      serviceType: Number(item.serviceType ?? item.ServiceType ?? 0),
      baseAmount: Number(item.baseAmount ?? item.BaseAmount ?? 0),
      refundPercent: Number(item.refundPercent ?? item.RefundPercent ?? 0),
      refundAmount: Number(item.refundAmount ?? item.RefundAmount ?? 0),
      policyType: Number(item.policyType ?? item.PolicyType ?? 0),
      referenceDate: item.referenceDate || item.ReferenceDate || null,
    })),
    refundSummary: raw.refundSummary || raw.RefundSummary
      ? {
          id: String(raw.refundSummary?.id || raw.RefundSummary?.Id || ""),
          status: raw.refundSummary?.status ?? raw.RefundSummary?.Status ?? 0,
          requestedAmount: Number(raw.refundSummary?.requestedAmount ?? raw.RefundSummary?.RequestedAmount ?? 0),
          approvedAmount:
            raw.refundSummary?.approvedAmount == null && raw.RefundSummary?.ApprovedAmount == null
              ? null
              : Number(raw.refundSummary?.approvedAmount ?? raw.RefundSummary?.ApprovedAmount ?? 0),
          reason: raw.refundSummary?.reason || raw.RefundSummary?.Reason || "",
          adminNote: raw.refundSummary?.adminNote || raw.RefundSummary?.AdminNote || null,
          requestedAt: raw.refundSummary?.requestedAt || raw.RefundSummary?.RequestedAt || null,
          processedAt: raw.refundSummary?.processedAt || raw.RefundSummary?.ProcessedAt || null,
        }
      : null,
    payment: raw.payment || raw.Payment
      ? {
          id: String(raw.payment?.id || raw.Payment?.Id || ""),
          amount: Number(raw.payment?.amount ?? raw.Payment?.Amount ?? 0),
          walletAmount: Number(raw.payment?.walletAmount ?? raw.Payment?.WalletAmount ?? 0),
          vnPayAmount: Number(raw.payment?.vnPayAmount ?? raw.Payment?.VnPayAmount ?? 0),
          paymentMethod: raw.payment?.paymentMethod ?? raw.Payment?.PaymentMethod ?? 0,
          paymentStatus: raw.payment?.paymentStatus ?? raw.Payment?.PaymentStatus ?? 0,
          paidAt: raw.payment?.paidAt || raw.Payment?.PaidAt || null,
        }
      : null,
    details: (raw.details || raw.Details || []).map((item: any) => ({
      id: String(item.id || item.Id || ""),
      roomName: item.roomName || item.RoomName || null,
      tourPackageName: item.tourPackageName || item.TourPackageName || null,
      tourPricingTierName: item.tourPricingTierName || item.TourPricingTierName || null,
      tourScheduleInfo: item.tourScheduleInfo || item.TourScheduleInfo || null,
      startDate: item.startDate || item.StartDate || null,
      endDate: item.endDate || item.EndDate || null,
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? item.UnitPrice ?? 0),
      subTotal: Number(item.subTotal ?? item.SubTotal ?? 0),
    })),
    comboItems: (raw.comboItems || raw.ComboItems || []).map((item: any) => ({
      id: String(item.id || item.Id || ""),
      comboItemId: item.comboItemId || item.ComboItemId || null,
      displayOrder: Number(item.displayOrder ?? item.DisplayOrder ?? 0),
      serviceId: String(item.serviceId || item.ServiceId || ""),
      serviceName: item.serviceName || item.ServiceName || "",
      serviceType: Number(item.serviceType ?? item.ServiceType ?? 0),
      thumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl || null,
      roomId: item.roomId || item.RoomId || null,
      roomName: item.roomName || item.RoomName || null,
      tourScheduleId: item.tourScheduleId || item.TourScheduleId || null,
      tourScheduleInfo: item.tourScheduleInfo || item.TourScheduleInfo || null,
      tourPricingTierId: item.tourPricingTierId || item.TourPricingTierId || null,
      tourPricingTierName:
        item.tourPricingTierName || item.TourPricingTierName || null,
      checkInDate: item.checkInDate || item.CheckInDate || null,
      checkOutDate: item.checkOutDate || item.CheckOutDate || null,
      startDate: item.startDate || item.StartDate || null,
      endDate: item.endDate || item.EndDate || null,
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? item.UnitPrice ?? 0),
      subTotal: Number(item.subTotal ?? item.SubTotal ?? 0),
    })),
  };
}

function normalizeServiceDetail(data: any): NormalizedServiceDetail {
  const raw = data?.data || data || {};
  return {
    id: String(raw.id || raw.Id || ""),
    name: raw.name || raw.Name || "",
    serviceType: raw.serviceType ?? raw.ServiceType ?? 0,
    address: raw.address || raw.Address || "",
    destinationName: raw.destinationName || raw.DestinationName || "",
    thumbnailUrl: raw.thumbnailUrl || raw.ThumbnailUrl || "",
    cancellationPolicyType:
      raw.cancellationPolicyType ?? raw.CancellationPolicyType ?? null,
    cancellationPolicyDescription:
      raw.cancellationPolicyDescription || raw.CancellationPolicyDescription || "",
    tourPackages: (raw.tourPackages || raw.TourPackages || []).map((pkg: any) => ({
      id: String(pkg.id || pkg.Id || ""),
      name: pkg.name || pkg.Name || "",
      duration: pkg.duration || pkg.Duration || "",
      meetingPoint: pkg.meetingPoint || pkg.MeetingPoint || "",
      includedItems: pkg.includedItems || pkg.IncludedItems || [],
      excludedItems: pkg.excludedItems || pkg.ExcludedItems || [],
      cancellationPolicyType:
        pkg.cancellationPolicyType ??
        pkg.CancellationPolicyType ??
        raw.cancellationPolicyType ??
        raw.CancellationPolicyType ??
        null,
      cancellationPolicyDescription:
        pkg.cancellationPolicyDescription || pkg.CancellationPolicyDescription || "",
      pricingTiers: (pkg.pricingTiers || pkg.PricingTiers || []).map((tier: any) => ({
        id: String(tier.id || tier.Id || ""),
        name: tier.name || tier.Name || "",
        unitPrice: Number(tier.unitPrice ?? tier.UnitPrice ?? 0),
      })),
      schedules: (pkg.schedules || pkg.Schedules || []).map((schedule: any) => ({
        id: String(schedule.id || schedule.Id || ""),
        startDate: schedule.startDate || schedule.StartDate || "",
        endDate: schedule.endDate || schedule.EndDate || "",
      })),
      itineraries: (pkg.itineraries || pkg.Itineraries || []).map((item: any) => ({
        id: String(item.id || item.Id || ""),
        dayNumber: Number(item.dayNumber ?? item.DayNumber ?? 0),
        title: item.title || item.Title || "",
        description: item.description || item.Description || "",
        startTime: item.startTime || item.StartTime || "",
        endTime: item.endTime || item.EndTime || "",
        location: item.location || item.Location || "",
        activityType: item.activityType || item.ActivityType || "",
      })),
    })),
    homestay: raw.homestay || raw.Homestay
      ? {
          checkInTime:
            raw.homestay?.checkInTime ||
            raw.Homestay?.CheckInTime ||
            "",
          checkOutTime:
            raw.homestay?.checkOutTime ||
            raw.Homestay?.CheckOutTime ||
            "",
          rooms: (raw.homestay?.rooms || raw.Homestay?.Rooms || []).map((room: any) => ({
            id: String(room.id || room.Id || ""),
            name: room.name || room.Name || "",
            bedType: room.bedType || room.BedType || "",
            maxGuests: Number(room.maxGuests ?? room.MaxGuests ?? 0),
            basePrice: Number(room.basePrice ?? room.BasePrice ?? 0),
          })),
        }
      : null,
  };
}

function normalizeComboDetail(data: any): ComboDetail {
  const raw = data?.data || data || {};
  return {
    id: String(raw.id || raw.Id || ""),
    name: raw.name || raw.Name || "",
    description: raw.description || raw.Description || "",
    comboPrice: Number(raw.comboPrice ?? raw.ComboPrice ?? 0),
    originalPrice: Number(raw.originalPrice ?? raw.OriginalPrice ?? 0),
    thumbnailUrl: raw.thumbnailUrl || raw.ThumbnailUrl || "",
    services: (raw.services || raw.Services || []).map((item: any) => ({
      serviceId: String(item.serviceId || item.ServiceId || ""),
      name: item.name || item.Name || "",
      serviceType: item.serviceType ?? item.ServiceType ?? 0,
      basePrice: Number(item.basePrice ?? item.BasePrice ?? 0),
      discountPrice:
        item.discountPrice == null && item.DiscountPrice == null
          ? null
          : Number(item.discountPrice ?? item.DiscountPrice ?? 0),
      thumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl || "",
      description: item.description || item.Description || "",
      destinationName: item.destinationName || item.DestinationName || "",
    })),
  };
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, emphasize && styles.detailValueEmphasize]}>
        {value}
      </Text>
    </View>
  );
}

function InfoPill({ text }: { text: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{text}</Text>
    </View>
  );
}

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [serviceDetail, setServiceDetail] = useState<NormalizedServiceDetail | null>(null);
  const [comboDetail, setComboDetail] = useState<ComboDetail | null>(null);
  const [comboServiceDetails, setComboServiceDetails] = useState<
    Record<string, NormalizedServiceDetail | null>
  >({});
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const showConfirm = useAppConfirm();
  const showSnackbar = useAppSnackbar();

  const loadData = useCallback(async () => {
    if (!params.id) return;
    setIsLoading(true);
    try {
      const [bookingResponse, reviewsResponse] = await Promise.all([
        bookingService.getBookingById(params.id),
        reviewService.getMyReviews().catch(() => null),
      ]);

      const normalizedBooking = normalizeBooking(bookingResponse);
      setBooking(normalizedBooking);

      const reviewData = reviewsResponse ? reviewsResponse.data || reviewsResponse : [];
      const reviewItems = Array.isArray(reviewData)
        ? reviewData
        : reviewData.items || reviewData.Items || [];
      const reviewedIds = new Set(
        reviewItems.map((item: any) => String(item.bookingId || item.BookingId || "")),
      );
      setHasReviewed(reviewedIds.has(normalizedBooking.id));

      if (normalizedBooking.comboId) {
        try {
          const comboResponse = await comboService.getById(normalizedBooking.comboId);
          const normalizedCombo = normalizeComboDetail(comboResponse);
          setComboDetail(normalizedCombo);

          const detailPairs = await Promise.all(
            normalizedCombo.services.map(async (service) => {
              try {
                const response = await serviceService.getById(service.serviceId);
                return [service.serviceId, normalizeServiceDetail(response)] as const;
              } catch {
                return [service.serviceId, null] as const;
              }
            }),
          );
          setComboServiceDetails(Object.fromEntries(detailPairs));
        } catch {
          setComboDetail(null);
          setComboServiceDetails({});
        }
        setServiceDetail(null);
      } else {
        const serviceResponse = await serviceService.getById(normalizedBooking.serviceId);
        setServiceDetail(normalizeServiceDetail(serviceResponse));
        setComboDetail(null);
        setComboServiceDetails({});
      }
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({
        message: normalized.message || "Không thể tải chi tiết đặt chỗ.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.id, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleCancel = async () => {
    if (!booking) return;

    const policyType = selectedPackage?.cancellationPolicyType ?? serviceDetail?.cancellationPolicyType;
    const policyDesc = selectedPackage?.cancellationPolicyDescription || serviceDetail?.cancellationPolicyDescription || "";
    const policySummary = policyType != null
      ? `${cancellationPolicyLabels[policyType] || ""}: ${policyDesc || CANCELLATION_POLICY_SUMMARIES[policyType] || ""}`
      : "";

    let cancelMsg = `Bạn có chắc muốn hủy đặt chỗ ${booking.bookingCode} không?`;
    if (policySummary) {
      cancelMsg += `\n\nChính sách hủy: ${policySummary}`;
    }
    if (booking.finalAmount > 0) {
      cancelMsg += `\nSố tiền đã thanh toán: ${formatCurrency(booking.finalAmount)}`;
      if (policyType === 3) {
        cancelMsg += "\n\n⚠️ Đây là gói Không hoàn tiền. Bạn sẽ không được hoàn lại số tiền đã thanh toán.";
      }
    }
    if (booking.refundEligibilityMessage) {
      cancelMsg += `\n\n${booking.refundEligibilityMessage}`;
    }
    if (booking.refundEligibleAmount > 0) {
      cancelMsg += `\nHoàn tiền dự kiến: ${formatCurrency(booking.refundEligibleAmount)}`;
    }
    if (booking.payment && booking.refundEligibleAmount > 0) {
      cancelMsg += "\n\nNếu xác nhận hủy, hệ thống sẽ tự động hoàn tiền về Ví VNS của bạn theo chính sách hủy.";
    } else if (booking.payment) {
      cancelMsg += "\n\nNếu xác nhận hủy, booking sẽ đóng ngay và không tạo yêu cầu hoàn tiền bổ sung.";
    }

    const approved = await showConfirm({
      title: "Hủy đặt chỗ",
      message: cancelMsg,
      confirmLabel: "Xác nhận hủy",
      cancelLabel: "Quay lại",
      tone: "error",
    });
    if (!approved) return;

    try {
      const result = await bookingService.cancelBooking(booking.id, "Người dùng hủy từ ứng dụng di động");
      const resData = result?.data || result;
      const refundAmount = resData?.refundAmount ?? resData?.RefundAmount;

      let successMsg = "Đã hủy đặt chỗ thành công.";
      if (refundAmount != null && Number(refundAmount) > 0) {
        successMsg += `\nSố tiền ${formatCurrency(Number(refundAmount))} đã được hoàn về Ví VNS của bạn.`;
      } else if (policyType !== 3) {
        successMsg += "\nBooking đã được hủy. Hiện không có khoản hoàn tiền nào được tạo thêm cho đơn này.";
      }

      showSnackbar({ message: successMsg, tone: "success" });
      loadData();
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({
        message: normalized.message || "Không thể hủy đặt chỗ.",
        tone: "error",
      });
    }
  };

  const handleContactSupport = () => {
    if (!booking?.partnerId) {
      showSnackbar({
        message: "Không tìm thấy thông tin đối tác để liên hệ.",
        tone: "error",
      });
      return;
    }

    router.push({
      pathname: "/chat-detail",
      params: {
        partnerId: booking.partnerId,
        partnerName: booking.partnerName || "Đối tác",
        partnerAvatar: "https://picsum.photos/seed/partner1/100/100",
      },
    });
  };

  const handleReview = () => {
    if (!booking) return;
    router.push({
      pathname: "/review-booking",
      params: { bookingId: booking.id },
    });
  };

  if (isLoading || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Đang tải chi tiết đặt chỗ...</Text>
      </View>
    );
  }

  const statusInfo = getBookingStatusInfo(booking.status, booking.commercialStatus, booking.fulfillmentStatus);
  const isComboBooking = booking.serviceType === 3 || !!booking.comboId;
  const isTourBooking = booking.serviceType === 1 && !isComboBooking;
  const isHomestayBooking = booking.serviceType === 0 && !isComboBooking;
  const canCancel = booking.canCancel;
  const canReview = booking.fulfillmentStatus === 2 && !hasReviewed;
  const refundSummaryStatusLabel = getRefundSummaryStatusLabel(
    booking.refundSummary?.status,
  );
  const comboItems = [...(booking.comboItems || [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  const homestayLines = booking.details.filter((line) => !!line.roomName);
  const tourLines = booking.details.filter((line) => !!line.tourPackageName || !!line.startDate);
  const homestaySubtotal = homestayLines.reduce((sum, line) => sum + line.subTotal, 0);
  const roomsCount = homestayLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const matchedRoom =
    serviceDetail?.homestay?.rooms.find((room) => room.name === homestayLines[0]?.roomName) ||
    serviceDetail?.homestay?.rooms[0] ||
    null;
  const pricePerNight =
    roomsCount > 0 && nights > 0 ? homestaySubtotal / (roomsCount * nights) : 0;

  const selectedPackage =
    serviceDetail?.tourPackages.find((pkg) => pkg.name === tourLines[0]?.tourPackageName) ||
    serviceDetail?.tourPackages[0] ||
    null;
  const selectedScheduleDate = tourLines[0]?.startDate?.slice(0, 10);
  const matchedSchedule =
    selectedPackage?.schedules.find(
      (schedule) => schedule.startDate.slice(0, 10) === selectedScheduleDate,
    ) || selectedPackage?.schedules[0] || null;
  const startTime = matchedSchedule?.startDate || "";
  const endTime = matchedSchedule?.endDate || "";
  const dropOffPoint =
    selectedPackage?.itineraries.find((item) => item.activityType === "dropoff")?.location ||
    "";

  const comboHomestay = comboDetail?.services.find((service) => service.serviceType === 0) || null;
  const comboTour = comboDetail?.services.find((service) => service.serviceType === 1) || null;
  const comboHomestayDetail = comboHomestay
    ? comboServiceDetails[comboHomestay.serviceId]
    : null;
  const comboTourDetail = comboTour ? comboServiceDetails[comboTour.serviceId] : null;
  const comboTourPackage = comboTourDetail?.tourPackages[0] || null;
  const comboStayItems = comboItems.filter(
    (item) => item.serviceType === 0 || item.roomName || item.checkInDate || item.checkOutDate,
  );
  const comboTourItems = comboItems.filter(
    (item) => item.serviceType === 1 || item.startDate || item.tourPricingTierName,
  );
  const comboServiceSubtotal =
    booking.comboOriginalAmount ??
    comboItems.reduce((sum, item) => sum + item.subTotal, 0);
  const comboDiscount =
    booking.comboBundleDiscountAmount ??
    Math.max(0, comboServiceSubtotal - booking.totalAmount);
  const homestayPolicyDescription = getPolicyDisplayValue(
    serviceDetail?.cancellationPolicyDescription,
    serviceDetail?.cancellationPolicyType,
  );
  const tourPolicyDescription = getPolicyDisplayValue(
    selectedPackage?.cancellationPolicyDescription ||
      serviceDetail?.cancellationPolicyDescription,
    selectedPackage?.cancellationPolicyType ?? serviceDetail?.cancellationPolicyType,
  );
  const comboPolicies = [
    resolvePolicyText(
      comboHomestayDetail?.cancellationPolicyDescription,
      comboHomestayDetail?.cancellationPolicyType,
    ),
    resolvePolicyText(
      comboTourPackage?.cancellationPolicyDescription ||
        comboTourDetail?.cancellationPolicyDescription,
      comboTourPackage?.cancellationPolicyType ??
        comboTourDetail?.cancellationPolicyType,
    ),
  ].filter((policy, index, list) => !!policy && list.indexOf(policy) === index);

  const heroImage =
    comboDetail?.thumbnailUrl ||
    booking.thumbnailUrl ||
    serviceDetail?.thumbnailUrl ||
    comboItems.find((item) => !!item.thumbnailUrl)?.thumbnailUrl ||
    comboHomestay?.thumbnailUrl ||
    comboTour?.thumbnailUrl ||
    "https://picsum.photos/seed/booking-detail/900/600";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1a2332" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đặt chỗ</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <Image source={{ uri: heroImage }} style={styles.heroImage} />

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.backgroundColor },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <Text style={styles.serviceName}>
            {isComboBooking ? booking.comboName || comboDetail?.name || booking.serviceName : booking.serviceName}
          </Text>
          <Text style={styles.serviceSubtitle}>
            {booking.partnerName ? `Đối tác: ${booking.partnerName}` : "Thông tin dịch vụ"}
          </Text>
          <View style={styles.heroMetaRow}>
            {!!(booking.address || serviceDetail?.address || comboHomestayDetail?.address || comboTourDetail?.address) && (
              <InfoPill
                text={
                  booking.address ||
                  serviceDetail?.address ||
                  comboHomestayDetail?.address ||
                  comboTourDetail?.address ||
                  ""
                }
              />
            )}
            <InfoPill text={`Đặt ngày ${formatDate(booking.bookingDate)}`} />
          </View>
        </View>

        {isHomestayBooking && (
          <>
            <SectionCard title="Thông tin homestay">
              <DetailRow label="Tên homestay" value={booking.serviceName} />
              <DetailRow label="Loại phòng" value={matchedRoom?.name || homestayLines[0]?.roomName || "Không có dữ liệu"} />
              <DetailRow
                label="Nhận phòng"
                value={formatDateWithClock(booking.checkInDate, serviceDetail?.homestay?.checkInTime || "")}
              />
              <DetailRow
                label="Trả phòng"
                value={formatDateWithClock(booking.checkOutDate, serviceDetail?.homestay?.checkOutTime || "")}
              />
              <DetailRow label="Số đêm" value={nights > 0 ? `${nights} đêm` : "Không có dữ liệu"} />
              <DetailRow label="Số phòng" value={roomsCount > 0 ? `${roomsCount} phòng` : "Không có dữ liệu"} />
            </SectionCard>

            <SectionCard title="Chi tiết giá">
              <DetailRow
                label="Giá mỗi đêm"
                value={pricePerNight > 0 ? formatCurrency(pricePerNight) : "Không có dữ liệu"}
              />
              <DetailRow label="Đêm × phòng" value={nights > 0 && roomsCount > 0 ? `${nights} × ${roomsCount}` : "Không có dữ liệu"} />
              <DetailRow label="Tạm tính" value={formatCurrency(homestaySubtotal || booking.totalAmount)} />
              <DetailRow
                label="Giảm giá"
                value={booking.discountAmount > 0 ? `- ${formatCurrency(booking.discountAmount)}` : "0đ"}
              />
              <DetailRow label="Đã thanh toán" value={formatCurrency(booking.finalAmount)} emphasize />
            </SectionCard>

            <SectionCard title="Trạng thái">
              <DetailRow label="Trạng thái đặt chỗ" value={statusInfo.label} />
            </SectionCard>

            <SectionCard title="Thông tin bổ sung">
              <DetailRow label="Mã đặt chỗ" value={booking.bookingCode} />
              {(booking.contactName || booking.contactPhone || booking.contactEmail) && (
                <DetailRow
                  label="Liên hệ"
                  value={[booking.contactName, booking.contactPhone, booking.contactEmail].filter(Boolean).join(" • ")}
                />
              )}
              <DetailRow
                label="Mô tả chính sách hủy"
                value={homestayPolicyDescription}
              />
            </SectionCard>
          </>
        )}

        {isTourBooking && (
          <>
            <SectionCard title="Thông tin tour">
              <DetailRow label="Tên tour" value={booking.serviceName} />
              <DetailRow label="Tên gói" value={selectedPackage?.name || tourLines[0]?.tourPackageName || "Không có dữ liệu"} />
              <DetailRow
                label="Ngày khởi hành"
                value={booking.startDate ? formatDateLabel(booking.startDate) : matchedSchedule?.startDate ? formatDateLabel(matchedSchedule.startDate) : tourLines[0]?.startDate ? formatDateLabel(tourLines[0].startDate) : "Không có dữ liệu"}
              />
              <DetailRow label="Giờ bắt đầu" value={formatShortTime(startTime) || "Không có dữ liệu"} />
              <DetailRow label="Giờ kết thúc" value={formatShortTime(endTime) || "Không có dữ liệu"} />
              <DetailRow label="Thời lượng" value={selectedPackage?.duration || "Không có dữ liệu"} />
            </SectionCard>

            <SectionCard title="Người tham gia">
              <DetailRow label="Tổng số người" value={`${booking.numberOfGuests || tourLines.reduce((sum, line) => sum + line.quantity, 0)} người`} />
              {tourLines.length > 1 ? (
                <View style={styles.breakdownGroup}>
                  {tourLines.map((line) => (
                    <DetailRow
                      key={line.id}
                      label={line.tourPricingTierName || "Nhóm khách"}
                      value={`${line.quantity} người`}
                    />
                  ))}
                </View>
              ) : (
                <DetailRow
                  label="Chi tiết"
                  value={tourLines[0]?.tourPricingTierName ? `${tourLines[0].tourPricingTierName}: ${tourLines[0].quantity} người` : "Không có phân loại"}
                />
              )}
            </SectionCard>

            <SectionCard title="Địa điểm">
              <DetailRow label="Điểm đón" value={selectedPackage?.meetingPoint || "Không có dữ liệu"} />
              {dropOffPoint ? <DetailRow label="Điểm trả" value={dropOffPoint} /> : null}
            </SectionCard>

            <SectionCard title="Lịch trình">
              {selectedPackage?.itineraries.length ? (
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineAbsoluteLine} />
                  {selectedPackage.itineraries
                    .sort((a: any, b: any) => a.dayNumber - b.dayNumber)
                    .map((item: any, index: number) => {
                      const isLast = index === selectedPackage.itineraries.length - 1;
                      return (
                        <View key={item.id || index} style={styles.timelineRow}>
                          <View style={styles.timelineDot}>
                            <Ionicons
                              name={getItineraryIcon(item.activityType)}
                              size={16}
                              color={PRIMARY_COLOR}
                            />
                          </View>
                          <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                            <Text style={styles.timelineTitle}>
                              {item.title}
                            </Text>
                            {item.startTime || item.endTime ? (
                              <View style={styles.timelineMetaRow}>
                                <Ionicons name="time-outline" size={13} color="#8d95a3" />
                                <Text style={styles.timelineMetaText}>
                                  {item.startTime ? item.startTime.substring(0, 5) : ""}
                                  {item.startTime && item.endTime ? " - " : ""}
                                  {item.endTime ? item.endTime.substring(0, 5) : ""}
                                </Text>
                              </View>
                            ) : null}
                            {item.location ? (
                              <View style={styles.timelineMetaRow}>
                                <Ionicons name="location-outline" size={13} color="#8d95a3" />
                                <Text style={styles.timelineMetaText}>{item.location}</Text>
                              </View>
                            ) : null}
                            {item.description ? (
                              <Text style={styles.timelineDescription}>{item.description}</Text>
                            ) : null}
                            {item.imageUrl ? (
                              <Image source={{ uri: item.imageUrl }} style={styles.timelineImage} />
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Chưa có lịch trình chi tiết.</Text>
              )}
            </SectionCard>

            {(selectedPackage?.includedItems?.length || selectedPackage?.excludedItems?.length) ? (
              <SectionCard title="Bao gồm / Không bao gồm">
                {selectedPackage.includedItems?.length ? (
                  <>
                    <Text style={styles.includedExcludedTitle}>Bao gồm</Text>
                    {selectedPackage.includedItems.map((item: string, index: number) => (
                      <View key={`inc-${index}`} style={styles.listRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                        <Text style={styles.listRowText}>{item}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
                {selectedPackage.excludedItems?.length ? (
                  <View style={selectedPackage.includedItems?.length ? { marginTop: 16 } : undefined}>
                    <Text style={styles.includedExcludedTitle}>Không bao gồm</Text>
                    {selectedPackage.excludedItems.map((item: string, index: number) => (
                      <View key={`exc-${index}`} style={styles.listRow}>
                        <Ionicons name="remove-circle-outline" size={16} color="#ef4444" />
                        <Text style={styles.listRowText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </SectionCard>
            ) : null}

            <SectionCard title="Chi tiết giá">
              {tourLines.map((line) => (
                <DetailRow
                  key={line.id}
                  label={line.tourPricingTierName || line.tourPackageName || "Số lượng × giá"}
                  value={`${line.quantity} × ${formatCurrency(line.unitPrice)}`}
                />
              ))}
              <DetailRow
                label="Tạm tính"
                value={formatCurrency(
                  tourLines.reduce((sum, line) => sum + line.subTotal, 0) || booking.totalAmount,
                )}
              />
              <DetailRow
                label="Giảm giá"
                value={booking.discountAmount > 0 ? `- ${formatCurrency(booking.discountAmount)}` : "0đ"}
              />
              <DetailRow label="Đã thanh toán" value={formatCurrency(booking.finalAmount)} emphasize />
            </SectionCard>

            <SectionCard title="Trạng thái">
              <DetailRow label="Trạng thái đặt chỗ" value={statusInfo.label} />
            </SectionCard>

            <SectionCard title="Thông tin bổ sung">
              <DetailRow label="Mã đặt chỗ" value={booking.bookingCode} />
              <DetailRow
                label="Chính sách hủy"
                value={tourPolicyDescription}
              />
            </SectionCard>
          </>
        )}

        {isComboBooking && (
          <>
            <SectionCard title={"Thông tin đặt chỗ"}>
              <DetailRow label={"Mã đặt chỗ"} value={booking.bookingCode} />
              <DetailRow label={"Trạng thái đặt chỗ"} value={statusInfo.label} />
              <DetailRow
                label={"Tên combo"}
                value={booking.comboName || comboDetail?.name || "Không có dữ liệu"}
              />
              <DetailRow
                label={"Số khách"}
                value={booking.numberOfGuests > 0 ? `${booking.numberOfGuests} khách` : "Không có dữ liệu"}
              />
            </SectionCard>

            <SectionCard title={"Dịch vụ trong combo"}>
              {comboItems.length ? (
                comboItems.map((item, index) => (
                  <View key={item.id || `${item.serviceId}-${index}`} style={styles.comboItemCard}>
                    <View style={styles.comboItemTitleRow}>
                      <Text style={styles.timelineTitle}>{item.serviceName || "Không có dữ liệu"}</Text>
                      <View style={styles.comboItemBadge}>
                        <Text style={styles.comboItemBadgeText}>
                          {SERVICE_TYPE_LABELS[item.serviceType] || "Dịch vụ"}
                        </Text>
                      </View>
                    </View>
                    {item.roomName ? (
                      <Text style={styles.comboItemMetaText}>
                        Phòng: {item.roomName}
                        {item.quantity > 0 ? ` • ${item.quantity} phòng` : ""}
                      </Text>
                    ) : null}
                    {item.checkInDate || item.checkOutDate ? (
                      <Text style={styles.comboItemMetaText}>
                        Lưu trú: {formatDate(item.checkInDate)} - {formatDate(item.checkOutDate)}
                      </Text>
                    ) : null}
                    {item.startDate && item.endDate ? (
                      <Text style={styles.comboItemMetaText}>
                        Lịch khởi hành: {formatDateLabel(item.startDate)} - {formatDateLabel(item.endDate)}
                      </Text>
                    ) : null}
                    {item.tourPricingTierName ? (
                      <Text style={styles.comboItemMetaText}>
                        Khung giá: {item.tourPricingTierName}
                      </Text>
                    ) : null}
                    {!item.roomName && !item.startDate && item.quantity > 0 ? (
                      <Text style={styles.comboItemMetaText}>
                        Số lượng: {item.quantity}
                      </Text>
                    ) : null}
                    <Text style={styles.comboItemMetaText}>
                      Tạm tính: {formatCurrency(item.subTotal)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Không có dữ liệu</Text>
              )}
            </SectionCard>

            {comboStayItems.length ? (
              <SectionCard title={"Lưu trú"}>
                {comboStayItems.map((item, index) => (
                  <View key={`stay-${item.id || index}`}>
                    <DetailRow label={`Dịch vụ ${index + 1}`} value={item.serviceName || "Không có dữ liệu"} />
                    <DetailRow label={"Loại phòng"} value={item.roomName || "Không có dữ liệu"} />
                    <DetailRow label={"Nhận phòng"} value={formatDate(item.checkInDate)} />
                    <DetailRow label={"Trả phòng"} value={formatDate(item.checkOutDate)} />
                    <DetailRow label={"Số lượng"} value={item.quantity > 0 ? `${item.quantity} phòng` : "Không có dữ liệu"} />
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {comboTourItems.length ? (
              <SectionCard title={"Tour trong combo"}>
                {comboTourItems.map((item, index) => (
                  <View key={`tour-${item.id || index}`}>
                    <DetailRow label={`Dịch vụ ${index + 1}`} value={item.serviceName || "Không có dữ liệu"} />
                    <DetailRow label={"Lịch khởi hành"} value={item.startDate && item.endDate ? `${formatDateLabel(item.startDate)} - ${formatDateLabel(item.endDate)}` : "Không có dữ liệu"} />
                    <DetailRow label={"Khung giá"} value={item.tourPricingTierName || "Không có dữ liệu"} />
                    <DetailRow label={"Số lượng"} value={item.quantity > 0 ? `${item.quantity}` : "Không có dữ liệu"} />
                  </View>
                ))}
              </SectionCard>
            ) : null}

            <SectionCard title={"Chi tiết giá"}>
              <DetailRow label={"Tạm tính dịch vụ"} value={formatCurrency(comboServiceSubtotal)} />
              <DetailRow label={"Giảm giá combo"} value={comboDiscount > 0 ? `- ${formatCurrency(comboDiscount)}` : "0đ"} />
              <DetailRow
                label={"Giảm giá voucher"}
                value={booking.discountAmount > 0 ? `- ${formatCurrency(booking.discountAmount)}` : "0đ"}
              />
              <DetailRow label={"Đã thanh toán"} value={formatCurrency(booking.finalAmount)} emphasize />
            </SectionCard>

            <SectionCard title={"Chính sách"}>
              {comboPolicies.length ? (
                comboPolicies.map((policy, index) => (
                  <DetailRow key={`${policy}-${index}`} label={`Chính sách ${index + 1}`} value={policy} />
                ))
              ) : (
                <DetailRow label={"Chính sách hủy"} value={"Không có dữ liệu"} />
              )}
            </SectionCard>
          </>
        )}

        {booking.refundSummary && refundSummaryStatusLabel ? (
          <SectionCard title="Hoàn tiền">
            <DetailRow
              label="Trạng thái"
              value={refundSummaryStatusLabel}
            />
            <DetailRow
              label="Số tiền"
              value={formatCurrency(booking.refundSummary.requestedAmount)}
            />
            {booking.refundSummary.approvedAmount != null ? (
              <DetailRow
                label="Đã hoàn"
                value={formatCurrency(booking.refundSummary.approvedAmount)}
              />
            ) : null}
            {booking.refundSummary.processedAt ? (
              <DetailRow
                label="Xử lý lúc"
                value={formatDateTime(booking.refundSummary.processedAt)}
              />
            ) : null}
            {booking.refundSummary.adminNote ? (
              <DetailRow
                label="Ghi chú"
                value={booking.refundSummary.adminNote}
              />
            ) : null}
          </SectionCard>
        ) : null}

        {booking.payment && (
          <SectionCard title="Thanh toán">
            <DetailRow label="Phương thức" value={PAYMENT_METHOD_LABELS[Number(booking.payment.paymentMethod)] || "Không có dữ liệu"} />
            <DetailRow label="Số tiền" value={formatCurrency(booking.payment.amount)} />
            {booking.payment.walletAmount > 0 ? (
              <DetailRow label="Thanh toán từ ví" value={formatCurrency(booking.payment.walletAmount)} />
            ) : null}
            {booking.payment.vnPayAmount > 0 ? (
              <DetailRow label="Thanh toán qua VNPay" value={formatCurrency(booking.payment.vnPayAmount)} />
            ) : null}
            <DetailRow label="Thời gian thanh toán" value={booking.payment.paidAt ? formatDateTime(booking.payment.paidAt) : "Chưa thanh toán"} />
          </SectionCard>
        )}

        {booking.specialRequests ? (
          <SectionCard title="Ghi chú">
            <Text style={styles.noteText}>{booking.specialRequests}</Text>
          </SectionCard>
        ) : null}

        {booking.fulfillmentStatus === 2 && hasReviewed ? (
          <View style={styles.reviewDoneBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#15803d" />
            <Text style={styles.reviewDoneText}>Bạn đã đánh giá dịch vụ này.</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.secondaryAction} onPress={handleContactSupport}>
          <Ionicons name="chatbubble-outline" size={18} color={PRIMARY_COLOR} />
          <Text style={styles.secondaryActionText}>Liên hệ hỗ trợ</Text>
        </TouchableOpacity>

        {canCancel ? (
          <TouchableOpacity style={styles.dangerAction} onPress={handleCancel}>
            <Text style={styles.dangerActionText}>Hủy đặt chỗ</Text>
          </TouchableOpacity>
        ) : null}

        {canReview ? (
          <TouchableOpacity style={styles.primaryAction} onPress={handleReview}>
            <Ionicons name="star-outline" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Đánh giá dịch vụ</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  scrollContent: {
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  heroImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#e2e8f0",
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  bookingCode: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 6,
  },
  serviceSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoPill: {
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoPillText: {
    fontSize: 12,
    color: "#475569",
  },
  section: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#64748b",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    textAlign: "right",
  },
  detailValueEmphasize: {
    color: "#ea580c",
    fontSize: 16,
  },
  comboItemCard: {
    borderWidth: 1,
    borderColor: "#e8ecf0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  comboItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  comboItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
  },
  comboItemBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369a1",
  },
  comboItemMetaText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginTop: 4,
  },
  breakdownGroup: {
    marginTop: 6,
  },
  timelineContainer: {
    position: "relative",
  },
  timelineAbsoluteLine: {
    position: "absolute",
    left: 17,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 1,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  timelineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  timelineMetaText: {
    fontSize: 14,
    color: "#8d95a3",
  },
  timelineDescription: {
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    marginTop: 4,
  },
  timelineImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginTop: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  listRowText: {
    flex: 1,
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
  },
  includedExcludedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
  },
  noteText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  reviewDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  reviewDoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#166534",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e8ecf0",
  },
  secondaryAction: {
    flex: 1,
    minWidth: 150,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  dangerAction: {
    flex: 1,
    minWidth: 150,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  dangerActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
  },
  primaryAction: {
    flex: 1,
    minWidth: 150,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
