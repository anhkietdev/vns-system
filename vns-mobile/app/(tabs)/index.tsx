// app/(tabs)/index.tsx
// Gói cần cài: expo-location
import { t } from "@/i18n";
import {
  calculateDistance,
  DESTINATION_COORDINATES,
  formatDistance,
} from "@/utils/location";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  recommendationService,
  RecommendedService,
} from "@/api/recommendation.service";
import { destinationService } from "@/api/destination.service";
import { serviceService } from "@/api/service.service";

import { notificationService } from "@/api/notification.service";

const { width, height } = Dimensions.get("window");

// ==================== TYPE DEFINITIONS ====================
type Destination = {
  id: string | number;
  name: string;
  location: string;
  city: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl?: string;
  serviceType: number;
  serviceTypeLabel: string;
  description: string;
  rating: number;
  reviews: number;
  totalBookings: number;
  isAvailable: boolean;
  destinationId?: string | number;
};

type LocationOption = {
  id: string | number;
  name: string;
  fullName: string;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

// ==================== DATA LOADED FROM API ====================
// All data now comes from API endpoints; no hardcoded location fallbacks.
// If the API call fails, the user sees an empty location selector with
// a "Tất cả" option and a retry prompt.

export default function HomeScreen() {
  // State management
  const [currentLocation, setCurrentLocation] = useState<LocationOption>({
    id: "1",
    name: "Hà Nội",
    fullName: "Hà Nội, Việt Nam",
  });
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<
    Destination[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tour");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationPermissionModal, setShowLocationPermissionModal] =
    useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationDetected, setIsLocationDetected] = useState(true);

  // Location permission states
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null,
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Nearby destinations state
  const [nearbyDestinations, setNearbyDestinations] = useState<
    (Destination & { distance: number })[]
  >([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Tour detail states

  // Recommendation states
  const [trendingServices, setTrendingServices] = useState<
    RecommendedService[]
  >([]);
  const [personalizedServices, setPersonalizedServices] = useState<
    RecommendedService[]
  >([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [activeSectionTab, setActiveSectionTab] = useState<
    "recommend" | "nearby"
  >("recommend");

  const scrollRef = useRef<ScrollView>(null);

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/signin");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        router.replace("/signin");
      }
    };

    checkAuth();
  }, []);

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      // Kiểm tra đăng nhập
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          setIsLoggedIn(true);
          setLoadingPersonalized(true);
          const personalized =
            await recommendationService.getPersonalizedRecommendations(10);
          setPersonalizedServices(personalized);
          setLoadingPersonalized(false);
        }
      } catch {
        setIsLoggedIn(false);
      }

      // Lấy dịch vụ thịnh hành (không cần đăng nhập)
      setLoadingTrending(true);
      const trending = await recommendationService.getTrendingServices(10);
      setTrendingServices(trending);
      setLoadingTrending(false);
    };

    fetchRecommendations();
  }, []);

  // Fetch destinations and notifications from API
  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch popular destinations/services
        try {
          const locationRes = await destinationService.getAll();
          const locationData = locationRes.data || locationRes;
          const locationItems = Array.isArray(locationData)
            ? locationData
            : locationData.items || [];
          const mappedLocations: LocationOption[] = [
            { id: "all", name: "Tất cả", fullName: "Tất cả điểm đến" },
            ...locationItems.map((item: any) => ({
              id: item.id,
              name: item.name || "",
              fullName: item.name || "",
            })),
          ];
          setLocationOptions(mappedLocations);
        } catch (err) {
          // API failed — show only "Tất cả" option user can still manual select
          console.warn("Failed to load destinations from API:", err);
          setLocationOptions([
            { id: "all", name: "Tất cả", fullName: "Tất cả điểm đến" },
          ]);
        }

        const destRes = await serviceService.getPopular(10);
        const destData = destRes.data || destRes;
        const destItems = Array.isArray(destData)
          ? destData
          : destData.items || [];
        const svcTypeMap: Record<number, string> = {
          0: "Homestay",
          1: "Tour",
        };
        const mappedDests: Destination[] = destItems.map(
          (item: any, idx: number) => ({
            id: item.id || idx + 1,
            name: item.name || "",
            location: item.destinationName || "",
            city: item.destinationName || "",
            price: item.discountPrice || item.basePrice || 0,
            originalPrice:
              item.discountPrice != null && item.discountPrice < item.basePrice
                ? item.basePrice || 0
                : undefined,
            discount:
              item.basePrice > 0 && item.discountPrice
                ? Math.round((1 - item.discountPrice / item.basePrice) * 100)
                : 0,
            imageUrl: item.thumbnailUrl || "",
            serviceType:
              typeof item.serviceType === "number" ? item.serviceType : 1,
            serviceTypeLabel:
              typeof item.serviceType === "number"
                ? svcTypeMap[item.serviceType] || "Tour"
                : "Tour",
            description: item.description || "",
            rating: item.averageRating || 0,
            reviews: item.totalReviews || 0,
            totalBookings: item.totalBookings || 0,
            isAvailable: item.isActive !== false,
            destinationId: item.destinationId,
          }),
        );
        setAllDestinations(mappedDests);
        setFilteredDestinations(mappedDests);

        // Fetch notifications (chỉ khi đã đăng nhập)
        try {
          const token = await AsyncStorage.getItem("token");
          if (token) {
            const notifRes = await notificationService.getAll(1, 10);
            const notifData = notifRes.data || notifRes;
            const notifItems = Array.isArray(notifData)
              ? notifData
              : notifData.items || [];
            setNotifications(
              notifItems.map((item: any) => ({
                id: item.id,
                title: item.title || "",
                message: item.content || "",
                time: item.createdAt ? formatNotifTime(item.createdAt) : "",
                read: item.isRead || false,
              })),
            );
          }
        } catch {}
      } catch (error) {
        console.log("Lỗi tải dữ liệu trang chủ:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchHomeData();
  }, []);

  const refreshRecommendations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
        setLoadingPersonalized(true);
        const personalized =
          await recommendationService.getPersonalizedRecommendations(10);
        setPersonalizedServices(personalized);
        setLoadingPersonalized(false);
      } else {
        setIsLoggedIn(false);
        setPersonalizedServices([]);
      }
    } catch {
      setIsLoggedIn(false);
      setPersonalizedServices([]);
    }

    setLoadingTrending(true);
    const trending = await recommendationService.getTrendingServices(10);
    setTrendingServices(trending);
    setLoadingTrending(false);
  }, []);

  const refreshHomeData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      try {
        const locationRes = await destinationService.getAll();
        const locationData = locationRes.data || locationRes;
        const locationItems = Array.isArray(locationData)
          ? locationData
          : locationData.items || [];
        const mappedLocations: LocationOption[] = [
          { id: "all", name: "Táº¥t cáº£", fullName: "Táº¥t cáº£ Ä‘iá»ƒm Ä‘áº¿n" },
          ...locationItems.map((item: any) => ({
            id: item.id,
            name: item.name || "",
            fullName: item.name || "",
          })),
        ];
        setLocationOptions(mappedLocations);
      } catch (err) {
        console.warn("Failed to load destinations from API:", err);
        setLocationOptions([
          { id: "all", name: "Táº¥t cáº£", fullName: "Táº¥t cáº£ Ä‘iá»ƒm Ä‘áº¿n" },
        ]);
      }

      const destRes = await serviceService.getPopular(10);
      const destData = destRes.data || destRes;
      const destItems = Array.isArray(destData)
        ? destData
        : destData.items || [];
      const svcTypeMap: Record<number, string> = {
        0: "Homestay",
        1: "Tour",
      };
      const mappedDests: Destination[] = destItems.map(
        (item: any, idx: number) => ({
          id: item.id || idx + 1,
          name: item.name || "",
          location: item.destinationName || "",
          city: item.destinationName || "",
          price: item.discountPrice || item.basePrice || 0,
          originalPrice:
            item.discountPrice != null && item.discountPrice < item.basePrice
              ? item.basePrice || 0
              : undefined,
          discount:
            item.basePrice > 0 && item.discountPrice
              ? Math.round((1 - item.discountPrice / item.basePrice) * 100)
              : 0,
          imageUrl: item.thumbnailUrl || "",
          serviceType:
            typeof item.serviceType === "number" ? item.serviceType : 1,
          serviceTypeLabel:
            typeof item.serviceType === "number"
              ? svcTypeMap[item.serviceType] || "Tour"
              : "Tour",
          description: item.description || "",
          rating: item.averageRating || 0,
          reviews: item.totalReviews || 0,
          totalBookings: item.totalBookings || 0,
          isAvailable: item.isActive !== false,
          destinationId: item.destinationId,
        }),
      );
      setAllDestinations(mappedDests);
      setFilteredDestinations(mappedDests);

      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          const notifRes = await notificationService.getAll(1, 10);
          const notifData = notifRes.data || notifRes;
          const notifItems = Array.isArray(notifData)
            ? notifData
            : notifData.items || [];
          setNotifications(
            notifItems.map((item: any) => ({
              id: item.id,
              title: item.title || "",
              message: item.content || "",
              time: item.createdAt ? formatNotifTime(item.createdAt) : "",
              read: item.isRead || false,
            })),
          );
        }
      } catch {}
    } catch (error) {
      console.log("Lá»—i táº£i dá»¯ liá»‡u trang chá»§:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshRecommendations();
      refreshHomeData();
    }, [refreshHomeData, refreshRecommendations]),
  );

  useEffect(() => {
    if (!locationOptions.length) {
      return;
    }

    const currentExists = locationOptions.some(
      (location) => String(location.id) === String(currentLocation.id),
    );

    if (!currentExists && !isLocationDetected) {
      setCurrentLocation({
        id: "all",
        name: "Tất cả",
        fullName: "Tất cả điểm đến",
      });
    }
  }, [currentLocation.id, isLocationDetected, locationOptions]);

  const formatNotifTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} ${t("home.minutesAgo")}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t("home.hoursAgo")}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t("home.daysAgo")}`;
  };

  // Render recommendation card
  const renderRecommendationCard = ({ item }: { item: RecommendedService }) => {
    const serviceTypeLabels: Record<number, string> = {
      0: "Homestay",
      1: "Tour",
    };

    return (
      <TouchableOpacity
        style={recStyles.card}
        onPress={() =>
          router.push({
            pathname: "/service-detail",
            params: { id: item.id, type: item.serviceType === 0 ? "homestay" : "tour" },
          } as any)
        }
        activeOpacity={0.7}
      >
        <Image
          source={
            item.thumbnailUrl
              ? { uri: item.thumbnailUrl }
              : require("@/assets/images/halong.jpg")
          }
          style={recStyles.cardImage}
        />

        {/* Nhãn lý do gợi ý */}
        <View style={recStyles.reasonBadge}>
          <Ionicons name="sparkles" size={10} color="#FFF" />
          <Text style={recStyles.reasonText} numberOfLines={1}>
            {item.recommendationReason}
          </Text>
        </View>

        {/* Giảm giá */}
        {item.discountPrice != null && item.discountPrice < item.basePrice && (
          <View style={recStyles.discountBadge}>
            <Text style={recStyles.discountText}>
              -
              {Math.round(
                ((item.basePrice - item.discountPrice) / item.basePrice) * 100,
              )}
              %
            </Text>
          </View>
        )}

        <View style={recStyles.cardContent}>
          <Text style={recStyles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={recStyles.cardMeta}>
            <View style={recStyles.ratingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={recStyles.ratingText}>
                {item.averageRating.toFixed(1)}
              </Text>
              <Text style={recStyles.reviewCount}>({item.totalReviews})</Text>
            </View>
            <View style={recStyles.typeBadge}>
              <Text style={recStyles.typeText}>
                {serviceTypeLabels[item.serviceType] ||
                  t("home.serviceType.default")}
              </Text>
            </View>
          </View>

          <Text style={recStyles.destination} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#888" />{" "}
            {item.destinationName}
          </Text>

          <View style={recStyles.priceRow}>
            {item.discountPrice && item.discountPrice < item.basePrice ? (
              <>
                <Text style={recStyles.originalPrice}>
                  {item.basePrice.toLocaleString("vi-VN")}d
                </Text>
                <Text style={recStyles.price}>
                  {item.discountPrice.toLocaleString("vi-VN")}d
                </Text>
              </>
            ) : (
              <Text style={recStyles.price}>
                {item.basePrice.toLocaleString("vi-VN")}d
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Location filter (must be defined before getCurrentLocation) ---
  const filterToursByLocation = useCallback(
    (location: LocationOption) => {
      if (location.id === "all") {
        setFilteredDestinations(allDestinations);
        return;
      }

      const cityName = location.name;

      // Filter destinations - chỉ hiển thị đúng location được chọn
      const filteredDest = allDestinations.filter(
        (dest) =>
          dest.city.toLowerCase() === cityName.toLowerCase() ||
          dest.location.toLowerCase().includes(cityName.toLowerCase()) ||
          dest.name.toLowerCase().includes(cityName.toLowerCase()),
      );

      if (filteredDest.length > 0) {
        setFilteredDestinations(filteredDest);
      } else {
        setFilteredDestinations(allDestinations);
      }
    },
    [allDestinations],
  );

  // Define functions with useCallback to avoid dependency issues
  const getCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationPermission(false);
        setIsLocationDetected(false);
        setShowLocationPermissionModal(true);
        // Hiển thị tất cả tour khi không có quyền
        setFilteredDestinations(allDestinations);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Lưu tọa độ người dùng để tính khoảng cách
      setUserCoords({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        let cityName = "";

        if (address.city) {
          cityName = address.city;
        } else if (address.region) {
          cityName = address.region;
        } else {
          cityName = "Hà Nội";
        }

        // Find matching location in availableLocations
        const matchedLocation = locationOptions.find(
          (loc) =>
            loc.name.toLowerCase().includes(cityName.toLowerCase()) ||
            cityName.toLowerCase().includes(loc.name.toLowerCase()),
        );

        if (matchedLocation) {
          setCurrentLocation(matchedLocation);
          setIsLocationDetected(true);
          // Filter tours theo location tìm được
          filterToursByLocation(matchedLocation);
        } else {
          // Không tìm thấy location phù hợp, hiển thị tất cả
          setIsLocationDetected(false);
          setFilteredDestinations(allDestinations);
        }
      }
    } catch (error) {
      console.log("Không thể lấy vị trí hiện tại:", error);
      // Khi có lỗi, hiển thị tất cả tour
      setIsLocationDetected(false);
      setFilteredDestinations(allDestinations);
    } finally {
      setIsGettingLocation(false);
    }
  }, [allDestinations, filterToursByLocation, locationOptions]);

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        await getCurrentLocation();
      } else {
        setLocationPermission(false);
        setIsLocationDetected(false);
        // Hiển thị tất cả tour khi không có quyền
        setFilteredDestinations(allDestinations);
        // Don't show modal immediately, wait a bit
        setTimeout(() => {
          setShowLocationPermissionModal(true);
        }, 1000);
      }
    } catch (error) {
      console.log("Error checking location permission:", error);
      setLocationPermission(false);
      setIsLocationDetected(false);
      setFilteredDestinations(allDestinations);
    }
  }, [getCurrentLocation, allDestinations]);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // Filter tours when location changes
  useEffect(() => {
    filterToursByLocation(currentLocation);
  }, [currentLocation, filterToursByLocation]);

  // Tính toán điểm đến gần người dùng
  useEffect(() => {
    if (!userCoords) return;

    setIsLoadingNearby(true);
    const destinationsWithDistance = allDestinations
      .map((dest) => {
        const coords =
          DESTINATION_COORDINATES[dest.location] ||
          DESTINATION_COORDINATES[dest.city];
        if (!coords) return null;
        const distance = calculateDistance(
          userCoords.lat,
          userCoords.lon,
          coords.lat,
          coords.lon,
        );
        return { ...dest, distance };
      })
      .filter(
        (item): item is Destination & { distance: number } => item !== null,
      )
      .sort((a, b) => a.distance - b.distance);

    setNearbyDestinations(destinationsWithDistance);
    setIsLoadingNearby(false);
  }, [allDestinations, userCoords]);

  // Request location permission
  const requestLocationPermission = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        setLocationPermission(true);
        await getCurrentLocation();
        setShowLocationPermissionModal(false);
      } else {
        setLocationPermission(false);
        setIsLocationDetected(false);
        setFilteredDestinations(allDestinations);
        Alert.alert(
          t("home.cannotAccessLocation"),
          t("home.showingAllToursAlert"),
          [
            {
              text: t("home.selectLocationButton"),
              onPress: () => {
                setShowLocationPermissionModal(false);
                setShowLocationModal(true);
              },
            },
            {
              text: t("common.close"),
              onPress: () => setShowLocationPermissionModal(false),
            },
          ],
        );
      }
    } catch (error) {
      console.log("Error requesting location permission:", error);
      Alert.alert(t("common.error"), t("home.locationError"));
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Toggle notifications function
  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    Animated.timing(fadeAnim, {
      toValue: showNotifications ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Handle location selection
  const handleSelectLocation = (location: LocationOption) => {
    setCurrentLocation(location);
    setIsLocationDetected(true);
    filterToursByLocation(location);
    setShowLocationModal(false);
  };

  // Handle search - filter realtime khi gõ
  const doSearch = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        setFilteredDestinations(allDestinations);
        return;
      }
      setFilteredDestinations(
        allDestinations.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.location.toLowerCase().includes(q) ||
            d.city.toLowerCase().includes(q) ||
            d.serviceTypeLabel.toLowerCase().includes(q),
        ),
      );
    },
    [allDestinations],
  );

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    doSearch(text);
  };

  const handleSearch = () => {
    doSearch(searchQuery);
  };

  // Handle item press
  const handleItemPress = (item: Destination) => {
    router.push({
      pathname: "/service-detail",
      params: { id: String(item.id), type: item.serviceType === 0 ? "homestay" : "tour" },
    } as any);
  };

  // Handle service button press
  const handleServicePress = (service: string) => {
    setActiveCategory(service);
    switch (service) {
      case "Du lịch":
        router.push("/tours" as any);
        break;
      case "Nơi ở":
        router.push("/homestay" as any);
        break;
      default:
        break;
    }
  };

  // Render destination item
  const renderDestinationItem = ({ item }: { item: Destination }) => {
    return (
      <TouchableOpacity
        style={[styles.tripCard, !item.isAvailable && styles.disabledCard]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={
            item.imageUrl
              ? { uri: item.imageUrl }
              : require("@/assets/images/halong.jpg")
          }
          style={styles.tripImage}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.tripGradient}
        />

        {!item.isAvailable && (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>{t("home.soldOut")}</Text>
          </View>
        )}

        {/* Discount badge if has discount */}
        {item.discount != null && item.discount > 0 && (
          <View style={styles.discountBadgeSmall}>
            <Text style={styles.discountTextSmall}>-{item.discount}%</Text>
          </View>
        )}

        <View style={styles.tripInfo}>
          <Text style={styles.tripName}>{item.name}</Text>
          <View style={styles.tripLocationContainer}>
            <MaterialIcons name="location-on" size={14} color="#FFF" />
            <Text style={styles.tripLocation}>{item.location}</Text>
          </View>

          {/* Rating */}
          <View style={styles.tripRatingRow}>
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text style={styles.tripRatingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.tripReviewsText}>({item.reviews})</Text>
          </View>

          <View style={styles.tripMetaRow}>
            <View style={styles.tripMetaBadge}>
              <Text style={styles.tripMetaBadgeText}>
                {item.serviceTypeLabel}
              </Text>
            </View>
            {item.totalBookings > 0 ? (
              <Text style={styles.tripBookingText}>
                {item.totalBookings} lượt đặt
              </Text>
            ) : null}
          </View>

          {/* Hiển thị giá */}
          <View style={styles.tripPriceContainer}>
            {item.originalPrice && item.originalPrice > item.price ? (
              <>
                <Text style={styles.tripOriginalPrice}>
                  {item.originalPrice.toLocaleString()}đ
                </Text>
                <Text style={styles.tripPrice}>
                  {item.price.toLocaleString()}đ
                </Text>
              </>
            ) : (
              <Text style={styles.tripPrice}>
                {item.price.toLocaleString()}đ
              </Text>
            )}
          </View>

          {/* Hiển thị số chỗ còn lại */}
        </View>
      </TouchableOpacity>
    );
  };

  // Render location item
  const renderLocationItem = ({ item }: { item: LocationOption }) => (
    <TouchableOpacity
      style={[
        styles.locationItem,
        currentLocation.id === item.id && styles.selectedLocationItem,
      ]}
      onPress={() => handleSelectLocation(item)}
    >
      <MaterialIcons
        name={
          currentLocation.id === item.id
            ? "radio-button-checked"
            : "location-on"
        }
        size={20}
        color={currentLocation.id === item.id ? "#008fa0" : "#5a6577"}
      />
      <Text
        style={[
          styles.locationItemText,
          currentLocation.id === item.id && styles.selectedLocationItemText,
        ]}
      >
        {item.name}
      </Text>
      {currentLocation.id === item.id && (
        <MaterialIcons
          name="check"
          size={20}
          color="#008fa0"
          style={styles.locationCheckIcon}
        />
      )}
    </TouchableOpacity>
  );

  // ==================== MAIN UI ====================
  return (
    <View style={styles.container}>
      {/* ===== TOP BAR ===== */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => setShowLocationModal(true)}
          style={styles.locationBtn}
        >
          <Ionicons name="location" size={18} color="#008fa0" />
          <Text style={styles.locationBtnText} numberOfLines={1}>
            {currentLocation.name}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#008fa0" />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => router.push("/chat" as any)}
            style={styles.notifBtn}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#1a2332"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleNotifications}
            style={styles.notifBtn}
          >
            <Ionicons name="notifications-outline" size={22} color="#1a2332" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8d95a3" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search.placeholder")}
            placeholderTextColor="#b0b8c1"
            value={searchQuery}
            onChangeText={handleSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchInput("")}>
              <Ionicons name="close-circle" size={20} color="#8d95a3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ===== SEARCH RESULTS DROPDOWN ===== */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchResults}>
          <ScrollView
            style={styles.searchResultsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {filteredDestinations.length === 0 ? (
              <View style={styles.searchEmpty}>
                <Ionicons name="search-outline" size={40} color="#b0b8c1" />
                <Text style={styles.searchEmptyText}>
                  {t("home.noDestinations")}
                </Text>
              </View>
            ) : (
              <>
                {filteredDestinations.map((item) => (
                  <TouchableOpacity
                    key={`sr-${item.id}`}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearchQuery("");
                      doSearch("");
                      handleItemPress(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={
                        item.imageUrl
                          ? { uri: item.imageUrl }
                          : require("@/assets/images/halong.jpg")
                      }
                      style={styles.searchResultImage}
                    />
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.searchResultRow}>
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color="#8d95a3"
                        />
                        <Text
                          style={styles.searchResultLocation}
                          numberOfLines={1}
                        >
                          {item.location}
                        </Text>
                      </View>
                      <View style={styles.searchResultRow}>
                        <FontAwesome name="star" size={11} color="#F59E0B" />
                        <Text style={styles.searchResultRating}>
                          {item.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.searchResultPrice}>
                          {item.price.toLocaleString()}đ
                        </Text>
                      </View>
                    </View>
                    <View style={styles.searchResultBadge}>
                      <Text style={styles.searchResultBadgeText}>
                        {item.serviceTypeLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Main content */}
      {searchQuery.trim().length === 0 && isLoadingData ? (
        <View style={styles.homeLoadingContainer}>
          <ActivityIndicator size="small" color="#008fa0" />
          <Text style={styles.homeLoadingText}>
            Đang tải dữ liệu dịch vụ...
          </Text>
        </View>
      ) : (
        searchQuery.trim().length === 0 && (
          <ScrollView
            ref={scrollRef}
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Dịch vụ Tham Quan */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("home.services")}</Text>
            </View>

            <View style={styles.servicesRow}>
              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  activeCategory === "Du lịch" && styles.activeServiceButton,
                ]}
                onPress={() => handleServicePress("Du lịch")}
              >
                <Ionicons
                  name="bus"
                  size={22}
                  color={activeCategory === "Du lịch" ? "#FFF" : "#008fa0"}
                />
                <Text
                  style={[
                    styles.serviceText,
                    activeCategory === "Du lịch" && styles.activeServiceText,
                  ]}
                >
                  {t("home.travel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.serviceButton,
                  activeCategory === "Nơi ở" && styles.activeServiceButton,
                ]}
                onPress={() => handleServicePress("Nơi ở")}
              >
                <Ionicons
                  name="bed"
                  size={22}
                  color={activeCategory === "Nơi ở" ? "#FFF" : "#008fa0"}
                />
                <Text
                  style={[
                    styles.serviceText,
                    activeCategory === "Nơi ở" && styles.activeServiceText,
                  ]}
                >
                  {t("home.accommodation")}
                </Text>
              </TouchableOpacity>


            </View>

            {/* Danh sách dịch vụ */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh sách dịch vụ</Text>
            </View>

            {/* Tab bar */}
            <View style={gridStyles.tabBar}>
              <TouchableOpacity
                style={[
                  gridStyles.tab,
                  activeSectionTab === "recommend" && gridStyles.activeTab,
                ]}
                onPress={() => setActiveSectionTab("recommend")}
              >
                <Text
                  style={[
                    gridStyles.tabText,
                    activeSectionTab === "recommend" &&
                      gridStyles.activeTabText,
                  ]}
                >
                  {t("home.recommended")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  gridStyles.tab,
                  activeSectionTab === "nearby" && gridStyles.activeTab,
                ]}
                onPress={() => setActiveSectionTab("nearby")}
              >
                <Text
                  style={[
                    gridStyles.tabText,
                    activeSectionTab === "nearby" && gridStyles.activeTabText,
                  ]}
                >
                  {t("nearby.title")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab content */}
            {activeSectionTab === "recommend" ? (
              loadingTrending ? (
                <View style={recStyles.loadingContainer}>
                  <ActivityIndicator size="small" color="#008fa0" />
                  <Text style={recStyles.loadingText}>{t("home.loading")}</Text>
                </View>
              ) : trendingServices.length > 0 ? (
                <View style={gridStyles.gridContainer}>
                  {chunkArray(trendingServices, 2).map((row, rowIndex) => (
                    <View
                      key={`trend-row-${rowIndex}`}
                      style={gridStyles.gridRow}
                    >
                      {row.map((item: RecommendedService) => {
                        const lowestPrice =
                          item.discountPrice != null &&
                          item.discountPrice < item.basePrice
                            ? item.discountPrice
                            : item.basePrice;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={gridStyles.card}
                            onPress={() =>
                              router.push({
                                pathname: "/service-detail",
                                params: { id: item.id, type: item.serviceType === 0 ? "homestay" : "tour" },
                              } as any)
                            }
                            activeOpacity={0.7}
                          >
                            <View style={gridStyles.imageContainer}>
                              <Image
                                source={
                                  item.thumbnailUrl
                                    ? { uri: item.thumbnailUrl }
                                    : require("@/assets/images/halong.jpg")
                                }
                                style={gridStyles.image}
                              />
                              <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.6)"]}
                                style={gridStyles.imageGradient}
                              />
                              <View style={gridStyles.locationOverlay}>
                                <Ionicons
                                  name="location-outline"
                                  size={11}
                                  color="#FFF"
                                />
                                <Text
                                  style={gridStyles.locationText}
                                  numberOfLines={1}
                                >
                                  {item.destinationName}
                                </Text>
                              </View>
                            </View>
                            <View style={gridStyles.content}>
                              <Text style={gridStyles.name} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={gridStyles.typeBadge}>
                                <Text style={gridStyles.typeText}>
                                  {item.serviceType === 0
                                    ? "Homestay"
                                    : "Tour"}
                                </Text>
                              </View>
                              <View style={gridStyles.ratingRow}>
                                <FontAwesome
                                  name="star"
                                  size={11}
                                  color="#F59E0B"
                                />
                                <Text style={gridStyles.ratingText}>
                                  {item.averageRating.toFixed(1)}
                                </Text>
                                <Text style={gridStyles.bookingText}>
                                  {item.totalBookings > 0
                                    ? ` (${item.totalBookings})`
                                    : ""}
                                </Text>
                              </View>
                              <Text style={gridStyles.price}>
                                {lowestPrice.toLocaleString("vi-VN")}đ
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={recStyles.emptyContainer}>
                  <Text style={recStyles.emptyText}>
                    {t("home.noTrendingServices")}
                  </Text>
                </View>
              )
            ) : /* Nearby tab */
            isLoadingNearby ? (
              <View style={recStyles.loadingContainer}>
                <ActivityIndicator size="small" color="#008fa0" />
                <Text style={recStyles.loadingText}>{t("nearby.loading")}</Text>
              </View>
            ) : !userCoords ? (
              <View style={gridStyles.permissionContainer}>
                <MaterialIcons name="location-off" size={32} color="#CCC" />
                <Text style={gridStyles.permissionText}>
                  {t("nearby.permissionNeeded")}
                </Text>
              </View>
            ) : nearbyDestinations.length > 0 ? (
              <View style={gridStyles.gridContainer}>
                {chunkArray(nearbyDestinations, 2).map((row, rowIndex) => (
                  <View
                    key={`nearby-row-${rowIndex}`}
                    style={gridStyles.gridRow}
                  >
                    {row.map((item: Destination & { distance: number }) => (
                      <TouchableOpacity
                        key={item.id}
                        style={gridStyles.card}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                      >
                        <View style={gridStyles.imageContainer}>
                          <Image
                            source={
                              item.imageUrl
                                ? { uri: item.imageUrl }
                                : require("@/assets/images/halong.jpg")
                            }
                            style={gridStyles.image}
                          />
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.6)"]}
                            style={gridStyles.imageGradient}
                          />
                          <View style={gridStyles.locationOverlay}>
                            <MaterialIcons
                              name="near-me"
                              size={12}
                              color="#FFF"
                            />
                            <Text
                              style={gridStyles.locationText}
                              numberOfLines={1}
                            >
                              {formatDistance(item.distance)}
                            </Text>
                          </View>
                        </View>
                        <View style={gridStyles.content}>
                          <Text style={gridStyles.name} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={gridStyles.typeBadge}>
                            <Text style={gridStyles.typeText}>
                              {item.serviceTypeLabel}
                            </Text>
                          </View>
                          <View style={gridStyles.ratingRow}>
                            <FontAwesome
                              name="star"
                              size={11}
                              color="#F59E0B"
                            />
                            <Text style={gridStyles.ratingText}>
                              {item.rating.toFixed(1)}
                            </Text>
                            <Text style={gridStyles.bookingText}>
                              {item.totalBookings > 0
                                ? ` (${item.totalBookings})`
                                : ""}
                            </Text>
                          </View>
                          <Text style={gridStyles.price}>
                            {item.price.toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View style={gridStyles.permissionContainer}>
                <MaterialIcons name="explore-off" size={32} color="#CCC" />
                <Text style={gridStyles.permissionText}>
                  {t("nearby.noResults")}
                </Text>
              </View>
            )}

            {/* Thêm khoảng trống ở cuối */}
            <View style={{ height: 32 }} />
          </ScrollView>
        )
      )}

      {/* Notification Modal */}
      <Modal
        transparent
        visible={showNotifications}
        animationType="fade"
        onRequestClose={toggleNotifications}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={toggleNotifications}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.notificationModal,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>
                {t("home.notifications")}
              </Text>
              <TouchableOpacity onPress={toggleNotifications}>
                <Ionicons name="close" size={24} color="#5a6577" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.notificationItem,
                    !item.read && styles.unreadNotification,
                  ]}
                >
                  <Text style={styles.notificationItemTitle}>{item.title}</Text>
                  <Text style={styles.notificationItemMessage}>
                    {item.message}
                  </Text>
                  <Text style={styles.notificationItemTime}>{item.time}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.notificationList}
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Location Modal */}
      <Modal
        transparent
        visible={showLocationModal}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowLocationModal(false)}
          activeOpacity={1}
        >
          <View style={styles.locationModal}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>
                {t("home.selectLocation")}
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#5a6577" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.locationItem}
              onPress={() => {
                if (locationPermission) {
                  getCurrentLocation();
                } else {
                  requestLocationPermission();
                }
                setShowLocationModal(false);
              }}
            >
              <Ionicons name="location" size={20} color="#008fa0" />
              <Text style={styles.locationItemText}>
                {isGettingLocation
                  ? t("home.gettingLocation")
                  : t("home.currentLocation")}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={locationOptions}
              renderItem={renderLocationItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.locationList}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Permission Modal */}
      <Modal
        transparent
        visible={showLocationPermissionModal}
        animationType="fade"
        onRequestClose={() => setShowLocationPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.permissionModal}>
            <View style={styles.permissionIcon}>
              <Ionicons name="location" size={50} color="#008fa0" />
            </View>

            <Text style={styles.permissionTitle}>
              {t("home.locationPermission")}
            </Text>

            <Text style={styles.permissionMessage}>
              {t("home.locationPermissionMsg")}
            </Text>

            <View style={styles.permissionButtons}>
              <TouchableOpacity
                style={[styles.permissionButton, styles.permissionCancel]}
                onPress={() => {
                  setShowLocationPermissionModal(false);
                  setIsLocationDetected(false);
                  setFilteredDestinations(allDestinations);
                }}
              >
                <Text style={styles.permissionCancelText}>
                  {t("home.later")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.permissionButton, styles.permissionAllow]}
                onPress={requestLocationPermission}
                disabled={isGettingLocation}
              >
                <Text style={styles.permissionAllowText}>
                  {isGettingLocation ? t("home.processing") : t("home.allow")}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowLocationPermissionModal(false);
                setTimeout(() => setShowLocationModal(true), 300);
              }}
            >
              <Text style={styles.permissionSkip}>
                {t("home.manualSelect")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  // ===== TOP BAR =====
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6f3f5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#008fa0",
    maxWidth: 150,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc2626",
    borderWidth: 1.5,
    borderColor: "#f4f6f8",
  },

  // ===== SEARCH BAR =====
  searchBarWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    paddingVertical: 0,
  },

  // ===== SEARCH RESULTS =====
  searchResults: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchResultsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  searchEmptyText: {
    fontSize: 15,
    color: "#8d95a3",
    textAlign: "center",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
    gap: 12,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
  },
  searchResultInfo: {
    flex: 1,
    gap: 3,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchResultLocation: {
    fontSize: 13,
    color: "#8d95a3",
    flex: 1,
  },
  searchResultRating: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a2332",
    marginRight: 8,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
  searchResultBadge: {
    backgroundColor: "#e6f3f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#008fa0",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f3f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    gap: 8,
  },
  locationChipText: {
    fontSize: 13,
    color: "#007a8a",
    fontWeight: "500",
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    letterSpacing: 0.2,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seeAll: {
    color: "#008fa0",
    fontSize: 14,
    fontWeight: "500",
  },
  servicesRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  serviceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f4f6f8",
    gap: 8,
  },
  activeServiceButton: {
    backgroundColor: "#008fa0",
  },
  serviceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
  },
  activeServiceText: {
    color: "#FFF",
  },
  horizontalListContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  tripCard: {
    width: width * 0.72,
    height: 240,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 14,
    position: "relative",
  },
  disabledCard: {
    opacity: 0.6,
  },
  tripImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  tripGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  soldOutBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  soldOutText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  soldOutBadgeSmall: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 10,
  },
  soldOutTextSmall: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  discountBadgeSmall: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#FF6B00",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  discountTextSmall: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tripInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  tripName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  tripLocationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tripLocation: {
    fontSize: 14,
    color: "#FFF",
    marginLeft: 4,
  },
  tripRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  tripRatingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  tripReviewsText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  tripMetaBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tripMetaBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  tripBookingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    flexShrink: 1,
  },
  tripPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tripOriginalPrice: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  tripPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F59E0B",
  },
  slotsContainer: {
    marginTop: 4,
  },
  slotsBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  slotsFill: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 2,
  },
  slotsText: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  homeLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  homeLoadingText: {
    fontSize: 14,
    color: "#5a6577",
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    marginTop: 10,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 5,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  notificationModal: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: "90%",
    maxHeight: height * 0.6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 0,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
  },
  notificationList: {
    paddingHorizontal: 16,
  },
  notificationItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  unreadNotification: {
    backgroundColor: "#f4f6f8",
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  notificationItemMessage: {
    fontSize: 14,
    color: "#5a6577",
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
    color: "#8d95a3",
  },
  locationModal: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: "90%",
    maxHeight: height * 0.6,
    overflow: "hidden",
  },
  locationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    lineHeight: 26,
  },
  locationList: {
    paddingBottom: 8,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  selectedLocationItem: {
    backgroundColor: "#F0F8FF",
  },
  locationItemText: {
    fontSize: 16,
    color: "#1a2332",
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  selectedLocationItemText: {
    color: "#008fa0",
    fontWeight: "500",
  },
  locationCheckIcon: {
    marginLeft: "auto",
  },
  permissionModal: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 28,
    width: "88%",
    alignItems: "center",
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 10,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    color: "#5a6577",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  permissionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  permissionCancel: {
    backgroundColor: "#F0F0F0",
  },
  permissionCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5a6577",
  },
  permissionAllow: {
    backgroundColor: "#008fa0",
  },
  permissionAllowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  permissionSkip: {
    fontSize: 14,
    color: "#008fa0",
    textDecorationLine: "underline",
  },
  nearbyLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  nearbyLoadingText: {
    fontSize: 14,
    color: "#8d95a3",
  },
  nearbyPermissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
    gap: 8,
  },
  nearbyPermissionText: {
    fontSize: 14,
    color: "#8d95a3",
    textAlign: "center",
  },
  nearbyCard: {
    width: width * 0.52,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  nearbyImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  nearbyInfo: {
    padding: 10,
  },
  nearbyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 4,
  },
  nearbyLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  nearbyLocation: {
    fontSize: 13,
    color: "#5a6577",
    marginLeft: 4,
    flex: 1,
  },
  nearbyDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nearbyDistance: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B00",
    marginLeft: 4,
  },
  nearbyBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nearbyPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
  nearbySlotsText: {
    fontSize: 11,
    color: "#8d95a3",
  },
});

// ==================== RECOMMENDATION STYLES ====================
const recStyles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#888",
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#8d95a3",
    textAlign: "center",
  },
  card: {
    width: 200,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  cardImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  reasonBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,143,160,0.85)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 160,
  },
  reasonText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "600",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#E53935",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "700",
  },
  cardContent: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a2332",
  },
  reviewCount: {
    fontSize: 11,
    color: "#8d95a3",
  },
  typeBadge: {
    backgroundColor: "#F0F5FF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    color: "#008fa0",
    fontWeight: "500",
  },
  destination: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: "#BBB",
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
});

// ==================== GRID CARD STYLES ====================
const CARD_GAP = 12;
const GRID_PADDING = 20;
const gridCardWidth = (width - GRID_PADDING * 2 - CARD_GAP) / 2;

const gridStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#f0f2f4",
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5a6577",
  },
  activeTabText: {
    color: "#008fa0",
  },
  gridContainer: {
    paddingHorizontal: GRID_PADDING,
  },
  gridRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: gridCardWidth,
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
  },
  locationOverlay: {
    position: "absolute",
    bottom: 6,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "500",
    flex: 1,
  },
  content: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a2332",
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f3f5",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    color: "#008fa0",
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1a2332",
  },
  bookingText: {
    fontSize: 10,
    color: "#8d95a3",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 40,
    gap: 8,
  },
  permissionText: {
    fontSize: 14,
    color: "#8d95a3",
    textAlign: "center",
  },
});
