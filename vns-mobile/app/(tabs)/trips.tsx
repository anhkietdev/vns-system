import { bookingService } from "@/api/booking.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Booking = {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceName: string;
  serviceType: number;
  thumbnailUrl: string | null;
  status: number;
  commercialStatus: number;
  fulfillmentStatus: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentStatus: number | null;
  numberOfGuests: number;
  checkInDate: string | null;
  checkOutDate: string | null;
  startDate: string | null;
  endDate: string | null;
  bookingDate: string;
  partnerName: string | null;
  customerName: string | null;
  comboId: string | null;
  comboName: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

function getStatusInfo(status: number, commercialStatus: number, fulfillmentStatus: number): { label: string; color: string; bg: string } {
  const baseLabel = (s: number) => {
    switch (s) {
      case 0: return { label: "Chờ thanh toán", color: "#ea580c", bg: "#FFF7ED" };
      case 1: return { label: "Đã xác nhận", color: "#008fa0", bg: "#E8F0FE" };
      case 2: return { label: "Hoàn thành", color: "#16a34a", bg: "#E8F5E9" };
      case 3: return { label: "Đã hủy", color: "#F44336", bg: "#FFEBEE" };
      case 4: return { label: "Đã hoàn tiền", color: "#7c3aed", bg: "#EDE9FE" };
      case 5: return { label: "Chờ hoàn tiền", color: "#ea580c", bg: "#FFF7ED" };
      case 7: return { label: "Hết hạn", color: "#64748b", bg: "#F1F5F9" };
      case 8: return { label: "Chờ hoàn tiền", color: "#ea580c", bg: "#FFF7ED" };
      default: return { label: "Không xác định", color: "#64748b", bg: "#F1F5F9" };
    }
  };
  if (commercialStatus === 0 && fulfillmentStatus === 0 && status === 0) {
    return { label: "Chờ thanh toán", color: "#ea580c", bg: "#FFF7ED" };
  }
  if (commercialStatus === 1 && fulfillmentStatus === 0) {
    return { label: "Đã thanh toán", color: "#008fa0", bg: "#E8F0FE" };
  }
  if (fulfillmentStatus === 3 && commercialStatus === 3) {
    return { label: "Đã hoàn tiền", color: "#7c3aed", bg: "#EDE9FE" };
  }
  if (fulfillmentStatus === 3 && commercialStatus === 2) {
    return { label: "Chờ hoàn tiền", color: "#ea580c", bg: "#FFF7ED" };
  }
  return baseLabel(status);
}

const serviceTypeConfig: Record<
  number,
  { label: string; icon: string; color: string; bg: string }
> = {
  0: { label: "Homestay", icon: "bed-outline", color: "#2563EB", bg: "#DBEAFE" },
  1: { label: "Tour", icon: "compass-outline", color: "#16a34a", bg: "#DCFCE7" },
  3: { label: "Combo", icon: "gift-outline", color: "#d97706", bg: "#FEF3C7" },
};

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRefundHint(booking: Booking) {
  if (booking.commercialStatus === 2) {
    return {
      icon: "time-outline",
      text: "Đơn đang chờ xử lý hoàn tiền về Ví VNS.",
      color: "#c2410c",
    };
  }
  if (booking.commercialStatus === 3) {
    return {
      icon: "wallet-outline",
      text: "Khoản hoàn tiền đã được chuyển về Ví VNS.",
      color: "#7c3aed",
    };
  }
  if (booking.fulfillmentStatus === 3 && booking.paymentStatus != null && booking.finalAmount > 0) {
    return {
      icon: "information-circle-outline",
      text: "Mở chi tiết để kiểm tra trạng thái hoàn tiền sau khi hủy.",
      color: "#0369a1",
    };
  }
  return null;
}

