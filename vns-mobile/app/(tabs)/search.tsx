// app/(tabs)/search.tsx
import { serviceService } from "@/api/service.service";
import { t } from "@/i18n";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

type ServiceItem = {
  id: string;
  name: string;
  type: "tour" | "homestay";
  location: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  discount?: number;
  serviceType?: number;
  thumbnailUrl?: string;
  destinationName?: string;
  averageRating?: number;
  totalReviews?: number;
  basePrice?: number;
  discountPercent?: number;
};

const serviceTypeMap: Record<number, "tour" | "homestay"> = {
  0: "homestay",
  1: "tour",
};

const suggestions = [
  "Đà Lạt",
  "Phú Quốc",
  "Nha Trang",
  "Sapa",
  "Hội An",
  "Hạ Long",
  "Hà Giang",
  "Mũi Né",
];

const sortOptions = [
  { key: "default", label: t("search.sortDefault") },
  { key: "price_asc", label: t("search.sortPriceAsc") },
  { key: "price_desc", label: t("search.sortPriceDesc") },
  { key: "rating", label: t("search.sortRating") },
];

const typeLabels: Record<string, { labelKey: string; color: string; bg: string }> = {
  tour: { labelKey: "search.tour", color: "#008fa0", bg: "#E8F0FE" },
  homestay: { labelKey: "search.homestay", color: "#FF6B00", bg: "#FFF3E0" },
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("default");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const typeFilters = [
    { key: "all", label: t("search.all") },
    { key: "tour", label: t("search.tour") },
    { key: "homestay", label: t("search.homestay") },
  ];

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const serviceTypeFilter = activeType === "all" ? undefined :
        activeType === "tour" ? 1 : activeType === "homestay" ? 0 : 1;

      const sortByParam = sortBy === "price_asc" ? "price_asc" :
        sortBy === "price_desc" ? "price_desc" :
        sortBy === "rating" ? "rating" : undefined;

      const res = await serviceService.getAll({
        keyword: query || undefined,
        serviceType: serviceTypeFilter,
        minRating: minRating > 0 ? minRating : undefined,
        sortBy: sortByParam,
        page: 1,
        pageSize: 20,
      });
      const data = res.data || res;
      const items = Array.isArray(data) ? data : (data.items || []);
      setAllServices(items.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: serviceTypeMap[item.serviceType] || "tour",
        location: item.destinationName || "",
        price: item.discountPrice || item.basePrice || 0,
        image: item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/400/300`,
        rating: item.averageRating || 0,
        reviewCount: item.totalReviews || 0,
        discount: item.basePrice > 0 && item.discountPrice ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0,
      })));
      setSearchError("");
    } catch (error) {
      console.log("Lỗi tải dịch vụ:", error);
      setSearchError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [query, activeType, minRating, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchServices();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchServices]);

  const filteredServices = allServices;

  const renderServiceCard = ({ item }: { item: ServiceItem }) => {
    const typeInfo = typeLabels[item.type];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: "/service-detail", params: { id: item.id.toString(), type: item.type } })
        }
      >
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        {!!item.discount && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>{t(typeInfo.labelKey)}</Text>
          </View>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.cardLocation}>
            <MaterialIcons name="location-on" size={13} color="#8d95a3" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
          <View style={styles.cardBottom}>
            <View style={styles.ratingRow}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewText}>({item.reviewCount})</Text>
            </View>
            <Text style={styles.priceText}>{item.price.toLocaleString()}đ</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a2332" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8d95a3" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search.placeholder")}
            placeholderTextColor="#8d95a3"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setShowSuggestions(text.length > 0);
            }}
            onFocus={() => setShowSuggestions(query.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={18} color="#8d95a3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions
            .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
            .map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionItem}
                onPress={() => {
                  setQuery(s);
                  setShowSuggestions(false);
                }}
              >
                <Ionicons name="search-outline" size={16} color="#8d95a3" />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {typeFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, activeType === f.key && styles.chipActive]}
              onPress={() => setActiveType(f.key)}
            >
              <Text style={[styles.chipText, activeType === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Rating filter */}
          {[4, 4.5].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, minRating === r && styles.chipActive]}
              onPress={() => setMinRating(minRating === r ? 0 : r)}
            >
              <FontAwesome name="star" size={12} color={minRating === r ? "#FFF" : "#F59E0B"} />
              <Text style={[styles.chipText, minRating === r && styles.chipTextActive, { marginLeft: 4 }]}>
                {r}+
              </Text>
            </TouchableOpacity>
          ))}

          {/* Sort */}
          <TouchableOpacity style={styles.chip} onPress={() => setShowSortModal(true)}>
            <MaterialIcons name="sort" size={16} color="#5a6577" />
            <Text style={[styles.chipText, { marginLeft: 4 }]}>{t("search.sort")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={styles.resultBar}>
        <Text style={styles.resultText}>{filteredServices.length} {t("search.results")}</Text>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>{t("search.loading")}</Text>
        </View>
      ) : searchError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>{searchError}</Text>
          <Text style={styles.emptySubtitle}>{t("search.noResultsDesc")}</Text>
          <TouchableOpacity
            style={[styles.chip, { marginTop: 16, backgroundColor: "#008fa0" }]}
            onPress={() => fetchServices()}
          >
            <Text style={[styles.chipText, { color: "#FFF" }]}>{t("common.refresh")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          renderItem={renderServiceCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>{t("search.noResults")}</Text>
              <Text style={styles.emptySubtitle}>{t("search.noResultsDesc")}</Text>
            </View>
          }
        />
      )}

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("search.sortBy")}</Text>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
                onPress={() => {
                  setSortBy(opt.key);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.key && (
                  <Ionicons name="checkmark" size={20} color="#008fa0" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    marginLeft: 8,
    paddingVertical: 0,
  },
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
    paddingHorizontal: 20,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
  },
  suggestionText: {
    fontSize: 14,
    color: "#1a2332",
    marginLeft: 10,
  },
  filterBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#008fa0",
  },
  chipText: {
    fontSize: 13,
    color: "#5a6577",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFF",
  },
  resultBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultText: {
    fontSize: 13,
    color: "#8d95a3",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  discountTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  cardInfo: {
    padding: 12,
  },
  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
    lineHeight: 18,
  },
  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 11,
    color: "#8d95a3",
    marginLeft: 3,
  },
  cardBottom: {
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
    marginLeft: 3,
  },
  reviewText: {
    fontSize: 10,
    color: "#8d95a3",
    marginLeft: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6B00",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2332",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 8,
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 20,
    textAlign: "center",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
  },
  sortOptionActive: {
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
  },
  sortOptionText: {
    fontSize: 15,
    color: "#1a2332",
  },
  sortOptionTextActive: {
    color: "#008fa0",
    fontWeight: "600",
  },
});
