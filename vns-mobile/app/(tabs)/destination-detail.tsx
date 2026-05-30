// app/(tabs)/destination-detail.tsx
import { destinationService } from "@/api/destination.service";
import { serviceService } from "@/api/service.service";
import { favoriteService } from "@/api/favorite.service";
import { t } from "@/i18n";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

type ServiceAtDestination = {
  id: string;
  name: string;
  type: "tour" | "homestay";
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
};

type DestinationData = {
  id: string;
  name: string;
  fullName: string;
  heroImage: string;
  images: string[];
  description: string;
  highlights: string[];
  weather: {
    temp: string;
    bestTime: string;
    note: string;
  };
  services: ServiceAtDestination[];
};

const serviceTypeMap: Record<number, "tour" | "homestay"> = {
  0: "homestay",
  1: "tour",
};

const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
  tour: { label: "Tour", color: "#008fa0", bg: "#E8F0FE" },
  homestay: { label: "Homestay", color: "#FF6B00", bg: "#FFF3E0" },
};

export default function DestinationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [destination, setDestination] = useState<DestinationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const handleToggleFavorite = async () => {
    if (isTogglingFavorite || !params.id) return;

    setIsTogglingFavorite(true);
    try {
      await favoriteService.toggle(params.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  useEffect(() => {
    const fetchDestination = async () => {
      setIsLoading(true);
      try {
        // Fetch destination details
        const res = await destinationService.getById(params.id || "");
        const data = res.data || res;

        // Fetch services at this destination
        let services: ServiceAtDestination[] = [];
        try {
          const svcRes = await serviceService.getAll({ destinationId: params.id });
          const svcData = svcRes.data || svcRes;
          const svcItems = Array.isArray(svcData) ? svcData : (svcData.items || []);
          services = svcItems.map((item: any) => ({
            id: item.id,
            name: item.name || "",
            type: serviceTypeMap[item.serviceType] || "tour",
            price: item.discountPrice || item.basePrice || 0,
            image: item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/400/300`,
            rating: item.averageRating || 0,
            reviewCount: item.totalReviews || 0,
          }));
        } catch {}

        setDestination({
          id: data.id,
          name: data.name || "",
          fullName: data.province || data.name || "",
          heroImage: data.imageUrl || `https://picsum.photos/seed/${data.id}/800/500`,
          images: data.imageUrl ? [data.imageUrl] : [],
          description: data.description || "",
          highlights: [],
          weather: {
            temp: "20-30°C",
            bestTime: "Quanh năm",
            note: "Thời tiết thuận lợi cho du lịch",
          },
          services,
        });
      } catch (error) {
        console.log("Lỗi tải chi tiết điểm đến:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchDestination();
  }, [params.id]);

  if (isLoading || !destination) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#008fa0" />
        <Text style={{ marginTop: 12, color: "#5a6577" }}>{t("home.loading")}</Text>
      </View>
    );
  }

  const renderServiceCard = (item: ServiceAtDestination) => {
    const typeInfo = typeLabels[item.type];
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.serviceCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: "/service-detail", params: { id: item.id.toString(), type: item.type } })
        }
      >
        <Image source={{ uri: item.image }} style={styles.serviceImage} />
        <View style={styles.serviceInfo}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
          </View>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.serviceBottom}>
            <View style={styles.ratingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewCountText}>({item.reviewCount})</Text>
            </View>
            <Text style={styles.servicePrice}>{item.price.toLocaleString()}đ</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: destination.heroImage }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleToggleFavorite}
              disabled={isTogglingFavorite}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#dc2626" : "#FFF"}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{destination.name}</Text>
            <View style={styles.heroLocation}>
              <MaterialIcons name="location-on" size={16} color="#FFF" />
              <Text style={styles.heroLocationText}>{destination.fullName}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.introduction")}</Text>
          <Text style={styles.description}>{destination.description}</Text>
        </View>

        {/* Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.highlights")}</Text>
          {destination.highlights.map((h, i) => (
            <View key={i} style={styles.highlightItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.highlightText}>{h}</Text>
            </View>
          ))}
        </View>

        {/* Weather */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.weather")}</Text>
          <View style={styles.weatherGrid}>
            <View style={styles.weatherItem}>
              <Ionicons name="thermometer-outline" size={24} color="#008fa0" />
              <Text style={styles.weatherLabel}>{t("home.temperature")}</Text>
              <Text style={styles.weatherValue}>{destination.weather.temp}</Text>
            </View>
            <View style={styles.weatherItem}>
              <Ionicons name="sunny-outline" size={24} color="#FF9800" />
              <Text style={styles.weatherLabel}>{t("home.bestTime")}</Text>
              <Text style={styles.weatherValue}>{destination.weather.bestTime}</Text>
            </View>
          </View>
          <View style={styles.weatherNote}>
            <Ionicons name="information-circle-outline" size={16} color="#008fa0" />
            <Text style={styles.weatherNoteText}>{destination.weather.note}</Text>
          </View>
        </View>

        {/* Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.gallery")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {destination.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
            ))}
          </ScrollView>
        </View>

        {/* Map placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.map")}</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="#CCC" />
            <Text style={styles.mapPlaceholderText}>{t("home.map")} {destination.name}</Text>
            <Text style={styles.mapSubtext}>{t("home.tapToViewMap")}</Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.servicesAt")} {destination.name}</Text>
          {destination.services.map(renderServiceCard)}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  heroContainer: {
    position: "relative",
    height: 280,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  heroHeader: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: {
    position: "absolute",
    bottom: 20,
    left: 16,
  },
  heroName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroLocationText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#FFF",
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    color: "#5a6577",
    lineHeight: 22,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    color: "#1a2332",
    marginLeft: 10,
  },
  // Weather
  weatherGrid: {
    flexDirection: "row",
    gap: 12,
  },
  weatherItem: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  weatherLabel: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 6,
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginTop: 2,
  },
  weatherNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  weatherNoteText: {
    fontSize: 13,
    color: "#008fa0",
    marginLeft: 8,
  },
  // Gallery
  galleryImage: {
    width: 200,
    height: 140,
    borderRadius: 16,
    marginRight: 12,
  },
  // Map
  mapPlaceholder: {
    backgroundColor: "#f4f6f8",
    borderRadius: 16,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: {
    fontSize: 15,
    color: "#5a6577",
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 4,
  },
  // Services
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  serviceImage: {
    width: 110,
    height: 100,
  },
  serviceInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
  },
  serviceBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a2332",
    marginLeft: 4,
  },
  reviewCountText: {
    fontSize: 11,
    color: "#8d95a3",
    marginLeft: 2,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
});
