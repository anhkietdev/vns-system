import { bookingService } from "@/api/booking.service";
import { reviewService } from "@/api/review.service";
import {
  useAppSnackbar,
} from "@/components/feedback/AppFeedbackProvider";
import { normalizeError } from "@/utils/normalizeError";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ReviewableBooking = {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceName: string;
  serviceType: number;
  thumbnailUrl: string | null;
  partnerName: string | null;
  finalAmount: number;
  startDate?: string | null;
  checkInDate: string | null;
  bookingDate: string | null;
};

const PRIMARY_COLOR = "#008fa0";
const MAX_COMMENT_LENGTH = 500;

function formatCurrency(value?: number | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(value?: string | null) {
  if (!value) return "Không có dữ liệu";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getServiceTypeLabel(serviceType: number) {
  if (serviceType === 0) return "Homestay";
  if (serviceType === 1) return "Tour";
  if (serviceType === 3) return "Combo";
  return "Dịch vụ";
}

function RatingStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          style={styles.starButton}
          onPress={() => onChange(star)}
        >
          <AntDesign
            name={(star <= rating ? "star" : "staro") as any}
            size={34}
            color={star <= rating ? "#f59e0b" : "#cbd5e1"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewBookingScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const [bookings, setBookings] = useState<ReviewableBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSnackbar = useAppSnackbar();

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookingResponse, reviewResponse] = await Promise.all([
        bookingService.getMyBookings({ status: 3, pageSize: 100 }),
        reviewService.getMyReviews().catch(() => null),
      ]);

      const bookingData = bookingResponse?.data || bookingResponse;
      const bookingItems = Array.isArray(bookingData)
        ? bookingData
        : bookingData.items || bookingData.Items || [];

      const reviewData = reviewResponse ? reviewResponse.data || reviewResponse : [];
      const reviewItems = Array.isArray(reviewData)
        ? reviewData
        : reviewData.items || reviewData.Items || [];
      const reviewedIds = new Set(
        reviewItems.map((item: any) => String(item.bookingId || item.BookingId || "")),
      );

      const mapped: ReviewableBooking[] = bookingItems
        .map((item: any) => ({
          id: String(item.id || item.Id || ""),
          bookingCode: item.bookingCode || item.BookingCode || "",
          serviceId: String(item.serviceId || item.ServiceId || ""),
          serviceName: item.serviceName || item.ServiceName || "",
          serviceType: item.serviceType ?? item.ServiceType ?? 0,
          thumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl || null,
          partnerName: item.partnerName || item.PartnerName || null,
          finalAmount: Number(item.finalAmount ?? item.FinalAmount ?? 0),
          checkInDate: item.checkInDate || item.CheckInDate || null,
          bookingDate: item.bookingDate || item.BookingDate || null,
        }))
        .filter((item: ReviewableBooking) => !reviewedIds.has(item.id));

      setBookings(mapped);

      if (params.bookingId) {
        const found = mapped.find((item: ReviewableBooking) => item.id === params.bookingId);
        setSelectedBookingId(found?.id || null);
      } else if (mapped.length === 1) {
        setSelectedBookingId(mapped[0].id);
      } else if (selectedBookingId && mapped.some((item: ReviewableBooking) => item.id === selectedBookingId)) {
        setSelectedBookingId(selectedBookingId);
      } else {
        setSelectedBookingId(null);
      }
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({
        message: normalized.message || "Không thể tải danh sách dịch vụ để đánh giá.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.bookingId, selectedBookingId, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const selectedBooking =
    bookings.find((item) => item.id === selectedBookingId) || null;

  const handleSubmit = async () => {
    if (!selectedBookingId) {
      showSnackbar({ message: "Vui lòng chọn một dịch vụ để đánh giá.", tone: "error" });
      return;
    }
    if (rating === 0) {
      showSnackbar({ message: "Vui lòng chọn số sao đánh giá.", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.createReview({
        bookingId: selectedBookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      showSnackbar({ message: "Đánh giá của bạn đã được gửi thành công.", tone: "success" });
      if (selectedBooking?.serviceType === 3) {
        router.replace({
          pathname: "/booking-detail",
          params: { id: selectedBookingId },
        });
      } else if (selectedBooking?.serviceId) {
        router.replace({
          pathname: "/service-detail",
          params: { id: selectedBooking.serviceId },
        } as any);
      } else {
        router.replace({
          pathname: "/booking-detail",
          params: { id: selectedBookingId },
        });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({
        message: normalized.message || "Không thể gửi đánh giá.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickComment = (value: string) => {
    const next = comment ? `${comment}\n${value}` : value;
    if (next.length > MAX_COMMENT_LENGTH) {
      showSnackbar({ message: "Nội dung đánh giá đã đạt giới hạn ký tự.", tone: "warning" });
      return;
    }
    setComment(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá dịch vụ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepCircleText}>1</Text>
          </View>
          <View style={[styles.stepLine, selectedBookingId && styles.stepLineActive]} />
          <View style={[styles.stepCircle, selectedBookingId && styles.stepCircleActive]}>
            <Text style={styles.stepCircleText}>2</Text>
          </View>
          <View style={[styles.stepLine, rating > 0 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, rating > 0 && styles.stepCircleActive]}>
            <Text style={styles.stepCircleText}>3</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dịch vụ đã hoàn thành</Text>
          <Text style={styles.sectionSubtitle}>
            Chọn dịch vụ bạn muốn chia sẻ trải nghiệm.
          </Text>

          {isLoading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              <Text style={styles.stateText}>Đang tải danh sách dịch vụ...</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.stateBlock}>
              <MaterialIcons name="rate-review" size={52} color="#cbd5e1" />
              <Text style={styles.stateText}>
                Hiện chưa có dịch vụ hoàn thành nào cần đánh giá.
              </Text>
              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => router.push("/review-history")}
              >
                <Text style={styles.historyButtonText}>Xem lịch sử đánh giá</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookings.map((item) => {
              const selected = selectedBookingId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.bookingCard, selected && styles.bookingCardSelected]}
                  onPress={() => {
                    setSelectedBookingId(item.id);
                    setRating(0);
                    setComment("");
                  }}
                >
                  <Image
                    source={{
                      uri:
                        item.thumbnailUrl ||
                        "https://picsum.photos/seed/review-booking/300/300",
                    }}
                    style={styles.bookingImage}
                  />
                  <View style={styles.bookingContent}>
                    <View style={styles.bookingTopRow}>
                      <Text style={styles.bookingName} numberOfLines={2}>
                        {item.serviceName}
                      </Text>
                      {selected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.bookingMeta}>
                      {getServiceTypeLabel(item.serviceType)} • {formatDate(item.startDate || item.checkInDate || item.bookingDate)}
                    </Text>
                    <Text style={styles.bookingMeta}>
                      {item.partnerName || "Đối tác VNS"}
                    </Text>
                    <Text style={styles.bookingPrice}>{formatCurrency(item.finalAmount)}</Text>
                    <Text style={styles.bookingCode}>{item.bookingCode}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {selectedBooking ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
            <Text style={styles.sectionSubtitle}>
              Hãy để lại cảm nhận thật của bạn để giúp người dùng khác lựa chọn tốt hơn.
            </Text>

            <View style={styles.ratingBox}>
              <RatingStars rating={rating} onChange={setRating} />
              <Text style={styles.ratingLabel}>
                {rating === 0
                  ? "Chưa chọn số sao"
                  : rating === 1
                    ? "Chưa hài lòng"
                    : rating === 2
                      ? "Tạm ổn"
                      : rating === 3
                        ? "Khá tốt"
                        : rating === 4
                          ? "Rất tốt"
                          : "Tuyệt vời"}
              </Text>
            </View>

            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>Nội dung đánh giá</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                placeholder="Ví dụ: phòng sạch sẽ, hướng dẫn viên nhiệt tình, lịch trình hợp lý..."
                placeholderTextColor="#94a3b8"
                value={comment}
                onChangeText={(value) => {
                  if (value.length <= MAX_COMMENT_LENGTH) {
                    setComment(value);
                  }
                }}
                textAlignVertical="top"
              />
              <Text style={styles.commentCount}>
                {comment.length}/{MAX_COMMENT_LENGTH} ký tự
              </Text>
            </View>

            <View style={styles.quickCommentSection}>
              <Text style={styles.quickCommentTitle}>Gợi ý nhanh</Text>
              <View style={styles.quickCommentGrid}>
                {[
                  "Dịch vụ đúng như mô tả",
                  "Giá cả hợp lý",
                  "Nhân viên hỗ trợ nhiệt tình",
                  "Muốn quay lại lần sau",
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.quickCommentChip}
                    onPress={() => handleQuickComment(item)}
                  >
                    <Text style={styles.quickCommentChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {selectedBooking ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setRating(0);
              setComment("");
            }}
          >
            <Text style={styles.resetButtonText}>Làm lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, (rating === 0 || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dbe4ec",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  stepLine: {
    width: 44,
    height: 2,
    backgroundColor: "#dbe4ec",
  },
  stepLineActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 14,
    lineHeight: 20,
  },
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  historyButton: {
    marginTop: 14,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  bookingCard: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 10,
  },
  bookingCardSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: "#eefbfc",
  },
  bookingImage: {
    width: 100,
    height: 100,
    backgroundColor: "#e2e8f0",
  },
  bookingContent: {
    flex: 1,
    padding: 12,
  },
  bookingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  bookingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1a2332",
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingMeta: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ea580c",
    marginTop: 4,
  },
  bookingCode: {
    marginTop: 4,
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  ratingBox: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  starButton: {
    paddingHorizontal: 6,
  },
  ratingLabel: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  commentBox: {
    marginTop: 16,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 10,
  },
  commentInput: {
    minHeight: 120,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    fontSize: 14,
    color: "#1a2332",
  },
  commentCount: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
    textAlign: "right",
  },
  quickCommentSection: {
    marginTop: 16,
  },
  quickCommentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  quickCommentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCommentChip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#cfe8ec",
  },
  quickCommentChipText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e8ecf0",
  },
  resetButton: {
    width: 112,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  submitButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
