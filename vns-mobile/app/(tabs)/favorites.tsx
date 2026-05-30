import { favoriteService } from "@/api/favorite.service";
import { useAppConfirm, useAppSnackbar } from "@/components/feedback/AppFeedbackProvider";
import { t } from "@/i18n";
import { normalizeError } from "@/utils/normalizeError";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type FavoriteItem = {
  id: string;
  name: string;
  type: "tour" | "homestay";
  location: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  serviceId?: string;
};

const serviceTypeMap: Record<number, "tour" | "homestay"> = {
  0: "homestay",
  1: "tour",
};

const typeLabels: Record<string, { labelKey: string; color: string; bg: string }> = {
  tour: { labelKey: "favorite.typeTour", color: "#008fa0", bg: "#E8F0FE" },
  homestay: { labelKey: "favorite.typeHomestay", color: "#FF6B00", bg: "#FFF3E0" },
};

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showConfirm = useAppConfirm();
  const showSnackbar = useAppSnackbar();

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await favoriteService.getMyFavorites(1, 50);
      const data = res.data || res;
      const items = Array.isArray(data) ? data : (data.items || []);
      setFavorites(items.map((item: any) => ({
        id: item.serviceId || item.id,
        name: item.serviceName || item.name || "",
        type: serviceTypeMap[item.serviceType] || "tour",
        location: item.destinationName || item.location || "",
        price: item.discountPrice || item.basePrice || item.price || 0,
        image: item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/400/300`,
        rating: item.averageRating || 0,
        reviewCount: item.totalReviews || 0,
        serviceId: item.serviceId || item.id,
      })));
    } catch (error) {
      console.log("Lá»—i táº£i yĂªu thĂ­ch:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  }, [fetchFavorites]);

  const removeFavorite = async (id: string) => {
    const approved = await showConfirm({
      title: t("favorite.removeTitle"),
      message: t("favorite.removeConfirm"),
      confirmLabel: t("favorite.remove"),
      cancelLabel: t("common.cancel"),
      tone: "error",
    });

    if (!approved) return;

    try {
      await favoriteService.toggle(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      showSnackbar({ message: t("favorite.remove"), tone: "success" });
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({ message: normalized.message || t("favorite.removeError"), tone: "error" });
    }
  };

  const renderListItem = ({ item }: { item: FavoriteItem }) => {
    const typeInfo = typeLabels[item.type];
    return (
      <TouchableOpacity
        style={styles.listCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: "/service-detail", params: { id: item.id.toString(), type: item.type } })
        }
      >
        <Image source={{ uri: item.image }} style={styles.listImage} />
        <View style={styles.listInfo}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>{t(typeInfo.labelKey)}</Text>
          </View>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color="#8d95a3" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.ratingRow}>
              <FontAwesome name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewText}>({item.reviewCount})</Text>
            </View>
            <Text style={styles.priceText}>{item.price.toLocaleString()}₫</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
        >
          <Ionicons name="heart" size={22} color="#dc2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGridItem = ({ item }: { item: FavoriteItem }) => {
    const typeInfo = typeLabels[item.type];
    return (
      <TouchableOpacity
        style={styles.gridCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: "/service-detail", params: { id: item.id.toString(), type: item.type } })
        }
      >
        <Image source={{ uri: item.image }} style={styles.gridImage} />
        <TouchableOpacity
          style={styles.gridHeart}
          onPress={() => removeFavorite(item.id)}
        >
          <Ionicons name="heart" size={20} color="#dc2626" />
        </TouchableOpacity>
        <View style={styles.gridInfo}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>{t(typeInfo.labelKey)}</Text>
          </View>
          <Text style={styles.gridName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.gridPrice}>{item.price.toLocaleString()}₫</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("favorite.title")}</Text>
        <TouchableOpacity onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
          <Ionicons
            name={viewMode === "grid" ? "list" : "grid"}
            size={24}
            color="#008fa0"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{favorites.length} {t("favorite.itemsCount")}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>{t("favorite.loading")}</Text>
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          key={viewMode}
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          numColumns={viewMode === "grid" ? 2 : 1}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
          renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#DDD" />
          <Text style={styles.emptyTitle}>{t("favorite.noFavorites")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("favorite.noFavoritesDesc")}
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push("/search")}
          >
            <Text style={styles.exploreButtonText}>{t("favorite.explore")}</Text>
          </TouchableOpacity>
        </View>
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
  countBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  countText: {
    fontSize: 14,
    color: "#5a6577",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  listImage: {
    width: 110,
    height: 120,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  listInfo: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#8d95a3",
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 12,
    color: "#8d95a3",
    marginLeft: 2,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B00",
  },
  removeButton: {
    padding: 14,
    justifyContent: "center",
  },
  gridRow: {
    justifyContent: "space-between",
  },
  gridCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    width: "48%",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  gridImage: {
    width: "100%",
    height: 130,
  },
  gridHeart: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  gridInfo: {
    padding: 12,
  },
  gridName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
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
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  exploreButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 12,
  },
});
