import { t } from "@/i18n";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  recommendationService,
  RecommendedService,
  RecommendedDestination,
} from "@/api/recommendation.service";

const { width } = Dimensions.get("window");

type TabKey = "personalized" | "trending" | "destinations";

export default function RecommendationsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("trending");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [personalizedServices, setPersonalizedServices] = useState<
    RecommendedService[]
  >([]);
  const [trendingServices, setTrendingServices] = useState<
    RecommendedService[]
  >([]);
  const [destinations, setDestinations] = useState<RecommendedDestination[]>(
    []
  );

  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  const fetchData = useCallback(async () => {
    // Kiểm tra đăng nhập
    let loggedIn = false;
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        loggedIn = true;
        setIsLoggedIn(true);
      }
    } catch {
      setIsLoggedIn(false);
    }

    // Lấy gợi ý cá nhân hóa
    if (loggedIn) {
      setLoadingPersonalized(true);
      const personalized =
        await recommendationService.getPersonalizedRecommendations(20);
      setPersonalizedServices(personalized);
      setLoadingPersonalized(false);
    }

    // Lấy dịch vụ thịnh hành
    setLoadingTrending(true);
    const trending = await recommendationService.getTrendingServices(20);
    setTrendingServices(trending);
    setLoadingTrending(false);

    // Lấy điểm đến gợi ý
    setLoadingDestinations(true);
    const dests = await recommendationService.getRecommendedDestinations(10);
    setDestinations(dests);
    setLoadingDestinations(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const serviceTypeLabels: Record<number, string> = {
    0: t("recommendation.typeHomestay"),
    1: t("recommendation.typeTour"),
    2: t("recommendation.typeActivity"),
  };

  const renderServiceItem = ({ item }: { item: RecommendedService }) => (
    <TouchableOpacity
      style={styles.serviceCard}
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
        style={styles.serviceImage}
      />

      <View style={styles.serviceContent}>
        <View style={styles.serviceReasonRow}>
          <Ionicons name="sparkles" size={11} color="#008fa0" />
          <Text style={styles.serviceReason} numberOfLines={1}>
            {item.recommendationReason}
          </Text>
        </View>

        <Text style={styles.serviceName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.serviceMetaRow}>
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {item.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.reviewCount}>({item.totalReviews})</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {serviceTypeLabels[item.serviceType] || t("recommendation.service")}
            </Text>
          </View>
        </View>

        <Text style={styles.serviceDestination} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color="#888" />{" "}
          {item.destinationName} - {item.partnerName}
        </Text>

        <View style={styles.servicePriceRow}>
          {item.discountPrice && item.discountPrice < item.basePrice ? (
            <>
              <Text style={styles.originalPrice}>
                {item.basePrice.toLocaleString("vi-VN")}d
              </Text>
              <Text style={styles.currentPrice}>
                {item.discountPrice.toLocaleString("vi-VN")}d
              </Text>
            </>
          ) : (
            <Text style={styles.currentPrice}>
              {item.basePrice.toLocaleString("vi-VN")}d
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDestinationItem = ({
    item,
  }: {
    item: RecommendedDestination;
  }) => (
    <TouchableOpacity
      style={styles.destCard}
      onPress={() =>
        router.push({
          pathname: "/destination-detail",
          params: { id: item.id },
        } as any)
      }
      activeOpacity={0.7}
    >
      <Image
        source={
          item.imageUrl
            ? { uri: item.imageUrl }
            : require("@/assets/images/halong.jpg")
        }
        style={styles.destImage}
      />

      <View style={styles.destContent}>
        <Text style={styles.destName}>{item.name}</Text>
        <Text style={styles.destProvince}>{item.province}</Text>

        <View style={styles.destReasonRow}>
          <Ionicons name="sparkles" size={11} color="#008fa0" />
          <Text style={styles.destReason} numberOfLines={1}>
            {item.recommendationReason}
          </Text>
        </View>

        <Text style={styles.destServiceCount}>
          {item.serviceCount} {t("recommendation.servicesAvailable")}
        </Text>

        {item.description && (
          <Text style={styles.destDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    ...(isLoggedIn
      ? [
          {
            key: "personalized" as TabKey,
            label: t("recommendation.forYou"),
            icon: "sparkles",
          },
        ]
      : []),
    { key: "trending" as TabKey, label: t("recommendation.trending"), icon: "trending-up" },
    {
      key: "destinations" as TabKey,
      label: t("recommendation.suggestedDestinations"),
      icon: "compass-outline",
    },
  ];

  const renderContent = () => {
    if (activeTab === "personalized") {
      if (loadingPersonalized) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#008fa0" />
            <Text style={styles.loadingText}>{t("recommendation.analyzingPreferences")}</Text>
          </View>
        );
      }
      if (personalizedServices.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="sparkles-outline" size={60} color="#CCC" />
            <Text style={styles.emptyTitle}>{t("recommendation.noSuggestions")}</Text>
            <Text style={styles.emptySubtext}>
              {t("recommendation.noSuggestionsDesc")}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={personalizedServices}
          renderItem={renderServiceItem}
          keyExtractor={(item) => `p-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }

    if (activeTab === "trending") {
      if (loadingTrending) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#008fa0" />
            <Text style={styles.loadingText}>{t("recommendation.loadingTrending")}</Text>
          </View>
        );
      }
      if (trendingServices.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="trending-up-outline" size={60} color="#CCC" />
            <Text style={styles.emptyTitle}>{t("recommendation.noData")}</Text>
            <Text style={styles.emptySubtext}>
              {t("recommendation.noDataDesc")}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={trendingServices}
          renderItem={renderServiceItem}
          keyExtractor={(item) => `t-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }

    if (activeTab === "destinations") {
      if (loadingDestinations) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#008fa0" />
            <Text style={styles.loadingText}>{t("recommendation.loadingDestinations")}</Text>
          </View>
        );
      }
      if (destinations.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="compass-outline" size={60} color="#CCC" />
            <Text style={styles.emptyTitle}>{t("recommendation.noDestinations")}</Text>
            <Text style={styles.emptySubtext}>
              {t("recommendation.noDestinationsDesc")}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={destinations}
          renderItem={renderDestinationItem}
          keyExtractor={(item) => `d-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("recommendation.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? "#FFF" : "#5a6577"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>{renderContent()}</View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
  },
  tabButtonActive: {
    backgroundColor: "#008fa0",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5a6577",
  },
  tabTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#8d95a3",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#8d95a3",
    textAlign: "center",
    lineHeight: 20,
  },

  // Service card
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  serviceImage: {
    width: 120,
    height: "100%",
    minHeight: 130,
    resizeMode: "cover",
  },
  serviceContent: {
    flex: 1,
    padding: 14,
  },
  serviceReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  serviceReason: {
    fontSize: 11,
    color: "#008fa0",
    fontWeight: "500",
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  serviceMetaRow: {
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
    backgroundColor: "#f4f6f8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeText: {
    fontSize: 10,
    color: "#008fa0",
    fontWeight: "500",
  },
  serviceDestination: {
    fontSize: 12,
    color: "#8d95a3",
    marginBottom: 6,
  },
  servicePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  originalPrice: {
    fontSize: 12,
    color: "#8d95a3",
    textDecorationLine: "line-through",
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B00",
  },

  // Destination card
  destCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  destImage: {
    width: "100%",
    height: 170,
    resizeMode: "cover",
  },
  destContent: {
    padding: 16,
  },
  destName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 2,
  },
  destProvince: {
    fontSize: 13,
    color: "#8d95a3",
    marginBottom: 8,
  },
  destReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  destReason: {
    fontSize: 12,
    color: "#008fa0",
    fontWeight: "500",
  },
  destServiceCount: {
    fontSize: 12,
    color: "#5a6577",
    fontWeight: "500",
    marginBottom: 4,
  },
  destDescription: {
    fontSize: 14,
    color: "#5a6577",
    lineHeight: 20,
  },
});
