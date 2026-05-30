import { bookingService } from "@/api/booking.service";
import { comboService } from "@/api/combo.service";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY_COLOR = "#008fa0";

type ComboServiceItem = {
  id?: string;
  displayOrder?: number;
  serviceId: string;
  name: string;
  serviceType: number;
  basePrice: number;
  fromPrice?: number;
  thumbnailUrl?: string;
  description?: string;
  destinationName?: string;
  cancellationPolicyType?: number;
};

type TourPricingTier = {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  minQuantity: number;
  maxQuantity: number;
};

type TourPackage = {
  id: string;
  name: string;
  duration: string;
  minParticipants: number;
  maxParticipants: number;
  cancellationPolicyType: number;
  bookingCutoffHours: number;
  pricingTiers: TourPricingTier[];
};

type ComboDetail = {
  id: string;
  name: string;
  description: string;
  comboPrice: number;
  originalPrice: number;
  fromComboPrice: number;
  fromOriginalPrice: number;
  discountType: number;
  discountValue: number;
  thumbnailUrl: string;
  dateDriver: number;
  stayOffsetBeforeDays: number;
  stayOffsetAfterDays: number;
  isPubliclyBookable: boolean;
  blockingReasons: string[];
  homestayRules: {
    minNights: number;
    maxNights: number;
    availableFrom?: string | null;
    availableTo?: string | null;
    activeRoomCount: number;
    rooms?: {
      id: string;
      name: string;
      basePrice: number;
      maxGuests: number;
      quantity: number;
    }[];
  } | null;
  tourSchedules: {
    id: string;
    startDate: string;
    endDate: string;
    status: string | number;
    packageId?: string;
    packageName?: string;
    bookingCutoffHours?: number;
    remainingCapacity: number;
    availableSlots: number;
    runCount: number;
    fromPrice: number;
  }[];
  tourPackages: TourPackage[];
  services: ComboServiceItem[];
};

type ComboQuoteItem = {
  comboItemId: string;
  serviceId: string;
  serviceName: string;
  serviceType: number;
  roomId?: string;
  roomName?: string;
  tourScheduleId?: string;
  tourScheduleInfo?: string;
  tourPricingTierId?: string;
  tourPricingTierName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  startDate?: string;
  endDate?: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
};

type ComboQuote = {
  quoteId: string;
  comboId: string;
  comboName: string;
  dateDriver: number;
  numberOfGuests: number;
  checkInDate?: string;
  checkOutDate?: string;
  tourScheduleId?: string;
  originalAmount: number;
  comboDiscountAmount: number;
  finalAmount: number;
  expiresAt: string;
  items: ComboQuoteItem[];
};

