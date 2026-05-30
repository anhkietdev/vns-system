// app/(tabs)/service-detail.tsx
import { serviceService } from "@/api/service.service";
import { reviewService } from "@/api/review.service";
import { favoriteService } from "@/api/favorite.service";
import { t } from "@/i18n";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { voucherService } from "@/api/voucher.service";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");
const PRIMARY_COLOR = "#008fa0";

type Review = {
  id: string;
  userName: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
};

const cancellationPolicyLabels: Record<number, string> = {
  0: "Linh hoạt",
  1: "Vừa phải",
  2: "Chặt chẽ",
  3: "Không hoàn tiền",
};

const cancellationPolicySummaries: Record<number, string> = {
  0: "Hoàn tiền 100% nếu hủy trước 24 giờ. Không hoàn tiền sau đó.",
  1: "Hoàn tiền 100% nếu hủy trước 5 ngày. Hoàn 50% từ 5 ngày đến giờ khởi hành.",
  2: "Hoàn tiền 100% nếu hủy trước 30 ngày. Hoàn 50% từ 30 đến 7 ngày trước khởi hành.",
  3: "Không được hoàn tiền.",
};

const AMENITY_LABELS: Record<string, string> = {
  "Wi-Fi": "Wi-Fi",
  Parking: "Bãi đỗ xe",
  Kitchen: "Bếp",
  Pool: "Hồ bơi",
  "BBQ area": "Khu BBQ",
  "Air conditioning": "Điều hòa",
  Laundry: "Giặt ủi",
  "TV/Entertainment": "TV/Giải trí",
  "Private bathroom": "Phòng tắm riêng",
  "Hot water": "Nước nóng",
  Towels: "Khăn tắm",
  "Bed linens": "Ga trải giường",
  "Wardrobe/Hangers": "Tủ/Móc áo",
  "Hair dryer": "Máy sấy tóc",
  Toiletries: "Đồ vệ sinh",
  "Desk/Workspace": "Bàn làm việc",
  "Mini fridge": "Tủ lạnh nhỏ",
  "Balcony/View": "Ban công/Cảnh quan",
};

const serviceTypeLabels: Record<string, string> = {
  homestay: "Homestay",
  tour: "Tour",
  activity: "Dịch vụ",
};

function translateAmenity(name: string): string {
  return AMENITY_LABELS[name] || name;
}

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

function normalizeImageList(images: any[] = [], thumbnailUrl?: string | null) {
  const normalized = images
    .map((img: any) =>
      typeof img === "string" ? img : img?.imageUrl || img?.url || "",
    )
    .filter(Boolean);

  if (!normalized.length && thumbnailUrl) {
    normalized.push(thumbnailUrl);
  }

  return normalized;
}

function formatIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function calculateHomestayNightlyTotal(
  room: any,
  checkInDate: Date | null,
  checkOutDate: Date | null,
) {
  if (!room || !checkInDate || !checkOutDate) return 0;

  let total = 0;
  const cursor = new Date(checkInDate);
  const end = new Date(checkOutDate);

  while (cursor < end) {
    const dateKey = formatIsoDate(cursor);
    const availability = (room.availability || []).find((item: any) =>
      String(item.date || "").startsWith(dateKey),
    );
    const overridePrice = Number(availability?.priceOverride || 0);

    if (overridePrice > 0) {
      total += overridePrice;
    } else {
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      total += isWeekend
        ? Number(room.weekendPrice ?? room.basePrice ?? 0)
        : Number(room.basePrice ?? 0);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function buildPolicyText(policyType?: number | null, notes?: string | null) {
  return [
    policyType != null ? cancellationPolicyLabels[policyType] || "" : "",
    notes || "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getCheapestTierPrice(pricingTiers: any[] = []) {
  const prices = pricingTiers
    .map((tier) => Number(tier.unitPrice || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function getScheduleTierPrice(
  schedule: any,
  tier: any,
  tierIndex: number,
): number {
  const override = (schedule?.pricingOverrides || []).find(
    (item: any) =>
      item?.tourPricingTierId === tier?.id ||
      Number(item?.tierDisplayOrder) ===
        Number(tier?.displayOrder ?? tierIndex),
  );

  const customPrice = Number(override?.customPrice || 0);
  if (customPrice > 0) return customPrice;

  const tierPrice = Number(tier?.unitPrice || 0);
  if (tierPrice > 0) return tierPrice;

  const legacyPrice = Number(schedule?.priceOverride || 0);
  return legacyPrice > 0 ? legacyPrice : 0;
}

function getScheduleDisplayPrice(schedule: any, pricingTiers: any[] = []) {
  const prices = pricingTiers
    .map((tier, tierIndex) => getScheduleTierPrice(schedule, tier, tierIndex))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length) return Math.min(...prices);

  const legacyPrice = Number(schedule?.priceOverride || 0);
  if (legacyPrice > 0) return legacyPrice;

  return getCheapestTierPrice(pricingTiers);
}

export default function ServiceDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    type?: string;
    checkInDate?: string;
    checkOutDate?: string;
    startDate?: string;
    endDate?: string;
    selectedPackageId?: string;
  }>();
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Booking selections
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await serviceService.getById(params.id || "");
      const data = res.data || res;
      const tour = data.tour || null;
      const tourPackages = (data.tourPackages || (tour ? [tour] : [])).map(
        (pkg: any, packageIndex: number) => ({
          id: pkg.id || `package-${packageIndex}`,
          name: pkg.name || `Gói ${packageIndex + 1}`,
          duration: pkg.duration || "",
          maxParticipants: pkg.maxParticipants || 0,
          minParticipants: pkg.minParticipants || 0,
          minGuestsToOperate: pkg.minGuestsToOperate || null,
          bookingCutoffHours: pkg.bookingCutoffHours || 0,
          meetingPoint: pkg.meetingPoint || "",
          cancellationPolicyType:
            pkg.cancellationPolicyType ?? data.cancellationPolicyType,
          cancellationPolicyDescription:
            pkg.cancellationPolicyDescription || "",
          includedItems: pkg.includedItems || [],
          excludedItems: pkg.excludedItems || [],
          pricingTiers: (pkg.pricingTiers || []).map((tier: any) => ({
            id: tier.id,
            name: tier.name || "",
            unitPrice: tier.unitPrice || 0,
            displayOrder: tier.displayOrder ?? 0,
            tierType: tier.tierType ?? null,
            minQuantity: tier.minQuantity || 0,
            maxQuantity: tier.maxQuantity || 0,
            groupMinGuests: tier.groupMinGuests ?? null,
            groupMaxGuests: tier.groupMaxGuests ?? null,
          })),
          schedules: (pkg.schedules || []).map((s: any) => ({
            id: s.id,
            startDate: s.startDate,
            endDate: s.endDate,
            runCount: s.runCount || 1,
            availableSlots: s.availableSlots,
            bookedSlots: s.bookedSlots,
            priceOverride: s.priceOverride,
            pricingOverrides: (s.pricingOverrides || []).map((item: any) => ({
              tourPricingTierId: item.tourPricingTierId,
              tierDisplayOrder: item.tierDisplayOrder ?? 0,
              tierName: item.tierName || "",
              customPrice: item.customPrice || 0,
            })),
            status: s.status,
          })),
          itineraries: (pkg.itineraries || []).map((it: any) => ({
            id: it.id,
            dayNumber: it.dayNumber,
            displayOrder: it.displayOrder || 0,
            title: it.title || "",
            description: it.description || "",
            startTime: it.startTime || "",
            endTime: it.endTime || "",
            location: it.location || "",
            activityType: it.activityType || "",
            imageUrl: it.imageUrl || "",
          })),
        }),
      );
      const homestay = data.homestay || null;
      const serviceImages = normalizeImageList(
        data.images || [],
        data.thumbnailUrl,
      );
      const basePrice = Number(data.discountPrice || data.basePrice || 0);
      const originalPrice =
        data.discountPrice != null &&
        Number(data.discountPrice) < Number(data.basePrice || 0)
          ? Number(data.basePrice || 0)
          : null;
      setService({
        id: data.id,
        name: data.name || "",
        type:
          data.serviceType === 0
            ? "homestay"
            : data.serviceType === 1
              ? "tour"
              : "tour",
        location: data.destinationName || data.address || "",
        address: data.address || "",
        price: basePrice,
        basePrice: Number(data.basePrice || 0),
        discountPrice:
          data.discountPrice != null ? Number(data.discountPrice) : null,
        originalPrice,
        rating: data.averageRating || 0,
        reviewCount: data.totalReviews || 0,
        totalBookings: data.totalBookings || 0,
        images: serviceImages,
        description: data.description || "",
        cancellationPolicyType: data.cancellationPolicyType,
        cancellationPolicyDescription: data.cancellationPolicyDescription || "",
        policy: buildPolicyText(
          data.cancellationPolicyType as number,
          data.cancellationPolicyDescription || "",
        ),
        isFavorite: data.isFavorite || false,
        partnerId: data.partnerId || "",
        partnerName: data.partnerName || "",
        partnerPhone: data.partnerPhone || "",
        tourPackages,
        tour: tourPackages[0] || null,
        homestay: homestay
          ? {
              checkInTime: homestay.checkInTime || "",
              checkOutTime: homestay.checkOutTime || "",
              minNights: homestay.minNights || 1,
              maxNights: homestay.maxNights || 30,
              availableFrom: homestay.availableFrom || null,
              availableTo: homestay.availableTo || null,
              rooms: (homestay.rooms || []).map((r: any) => ({
                id: r.id,
                name: r.name || "",
                description: r.description || "",
                bedType: r.bedType || "",
                maxGuests: r.maxGuests || 0,
                quantity: r.quantity || 0,
                basePrice: r.basePrice || 0,
                weekendPrice: r.weekendPrice || null,
                holidayPrice: r.holidayPrice || null,
                bedCount: r.bedCount || 0,
                imageUrl: r.imageUrl || "",
                images: (r.images || []).map((img: any) =>
                  typeof img === "string"
                    ? { imageUrl: img, isCover: false }
                    : {
                        imageUrl: img.imageUrl || img.url || "",
                        isCover: !!img.isCover,
                      },
                ),
                amenities: (r.amenities || []).map((a: any) => ({
                  id: a.id,
                  name: a.name || "",
                  icon: a.icon || "",
                })),
                availability: (r.availability || []).map((a: any) => ({
                  id: a.id,
                  date: a.date,
                  availableCount: a.availableCount || 0,
                  priceOverride: a.priceOverride || null,
                  isBlocked: !!a.isBlocked,
                })),
                isActive: r.isActive,
              })),
              amenities: (homestay.amenities || []).map((a: any) => ({
                id: a.id,
                name: a.name || "",
                icon: a.icon || "",
              })),
            }
          : null,
      });
      setIsFavorite(data.isFavorite || false);
      setSelectedPackageId(params.selectedPackageId || tourPackages[0]?.id || null);

      if (homestay) {
        const parsedCheckIn = params.checkInDate
          ? new Date(params.checkInDate)
          : params.startDate
            ? new Date(params.startDate)
            : null;
        const parsedCheckOut = params.checkOutDate
          ? new Date(params.checkOutDate)
          : params.endDate
            ? new Date(params.endDate)
            : null;

        if (parsedCheckIn && !Number.isNaN(parsedCheckIn.getTime())) {
          setCheckInDate(parsedCheckIn);
        }

        if (parsedCheckOut && !Number.isNaN(parsedCheckOut.getTime())) {
          setCheckOutDate(parsedCheckOut);
        }
      }

      // Fetch reviews
      try {
        const revRes = await reviewService.getServiceReviews(
          params.id || "",
          1,
          3,
        );
        const revData = revRes.data || revRes;
        const revItems = Array.isArray(revData)
          ? revData
          : revData.items || revData.Items || [];
        setReviews(
          revItems.map((r: any) => ({
            id: r.id,
            userName: r.userName || r.userFullName || "Ẩn danh",
            avatar: r.userAvatar || "",
            rating: r.rating || 0,
            date: r.createdAt
              ? new Date(r.createdAt).toLocaleDateString("vi-VN")
              : "",
            comment: r.comment || "",
          })),
        );
      } catch (e) {
        console.log("Lỗi tải đánh giá:", e);
      }
    } catch (error) {
      console.log("Lỗi tải chi tiết dịch vụ:", error);
    } finally {
      setIsLoading(false);
    }
  }, [params.checkInDate, params.checkOutDate, params.endDate, params.id, params.selectedPackageId, params.startDate]);

  useFocusEffect(
    useCallback(() => {
      if (params.id) {
        fetchData();
      }
    }, [fetchData, params.id]),
  );

  const handleToggleFavorite = async () => {
    try {
      await favoriteService.toggle(params.id || "");
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.log("Lỗi toggle yêu thích:", error);
    }
  };

  if (isLoading || !service) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ marginTop: 12, color: "#8d95a3" }}>
          {t("home.loading")}
        </Text>
      </View>
    );
  }

  // Tính giá đơn vị (1 đêm / 1 người) - dùng cho hiển thị
  const activeTourPackage =
    service.tourPackages?.find((pkg: any) => pkg.id === selectedPackageId) ||
    service.tourPackages?.[0] ||
    null;

  const getUnitPrice = () => {
    const selectedRoom = service.homestay?.rooms?.find(
      (r: any) => r.id === selectedRoomId,
    );
    if (selectedRoom) return Number(selectedRoom.basePrice);
    const selectedSchedule = activeTourPackage?.schedules?.find(
      (s: any) => s.id === selectedScheduleId,
    );
    if (selectedSchedule) {
      const sessionPrice = getScheduleDisplayPrice(
        selectedSchedule,
        activeTourPackage?.pricingTiers || [],
      );
      if (sessionPrice > 0) return sessionPrice;
    }
    const packagePrice = getCheapestTierPrice(
      activeTourPackage?.pricingTiers || [],
    );
    if (packagePrice > 0) return packagePrice;
    return service.price;
  };
  const unitPrice = getUnitPrice();
  const selectedRoom =
    service?.homestay?.rooms?.find((room: any) => room.id === selectedRoomId) || null;
  const maxHomestayGuests = Math.max(1, Number(selectedRoom?.maxGuests || 1));

  const getNearestAvailableDate = () => {
    if (activeTourPackage?.schedules?.length) {
      const now = new Date();
      const future = [...activeTourPackage.schedules]
        .filter((s: any) => new Date(s.startDate) >= now)
        .sort(
          (a: any, b: any) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        );
      if (future.length) return future[0].startDate;
      const sorted = [...activeTourPackage.schedules].sort(
        (a: any, b: any) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
      return sorted[0]?.startDate;
    }
    if (service.homestay?.availableFrom) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const availDate = new Date(service.homestay.availableFrom);
      availDate.setHours(0, 0, 0, 0);
      if (availDate >= today) return service.homestay.availableFrom;
      return null;
    }
    return null;
  };
  const nearestAvailableDate = getNearestAvailableDate();

  const openOfferModal = async () => {
    try {
      const res = await voucherService.getActiveVouchers();
      const data = res?.data || res?.items || [];
      setVouchers(Array.isArray(data) ? data : []);
    } catch {
      setVouchers([]);
    }
    setShowOfferModal(true);
  };

  const policyType = service.tourPackages?.length
    ? activeTourPackage?.cancellationPolicyType
    : service.cancellationPolicyType;
  const policyDescription = service.tourPackages?.length
    ? activeTourPackage?.cancellationPolicyDescription ||
      service.cancellationPolicyDescription
    : service.cancellationPolicyDescription;

  // Tính số đêm nếu homestay
  const numberOfNights =
    checkInDate && checkOutDate
      ? Math.max(
          1,
          Math.round(
            (checkOutDate.getTime() - checkInDate.getTime()) / 86400000,
          ),
        )
      : 1;

  // Tính tổng giá theo từng đêm có check weekend price (giống logic backend)
  const calculateHomestayTotal = (): number => {
    if (!service.homestay || !checkInDate || !checkOutDate) return unitPrice;
    if (!selectedRoom) return unitPrice * numberOfNights;
    return calculateHomestayNightlyTotal(selectedRoom, checkInDate, checkOutDate);
  };

  // Tính tổng giá: homestay tính theo từng đêm có weekend; tour/activity = unitPrice
  const totalBeforeVoucher = service.homestay
    ? calculateHomestayTotal()
    : unitPrice;

  const discountedPrice = totalBeforeVoucher;

  const onScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(index);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FontAwesome
        key={i}
        name={
          i < Math.floor(rating)
            ? "star"
            : i < rating
              ? "star-half-empty"
              : "star-o"
        }
        size={14}
        color="#F59E0B"
        style={styles.basicInfoIconStar}
      />
    ));
  };

  const buildCartBookingData = () => {
    const bookingPrice =
      service.homestay && numberOfNights > 0
        ? Math.round(totalBeforeVoucher / numberOfNights)
        : unitPrice;

    const isoCheckIn = checkInDate
      ? checkInDate.toISOString().split("T")[0]
      : undefined;
    const isoCheckOut = checkOutDate
      ? checkOutDate.toISOString().split("T")[0]
      : undefined;

    let availableQuantity;
    const selectedRoom = service.homestay?.rooms?.find(
      (r: any) => r.id === selectedRoomId,
    );
    const selectedSchedule = activeTourPackage?.schedules?.find(
      (s: any) => s.id === selectedScheduleId,
    );

    // Calculate max rooms per night availability constraint
    let maxRooms = 1;
    if (selectedRoom) {
      maxRooms = selectedRoom.quantity || 1;
      if (selectedRoom.availability?.length && checkInDate && checkOutDate) {
        const cur = new Date(checkInDate);
        const end = new Date(checkOutDate);
        while (cur < end) {
          const dateStr = cur.toISOString().split("T")[0];
          const avail = selectedRoom.availability.find(
            (a: any) => a.date === dateStr || a.date?.startsWith(dateStr),
          );
          if (avail) {
            maxRooms = Math.min(maxRooms, avail.availableCount);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    if (selectedSchedule) {
      const remaining =
        selectedSchedule.availableSlots - selectedSchedule.bookedSlots;
      availableQuantity = remaining > 0 ? remaining : 0;
    }

    return {
      serviceId: service.id,
      serviceName: service.name,
      serviceImage: service.images?.[0],
      serviceLocation: service.location,
      unitPrice: bookingPrice,
      quantity: 1,
      serviceType: service.type,
      guestCount,
      roomId: selectedRoomId || undefined,
      roomName: selectedRoom?.name || undefined,
      roomMaxGuests: selectedRoom?.maxGuests || undefined,
      roomAvailability: selectedRoom?.availability || undefined,
      maxRooms,
      tourScheduleId: selectedScheduleId || undefined,
      tourScheduleEndDate: selectedSchedule?.endDate || undefined,
      checkInDate: isoCheckIn,
      checkOutDate: isoCheckOut,
      minNights: service.homestay?.minNights || undefined,
      maxNights: service.homestay?.maxNights || undefined,

      availableSlots: availableQuantity,
      precomputedTotal: totalBeforeVoucher,
    };
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 84 }}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          {service.images.length ? (
            <FlatList
              ref={flatListRef}
              data={service.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.carouselImage} />
              )}
            />
          ) : (
            <View style={[styles.carouselImage, styles.carouselPlaceholder]}>
              <Ionicons name="image-outline" size={36} color="#c0c7d1" />
              <Text style={styles.carouselPlaceholderText}>
                Chưa có hình ảnh
              </Text>
            </View>
          )}
          {/* Dots */}
          <View style={styles.dotsContainer}>
            {service.images.map((_: any, i: number) => (
              <View
                key={i}
                style={[styles.dot, activeImageIndex === i && styles.dotActive]}
              />
            ))}
          </View>
          {/* Header buttons */}
          <View style={styles.carouselHeader}>
            <TouchableOpacity
              style={styles.carouselButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.carouselActions}>
              <TouchableOpacity
                style={styles.carouselButton}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#dc2626" : "#FFF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.carouselButton, { marginLeft: 8 }]}
              >
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {service.images.length
                ? `${activeImageIndex + 1}/${service.images.length}`
                : "0/0"}
            </Text>
          </View>
        </View>

        {/* Basic info */}
        <View style={styles.section}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <View style={styles.basicInfoRow}>
            {renderStars(service.rating)}
            <Text style={styles.basicInfoText}>
              {service.rating} • ({service.reviewCount} {t("booking.reviews")})
              • {service.totalBookings} lượt đặt
            </Text>
          </View>
          <View style={styles.basicInfoRowWide}>
            <View style={styles.basicInfoChip}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={PRIMARY_COLOR}
                style={styles.basicInfoIcon}
              />
              <Text style={styles.basicInfoText}>
                {serviceTypeLabels[service.type] || "Dịch vụ"}
              </Text>
            </View>
            {activeTourPackage ? (
              <View style={styles.basicInfoChip}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={PRIMARY_COLOR}
                  style={styles.basicInfoIcon}
                />
                <Text style={styles.basicInfoText}>
                  {activeTourPackage.duration || "—"}
                </Text>
              </View>
            ) : null}
          </View>
          {activeTourPackage ? (
            <View style={styles.basicInfoRowWide}>
              {activeTourPackage.schedules?.[0]?.endDate ? (
                <View style={styles.basicInfoChip}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={PRIMARY_COLOR}
                    style={styles.basicInfoIcon}
                  />
                  <Text style={styles.basicInfoText}>
                    {new Date(activeTourPackage.schedules[0].startDate) < new Date(activeTourPackage.schedules[0].endDate)
                      ? `${new Date(activeTourPackage.schedules[0].startDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} → ${new Date(activeTourPackage.schedules[0].endDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
                      : "Trong ngày"}
                  </Text>
                </View>
              ) : null}
              <View style={styles.basicInfoChip}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={PRIMARY_COLOR}
                  style={styles.basicInfoIcon}
                />
                <Text style={styles.basicInfoText}>
                  {activeTourPackage.minParticipants}-
                  {activeTourPackage.maxParticipants} khách
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.basicInfoRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={PRIMARY_COLOR}
              style={styles.basicInfoIcon}
            />
            <Text style={styles.basicInfoText}>
              {service.address || service.location}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>{t("home.description")}</Text>
          </View>
          <Text style={styles.descriptionText}>{service.description}</Text>
        </View>

        {/* Cancellation & Availability */}
        {policyType != null || policyDescription || nearestAvailableDate ? (
          <View style={styles.section}>
            {policyType != null || policyDescription ? (
              <View style={styles.infoRow}>
                <View style={styles.infoRowIconWrap}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {policyType != null ? (
                    <Text style={styles.infoRowText}>
                      {cancellationPolicySummaries[policyType] || ""}
                    </Text>
                  ) : null}
                  {policyDescription ? (
                    <Text style={[styles.policyDescText, { marginTop: 4 }]}>
                      {policyDescription}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {nearestAvailableDate ? (
              <View
                style={[
                  styles.infoRow,
                  policyType != null || policyDescription
                    ? { marginTop: 12 }
                    : null,
                ]}
              >
                <View style={styles.infoRowIconWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text style={styles.infoRowText}>
                  Có thể đặt từ{" "}
                  {new Date(nearestAvailableDate).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Offers for you */}
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.6}
          onPress={openOfferModal}
        >
          <View style={styles.offerRow}>
            <View style={styles.offerRowLeft}>
              <Ionicons
                name="pricetags-outline"
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.offerRowText}>Ưu đãi cho bạn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8d95a3" />
          </View>
        </TouchableOpacity>

        {/* ===== TOUR SECTIONS ===== */}
        {activeTourPackage ? (
          <>
            {service.tourPackages?.length > 1 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>Gói tour</Text>
                </View>
                <View style={styles.packageTabs}>
                  {service.tourPackages.map((pkg: any) => {
                    const active = selectedPackageId === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[
                          styles.packageTab,
                          active && styles.packageTabActive,
                        ]}
                        onPress={() => {
                          setSelectedPackageId(pkg.id);
                          setSelectedScheduleId(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.packageTabTitle,
                            active && styles.packageTabTitleActive,
                          ]}
                        >
                          {pkg.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Tour itinerary - timeline */}
            {activeTourPackage.itineraries.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>Lịch trình</Text>
                </View>
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineAbsoluteLine} />
                  {activeTourPackage.itineraries
                    .sort((a: any, b: any) => a.dayNumber - b.dayNumber || (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((item: any, index: number) => {
                      const isLast =
                        index === activeTourPackage.itineraries.length - 1;
                      return (
                        <View key={item.id || index} style={styles.timelineRow}>
                          <View style={styles.timelineDot}>
                            <Ionicons
                              name={getItineraryIcon(item.activityType)}
                              size={16}
                              color={PRIMARY_COLOR}
                            />
                          </View>
                          <View
                            style={[
                              styles.timelineContent,
                              isLast && { paddingBottom: 0 },
                            ]}
                          >
                            {activeTourPackage.itineraries.some((i: any) => i.dayNumber !== activeTourPackage.itineraries[0]?.dayNumber) ? (
                              <Text style={styles.timelineDayLabel}>
                                Ngày {item.dayNumber}
                              </Text>
                            ) : null}
                            <Text style={styles.timelineTitle}>
                              {item.title}
                            </Text>
                            {item.startTime || item.endTime ? (
                              <View style={styles.timelineMetaRow}>
                                <Ionicons
                                  name="time-outline"
                                  size={13}
                                  color="#8d95a3"
                                />
                                <Text style={styles.timelineMetaText}>
                                  {item.startTime
                                    ? item.startTime.substring(0, 5)
                                    : ""}
                                  {item.startTime && item.endTime ? " - " : ""}
                                  {item.endTime
                                    ? item.endTime.substring(0, 5)
                                    : ""}
                                </Text>
                              </View>
                            ) : null}
                            {item.location ? (
                              <View style={styles.timelineMetaRow}>
                                <Ionicons
                                  name="location-outline"
                                  size={13}
                                  color="#8d95a3"
                                />
                                <Text style={styles.timelineMetaText}>
                                  {item.location}
                                </Text>
                              </View>
                            ) : null}
                            {item.description ? (
                              <Text style={styles.timelineDescription}>
                                {item.description}
                              </Text>
                            ) : null}
                            {item.imageUrl ? (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.timelineImage}
                              />
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            ) : null}

            {activeTourPackage.includedItems?.length ||
            activeTourPackage.excludedItems?.length ? (
              <View style={styles.section}>
                {activeTourPackage.includedItems?.length ? (
                  <>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionHeaderLine} />
                      <Text style={styles.sectionTitle}>Bao gồm</Text>
                    </View>
                    {activeTourPackage.includedItems.map(
                      (item: string, index: number) => (
                        <View key={`inc-${index}`} style={styles.listRow}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={16}
                            color="#16a34a"
                          />
                          <Text style={styles.listRowText}>{item}</Text>
                        </View>
                      ),
                    )}
                  </>
                ) : null}
                {activeTourPackage.excludedItems?.length ? (
                  <View
                    style={
                      activeTourPackage.includedItems?.length
                        ? { marginTop: 16 }
                        : null
                    }
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionHeaderLine} />
                      <Text style={styles.sectionTitle}>Không bao gồm</Text>
                    </View>
                    {activeTourPackage.excludedItems.map(
                      (item: string, index: number) => (
                        <View key={`exc-${index}`} style={styles.listRow}>
                          <Ionicons
                            name="remove-circle-outline"
                            size={16}
                            color="#ef4444"
                          />
                          <Text style={styles.listRowText}>{item}</Text>
                        </View>
                      ),
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {/* ===== HOMESTAY SECTIONS ===== */}
        {service.homestay ? (
          <>
            {/* Homestay info */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLine} />
                <Text style={styles.sectionTitle}>Thông tin homestay</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.infoLabel}>Nhận phòng</Text>
                  <Text style={styles.infoValue}>
                    {service.homestay.checkInTime
                      ? service.homestay.checkInTime.substring(0, 5)
                      : "—"}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.infoLabel}>Trả phòng</Text>
                  <Text style={styles.infoValue}>
                    {service.homestay.checkOutTime
                      ? service.homestay.checkOutTime.substring(0, 5)
                      : "—"}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoGrid, { marginTop: 10 }]}>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="moon-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.infoLabel}>Tối thiểu</Text>
                  <Text style={styles.infoValue}>
                    {service.homestay.minNights} đêm
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="bed-outline"
                    size={20}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.infoLabel}>Loại phòng</Text>
                  <Text style={styles.infoValue}>
                    {service.homestay.rooms.length} loại
                  </Text>
                </View>
              </View>
            </View>

            {/* Chọn ngày nhận/trả phòng */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLine} />
                <Text style={styles.sectionTitle}>Chọn ngày</Text>
              </View>
              <Text style={styles.dateLabel}>Ngày nhận phòng</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowCheckInPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
                <Text
                  style={
                    checkInDate
                      ? styles.dateInputTextFilled
                      : styles.dateInputTextPlaceholder
                  }
                >
                  {checkInDate
                    ? checkInDate.toLocaleDateString("vi-VN")
                    : "Chọn ngày nhận phòng"}
                </Text>
              </TouchableOpacity>
              {showCheckInPicker && (
                <DateTimePicker
                  value={checkInDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={
                    service.homestay?.availableFrom
                      ? new Date(Math.max(
                          new Date(service.homestay.availableFrom).getTime(),
                          new Date(new Date().toDateString()).getTime(),
                        ))
                      : new Date(new Date().toDateString())
                  }
                  maximumDate={
                    service.homestay?.availableTo
                      ? new Date(service.homestay.availableTo)
                      : undefined
                  }
                  onChange={(event, date) => {
                    setShowCheckInPicker(Platform.OS === "ios");
                    if (date) {
                      const today = new Date(new Date().toDateString());
                      if (date < today) return;
                      setCheckInDate(date);
                      if (!checkOutDate || date >= checkOutDate) {
                        const co = new Date(date);
                        co.setDate(
                          co.getDate() + (service.homestay?.minNights || 1),
                        );
                        setCheckOutDate(co);
                      }
                    }
                  }}
                />
              )}

              <Text style={[styles.dateLabel, { marginTop: 14 }]}>
                Ngày trả phòng
              </Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowCheckOutPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
                <Text
                  style={
                    checkOutDate
                      ? styles.dateInputTextFilled
                      : styles.dateInputTextPlaceholder
                  }
                >
                  {checkOutDate
                    ? checkOutDate.toLocaleDateString("vi-VN")
                    : "Chọn ngày trả phòng"}
                </Text>
              </TouchableOpacity>
              {showCheckOutPicker && (
                <DateTimePicker
                  value={checkOutDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={
                    checkInDate
                      ? new Date(
                          checkInDate.getTime() +
                            86400000 * Math.max(1, service.homestay?.minNights || 1),
                        )
                      : new Date()
                  }
                  maximumDate={
                    service.homestay?.availableTo
                      ? new Date(service.homestay.availableTo)
                      : undefined
                  }
                  onChange={(event, date) => {
                    setShowCheckOutPicker(Platform.OS === "ios");
                    if (date) setCheckOutDate(date);
                  }}
                />
              )}

              {checkInDate && checkOutDate && (
                <View style={styles.nightsInfo}>
                  <Ionicons
                    name="moon-outline"
                    size={16}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.nightsText}>
                    {Math.round(
                      (checkOutDate.getTime() - checkInDate.getTime()) /
                        86400000,
                    )}{" "}
                    đêm
                  </Text>
                </View>
              )}
              {checkInDate && checkOutDate && (
                <View
                  style={{
                    backgroundColor: "#FEF3C7",
                    borderRadius: 10,
                    padding: 10,
                    marginTop: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#D97706"
                  />
                  <Text style={{ fontSize: 14, color: "#92400E", flex: 1 }}>
                    Phòng có thể đã có người đặt trong ngày này. Nếu không đặt
                    được, vui lòng chọn ngày khác.
                  </Text>
                </View>
              )}
            </View>

            {/* Rooms - chọn phòng */}
            {service.homestay.rooms.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>Chọn loại phòng</Text>
                </View>
                {service.homestay.rooms.map((room: any, index: number) => {
                  const isSelected = selectedRoomId === room.id;
                  const roomGallery = Array.isArray(room.images)
                    ? room.images
                    : [];
                  const roomCover =
                    room.imageUrl || roomGallery[0]?.imageUrl || "";
                  return (
                    <TouchableOpacity
                      key={room.id || index}
                      style={[
                        styles.roomCard,
                        isSelected && styles.roomCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedRoomId(room.id);
                        setGuestCount((current) =>
                          Math.max(1, Math.min(current, Math.max(1, Number(room.maxGuests || 1)))),
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      {roomCover ? (
                        <Image
                          source={{ uri: roomCover }}
                          style={styles.roomImage}
                        />
                      ) : null}
                      <View style={styles.roomInfo}>
                        <View style={styles.roomHeader}>
                          <Ionicons
                            name={
                              isSelected
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={20}
                            color={PRIMARY_COLOR}
                          />
                          <Text style={styles.roomName}>{room.name}</Text>
                        </View>
                        {room.description ? (
                          <Text style={styles.roomDesc}>
                            {room.description}
                          </Text>
                        ) : null}
                        <View style={styles.roomBedRow}>
                          <View style={styles.roomBedItem}>
                            <Ionicons
                              name="bed-outline"
                              size={16}
                              color={PRIMARY_COLOR}
                            />
                            <Text style={styles.roomBedLabel}>Loại Giường</Text>
                            <Text style={styles.roomBedValue}>
                              {room.bedType || "—"}
                            </Text>
                          </View>
                          {room.bedCount ? (
                            <View style={styles.roomBedItem}>
                              <Ionicons
                                name="layers-outline"
                                size={16}
                                color={PRIMARY_COLOR}
                              />
                              <Text style={styles.roomBedLabel}>Giường</Text>
                              <Text style={styles.roomBedValue}>
                                {room.bedCount}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.roomDetails}>
                          <View style={styles.roomDetailItem}>
                            <Ionicons
                              name="people-outline"
                              size={14}
                              color="#8d95a3"
                            />
                            <Text style={styles.roomDetailText}>
                              Tối đa {room.maxGuests} khách
                            </Text>
                          </View>
                          <View style={styles.roomDetailItem}>
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color="#8d95a3"
                            />
                            <Text style={styles.roomDetailText}>
                              {room.quantity} phòng
                            </Text>
                          </View>
                        </View>
                        {roomGallery.length > 1 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.roomThumbnailStrip}
                            contentContainerStyle={
                              styles.roomThumbnailStripContent
                            }
                          >
                            {roomGallery.map(
                              (image: any, imageIndex: number) => {
                                const imageUrl =
                                  image.imageUrl || image.url || image;
                                return (
                                  <Image
                                    key={`${room.id || index}-thumb-${imageIndex}`}
                                    source={{ uri: imageUrl }}
                                    style={[
                                      styles.roomThumbnail,
                                      image.isCover &&
                                        styles.roomThumbnailCover,
                                    ]}
                                  />
                                );
                              },
                            )}
                          </ScrollView>
                        ) : null}
                        <View style={styles.roomPriceRow}>
                          <Text style={styles.roomPrice}>
                            {Number(room.basePrice).toLocaleString()}đ
                          </Text>
                          <Text style={styles.roomPriceUnit}>/đêm</Text>
                          {room.weekendPrice ? (
                            <Text style={styles.roomWeekendPrice}>
                              Cuối tuần:{" "}
                              {Number(room.weekendPrice).toLocaleString()}đ
                            </Text>
                          ) : null}
                        </View>
                        {room.holidayPrice ? (
                          <Text style={styles.roomHolidayPrice}>
                            Ngày lễ:{" "}
                            {Number(room.holidayPrice).toLocaleString()}đ
                          </Text>
                        ) : null}
                        {room.amenities?.length ? (
                          <View
                            style={[styles.amenitiesGrid, { marginTop: 10 }]}
                          >
                            {room.amenities.map(
                              (amenity: any, amenityIndex: number) => (
                                <View
                                  key={amenity.id || amenityIndex}
                                  style={styles.amenityChip}
                                >
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={16}
                                    color={PRIMARY_COLOR}
                                  />
                                  <Text style={styles.amenityText}>
                                    {translateAmenity(amenity.name)}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {selectedRoom ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>Số khách lưu trú</Text>
                </View>
                <View style={styles.guestCounterCard}>
                  <View style={styles.guestCounterInfo}>
                    <Text style={styles.guestCounterTitle}>Khách trong phòng</Text>
                    <Text style={styles.guestCounterHint}>
                      {`Phòng này nhận tối đa ${maxHomestayGuests} khách.`}
                    </Text>
                  </View>
                  <View style={styles.guestCounterActions}>
                    <TouchableOpacity
                      style={[styles.guestCounterButton, guestCount <= 1 && styles.guestCounterButtonDisabled]}
                      onPress={() => setGuestCount((current) => Math.max(1, current - 1))}
                      disabled={guestCount <= 1}
                    >
                      <Ionicons name="remove" size={18} color={guestCount <= 1 ? "#c0c7d1" : "#1a2332"} />
                    </TouchableOpacity>
                    <Text style={styles.guestCounterValue}>{guestCount}</Text>
                    <TouchableOpacity
                      style={[
                        styles.guestCounterButton,
                        guestCount >= maxHomestayGuests && styles.guestCounterButtonDisabled,
                      ]}
                      onPress={() => setGuestCount((current) => Math.min(maxHomestayGuests, current + 1))}
                      disabled={guestCount >= maxHomestayGuests}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={guestCount >= maxHomestayGuests ? "#c0c7d1" : "#1a2332"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Amenities */}
            {service.homestay.amenities.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLine} />
                  <Text style={styles.sectionTitle}>Tiện ích</Text>
                </View>
                <View style={styles.amenitiesGrid}>
                  {service.homestay.amenities.map((a: any, i: number) => (
                    <View key={a.id || i} style={styles.amenityChip}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={PRIMARY_COLOR}
                      />
                      <Text style={styles.amenityText}>
                        {translateAmenity(a.name)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>{t("home.reviews")}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t("common.seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {reviews.length ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  {review.avatar ? (
                    <Image
                      source={{ uri: review.avatar }}
                      style={styles.reviewAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.reviewAvatar,
                        styles.reviewAvatarPlaceholder,
                      ]}
                    >
                      <Text style={styles.reviewAvatarInitial}>
                        {review.userName?.trim()?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.userName}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.reviewStars}>
                    {renderStars(review.rating)}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>
              Dịch vụ chưa được đánh giá.
            </Text>
          )}
        </View>

        {/* About the operator */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Về nhà cung cấp</Text>
          </View>
          <View>
            <View style={styles.operatorRow}>
              <Ionicons
                name="business-outline"
                size={18}
                color={PRIMARY_COLOR}
                style={styles.operatorIcon}
              />
              <Text style={styles.operatorLabel}>Điều hành bởi: </Text>
              <Text style={styles.operatorValue}>{service.partnerName}</Text>
            </View>
            <View style={styles.operatorRow}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={PRIMARY_COLOR}
                style={styles.operatorIcon}
              />
              <Text style={styles.operatorLabel}>Tổng đánh giá: </Text>
              <Text style={styles.operatorValue}>{service.reviewCount}</Text>
            </View>
            <View style={styles.operatorRow}>
              <Ionicons
                name="star-outline"
                size={18}
                color={PRIMARY_COLOR}
                style={styles.operatorIcon}
              />
              <Text style={styles.operatorLabel}>Tỷ lệ đánh giá tốt: </Text>
              <Text style={styles.operatorValue}>
                {reviews.length
                  ? Math.round(
                      (reviews.filter((r) => r.rating >= 4).length /
                        reviews.length) *
                        100,
                    )
                  : 0}
                %
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Offer Modal */}
      <Modal
        visible={showOfferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.offerModalOverlay}>
          <View style={styles.offerModalContent}>
            <View style={styles.offerModalHeader}>
              <Text style={styles.offerModalTitle}>Ưu đãi cho bạn</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <Ionicons name="close" size={24} color="#1a2332" />
              </TouchableOpacity>
            </View>
            {vouchers.length > 0 ? (
              <FlatList
                data={vouchers}
                keyExtractor={(item: any) => item.id || item.code}
                contentContainerStyle={{ paddingBottom: 16 }}
                renderItem={({ item }: { item: any }) => (
                  <View style={styles.offerItem}>
                    <View style={styles.offerItemLeft}>
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.offerItemBody}>
                      <Text style={styles.offerItemCode}>
                        {item.code || ""}
                      </Text>
                      <Text style={styles.offerItemDesc}>
                        {item.description || item.name || "Giảm giá"}
                      </Text>
                      {item.discountPercent ? (
                        <Text style={styles.offerItemValue}>
                          Giảm {item.discountPercent}%
                        </Text>
                      ) : item.discountAmount ? (
                        <Text style={styles.offerItemValue}>
                          Giảm {Number(item.discountAmount).toLocaleString()}đ
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
              />
            ) : (
              <View style={styles.offerEmpty}>
                <Ionicons name="pricetags-outline" size={40} color="#c8cdd4" />
                <Text style={styles.offerEmptyText}>
                  Hiện chưa có ưu đãi nào cho dịch vụ này.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          {service.homestay && numberOfNights > 1 ? (
            <>
              <Text style={styles.bottomPriceLabel}>
                {unitPrice.toLocaleString()}đ × {numberOfNights} đêm
              </Text>
              <Text style={styles.bottomPriceValue}>
                {totalBeforeVoucher.toLocaleString()}đ
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.bottomPriceLabel}>{t("home.priceFrom")}</Text>
              <Text style={styles.bottomPriceValue}>
                {discountedPrice.toLocaleString()}đ
              </Text>
            </>
          )}
        </View>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() =>
              router.push({
                pathname: "/chat-detail",
                params: {
                  partnerId: service.partnerId || "",
                  partnerName: service.partnerName || "Nhà cung cấp",
                  partnerAvatar: "",
                },
              } as any)
            }
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={PRIMARY_COLOR}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              // Tour: navigate to schedule-selection page
              if (activeTourPackage && activeTourPackage.schedules.length > 0) {
                router.push({
                  pathname: "/schedule-selection",
                  params: {
                    serviceData: JSON.stringify({
                      ...service,
                      selectedPackageId,
                      preferredStartDate: params.startDate || params.checkInDate || "",
                      preferredEndDate: params.endDate || params.checkOutDate || "",
                    }),
                  },
                } as any);
                return;
              }
              // Validate homestay: phải chọn phòng và ngày
              if (service.homestay) {
                if (service.homestay.rooms.length > 0 && !selectedRoomId) {
                  Alert.alert("Thông báo", "Vui lòng chọn loại phòng.");
                  return;
                }
                if (!checkInDate || !checkOutDate) {
                  Alert.alert(
                    "Thông báo",
                    "Vui lòng nhập ngày nhận và trả phòng.",
                  );
                  return;
                }
                if (checkInDate < new Date(new Date().toDateString())) {
                  Alert.alert("Thông báo", "Ngày nhận phòng không thể trong quá khứ.");
                  return;
                }
                const selectedNights = Math.round(
                  (checkOutDate.getTime() - checkInDate.getTime()) / 86400000,
                );
                if (selectedNights < (service.homestay.minNights || 1)) {
                  Alert.alert(
                    "Thông báo",
                    `Homestay yêu cầu tối thiểu ${service.homestay.minNights || 1} đêm.`,
                  );
                  return;
                }
                if (
                  service.homestay.maxNights &&
                  selectedNights > service.homestay.maxNights
                ) {
                  Alert.alert(
                    "Thông báo",
                    `Homestay chỉ cho phép tối đa ${service.homestay.maxNights} đêm.`,
                  );
                  return;
                }
                if (
                  selectedRoom &&
                  guestCount > Math.max(1, Number(selectedRoom.maxGuests || 1))
                ) {
                  Alert.alert(
                    "Thông báo",
                    `Phòng này chỉ nhận tối đa ${selectedRoom.maxGuests} khách.`,
                  );
                  return;
                }
              }

              router.push({
                pathname: "/checkout",
                params: {
                  checkoutData: JSON.stringify(buildCartBookingData()),
                },
              });
            }}
          >
            <Text style={styles.bookButtonText}>{t("booking.bookNow")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  // Carousel
  carouselContainer: {
    position: "relative",
    height: 280,
    overflow: "hidden",
  },
  carouselImage: {
    width: width,
    height: 280,
  },
  carouselPlaceholder: {
    backgroundColor: "#dfe7ee",
    justifyContent: "center",
    alignItems: "center",
  },
  carouselPlaceholderText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#5a6577",
    fontFamily: "Inter",
  },
  carouselHeader: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  carouselActions: {
    flexDirection: "row",
  },
  carouselButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: "#FFF",
    width: 20,
  },
  imageCounter: {
    position: "absolute",
    bottom: 12,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imageCounterText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter",
  },
  // Section
  section: {
    backgroundColor: "#FFF",
    padding: 20,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderLine: {
    width: 4,
    height: 22,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  // Basic info
  serviceName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 8,
    fontFamily: "Inter",
  },
  basicInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  basicInfoText: {
    fontSize: 16,
    color: "#1a2332",
    flexShrink: 1,
    fontFamily: "Inter",
    lineHeight: 25.6,
  },
  basicInfoRowWide: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 20,
  },
  basicInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  basicInfoIcon: {
    lineHeight: 25.6,
  },
  basicInfoIconStar: {
    lineHeight: 25.6,
  },

  // Description
  descriptionText: {
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    fontFamily: "Inter",
  },
  // Offers for you
  offerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offerRowText: {
    fontSize: 16,
    color: "#1a2332",
    fontWeight: "500",
    fontFamily: "Inter",
    lineHeight: 25.6,
  },
  // Cancellation & Availability
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoRowIconWrap: {
    height: 25.6,
    justifyContent: "center",
  },
  infoRowText: {
    flex: 1,
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    fontFamily: "Inter",
  },
  policyDescText: {
    fontSize: 16,
    color: "#8d95a3",
    lineHeight: 25.6,
    fontFamily: "Inter",
  },
  // Timeline
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
  timelineDayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 2,
    textTransform: "uppercase",
    fontFamily: "Inter",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
    fontFamily: "Inter",
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
    fontFamily: "Inter",
  },
  timelineDescription: {
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    marginTop: 4,
    fontFamily: "Inter",
  },
  timelineImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginTop: 10,
  },
  packageTabs: {
    gap: 10,
  },
  packageTab: {
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  packageTabActive: {
    backgroundColor: "#e6f5f7",
    borderColor: PRIMARY_COLOR,
  },
  packageTabTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 6,
    fontFamily: "Inter",
  },
  packageTabTitleActive: {
    color: "#006f7d",
  },
  packageTabMeta: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 22.4,
    fontFamily: "Inter",
  },
  packageTabMetaActive: {
    color: "#0f5660",
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoItem: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 6,
    fontFamily: "Inter",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginTop: 2,
    textAlign: "center",
    fontFamily: "Inter",
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
    fontFamily: "Inter",
  },
  // Date input
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 8,
    fontFamily: "Inter",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  dateInputTextFilled: {
    flex: 1,
    fontSize: 16,
    color: "#1a2332",
    fontFamily: "Inter",
  },
  dateInputTextPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#b0b8c1",
    fontFamily: "Inter",
  },
  nightsInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f5f7",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  nightsText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    fontFamily: "Inter",
  },
  // Room card
  roomCard: {
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  roomCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: "#e6f5f7",
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  roomImage: {
    width: "100%",
    height: 160,
  },
  roomInfo: {
    padding: 14,
  },
  roomName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 4,
    fontFamily: "Inter",
  },
  roomDesc: {
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    marginBottom: 8,
    fontFamily: "Inter",
  },
  roomBedRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  roomBedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roomBedLabel: {
    fontSize: 14,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  roomBedValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  roomDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  roomThumbnailStrip: {
    marginBottom: 10,
  },
  roomThumbnailStripContent: {
    gap: 8,
    paddingRight: 4,
  },
  roomThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  roomThumbnailCover: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  roomDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roomDetailText: {
    fontSize: 16,
    color: "#1a2332",
    fontFamily: "Inter",
  },
  roomPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  roomPriceUnit: {
    fontSize: 14,
    color: "#8d95a3",
    marginLeft: 2,
    fontFamily: "Inter",
  },
  roomWeekendPrice: {
    fontSize: 14,
    color: "#8d95a3",
    marginLeft: 12,
    fontFamily: "Inter",
  },
  roomHolidayPrice: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 4,
    fontFamily: "Inter",
  },
  guestCounterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dceef1",
    backgroundColor: "#f8fcfd",
    padding: 16,
  },
  guestCounterInfo: {
    flex: 1,
    gap: 4,
  },
  guestCounterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  guestCounterHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5a6577",
    fontFamily: "Inter",
  },
  guestCounterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guestCounterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dceef1",
  },
  guestCounterButtonDisabled: {
    backgroundColor: "#f4f6f8",
    borderColor: "#e5e7eb",
  },
  guestCounterValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  // Amenities
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f5f7",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  amenityText: {
    fontSize: 14,
    color: "#1a2332",
    fontWeight: "500",
    fontFamily: "Inter",
  },
  // Reviews
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
    paddingVertical: 14,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  reviewAvatarPlaceholder: {
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAvatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1d4d8f",
    fontFamily: "Inter",
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  reviewDate: {
    fontSize: 14,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 16,
    color: "#1a2332",
    lineHeight: 25.6,
    fontFamily: "Inter",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#8d95a3",
    lineHeight: 25.6,
    fontFamily: "Inter",
  },
  // Operator
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  operatorIcon: {
    marginRight: 8,
  },
  operatorLabel: {
    fontSize: 16,
    color: "#1a2332",
    fontFamily: "Inter",
  },
  operatorValue: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    fontFamily: "Inter",
  },
  // Voucher
  // Bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
  },
  bottomPrice: {},
  bottomPriceLabel: {
    fontSize: 14,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  bookButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  // Offer Modal
  offerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  offerModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 32,
  },
  offerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  offerModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  offerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  offerItemLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f9fa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  offerItemBody: {
    flex: 1,
  },
  offerItemCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  offerItemDesc: {
    fontSize: 12,
    color: "#5a6577",
    marginTop: 2,
    fontFamily: "Inter",
  },
  offerItemValue: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: "500",
    marginTop: 2,
    fontFamily: "Inter",
  },
  offerEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  offerEmptyText: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 12,
    fontFamily: "Inter",
  },
});
