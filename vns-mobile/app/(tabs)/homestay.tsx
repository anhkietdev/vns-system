// app/(tabs)/homestay.tsx
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

type HomestayItem = {
  id: string;
  name: string;
  location: string;
  price: number;
  availableTimes: string[];
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

export default function HomestayScreen() {
  const [homestays, setHomestays] = useState<HomestayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHomestays = useCallback(async (start?: string, end?: string) => {
    setIsLoading(true);
    try {
      const res = await serviceService.getAll({
        serviceType: 0,
        pageSize: 100,
        ...(start && { startDate: start }),
        ...(end && { endDate: end }),
      });
      // Parse linh hoạt: { success, data: { items } } hoặc { items } hoặc array
      const root: any = res?.data ?? res;
      const items: any[] = Array.isArray(root)
        ? root
        : (root?.items || root?.Items || root?.data?.items || root?.data?.Items || []);
      const mapped: HomestayItem[] = items.map((item: any) => ({
        id: item.id,
        name: item.name || "",
        location: item.destinationName || "",
        price: item.discountPrice || item.basePrice || 0,
        availableTimes: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
        startDate: "",
        endDate: "",
        image: item.thumbnailUrl ? { uri: item.thumbnailUrl } : require("@/assets/images/homestay1.jpg"),
        rating: item.averageRating || 0,
        reviewCount: item.totalReviews || 0,
        description: item.description || "",
        highlights: [],
        included: [],
        policy: "",
      }));
      setHomestays(mapped);
    } catch (error) {
      console.log("Lỗi tải danh sách homestay:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllLocations = useCallback(async () => {
    try {
      const res = await serviceService.getAll({ serviceType: 0, pageSize: 100 });
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
      fetchHomestays();
    }, [fetchAllLocations, fetchHomestays]),
  );
  const [priceSort, setPriceSort] = useState<"asc" | "desc">("asc");
  const [ratingSort, setRatingSort] = useState(false);
  const [selectedHomestay, setSelectedHomestay] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false); // kept for potential future use
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // State cho form tìm kiếm
  const [showSearchForm, setShowSearchForm] = useState(true);
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(t("search.allLocations"));
  const [showCheckInDatePicker, setShowCheckInDatePicker] = useState(false);
  const [showCheckOutDatePicker, setShowCheckOutDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [allLocations, setAllLocations] = useState<string[]>([t("search.allLocations")]);

  // Xử lý DatePicker
  const onChangeCheckInDate = (event: any, selectedDate?: Date) => {
    setShowCheckInDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setCheckInDate(selectedDate);
      // Nếu checkOut nhỏ hơn checkIn, reset checkOut
      if (checkOutDate && selectedDate > checkOutDate) {
        setCheckOutDate(null);
      }
    }
  };

  const onChangeCheckOutDate = (event: any, selectedDate?: Date) => {
    setShowCheckOutDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setCheckOutDate(selectedDate);
    }
  };

  // Lọc và sắp xếp homestay
  const filteredHomestays = homestays
    .filter((homestay) => {
      // Filter theo địa điểm
      if (
        selectedLocation !== t("search.allLocations") &&
        homestay.location !== selectedLocation
      )
        return false;

      // Filter theo search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          homestay.name.toLowerCase().includes(query) ||
          homestay.location.toLowerCase().includes(query) ||
          homestay.description.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (ratingSort) return b.rating - a.rating;
      if (priceSort === "asc") return a.price - b.price;
      return b.price - a.price;
    });

  const handleHomestayPress = (homestay: any) => {
    router.push({
      pathname: "/service-detail",
      params: {
        id: homestay.id,
        type: "homestay",
        ...(checkInDate ? { checkInDate: checkInDate.toISOString().split("T")[0] } : {}),
        ...(checkOutDate ? { checkOutDate: checkOutDate.toISOString().split("T")[0] } : {}),
      },
    } as any);
  };

  const handleBookHomestay = () => {
    if (!selectedTime) {
      alert(t("booking.selectCheckInTimePrompt"));
      return;
    }
    setShowDetailModal(false);
    router.push({
      pathname: "/checkout",
      params: {
        checkoutData: JSON.stringify({
          serviceId: selectedHomestay.id,
          serviceName: selectedHomestay.name,
          serviceImage: selectedHomestay.image?.uri || selectedHomestay.image,
          serviceLocation: selectedHomestay.location,
          unitPrice: selectedHomestay.price,
          quantity: 1,
          serviceType: 0, // Homestay
          checkInDate: selectedTime,
        }),
      },
    });
  };

  const handleSearchHomestays = () => {
    setShowSearchForm(false);
    const start = checkInDate ? checkInDate.toISOString().split("T")[0] : undefined;
    const end = checkOutDate ? checkOutDate.toISOString().split("T")[0] : undefined;
    fetchHomestays(start, end);
  };

  const resetSearchForm = () => {
    setCheckInDate(null);
    setCheckOutDate(null);
    setSelectedLocation(t("search.allLocations"));
    setShowSearchForm(true);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowTimePicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#008fa0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.homestays")}</Text>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
        ></TouchableOpacity>
      </View>

      {/* Form tìm kiếm homestay */}
      {showSearchForm ? (
        <View style={styles.searchFormContainer}>
          <Text style={styles.searchFormTitle}>{t("search.searchHomestay")}</Text>

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

          {/* Chọn ngày nhận phòng */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="calendar-today" size={20} color="#008fa0" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowCheckInDatePicker(true)}
            >
              <Text
                style={
                  checkInDate
                    ? styles.searchInputText
                    : styles.searchInputPlaceholder
                }
              >
                {checkInDate
                  ? checkInDate.toLocaleDateString()
                  : t("search.selectCheckInDate")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chọn ngày trả phòng */}
          <View style={styles.inputContainer}>
            <MaterialIcons name="calendar-today" size={20} color="#008fa0" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowCheckOutDatePicker(true)}
            >
              <Text
                style={
                  checkOutDate
                    ? styles.searchInputText
                    : styles.searchInputPlaceholder
                }
              >
                {checkOutDate
                  ? checkOutDate.toLocaleDateString()
                  : "Chọn ngày trả phòng"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Nút tìm kiếm */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchHomestays}
          >
            <Text style={styles.searchButtonText}>{t("search.searchHomestayButton")}</Text>
          </TouchableOpacity>

          {/* DatePicker cho ngày nhận phòng */}
          {showCheckInDatePicker && (
            <DateTimePicker
              value={checkInDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeCheckInDate}
              minimumDate={new Date()}
            />
          )}

          {/* DatePicker cho ngày trả phòng */}
          {showCheckOutDatePicker && (
            <DateTimePicker
              value={checkOutDate || checkInDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeCheckOutDate}
              minimumDate={checkInDate || new Date()}
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
                placeholder={t("search.searchHomestayPlaceholder")}
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
            </View>
          </View>

          {/* Danh sách homestay */}
          {isLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
              <ActivityIndicator size="large" color="#008fa0" />
              <Text style={{ marginTop: 12, color: "#5a6577" }}>{t("home.loadingHomestays")}</Text>
            </View>
          ) : filteredHomestays.length > 0 ? (
            <FlatList
              data={filteredHomestays}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.homestayCard}
                  onPress={() => handleHomestayPress(item)}
                  activeOpacity={0.8}
                >
                  <Image source={item.image} style={styles.homestayImage} />
                  <View style={styles.homestayInfo}>
                    <Text style={styles.homestayName}>{item.name}</Text>
                    <Text style={styles.homestayDate}>
                      {t("home.checkIn")}: {item.startDate}
                    </Text>

                    <View style={styles.homestayMeta}>
                      <View style={styles.homestayLocation}>
                        <MaterialIcons
                          name="location-on"
                          size={16}
                          color="#008fa0"
                        />
                        <Text style={styles.homestayLocationText}>
                          {item.location}
                        </Text>
                      </View>

                      <View style={styles.homestayRating}>
                        <FontAwesome name="star" size={14} color="#F59E0B" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                        <Text style={styles.reviewCount}>
                          ({item.reviewCount})
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.homestayPrice}>
                      {item.price.toLocaleString()}đ
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("home.noMatchingHomestays")}
              </Text>
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

      {/* Modal chi tiết homestay */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedHomestay && (
          <View style={styles.modalContainer}>
            <ScrollView>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedHomestay.name}</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Hình ảnh */}
              <Image
                source={selectedHomestay.image}
                style={styles.detailImage}
              />

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
                      {selectedHomestay.location}
                    </Text>
                  </View>

                  <View style={styles.detailRating}>
                    <FontAwesome name="star" size={18} color="#F59E0B" />
                    <Text style={styles.detailRatingText}>
                      {selectedHomestay.rating}
                    </Text>
                    <Text style={styles.detailReviewCount}>
                      ({selectedHomestay.reviewCount} {t("booking.reviews")})
                    </Text>
                  </View>
                </View>

                <Text style={styles.homestayDateDetail}>
                  {t("home.homestayCheckInDate")}: {selectedHomestay.startDate}
                </Text>

                {/* Chọn thời gian nhận phòng */}
                <TouchableOpacity
                  style={styles.timeSelectionButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <MaterialIcons name="access-time" size={20} color="#008fa0" />
                  <Text style={styles.timeSelectionText}>
                    {selectedTime
                      ? `${t("booking.checkInTime")}: ${selectedTime}`
                      : t("booking.selectCheckInTime")}
                  </Text>
                </TouchableOpacity>

                {/* Hiển thị các khung giờ trống */}
                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <Text style={styles.timePickerTitle}>
                      {t("booking.selectCheckInTimeLabel")}
                    </Text>
                    <View style={styles.timeOptionsContainer}>
                      {selectedHomestay.availableTimes.map((time: string) => (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeOption,
                            selectedTime === time && styles.selectedTimeOption,
                          ]}
                          onPress={() => handleTimeSelect(time)}
                        >
                          <Text
                            style={[
                              styles.timeOptionText,
                              selectedTime === time &&
                                styles.selectedTimeOptionText,
                            ]}
                          >
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={styles.homestayPriceDetail}>
                  {selectedHomestay.price.toLocaleString()}đ
                </Text>
              </View>

              {/* Mô tả */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.homestayDescription")}</Text>
                <Text style={styles.descriptionText}>
                  {selectedHomestay.description}
                </Text>
              </View>

              {/* Điểm nổi bật */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.homestayHighlights")}</Text>
                {selectedHomestay.highlights.map(
                  (highlight: string, index: number) => (
                    <View key={index} style={styles.highlightItem}>
                      <MaterialIcons name="star" size={16} color="#008fa0" />
                      <Text style={styles.highlightText}>{highlight}</Text>
                    </View>
                  )
                )}
              </View>

              {/* Tiện ích */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.amenitiesIncluded")}</Text>
                {selectedHomestay.included.map(
                  (item: string, index: number) => (
                    <View key={index} style={styles.includedItem}>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#16a34a"
                      />
                      <Text style={styles.includedText}>{item}</Text>
                    </View>
                  )
                )}
              </View>

              {/* Chính sách */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>{t("home.roomCancellationPolicy")}</Text>
                <Text style={styles.policyText}>{selectedHomestay.policy}</Text>
              </View>
            </ScrollView>

            {/* Nút đặt homestay */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookHomestay}
              >
                <Text style={styles.bookButtonText}>{t("booking.bookRoomNow")}</Text>
                <Text style={styles.bookButtonSubText}>
                  {selectedHomestay.price.toLocaleString()}đ
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  showAllButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
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
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    width: "100%",
    padding: 16,
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
    borderColor: "#008fa0",
  },
  filterText: {
    color: "#5a6577",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#FFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  homestayCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  homestayImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  homestayInfo: {
    padding: 16,
  },
  homestayName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 6,
  },
  homestayDate: {
    fontSize: 14,
    color: "#5a6577",
    marginBottom: 8,
  },
  homestayMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homestayLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  homestayLocationText: {
    fontSize: 14,
    color: "#5a6577",
    marginLeft: 4,
  },
  homestayRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#1a2332",
    fontWeight: "700",
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#5a6577",
    marginLeft: 4,
  },
  homestayPrice: {
    fontSize: 18,
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
    fontSize: 18,
    color: "#5a6577",
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
    color: "#1a2332",
    fontWeight: "700",
    fontSize: 14,
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
    fontSize: 14,
    color: "#5a6577",
    marginLeft: 4,
  },
  homestayDateDetail: {
    fontSize: 16,
    color: "#5a6577",
    marginBottom: 12,
  },
  homestayPriceDetail: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B00",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: "#1a2332",
    lineHeight: 22,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 15,
    color: "#1a2332",
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
    fontSize: 15,
    color: "#1a2332",
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  policyText: {
    fontSize: 15,
    color: "#1a2332",
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
    height: 52,
    borderRadius: 14,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  bookButtonText: {
    fontSize: 18,
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
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    padding: 20,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  paymentOptionButton: {
    backgroundColor: "#008fa0",
    height: 48,
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
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
    justifyContent: "center",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#008fa0",
    marginTop: 10,
  },
  cancelPaymentButtonText: {
    color: "#008fa0",
    fontSize: 16,
    fontWeight: "700",
  },
  // Styles for time selection
  timeSelectionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f4f6f8",
    borderRadius: 8,
    marginBottom: 16,
  },
  timeSelectionText: {
    fontSize: 16,
    color: "#1a2332",
    marginLeft: 8,
  },
  timePickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1a2332",
  },
  timeOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
    marginRight: 10,
    marginBottom: 10,
    minWidth: 80,
    alignItems: "center",
  },
  selectedTimeOption: {
    backgroundColor: "#008fa0",
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
  },
  selectedTimeOptionText: {
    color: "#fff",
  },
});