function formatCurrency(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa chọn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chua co lich";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeComboDetail(data: any): ComboDetail {
  const raw = data?.data || data || {};
  return {
    id: String(raw.id || raw.Id || ""),
    name: raw.name || raw.Name || "",
    description: raw.description || raw.Description || "",
    comboPrice: Number(raw.comboPrice ?? raw.ComboPrice ?? 0),
    originalPrice: Number(raw.originalPrice ?? raw.OriginalPrice ?? 0),
    fromComboPrice: Number(raw.fromComboPrice ?? raw.FromComboPrice ?? raw.comboPrice ?? raw.ComboPrice ?? 0),
    fromOriginalPrice: Number(raw.fromOriginalPrice ?? raw.FromOriginalPrice ?? raw.originalPrice ?? raw.OriginalPrice ?? 0),
    discountType: Number(raw.discountType ?? raw.DiscountType ?? 0),
    discountValue: Number(raw.discountValue ?? raw.DiscountValue ?? 0),
    thumbnailUrl: raw.thumbnailUrl || raw.ThumbnailUrl || "",
    dateDriver: Number(raw.dateDriver ?? raw.DateDriver ?? 0),
    stayOffsetBeforeDays: Number(raw.stayOffsetBeforeDays ?? raw.StayOffsetBeforeDays ?? 0),
    stayOffsetAfterDays: Number(raw.stayOffsetAfterDays ?? raw.StayOffsetAfterDays ?? 0),
    isPubliclyBookable: Boolean(raw.isPubliclyBookable ?? raw.IsPubliclyBookable ?? false),
    blockingReasons: (raw.blockingReasons || raw.BlockingReasons || []).map((item: any) => String(item)),
    homestayRules: raw.homestayRules || raw.HomestayRules
      ? {
          minNights: Number(raw.homestayRules?.minNights ?? raw.HomestayRules?.MinNights ?? 1),
          maxNights: Number(raw.homestayRules?.maxNights ?? raw.HomestayRules?.MaxNights ?? 0),
          availableFrom: raw.homestayRules?.availableFrom || raw.HomestayRules?.AvailableFrom || null,
          availableTo: raw.homestayRules?.availableTo || raw.HomestayRules?.AvailableTo || null,
          activeRoomCount: Number(raw.homestayRules?.activeRoomCount ?? raw.HomestayRules?.ActiveRoomCount ?? 0),
          rooms: (raw.homestayRules?.rooms || raw.HomestayRules?.Rooms || []).map((room: any) => ({
            id: String(room.id || room.Id || ""),
            name: room.name || room.Name || "",
            basePrice: Number(room.basePrice ?? room.BasePrice ?? 0),
            maxGuests: Number(room.maxGuests ?? room.MaxGuests ?? 1),
            quantity: Number(room.quantity ?? room.Quantity ?? 1),
          })),
        }
      : null,
    tourSchedules: (raw.tourSchedules || raw.TourSchedules || []).map((schedule: any) => ({
      id: String(schedule.id || schedule.Id || ""),
      startDate: schedule.startDate || schedule.StartDate || "",
      endDate: schedule.endDate || schedule.EndDate || "",
      status: schedule.status ?? schedule.Status ?? "",
      packageId: schedule.packageId || schedule.PackageId,
      packageName: schedule.packageName || schedule.PackageName,
      bookingCutoffHours: Number(schedule.bookingCutoffHours ?? schedule.BookingCutoffHours ?? 0),
      remainingCapacity: Number(schedule.remainingCapacity ?? schedule.RemainingCapacity ?? 0),
      availableSlots: Number(schedule.availableSlots ?? schedule.AvailableSlots ?? 0),
      runCount: Number(schedule.runCount ?? schedule.RunCount ?? 1),
      fromPrice: Number(schedule.fromPrice ?? schedule.FromPrice ?? 0),
    })),
    tourPackages: (raw.tourPackages || raw.TourPackages || []).map((pkg: any) => ({
      id: String(pkg.id || pkg.Id || ""),
      name: pkg.name || pkg.Name || "",
      duration: pkg.duration || pkg.Duration || "",
      minParticipants: Number(pkg.minParticipants ?? pkg.MinParticipants ?? 0),
      maxParticipants: Number(pkg.maxParticipants ?? pkg.MaxParticipants ?? 0),
      cancellationPolicyType: Number(pkg.cancellationPolicyType ?? pkg.CancellationPolicyType ?? 1),
      bookingCutoffHours: Number(pkg.bookingCutoffHours ?? pkg.BookingCutoffHours ?? 0),
      pricingTiers: (pkg.pricingTiers || pkg.PricingTiers || []).map((tier: any) => ({
        id: String(tier.id || tier.Id || ""),
        name: tier.name || tier.Name || "",
        description: tier.description || tier.Description || undefined,
        unitPrice: Number(tier.unitPrice ?? tier.UnitPrice ?? 0),
        minQuantity: Number(tier.minQuantity ?? tier.MinQuantity ?? 1),
        maxQuantity: Number(tier.maxQuantity ?? tier.MaxQuantity ?? 0),
      })),
    })),
    services: (raw.services || raw.Services || [])
      .map((item: any) => ({
        id: item.id || item.Id || undefined,
        displayOrder: Number(item.displayOrder ?? item.DisplayOrder ?? 0),
        serviceId: String(item.serviceId || item.ServiceId || ""),
        name: item.name || item.Name || "",
        serviceType: Number(item.serviceType ?? item.ServiceType ?? 0),
        basePrice: Number(item.basePrice ?? item.BasePrice ?? 0),
        fromPrice: Number(item.fromPrice ?? item.FromPrice ?? item.basePrice ?? item.BasePrice ?? 0),
        thumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl || "",
        description: item.description || item.Description || "",
        destinationName: item.destinationName || item.DestinationName || "",
        cancellationPolicyType: Number(item.cancellationPolicyType ?? item.CancellationPolicyType ?? 1),
      }))
      .sort((a: ComboServiceItem, b: ComboServiceItem) => (a.displayOrder || 0) - (b.displayOrder || 0)),
  };
}

