// app/(tabs)/tour.tsx
import { serviceService } from "@/api/service.service";
import { t } from "@/i18n";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type TourItem = {
  id: string;
  name: string;
  location: string;
  price: number;
  discount: number;
  startDate: string;
  endDate: string;
  image: any;
  rating: number;
  reviewCount: number;
  description: string;
  highlights: string[];
  included: string[];
  policy: string;
};

export default function TourScreen() {
  const [tours, setTours] = useState<TourItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTours = useCallback(async (start?: string, end?: string) => {
    setIsLoading(true);
    try {
      const res = await serviceService.getAll({
        serviceType: 1,
        pageSize: 100,
        ...(start && { startDate: start }),
        ...(end && { endDate: end }),
      });
      // Parse linh hoạt: { success, data: { items } } hoặc { items } hoặc array
      const root: any = res?.data ?? res;
      const items: any[] = Array.isArray(root)
        ? root
        : (root?.items || root?.Items || root?.data?.items || root?.data?.Items || []);
      const mapped: TourItem[] = items.map((item: any) => ({
        id: item.id,
        name: item.name || "",
        location: item.destinationName || "",
        price: item.discountPrice || item.basePrice || 0,
        discount: item.basePrice > 0 && item.discountPrice ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0,
        startDate: "",
        endDate: "",
        image: item.thumbnailUrl ? { uri: item.thumbnailUrl } : require("@/assets/images/halong.jpg"),
        rating: item.averageRating || 0,
        reviewCount: item.totalReviews || 0,
        description: item.description || "",
        highlights: [],
        included: [],
        policy: "",
      }));
      setTours(mapped);
    } catch (error) {
      console.log("Lỗi tải danh sách tour:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllLocations = useCallback(async () => {
    try {
      const res = await serviceService.getAll({ serviceType: 1, pageSize: 100 });
      const root: any = res?.data ?? res;
      const items: any[] = Array.isArray(root)
        ? root
        : (root?.items || root?.Items || root?.data?.items || root?.data?.Items || []);
      const locs = [...new Set(items.map((t: any) => t.destinationName || "").filter(Boolean))];
      setAllLocations([t("search.allLocations"), ...locs]);
    } catch {
      console.log("Lỗi tải danh sách địa điểm");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAllLocations();
      fetchTours();
    }, [fetchAllLocations, fetchTours]),
  );
  const [priceSort, setPriceSort] = useState<"asc" | "desc">("asc");
  const [ratingSort, setRatingSort] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false); // kept for potential future use
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // State cho form tìm kiếm
  const [showSearchForm, setShowSearchForm] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(t("search.allLocations"));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [allLocations, setAllLocations] = useState<string[]>([t("search.allLocations")]);

  // Xử lý DatePicker
  const onChangeStartDate = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setStartDate(selectedDate);
      // Nếu endDate nhỏ hơn startDate, reset endDate
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
      }
    }
  };

  const onChangeEndDate = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Lọc và sắp xếp tour
  const filteredTours = tours
    .filter((tour) => {
      // Filter theo địa điểm
      if (
        selectedLocation !== t("search.allLocations") &&
        tour.location !== selectedLocation
      )
        return false;

      // Filter theo các điều kiện khác
      if (discountOnly && !tour.discount) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tour.name.toLowerCase().includes(query) ||
          tour.location.toLowerCase().includes(query) ||
          tour.description.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (ratingSort) return b.rating - a.rating;
      if (priceSort === "asc") return a.price - b.price;
      return b.price - a.price;
    });

  const handleTourPress = (tour: any) => {
    router.push({
      pathname: "/service-detail",
      params: {
        id: tour.id,
        type: "tour",
        ...(startDate ? { startDate: startDate.toISOString().split("T")[0] } : {}),
        ...(endDate ? { endDate: endDate.toISOString().split("T")[0] } : {}),
      },
    } as any);
  };

  const handleBookTour = () => {
    setShowDetailModal(false);
    const discountedPrice = selectedTour.discount
      ? Math.round(selectedTour.price * (1 - selectedTour.discount / 100))
      : selectedTour.price;
    router.push({
      pathname: "/checkout",
      params: {
        checkoutData: JSON.stringify({
          serviceId: selectedTour.id,
          serviceName: selectedTour.name,
          serviceImage: selectedTour.image?.uri || selectedTour.image,
          serviceLocation: selectedTour.location,
          unitPrice: discountedPrice,
          quantity: 1,
          serviceType: 1, // Tour
        }),
      },
    });
  };

  const handleSearchTours = () => {
    setShowSearchForm(false);
    const start = startDate ? startDate.toISOString().split("T")[0] : undefined;
    const end = endDate ? endDate.toISOString().split("T")[0] : undefined;
    fetchTours(start, end);
  };

  const resetSearchForm = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedLocation(t("search.allLocations"));
    setShowSearchForm(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.tours")}</Text>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
        ></TouchableOpacity>
      </View>

      {/* Form tìm kiếm tour */}
      {showSearchForm ? (
        <View style={styles.searchFormContainer}>
          <Text style={styles.searchFormTitle}>{t("search.searchTour")}</Text>

          {/* Chọn địa điểm */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="location-on" size={20} color="#008fa0" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowLocationPicker(true)}
            >
              <Text
                style={
                  selectedLocation
                    ? styles.searchInputText
                    : styles.searchInputPlaceholder
                }
              >
                {selectedLocation}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chọn ngày đi */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="calendar-today" size={20} color="#008fa0" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text
                style={
                  startDate
                    ? styles.searchInputText
                    : styles.searchInputPlaceholder
                }
              >
                {startDate
                  ? startDate.toLocaleDateString()
                  : t("search.selectDate")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chọn ngày kết thúc */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="calendar-today" size={20} color="#008fa0" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text
                style={
                  endDate
                    ? styles.searchInputText
                    : styles.searchInputPlaceholder
                }
              >
                {endDate
                  ? endDate.toLocaleDateString()
                  : "Chọn ngày kết thúc"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nút tìm kiếm */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchTours}
          >
            <Text style={styles.searchButtonText}>{t("search.searchTourButton")}</Text>
          </TouchableOpacity>

          {/* DatePicker cho ngày đi */}
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeStartDate}
              minimumDate={new Date()}
            />
          )}

          {/* DatePicker cho ngày kết thúc */}
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate || startDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeEndDate}
              minimumDate={startDate || new Date()}
            />
          )}

          {/* Modal chọn địa điểm */}
          <Modal
            visible={showLocationPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowLocationPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.locationModalContent}>
                <Text style={styles.modalTitle}>{t("search.selectLocation")}</Text>
                  <FlatList
                  data={allLocations}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.locationItem,
                        selectedLocation === item &&
                          styles.selectedLocationItem,
                      ]}
                      onPress={() => {
                        setSelectedLocation(item);
                        setShowLocationPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.locationText,
                          selectedLocation === item &&
                            styles.selectedLocationText,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInputField}
                placeholder={t("search.searchTourPlaceholder")}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setShowSearch(false);
                }}
                style={styles.searchCloseButton}
              >
                <Ionicons name="close" size={20} color="#5a6577" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bộ lọc */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetSearchForm}
            >
              <Text style={styles.resetButtonText}>{t("search.changeSearch")}</Text>
            </TouchableOpacity>

            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  priceSort && styles.activeFilterButton,
                ]}
                onPress={() =>
                  setPriceSort(priceSort === "asc" ? "desc" : "asc")
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    priceSort && styles.activeFilterText,
                  ]}
                >
                  {t("search.price")} {priceSort === "asc" ? "↑" : "↓"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  ratingSort && styles.activeFilterButton,
                ]}
                onPress={() => setRatingSort(!ratingSort)}
              >
                <Text
                  style={[
                    styles.filterText,
                    ratingSort && styles.activeFilterText,
                  ]}
                >
                  {t("search.rating")} {ratingSort ? "↓" : "↑"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  discountOnly && styles.activeFilterButton,
                ]}
                onPress={() => setDiscountOnly(!discountOnly)}
              >
                <MaterialIcons
                  name="local-offer"
                  size={16}
                  color={discountOnly ? "#FFF" : "#008fa0"}
                />
                <Text
                  style={[
                    styles.filterText,
                    discountOnly && styles.activeFilterText,
                  ]}
                >
                  {t("search.offers")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Danh sách tour */}
          {isLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
              <ActivityIndicator size="large" color="#008fa0" />
              <Text style={{ marginTop: 12, color: "#5a6577" }}>{t("home.loadingTours")}</Text>
            </View>
          ) : filteredTours.length > 0 ? (
            <FlatList
              data={filteredTours}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tourCard}
                  onPress={() => handleTourPress(item)}
                  activeOpacity={0.8}
                >
                  <Image source={item.image} style={styles.tourImage} />
                  {item.discount > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        -{item.discount}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.tourInfo}>
                    <Text style={styles.tourName}>{item.name}</Text>
                    <Text style={styles.tourDate}>
                      {t("home.departure")}: {item.startDate}
                    </Text>

                    <View style={styles.tourMeta}>
                      <View style={styles.tourLocation}>
                        <MaterialIcons
                          name="location-on"
                          size={16}
                          color="#008fa0"
                        />
                        <Text style={styles.tourLocationText}>
                          {item.location}
                        </Text>
                      </View>

                      <View style={styles.tourRating}>
                        <FontAwesome name="star" size={14} color="#F59E0B" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                        <Text style={styles.reviewCount}>
                          ({item.reviewCount})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceContainer}>
                      {item.discount ? (
                        <>
                          <Text style={styles.originalPrice}>
                            {item.price.toLocaleString()}đ
                          </Text>
                          <Text style={styles.discountedPrice}>
                            {Math.round(
                              item.price * (1 - item.discount / 100)
                            ).toLocaleString()}
                            đ
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.tourPrice}>
                          {item.price.toLocaleString()}đ
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("home.noMatchingTours")}</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetSearchForm}
              >
                <Text style={styles.resetButtonText}>
                  {t("search.changeSearchConditions")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Modal chi tiết tour */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedTour && (
          <View style={styles.modalContainer}>
            <ScrollView>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedTour.name}</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Hình ảnh */}
              <Image source={selectedTour.image} style={styles.detailImage} />

              {/* Thông tin cơ bản */}
              <View style={styles.detailSection}>
                <View style={styles.detailMeta}>
                  <View style={styles.detailLocation}>
                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color="#008fa0"
                    />
                    <Text style={styles.detailLocationText}>
                      {selectedTour.location}
                    </Text>
                  </View>

                  <View style={styles.detailRating}>
                    <FontAwesome name="star" size={18} color="#F59E0B" />
                    <Text style={styles.detailRatingText}>
                      {selectedTour.rating}
                    </Text>
                    <Text style={styles.detailReviewCount}>
                      ({selectedTour.reviewCount} {t("booking.reviews")})
                    </Text>
                  </View>
                </View>

                <Text style={styles.tourDateDetail}>
                  {t("home.departureDate")}: {selectedTour.startDate}
                </Text>

                <View style={styles.priceContainer}>
                  {selectedTour.discount ? (
                    <>
                      <Text style={styles.originalPriceDetail}>
                        {selectedTour.price.toLocaleString()}đ
                      </Text>
                      <Text style={styles.discountedPriceDetail}>
                        {Math.round(
                          selectedTour.price * (1 - selectedTour.discount / 100)
                        ).toLocaleString()}
                        đ
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.tourPriceDetail}>
                      {selectedTour.price.toLocaleString()}đ
                    </Text>
                  )}
                </View>
              </View>

              {/* Mô tả */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.tourDescription")}</Text>
                <Text style={styles.descriptionText}>
                  {selectedTour.description}
                </Text>
              </View>

              {/* Điểm nổi bật */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.tourHighlights")}</Text>
                {selectedTour.highlights.map(
                  (highlight: string, index: number) => (
                    <View key={index} style={styles.highlightItem}>
                      <MaterialIcons name="star" size={16} color="#008fa0" />
                      <Text style={styles.highlightText}>{highlight}</Text>
                    </View>
                  )
                )}
              </View>

              {/* Bao gồm */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.tourServicesIncluded")}</Text>
                {selectedTour.included.map((item: string, index: number) => (
                  <View key={index} style={styles.includedItem}>
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#16a34a"
                    />
                    <Text style={styles.includedText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Chính sách */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.tourCancellationPolicy")}</Text>
                <Text style={styles.policyText}>{selectedTour.policy}</Text>
              </View>
            </ScrollView>

            {/* Nút đặt tour */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookTour}
              >
                <Text style={styles.bookButtonText}>{t("booking.bookTourNow")}</Text>
                <Text style={styles.bookButtonSubText}>
                  {selectedTour.discount ? (
                    <>
                      {t("booking.onlyFrom")}{" "}
                      {Math.round(
                        selectedTour.price * (1 - selectedTour.discount / 100)
                      ).toLocaleString()}
                      đ
                    </>
                  ) : (
                    <>{selectedTour.price.toLocaleString()}đ</>
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Payment options modal removed - checkout handles payment */}
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
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
    textAlign: "center",
    marginRight: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  // Styles cho form tìm kiếm
  searchFormContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  searchFormTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1a2332",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginLeft: 10,
    justifyContent: "center",
  },
  searchInputText: {
    fontSize: 16,
    color: "#1a2332",
  },
  searchInputPlaceholder: {
    fontSize: 16,
    color: "#8d95a3",
  },
  searchButton: {
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  showAllButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#008fa0",
  },
  showAllButtonText: {
    color: "#008fa0",
    fontSize: 16,
    fontWeight: "700",
  },
  searchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Styles cho modal chọn địa điểm
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  locationModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: "100%",
    maxHeight: "70%",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#1a2332",
  },
  locationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  selectedLocationItem: {
    backgroundColor: "#F0F7FF",
  },
  locationText: {
    fontSize: 16,
    color: "#1a2332",
  },
  selectedLocationText: {
    color: "#008fa0",
    fontWeight: "700",
  },
  // Các styles còn lại
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  searchInputField: {
    flex: 1,
    height: 48,
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1a2332",
  },
  searchCloseButton: {
    marginLeft: 8,
    padding: 8,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  filterGroup: {
    flexDirection: "row",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    marginRight: 8,
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: "#008fa0",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  tourCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  tourImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  tourInfo: {
    padding: 16,
  },
  tourName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 6,
  },
  tourDate: {
    fontSize: 12,
    color: "#8d95a3",
    marginBottom: 8,
  },
  tourMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tourLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  tourLocationText: {
    fontSize: 13,
    color: "#5a6577",
    marginLeft: 4,
  },
  tourRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#8d95a3",
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  tourPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B00",
  },
  originalPrice: {
    fontSize: 14,
    color: "#8d95a3",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B00",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#8d95a3",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5a6577",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#008fa0",
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  detailImage: {
    width: "100%",
    height: 250,
  },
  detailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  detailMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLocationText: {
    fontSize: 16,
    color: "#5a6577",
    marginLeft: 8,
  },
  detailRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailRatingText: {
    fontSize: 16,
    color: "#1a2332",
    fontWeight: "700",
    marginLeft: 4,
  },
  detailReviewCount: {
    fontSize: 12,
    color: "#8d95a3",
    marginLeft: 4,
  },
  tourDateDetail: {
    fontSize: 14,
    color: "#5a6577",
    marginBottom: 12,
  },
  tourPriceDetail: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B00",
  },
  originalPriceDetail: {
    fontSize: 18,
    color: "#8d95a3",
    textDecorationLine: "line-through",
    marginRight: 12,
  },
  discountedPriceDetail: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B00",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#5a6577",
    lineHeight: 22,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    color: "#5a6577",
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  includedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  includedText: {
    fontSize: 14,
    color: "#5a6577",
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  policyText: {
    fontSize: 14,
    color: "#5a6577",
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
    gap: 12,
  },
  bookButton: {
    flex: 1,
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  bookButtonSubText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  paymentModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  paymentModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: "100%",
    maxHeight: "92%",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#1a2332",
  },
  paymentOptionButton: {
    backgroundColor: "#008fa0",
    height: 48,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentOptionText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  paymentOptionSubText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 5,
  },
  cancelPaymentButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#008fa0",
    marginTop: 10,
  },
  cancelPaymentButtonText: {
    color: "#008fa0",
    fontSize: 16,
    fontWeight: "700",
  },
});