function BookingCard({ booking }: { booking: Booking }) {
  const serviceType = serviceTypeConfig[booking.serviceType] || serviceTypeConfig[0];
  const status = getStatusInfo(booking.status, booking.commercialStatus, booking.fulfillmentStatus);
  const isHomestay = booking.serviceType === 0;
  const isCombo = booking.serviceType === 3;
  const refundHint = getRefundHint(booking);

  const handlePress = () => {
    router.push({
      pathname: "/booking-detail",
      params: { id: booking.id, bookingCode: booking.bookingCode },
    });
  };

  const dateDisplay = isHomestay
    ? `${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}`
    : formatDate(booking.startDate || booking.checkInDate || booking.bookingDate);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        {booking.thumbnailUrl ? (
          <Image source={{ uri: booking.thumbnailUrl }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.cardImagePlaceholder,
              { backgroundColor: serviceType.bg },
            ]}
          >
            <Ionicons name={serviceType.icon as any} size={28} color={serviceType.color} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.typeBadge, { backgroundColor: serviceType.bg }]}>
              <Text style={[styles.typeBadgeText, { color: serviceType.color }]}>
                {serviceType.label}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusBadgeText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceName} numberOfLines={1}>
            {booking.serviceName}
          </Text>

          {booking.partnerName ? (
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={12} color="#8d95a3" />
              <Text style={styles.metaText} numberOfLines={1}>
                {booking.partnerName}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color="#8d95a3" />
            <Text style={styles.metaText}>{dateDisplay}</Text>
          </View>

          {isHomestay && booking.numberOfGuests > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color="#8d95a3" />
              <Text style={styles.metaText}>{booking.numberOfGuests} khách</Text>
            </View>
          ) : null}

          {isCombo && booking.comboName ? (
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={12} color="#d97706" />
              <Text style={[styles.metaText, { color: "#d97706" }]}>
                {booking.comboName}
              </Text>
            </View>
          ) : null}

          {booking.address ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color="#8d95a3" />
              <Text style={styles.metaText} numberOfLines={1}>
                {booking.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
          {refundHint ? (
            <View style={styles.refundHintRow}>
              <Ionicons name={refundHint.icon as any} size={12} color={refundHint.color} />
              <Text style={[styles.refundHintText, { color: refundHint.color }]}>
                {refundHint.text}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailHintRow}>
            <Text style={styles.detailHintText}>Xem chi tiết</Text>
            <Ionicons name="chevron-forward" size={12} color="#008fa0" />
          </View>
        </View>

        <View style={styles.footerRight}>
          <Text style={styles.priceLabel}>Tổng: </Text>
          <Text style={styles.priceValue}>{formatCurrency(booking.finalAmount)}</Text>
          {booking.discountAmount > 0 ? (
            <Text style={styles.priceOriginal}>{formatCurrency(booking.totalAmount)}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page] = useState(1);

  const mapBooking = (raw: any): Booking => ({
    id: raw.id || raw.Id || "",
    bookingCode: raw.bookingCode || raw.BookingCode || "",
    serviceId: raw.serviceId || raw.ServiceId || "",
    serviceName: raw.serviceName || raw.ServiceName || "",
    serviceType: raw.serviceType ?? raw.ServiceType ?? 0,
    thumbnailUrl: raw.thumbnailUrl || raw.ThumbnailUrl || null,
    status: raw.status ?? raw.Status ?? 0,
    commercialStatus: raw.commercialStatus ?? raw.CommercialStatus ?? 0,
    fulfillmentStatus: raw.fulfillmentStatus ?? raw.FulfillmentStatus ?? 0,
    totalAmount: raw.totalAmount ?? raw.TotalAmount ?? 0,
    discountAmount: raw.discountAmount ?? raw.DiscountAmount ?? 0,
    finalAmount: raw.finalAmount ?? raw.FinalAmount ?? 0,
    paymentStatus: raw.paymentStatus ?? raw.PaymentStatus ?? null,
    numberOfGuests: raw.numberOfGuests ?? raw.NumberOfGuests ?? 0,
    checkInDate: raw.checkInDate || raw.CheckInDate || null,
    checkOutDate: raw.checkOutDate || raw.CheckOutDate || null,
    startDate: raw.startDate || raw.StartDate || raw.checkInDate || raw.CheckInDate || null,
    endDate: raw.endDate || raw.EndDate || raw.checkOutDate || raw.CheckOutDate || null,
    bookingDate: raw.bookingDate || raw.BookingDate || new Date().toISOString(),
    partnerName: raw.partnerName || raw.PartnerName || null,
    customerName: raw.customerName || raw.CustomerName || null,
    comboId: raw.comboId || raw.ComboId || null,
    comboName: raw.comboName || raw.ComboName || null,
    address: raw.address || raw.Address || null,
    contactEmail: raw.contactEmail || raw.ContactEmail || null,
    contactPhone: raw.contactPhone || raw.ContactPhone || null,
  });

  const fetchBookings = useCallback(async () => {
    try {
      const filter: any = { page, pageSize: 20 };
      const res = await bookingService.getMyBookings(filter);
      const data = res?.data || res;
      const items: any[] = data.items || data.Items || data || [];
      setBookings(items.map(mapBooking));
      setTotalCount(data.totalCount || data.TotalCount || items.length);
    } catch (error) {
      console.log("Lỗi tải đặt chỗ:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setIsLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const filter: any = { page: 1, pageSize: 20 };
      const res = await bookingService.getMyBookings(filter);
      const data = res?.data || res;
      const items: any[] = data.items || data.Items || data || [];
      setBookings(items.map(mapBooking));
      setTotalCount(data.totalCount || data.TotalCount || items.length);
    } catch (error) {
      console.log("Lỗi refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch</Text>
        <Text style={styles.headerSubtitle}>
          {totalCount > 0 ? `${totalCount} đặt chỗ` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>Đang tải lịch...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#008fa0"]}
            />
          }
        >
          <Ionicons name="document-text-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Chưa có đặt chỗ nào</Text>
          <Text style={styles.emptySubtitle}>
            Khi bạn đặt tour, homestay hoặc dịch vụ, chúng sẽ tự động xuất hiện ở đây.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#008fa0"]}
            />
          }
        >
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2332",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#8d95a3",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#8d95a3",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    padding: 14,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: "#5a6577",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f4f6f8",
    backgroundColor: "#fafbfc",
  },
  footerLeft: {},
  bookingCode: {
    fontSize: 11,
    color: "#8d95a3",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  refundHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 6,
    maxWidth: 220,
  },
  refundHintText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  detailHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  detailHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#008fa0",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: "#8d95a3",
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B00",
  },
  priceOriginal: {
    fontSize: 11,
    color: "#c8cdd4",
    textDecorationLine: "line-through",
  },
});