function normalizeComboQuote(data: any): ComboQuote {
  const raw = data?.data || data || {};
  return {
    quoteId: String(raw.quoteId || raw.QuoteId || ""),
    comboId: String(raw.comboId || raw.ComboId || ""),
    comboName: raw.comboName || raw.ComboName || "",
    dateDriver: Number(raw.dateDriver ?? raw.DateDriver ?? 0),
    numberOfGuests: Number(raw.numberOfGuests ?? raw.NumberOfGuests ?? 1),
    checkInDate: raw.checkInDate || raw.CheckInDate,
    checkOutDate: raw.checkOutDate || raw.CheckOutDate,
    tourScheduleId: raw.tourScheduleId || raw.TourScheduleId,
    originalAmount: Number(raw.originalAmount ?? raw.OriginalAmount ?? 0),
    comboDiscountAmount: Number(raw.comboDiscountAmount ?? raw.ComboDiscountAmount ?? 0),
    finalAmount: Number(raw.finalAmount ?? raw.FinalAmount ?? 0),
    expiresAt: raw.expiresAt || raw.ExpiresAt || "",
    items: (raw.items || raw.Items || []).map((item: any) => ({
      comboItemId: String(item.comboItemId || item.ComboItemId || ""),
      serviceId: String(item.serviceId || item.ServiceId || ""),
      serviceName: item.serviceName || item.ServiceName || "",
      serviceType: Number(item.serviceType ?? item.ServiceType ?? 0),
      roomId: item.roomId || item.RoomId,
      roomName: item.roomName || item.RoomName,
      tourScheduleId: item.tourScheduleId || item.TourScheduleId,
      tourScheduleInfo: item.tourScheduleInfo || item.TourScheduleInfo,
      tourPricingTierId: item.tourPricingTierId || item.TourPricingTierId,
      tourPricingTierName: item.tourPricingTierName || item.TourPricingTierName,
      checkInDate: item.checkInDate || item.CheckInDate,
      checkOutDate: item.checkOutDate || item.CheckOutDate,
      startDate: item.startDate || item.StartDate,
      endDate: item.endDate || item.EndDate,
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? item.UnitPrice ?? 0),
      subTotal: Number(item.subTotal ?? item.SubTotal ?? 0),
    })),
  };
}

