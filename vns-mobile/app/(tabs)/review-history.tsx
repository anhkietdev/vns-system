// app/(tabs)/review-history.tsx
import { bookingService } from "@/api/booking.service";
import { reviewService } from "@/api/review.service";
import { t } from "@/i18n";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ReviewItem = {
  id: string;
  bookingId: string;
  tourName: string;
  image: any;
  rating: number;
  comment: string;
  createdAt: string;
  createdAtRaw: string;
  status: string;
  partnerResponse: string;
};

// Component hiển thị sao đánh giá - Fix lỗi type bằng cách sử dụng any
const RatingStars = ({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => {
        // Sử dụng any để bypass type checking
        const iconName: any = star <= rating ? "star" : "staro";
        return (
          <AntDesign
            key={star}
            name={iconName}
            size={size}
            color={star <= rating ? "#F59E0B" : "#E2E8F0"}
            style={styles.starIcon}
          />
        );
      })}
    </View>
  );
};

const ReviewHistoryScreen = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const [reviewRes, bookingRes] = await Promise.all([
        reviewService.getMyReviews(),
        bookingService.getMyBookings({ pageSize: 100 }).catch(() => null),
      ]);

      const reviewData = reviewRes.data || reviewRes;
      const reviewItems = Array.isArray(reviewData)
        ? reviewData
        : reviewData.items || [];

      const thumbnailMap = new Map<string, string>();
      if (bookingRes) {
        const bookingData = bookingRes.data || bookingRes;
        const bookingItems = Array.isArray(bookingData)
          ? bookingData
          : bookingData.items || bookingData.Items || [];
        bookingItems.forEach((b: any) => {
          const id = String(b.id || b.Id || "");
          const thumb = b.thumbnailUrl || b.ThumbnailUrl || null;
          if (id && thumb) thumbnailMap.set(id, thumb);
        });
      }

      const mapped = reviewItems.map((item: any) => {
        const bookingId = item.bookingId || item.BookingId || "";
        const thumbUrl = thumbnailMap.get(bookingId);
        const rawDate = item.createdAt || "";
        return {
          id: item.id,
          bookingId,
          tourName: item.serviceName || "",
          image: thumbUrl
            ? { uri: thumbUrl }
            : item.imageUrls?.[0]
              ? { uri: item.imageUrls[0] }
              : require("@/assets/images/halong.jpg"),
          rating: item.rating || 0,
          comment: item.comment || "",
          createdAt: rawDate
            ? new Date(rawDate).toLocaleDateString("vi-VN")
            : "",
          createdAtRaw: rawDate,
          status:
            item.isVisible === false
              ? "rejected"
              : item.adminStatus === "actioned" ||
                  item.adminStatus === "reviewed" ||
                  item.isVisible === true
                ? "approved"
                : "approved",
          partnerResponse: item.partnerResponse || "",
        };
      });

      const sorted = [...mapped].sort((a, b) => {
        const dateA = a.createdAtRaw ? new Date(a.createdAtRaw).getTime() : 0;
        const dateB = b.createdAtRaw ? new Date(b.createdAtRaw).getTime() : 0;
        return (dateB || 0) - (dateA || 0);
      });

      setReviews(sorted);
    } catch (error) {
      console.log("Lỗi tải lịch sử đánh giá:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  }, [fetchReviews]);

  const handleBackToProfile = () => {
    router.back();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return t("review.statusApproved");
      case "pending":
        return t("review.statusPending");
      case "rejected":
        return t("review.statusRejected");
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "rejected":
        return "#F44336";
      default:
        return "#64748B";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#D1FAE5";
      case "pending":
        return "#FEF3C7";
      case "rejected":
        return "#FFEBEE";
      default:
        return "#F1F5F9";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackToProfile}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("review.historyTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#008fa0"]}
          />
        }
      >
        {/* Loading state */}
        {isLoading && !refreshing && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 40,
            }}
          >
            <ActivityIndicator size="large" color="#008fa0" />
            <Text style={{ marginTop: 12, color: "#666", fontSize: 14 }}>
              {t("review.loading")}
            </Text>
          </View>
        )}

        {/* Danh sách đánh giá */}
        {!isLoading && reviews.length > 0 ? (
          reviews.map((review) => (
            <TouchableOpacity
              key={review.id}
              style={styles.reviewCard}
              onPress={() => {
                if (review.bookingId) {
                  router.push({
                    pathname: "/booking-detail",
                    params: { id: review.bookingId },
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Image source={review.image} style={styles.tourImage} />

              <View style={styles.reviewContent}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.tourName} numberOfLines={1}>
                    {review.tourName}
                  </Text>
                </View>

                <View style={styles.ratingRow}>
                  <RatingStars rating={review.rating} size={14} />
                  <Text style={styles.ratingText}>{review.rating}/5</Text>
                </View>

                <Text style={styles.reviewDate}>{review.createdAt}</Text>

                <View style={styles.commentWrapper}>
                  <Text style={styles.commentPreview} numberOfLines={2}>
                    {review.comment}
                  </Text>
                </View>

                <View style={styles.bottomRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(review.status) },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(review.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(review.status) },
                      ]}
                    >
                      {getStatusText(review.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : !isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <MaterialIcons name="rate-review" size={64} color="#008fa0" />
            </View>
            <Text style={styles.emptyTitle}>{t("review.noReviews")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("review.noReviewsDesc")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  reviewCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  tourImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    marginRight: 14,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tourName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    flex: 1,
  },
  reviewDate: {
    fontSize: 12,
    color: "#8d95a3",
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f4f6f8",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 6,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  commentWrapper: {
    backgroundColor: "#f4f6f8",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentPreview: {
    fontSize: 13,
    color: "#5a6577",
    lineHeight: 18,
    fontStyle: "italic",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8d95a3",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ReviewHistoryScreen;
