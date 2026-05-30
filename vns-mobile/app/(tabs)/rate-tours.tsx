import { bookingService } from "@/api/booking.service";
import { useAppSnackbar } from "@/components/feedback/AppFeedbackProvider";
import { reviewService } from "@/api/review.service";
import { t } from "@/i18n";
import { normalizeError } from "@/utils/normalizeError";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type BookingForReview = {
  id: string;
  name: string;
  date: string;
  image: any;
  price: string;
  guide: string;
};

const RatingStars = ({
  rating,
  setRating,
  size = 36,
}: {
  rating: number;
  setRating: (value: number) => void;
  size?: number;
}) => {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          activeOpacity={0.7}
          style={styles.starButton}
        >
          <AntDesign
            name={(star <= rating ? "star" : "staro") as any}
            size={size}
            color={star <= rating ? "#F59E0B" : "#E2E8F0"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const RateToursScreen = () => {
  const params = useLocalSearchParams<{ preselectedBookingId?: string }>();
  const [sampleTours, setSampleTours] = useState<BookingForReview[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showSnackbar = useAppSnackbar();

  const MAX_COMMENT_LENGTH = 500;

  useEffect(() => {
    const fetchCompletedBookings = async () => {
      setIsLoadingTours(true);
      try {
        const res = await bookingService.getMyBookings({ status: 3, pageSize: 100 });
        const data = res.data || res;
        const items = Array.isArray(data) ? data : (data.items || data.Items || []);

        let reviewedBookingIds: Set<string> = new Set();
        try {
          const reviewRes = await reviewService.getMyReviews();
          const reviewData = reviewRes.data || reviewRes;
          const reviewItems = Array.isArray(reviewData) ? reviewData : (reviewData.items || reviewData.Items || []);
          reviewedBookingIds = new Set(reviewItems.map((r: any) => r.bookingId));
        } catch (reviewError) {
          console.log("Lá»—i táº£i danh sĂ¡ch Ä‘Ă¡nh giĂ¡:", reviewError);
        }

        const unreviewedItems = items.filter((item: any) => !reviewedBookingIds.has(item.id));

        setSampleTours(unreviewedItems.map((item: any) => ({
          id: item.id,
          name: item.serviceName || "",
          date: item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN") : item.checkInDate ? new Date(item.checkInDate).toLocaleDateString("vi-VN") : item.bookingDate ? new Date(item.bookingDate).toLocaleDateString("vi-VN") : "",
          image: item.thumbnailUrl ? { uri: item.thumbnailUrl } : require("@/assets/images/halong.jpg"),
          price: `${(item.finalAmount || item.totalAmount || 0).toLocaleString()}d`,
          guide: item.partnerName || "",
        })));
      } catch (error) {
        console.log("Lá»—i táº£i danh sĂ¡ch booking:", error);
      } finally {
        setIsLoadingTours(false);
      }
    };
    fetchCompletedBookings();
  }, []);

  useEffect(() => {
    if (!isLoadingTours && params.preselectedBookingId && sampleTours.length > 0) {
      const found = sampleTours.find((tour) => tour.id === params.preselectedBookingId);
      if (found) {
        setSelectedTour(found.id);
      }
    }
  }, [isLoadingTours, sampleTours, params.preselectedBookingId]);

  const handleSelectTour = (tourId: string) => {
    if (selectedTour !== tourId) {
      setSelectedTour(tourId);
      setRating(0);
      setComment("");
    }
  };

  const handleCommentChange = (text: string) => {
    if (text.length <= MAX_COMMENT_LENGTH) {
      setComment(text);
    } else {
      showSnackbar({
        message: `${t("review.alertMaxChars")} ${MAX_COMMENT_LENGTH} ${t("review.characters")}`,
        tone: "warning",
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedTour) {
      showSnackbar({ message: t("review.alertSelectTour"), tone: "error" });
      return;
    }

    if (rating === 0) {
      showSnackbar({ message: t("review.alertSelectRating"), tone: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewService.createReview({
        bookingId: selectedTour,
        rating,
        comment: comment || undefined,
      });
      setIsSubmitting(false);
      showSnackbar({
        message: `${t("review.alertSuccessMsg")} ${rating} ${t("review.alertSuccessStars")}`,
        tone: "success",
      });
      setSelectedTour(null);
      setRating(0);
      setComment("");
      router.replace("/(tabs)/review-history");
    } catch (error: any) {
      setIsSubmitting(false);
      const normalized = normalizeError(error);
      showSnackbar({
        message: normalized.message || t("review.alertSubmitError"),
        tone: "error",
      });
    }
  };

  const getRatingText = (ratingValue: number) => {
    if (ratingValue === 0) return t("review.notRated");
    if (ratingValue === 1) return t("review.rating1");
    if (ratingValue === 2) return t("review.rating2");
    if (ratingValue === 3) return t("review.rating3");
    if (ratingValue === 4) return t("review.rating4");
    return t("review.rating5");
  };

  const addQuickReview = (text: string) => {
    const newText = comment ? `${comment}\n${text}` : text;
    if (newText.length <= MAX_COMMENT_LENGTH) {
      setComment(newText);
    } else {
      showSnackbar({
        message: `${t("review.alertCannotAdd")} ${MAX_COMMENT_LENGTH - comment.length} ${t("review.characters")}`,
        tone: "warning",
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("review.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressStepActive]}>
            <Text style={styles.progressStepText}>1</Text>
          </View>
          <View
            style={[
              styles.progressLine,
              selectedTour && styles.progressLineActive,
            ]}
          />
          <View
            style={[
              styles.progressStep,
              selectedTour && styles.progressStepActive,
            ]}
          >
            <Text style={styles.progressStepText}>2</Text>
          </View>
          <View
            style={[
              styles.progressLine,
              selectedTour && rating > 0 && styles.progressLineActive,
            ]}
          />
          <View
            style={[
              styles.progressStep,
              selectedTour && rating > 0 && styles.progressStepActive,
            ]}
          >
            <Text style={styles.progressStepText}>3</Text>
          </View>
        </View>

        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>
            {t("review.selectTour")}
          </Text>
          <Text
            style={[
              styles.progressLabel,
              selectedTour && styles.progressLabelActive,
            ]}
          >
            {t("review.rate")}
          </Text>
          <Text
            style={[
              styles.progressLabel,
              selectedTour && rating > 0 && styles.progressLabelActive,
            ]}
          >
            {t("review.complete")}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t("review.completedTours")}</Text>
              <Text style={styles.sectionSubtitle}>
                {t("review.selectTourDesc")}
              </Text>
            </View>
            <View style={styles.tourCount}>
              <Text style={styles.tourCountText}>
                {sampleTours.length} {t("review.tourUnit")}
              </Text>
            </View>
          </View>

          {isLoadingTours && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#008fa0" />
              <Text style={{ marginTop: 12, color: "#666", fontSize: 14 }}>{t("review.loading")}</Text>
            </View>
          )}

          {!isLoadingTours && sampleTours.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <MaterialIcons name="rate-review" size={48} color="#CCC" />
              <Text style={{ marginTop: 12, color: "#666", fontSize: 14, textAlign: "center" }}>
                {t("review.noTours")}
              </Text>
            </View>
          )}

          {sampleTours.map((tour) => (
            <TouchableOpacity
              key={tour.id}
              style={[
                styles.tourCard,
                selectedTour === tour.id && styles.selectedTourCard,
              ]}
              onPress={() => handleSelectTour(tour.id)}
              activeOpacity={0.7}
            >
              <Image source={tour.image} style={styles.tourImage} />
              <View style={styles.tourContent}>
                <View style={styles.tourHeader}>
                  <Text style={styles.tourName}>{tour.name}</Text>
                  {selectedTour === tour.id && (
                    <View style={styles.selectedBadge}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                <View style={styles.tourDetails}>
                  <View style={styles.tourDetailItem}>
                    <MaterialIcons
                      name="date-range"
                      size={14}
                      color="#64748B"
                    />
                    <Text style={styles.tourDetailText}>{tour.date}</Text>
                  </View>
                  <View style={styles.tourDetailItem}>
                    <MaterialIcons
                      name="attach-money"
                      size={14}
                      color="#64748B"
                    />
                    <Text style={styles.tourDetailText}>{tour.price}</Text>
                  </View>
                  <View style={styles.tourDetailItem}>
                    <MaterialIcons name="person" size={14} color="#64748B" />
                    <Text style={styles.tourDetailText}>{t("review.guide")} {tour.guide}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTour && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("review.yourReview")}</Text>
              <Text style={styles.sectionSubtitle}>
                {t("review.shareExperience")}
              </Text>
            </View>

            <View style={styles.ratingContainer}>
              <RatingStars rating={rating} setRating={setRating} size={40} />
              <View style={styles.ratingInfo}>
                <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
              </View>
            </View>

            <View style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <MaterialIcons name="rate-review" size={20} color="#008fa0" />
                <Text style={styles.commentLabel}>{t("review.detailedReview")}</Text>
                <Text style={styles.commentOptional}>{t("review.optional")}</Text>
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder={t("review.commentPlaceholder")}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={handleCommentChange}
                textAlignVertical="top"
                maxLength={MAX_COMMENT_LENGTH}
              />

              <View style={styles.commentFooter}>
                <Text
                  style={[
                    styles.commentHint,
                    comment.length >= MAX_COMMENT_LENGTH &&
                      styles.commentWarning,
                  ]}
                >
                  {comment.length}/{MAX_COMMENT_LENGTH} {t("review.characters")}
                </Text>
                {comment.length >= MAX_COMMENT_LENGTH && (
                  <Text style={styles.commentLimitText}>{t("review.limitReached")}</Text>
                )}
              </View>
            </View>

            <View style={styles.quickReviewContainer}>
              <Text style={styles.quickReviewTitle}>{t("review.quickReview")}</Text>
              <View style={styles.quickReviewGrid}>
                {[
                  { emoji: "đŸ‘", text: t("review.quick1"), color: "#16a34a" },
                  { emoji: "đŸ‘Œ", text: t("review.quick2"), color: "#2196F3" },
                  { emoji: "đŸ¤”", text: t("review.quick3"), color: "#FF9800" },
                  { emoji: "đŸ‘", text: t("review.quick4"), color: "#F44336" },
                ].map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.quickReviewChip,
                      { borderColor: item.color },
                    ]}
                    onPress={() => addQuickReview(`${item.emoji} ${item.text}`)}
                    activeOpacity={0.7}
                    disabled={comment.length >= MAX_COMMENT_LENGTH}
                  >
                    <Text
                      style={[
                        styles.quickReviewChipText,
                        { color: item.color },
                      ]}
                    >
                      {item.emoji} {item.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {selectedTour && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedTour(null);
                setRating(0);
                setComment("");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("review.reset")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || rating === 0) && styles.disabledButton,
              ]}
              onPress={handleSubmitReview}
              disabled={isSubmitting || rating === 0}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitButtonText}>{t("review.submitting")}</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{t("review.submit")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.guideSection}>
          <View style={styles.guideHeader}>
            <MaterialIcons name="info-outline" size={20} color="#008fa0" />
            <Text style={styles.guideTitle}>{t("review.guideTitle")}</Text>
          </View>

          <View style={styles.guideContent}>
            <View style={styles.guideItem}>
              <View style={styles.guideDot} />
              <Text style={styles.guideText}>
                {t("review.guideNote1")}
              </Text>
            </View>
            <View style={styles.guideItem}>
              <View style={styles.guideDot} />
              <Text style={styles.guideText}>
                {t("review.guideNote2")}
              </Text>
            </View>
            <View style={styles.guideItem}>
              <View style={styles.guideDot} />
              <Text style={styles.guideText}>
                {t("review.guideNote3")}
              </Text>
            </View>
          </View>
        </View>
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
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e8ecf0",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: "#008fa0",
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e8ecf0",
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: "#008fa0",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 12,
    color: "#8d95a3",
  },
  progressLabelActive: {
    color: "#008fa0",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#5a6577",
  },
  tourCount: {
    backgroundColor: "#f4f6f8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tourCountText: {
    fontSize: 12,
    color: "#5a6577",
    fontWeight: "500",
  },
  tourCard: {
    flexDirection: "row",
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    overflow: "hidden",
  },
  selectedTourCard: {
    borderColor: "#008fa0",
    backgroundColor: "#f0f9f9",
  },
  tourImage: {
    width: 100,
    height: 100,
  },
  tourContent: {
    flex: 1,
    padding: 12,
  },
  tourHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tourName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    flex: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  tourDetails: {
    gap: 6,
  },
  tourDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tourDetailText: {
    fontSize: 12,
    color: "#64748B",
  },
  ratingContainer: {
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  starButton: {
    marginHorizontal: 4,
  },
  ratingInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    fontSize: 16,
    color: "#5a6577",
    fontWeight: "500",
  },
  commentContainer: {
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a2332",
  },
  commentOptional: {
    fontSize: 12,
    color: "#8d95a3",
  },
  commentInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: "#1a2332",
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentHint: {
    fontSize: 11,
    color: "#94A3B8",
  },
  commentWarning: {
    color: "#F44336",
    fontWeight: "500",
  },
  commentLimitText: {
    fontSize: 11,
    color: "#F44336",
    fontWeight: "500",
  },
  quickReviewContainer: {
    marginBottom: 8,
  },
  quickReviewTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 12,
  },
  quickReviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  quickReviewChip: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  quickReviewChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5a6577",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#008fa0",
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  guideSection: {
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },
  guideContent: {
    gap: 10,
  },
  guideItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  guideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#008fa0",
    marginTop: 6,
    marginRight: 10,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: "#5a6577",
    lineHeight: 20,
  },
});

export default RateToursScreen;