export default function ComboBookingScreen() {
  const params = useLocalSearchParams<{ comboId?: string; comboData?: string }>();
  const [combo, setCombo] = useState<ComboDetail | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [checkInDate, setCheckInDate] = useState(toLocalIsoDate(new Date()));
  const [checkOutDate, setCheckOutDate] = useState(toLocalIsoDate(new Date(Date.now() + 86400000)));
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTourPackageId, setSelectedTourPackageId] = useState<string | null>(null);
  const [tierQuantities, setTierQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<ComboQuote | null>(null);
  const [tourStartDate, setTourStartDate] = useState(toLocalIsoDate(new Date(Date.now() + 86400000 * 7)));
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [showTourDatePicker, setShowTourDatePicker] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const initialCombo = params.comboData ? normalizeComboDetail(JSON.parse(params.comboData)) : null;
        const comboResponse = params.comboId ? await comboService.getById(params.comboId) : null;
        const resolvedCombo = normalizeComboDetail(comboResponse || initialCombo || {});
        setCombo(resolvedCombo);
        if (Number(resolvedCombo.dateDriver || 0) === 0 && resolvedCombo.homestayRules) {
          const today = new Date();
          const availableFrom = parseDateOnly(resolvedCombo.homestayRules.availableFrom) || today;
          const initialCheckIn = availableFrom > today ? availableFrom : today;
          const minNights = Math.max(1, Number(resolvedCombo.homestayRules.minNights || 1));
          const initialCheckOut = new Date(initialCheckIn);
          initialCheckOut.setDate(initialCheckOut.getDate() + minNights);
          setCheckInDate(toLocalIsoDate(initialCheckIn));
          setCheckOutDate(toLocalIsoDate(initialCheckOut));
        } else if (Number(resolvedCombo.dateDriver || 0) !== 0 && resolvedCombo.tourSchedules.length > 0) {
          setTourStartDate((current) => {
            if (current) return current;
            const firstSchedule = resolvedCombo.tourSchedules[0];
            return firstSchedule?.startDate ? toLocalIsoDate(new Date(firstSchedule.startDate)) : current;
          });
        }
      } catch (error) {
        console.log("Combo load error:", error);
        Alert.alert("Loi", "Khong the tai cau hinh combo.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.comboData, params.comboId]);

  const isStayDriven = Number(combo?.dateDriver || 0) === 0;
  const schedules = combo?.tourSchedules || [];
  const minStayNights = Math.max(1, Number(combo?.homestayRules?.minNights || 1));
  const maxStayNights = Number(combo?.homestayRules?.maxNights || 0);
  const availableFromDate = parseDateOnly(combo?.homestayRules?.availableFrom);
  const availableToDate = parseDateOnly(combo?.homestayRules?.availableTo);
  const stayNights = Math.max(
    0,
    Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000),
  );

  const tourDateSchedules = !isStayDriven && tourStartDate
    ? schedules.filter((s) => {
        const sd = new Date(s.startDate);
        const td = new Date(tourStartDate);
        return sd.getFullYear() === td.getFullYear() && sd.getMonth() === td.getMonth() && sd.getDate() === td.getDate();
      })
    : [];
  const eligibleTourPackages = !isStayDriven
    ? (combo?.tourPackages || []).filter((pkg) =>
        tourDateSchedules.some((s) => s.packageId === pkg.id),
      )
    : [];
  const noEligiblePackages = !isStayDriven && tourStartDate && tourDateSchedules.length > 0 && eligibleTourPackages.length === 0;

  useEffect(() => {
    setQuote(null);
    setSelectedRoomId(null);
    setTierQuantities({});
    setSelectedTourPackageId(null);
    setSelectedScheduleId(null);
  }, [checkInDate, checkOutDate, guestCount, tourStartDate]);

  const resolveQuote = async () => {
    if (!combo) return;
    if (!combo.isPubliclyBookable) {
      Alert.alert("Combo chua san sang", combo.blockingReasons[0] || "Combo nay hien chua the dat.");
      return;
    }
    if (!isStayDriven && !selectedScheduleId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn lịch khởi hành cho combo.");
      return;
    }
    if (isStayDriven) {
      const checkIn = parseDateOnly(checkInDate);
      const checkOut = parseDateOnly(checkOutDate);
      if (!checkIn || !checkOut) {
        Alert.alert("Thiếu thông tin", "Vui lòng chọn ngày nhận và trả phòng.");
        return;
      }
      if (availableFromDate && checkIn < availableFromDate) {
        Alert.alert("Ngày không hợp lệ", `Combo chỉ nhận khách từ ${formatDate(combo.homestayRules?.availableFrom)}.`);
        return;
      }
      if (availableToDate && checkOut > availableToDate) {
        Alert.alert("Ngày không hợp lệ", `Combo chỉ mở đến ${formatDate(combo.homestayRules?.availableTo)}.`);
        return;
      }
      if (stayNights < minStayNights) {
        Alert.alert("Số đêm không hợp lệ", `Combo yêu cầu tối thiểu ${minStayNights} đêm.`);
        return;
      }
      if (maxStayNights > 0 && stayNights > maxStayNights) {
        Alert.alert("Số đêm không hợp lệ", `Combo chỉ cho phép tối đa ${maxStayNights} đêm.`);
        return;
      }
    }

    setIsResolving(true);
    try {
      const tierSelections = Object.entries(tierQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([tierId, qty]) => ({ tourPricingTierId: tierId, quantity: qty }));

      const response = await bookingService.createComboQuote({
        comboId: combo.id,
        numberOfGuests: guestCount,
        ...(isStayDriven
          ? {
              checkInDate,
              checkOutDate,
              ...(selectedRoomId ? { roomId: selectedRoomId } : {}),
            }
          : {
              tourScheduleId: selectedScheduleId || undefined,
              ...(selectedRoomId ? { roomId: selectedRoomId } : {}),
            }),
        ...(tierSelections.length > 0 ? { tierSelections } : {}),
      });
      setQuote(normalizeComboQuote(response));
    } catch (error: any) {
      const message = error?.response?.data?.message || "Khong the tao bao gia combo.";
      Alert.alert("Khong the dat combo", message);
    } finally {
      setIsResolving(false);
    }
  };

  const handleContinue = () => {
    if (!combo || !quote?.quoteId) {
      Alert.alert("Thieu thong tin", "Vui long tao bao gia combo truoc khi tiep tuc.");
      return;
    }

    const comboSummary = quote.items.map((item) => {
      const serviceInfo = combo.services.find((s) => s.serviceId === item.serviceId);
      return {
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        serviceType: item.serviceType,
        roomName: item.roomName,
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        scheduleInfo: item.startDate && item.endDate ? `${formatDateTime(item.startDate)} - ${formatDateTime(item.endDate)}` : undefined,
        tierName: item.tourPricingTierName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: item.subTotal,
        cancellationPolicyType: serviceInfo?.cancellationPolicyType ?? 1,
      };
    });

    router.push({
      pathname: "/checkout" as any,
      params: {
        checkoutData: JSON.stringify({
          serviceId: combo.services[0]?.serviceId,
          serviceName: combo.name,
          serviceImage: combo.thumbnailUrl,
          serviceLocation: combo.services.map((service) => service.destinationName).filter(Boolean).join(" • "),
          unitPrice: quote.finalAmount,
          quantity: 1,
          serviceType: 3,
          isCombo: true,
          comboId: combo.id,
          comboName: combo.name,
          comboPrice: quote.finalAmount,
          comboQuoteId: quote.quoteId,
          precomputedTotal: quote.finalAmount,
          comboGuestCount: guestCount,
          comboSummary,
          comboSubtotalBeforeDiscount: quote.originalAmount,
          comboDiscountAmount: quote.comboDiscountAmount,
          checkInDate: quote.checkInDate,
          checkOutDate: quote.checkOutDate,
        }),
      },
    });
  };

  if (isLoading || !combo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Dang tai cau hinh combo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#1a2332" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <Image
          source={{ uri: combo.thumbnailUrl || "https://picsum.photos/seed/combo-booking/1000/700" }}
          style={styles.heroImage}
        />

        <View style={styles.heroCard}>
          <Text style={styles.comboName}>{combo.name}</Text>
          {combo.description ? <Text style={styles.comboDescription}>{combo.description}</Text> : null}
          <View style={styles.priceRow}>
            <Text style={styles.comboPrice}>Tu {formatCurrency(combo.fromComboPrice || combo.comboPrice)}</Text>
            {combo.fromOriginalPrice > combo.fromComboPrice ? (
              <Text style={styles.originalPrice}>{formatCurrency(combo.fromOriginalPrice)}</Text>
            ) : null}
          </View>
          <Text style={styles.summaryChip}>{isStayDriven ? "Theo lịch lưu trú" : "Theo lịch tour"}</Text>
        </View>

        {!combo.isPubliclyBookable || combo.blockingReasons.length ? (
          <View style={[styles.section, styles.warningSection]}>
            <Text style={styles.warningTitle}>Combo chua san sang de dat</Text>
            {combo.blockingReasons.map((reason, index) => (
              <Text key={`${reason}-${index}`} style={styles.warningText}>
                • {reason}
              </Text>
            ))}
          </View>
        ) : null}

        {isStayDriven ? (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Số khách</Text>
          <View style={styles.guestCounter}>
            <TouchableOpacity style={styles.counterButton} onPress={() => setGuestCount((value) => Math.max(1, value - 1))}>
              <Ionicons name="remove" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            <Text style={styles.guestCountText}>{guestCount}</Text>
            <TouchableOpacity style={styles.counterButton} onPress={() => setGuestCount((value) => value + 1)}>
              <Ionicons name="add" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
        ) : null}

        {isStayDriven ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn khoảng ngày ở</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowCheckInPicker(true)}>
                <Text style={styles.dateButtonLabel}>Nhận phòng</Text>
                <Text style={styles.dateButtonValue}>{formatDate(checkInDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowCheckOutPicker(true)}>
                <Text style={styles.dateButtonLabel}>Trả phòng</Text>
                <Text style={styles.dateButtonValue}>{formatDate(checkOutDate)}</Text>
              </TouchableOpacity>
            </View>
            {combo.homestayRules?.rooms && combo.homestayRules.rooms.length > 0 ? (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Chọn phòng (tự động nếu không chọn)</Text>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    !selectedRoomId && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedRoomId(null)}
                >
                  <Text style={styles.optionTitle}>Tự động chọn phòng phù hợp</Text>
                  <Text style={styles.optionMeta}>Hệ thống sẽ tự chọn phòng còn trống tốt nhất</Text>
                </TouchableOpacity>
                {combo.homestayRules.rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.optionCard,
                      selectedRoomId === room.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedRoomId(room.id)}
                  >
                    <Text style={styles.optionTitle}>{room.name}</Text>
                    <Text style={styles.optionMeta}>{formatCurrency(room.basePrice)} / dem</Text>
                    {room.maxGuests > 0 ? <Text style={styles.optionMeta}>Toi da {room.maxGuests} khach</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionHint}>
              Hệ thống sẽ tự động tìm phòng và lịch tour phù hợp nhất trong khoảng ngày này.
            </Text>
            {combo.homestayRules ? (
              <Text style={styles.sectionHint}>
                {`Toi thieu ${minStayNights} dem`}
                {maxStayNights > 0 ? ` • toi da ${maxStayNights} dem` : ""}
                {combo.homestayRules.availableFrom ? ` • mo tu ${formatDate(combo.homestayRules.availableFrom)}` : ""}
                {combo.homestayRules.availableTo ? ` • den ${formatDate(combo.homestayRules.availableTo)}` : ""}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn ngày khởi hành tour</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTourDatePicker(true)}>
                <Text style={styles.dateButtonLabel}>Ngày khởi hành</Text>
                <Text style={styles.dateButtonValue}>{formatDate(tourStartDate)}</Text>
              </TouchableOpacity>
            </View>
            {tourDateSchedules.length > 0 ? (
              <Text style={styles.sectionHint}>
                Có {tourDateSchedules.length} lịch khởi hành vào ngày này.
                {tourDateSchedules.length > 0 && eligibleTourPackages.length === 0
                  ? ` Tuy nhiên, các gói tour tương ứng không phù hợp.`
                  : ""}
              </Text>
            ) : (
              <Text style={[styles.sectionHint, { color: "#b34122" }]}>
                Không có lịch khởi hành nào vào ngày này. Vui lòng chọn ngày khác.
              </Text>
            )}
            <Text style={styles.sectionHint}>
              Hệ thống sẽ tự động suy ra ngày ở theo cấu hình combo và tìm phòng phù hợp.
            </Text>
          </View>
        )}

        {!isStayDriven && tourDateSchedules.length > 0 && combo.tourPackages.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn gói tour</Text>
            {eligibleTourPackages.length === 0 ? (
              <Text style={[styles.sectionHint, { color: "#b34122" }]}>
                Không có gói tour nào phù hợp với ngày này.
              </Text>
            ) : null}
            {eligibleTourPackages.map((pkg) => {
              const selected = selectedTourPackageId === pkg.id;
              const matchingSchedule = tourDateSchedules.find((s) => String(s.packageId) === String(pkg.id));
              const perRunRemaining = matchingSchedule
                ? Math.min(
                    Number(matchingSchedule.availableSlots || 0),
                    Math.floor(Number(matchingSchedule.remainingCapacity || 0) / Math.max(1, Number(matchingSchedule.runCount || 1))),
                  )
                : 0;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => {
                    setSelectedTourPackageId(pkg.id);
                    if (matchingSchedule) setSelectedScheduleId(matchingSchedule.id);
                    const initial: Record<string, number> = {};
                    (pkg.pricingTiers || []).forEach((tier) => {
                      initial[tier.id] = tier.minQuantity;
                    });
                    setTierQuantities(initial);
                  }}
                >
                  <Text style={styles.optionTitle}>{pkg.name}</Text>
                  {matchingSchedule ? (
                    <>
                      <Text style={styles.optionMeta}>
                        {formatDateTime(matchingSchedule.startDate)} - {formatDateTime(matchingSchedule.endDate)}
                      </Text>
                      <Text style={styles.optionMeta}>Còn: {perRunRemaining} chỗ/lượt</Text>
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {selectedTourPackageId ? (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>Số lượng khách theo loại</Text>
                {(() => {
                  const pkg = combo.tourPackages.find((p) => p.id === selectedTourPackageId);
                  if (!pkg) return null;
                  return pkg.pricingTiers.map((tier) => (
                    <View key={tier.id} style={styles.guestCounter}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: "#1a2332", fontWeight: "600" }}>{tier.name}</Text>
                        <Text style={{ fontSize: 12, color: "#008fa0", marginTop: 2 }}>{formatCurrency(tier.unitPrice)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() =>
                          setTierQuantities((prev) => ({
                            ...prev,
                            [tier.id]: Math.max(tier.minQuantity, (prev[tier.id] || tier.minQuantity) - 1),
                          }))
                        }
                      >
                        <Ionicons name="remove" size={20} color={PRIMARY_COLOR} />
                      </TouchableOpacity>
                      <Text style={styles.guestCountText}>{tierQuantities[tier.id] ?? tier.minQuantity}</Text>
                      <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() =>
                          setTierQuantities((prev) => {
                            const max = tier.maxQuantity > 0 ? tier.maxQuantity : 999;
                            return {
                              ...prev,
                              [tier.id]: Math.min(max, (prev[tier.id] || tier.minQuantity) + 1),
                            };
                          })
                        }
                      >
                        <Ionicons name="add" size={20} color={PRIMARY_COLOR} />
                      </TouchableOpacity>
                    </View>
                  ));
                })()}
              </View>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity style={styles.resolveButton} onPress={resolveQuote} disabled={isResolving}>
          <Text style={styles.resolveButtonText}>{isResolving ? "Đang tính combo..." : "Tạo báo giá combo"}</Text>
        </TouchableOpacity>

        {quote ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kết quả tự động</Text>
            {quote.items.map((item) => (
              <View key={`${item.comboItemId}-${item.serviceId}`} style={styles.quoteItem}>
                <Text style={styles.quoteItemTitle}>{item.serviceName}</Text>
                {item.roomName ? <Text style={styles.quoteMeta}>Phong: {item.roomName}</Text> : null}
                {item.checkInDate ? <Text style={styles.quoteMeta}>Ngay o: {formatDate(item.checkInDate)} - {formatDate(item.checkOutDate)}</Text> : null}
                {item.startDate && item.endDate ? <Text style={styles.quoteMeta}>Lich tour: {formatDateTime(item.startDate)} - {formatDateTime(item.endDate)}</Text> : null}
                {item.tourPricingTierName ? <Text style={styles.quoteMeta}>Khung gia: {item.tourPricingTierName}</Text> : null}
                <Text style={styles.quoteMeta}>So luong: {item.quantity}</Text>
                <Text style={styles.quotePrice}>{formatCurrency(item.subTotal)}</Text>
              </View>
            ))}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tam tinh dich vu</Text>
              <Text style={styles.summaryValue}>{formatCurrency(quote.originalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giam gia combo</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>- {formatCurrency(quote.comboDiscountAmount)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Thanh toan truoc voucher</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(quote.finalAmount)}</Text>
            </View>
            <Text style={styles.sectionHint}>Bao gia co hieu luc den {formatDateTime(quote.expiresAt)}.</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.submitButton, !quote && styles.submitButtonDisabled]} onPress={handleContinue} disabled={!quote}>
          <Text style={styles.submitButtonText}>Tiếp tục thanh toán</Text>
        </TouchableOpacity>
      </ScrollView>

      {showCheckInPicker ? (
        <DateTimePicker
          value={new Date(checkInDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={availableFromDate && availableFromDate > new Date() ? availableFromDate : new Date()}
          maximumDate={availableToDate || undefined}
          onChange={(_event, pickedDate) => {
            if (Platform.OS !== "ios") setShowCheckInPicker(false);
            if (!pickedDate) return;
            const nextCheckIn = toLocalIsoDate(pickedDate);
            setCheckInDate(nextCheckIn);
            const nextMinimumCheckout = new Date(pickedDate);
            nextMinimumCheckout.setDate(nextMinimumCheckout.getDate() + minStayNights);
            if (new Date(checkOutDate) <= nextMinimumCheckout) {
              const nextOut = new Date(pickedDate);
              nextOut.setDate(nextOut.getDate() + minStayNights);
              setCheckOutDate(toLocalIsoDate(nextOut));
            }
          }}
        />
      ) : null}

      {showCheckOutPicker ? (
        <DateTimePicker
          value={new Date(checkOutDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date(new Date(checkInDate).getTime() + 86400000 * minStayNights)}
          maximumDate={
            maxStayNights > 0
              ? (() => {
                  const latest = new Date(checkInDate);
                  latest.setDate(latest.getDate() + maxStayNights);
                  if (availableToDate && latest > availableToDate) return availableToDate;
                  return latest;
                })()
              : (availableToDate || undefined)
          }
          onChange={(_event, pickedDate) => {
            if (Platform.OS !== "ios") setShowCheckOutPicker(false);
            if (!pickedDate) return;
            setCheckOutDate(toLocalIsoDate(pickedDate));
          }}
        />
      ) : null}

      {showTourDatePicker ? (
        <DateTimePicker
          value={new Date(tourStartDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={(_event, pickedDate) => {
            if (Platform.OS !== "ios") setShowTourDatePicker(false);
            if (!pickedDate) return;
            setTourStartDate(toLocalIsoDate(pickedDate));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  scrollContent: { paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f6f8" },
  loadingText: { marginTop: 12, color: "#5a6577" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a2332" },
  headerPlaceholder: { width: 40 },
  heroImage: { width: "100%", height: 220 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  comboName: { fontSize: 22, fontWeight: "700", color: "#1a2332" },
  comboDescription: { fontSize: 14, lineHeight: 20, color: "#5a6577", marginTop: 8 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 14 },
  comboPrice: { fontSize: 24, fontWeight: "800", color: PRIMARY_COLOR },
  originalPrice: { fontSize: 14, color: "#8d95a3", textDecorationLine: "line-through" },
  summaryChip: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#eef8fa",
    color: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
  },
  warningSection: {
    borderWidth: 1,
    borderColor: "#ffd6cc",
    backgroundColor: "#fff7f5",
  },
  warningTitle: { fontSize: 15, fontWeight: "700", color: "#b34122" },
  warningText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#7a4939" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a2332" },
  sectionHint: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#5a6577" },
  guestCounter: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eef8fa",
    alignItems: "center",
    justifyContent: "center",
  },
  guestCountText: { minWidth: 40, textAlign: "center", fontSize: 22, fontWeight: "700", color: "#1a2332" },
  dateRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d9e1e7",
    borderRadius: 16,
    padding: 14,
  },
  dateButtonLabel: { fontSize: 12, color: "#8d95a3", marginBottom: 6 },
  dateButtonValue: { fontSize: 15, fontWeight: "600", color: "#1a2332" },
  optionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d9e1e7",
    borderRadius: 16,
    padding: 14,
  },
  optionCardSelected: { borderColor: PRIMARY_COLOR, backgroundColor: "#eef8fa" },
  optionCardDisabled: { opacity: 0.45 },
  optionTitle: { fontSize: 15, fontWeight: "700", color: "#1a2332" },
  optionMeta: { fontSize: 13, color: "#5a6577", marginTop: 4 },
  resolveButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#eef8fa",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  resolveButtonText: { fontSize: 15, fontWeight: "700", color: PRIMARY_COLOR },
  quoteItem: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e4eaf0",
    borderRadius: 16,
    padding: 14,
  },
  quoteItemTitle: { fontSize: 15, fontWeight: "700", color: "#1a2332" },
  quoteMeta: { marginTop: 4, fontSize: 13, color: "#5a6577" },
  quotePrice: { marginTop: 8, fontSize: 15, fontWeight: "700", color: PRIMARY_COLOR },
  summaryRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { color: "#5a6577", fontSize: 14 },
  summaryValue: { color: "#1a2332", fontSize: 14, fontWeight: "600" },
  discountValue: { color: "#E5484D" },
  summaryTotalRow: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e7edf2" },
  summaryTotalLabel: { fontSize: 15, fontWeight: "700", color: "#1a2332" },
  summaryTotalValue: { fontSize: 18, fontWeight: "800", color: PRIMARY_COLOR },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.45 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
