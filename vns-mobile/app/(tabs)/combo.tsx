import { comboService } from "@/api/combo.service";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type ComboItem = {
  id: string;
  name: string;
  description: string;
  comboPrice: number;
  originalPrice: number;
  fromComboPrice?: number;
  fromOriginalPrice?: number;
  discountAmount?: number;
  discountPercent?: number;
  discountType?: number;
  discountValue?: number;
  discount: number;
  thumbnailUrl: string;
  partnerName: string;
  serviceCount: number;
  services: {
    id?: string;
    serviceId: string;
    name: string;
    serviceType: number;
    basePrice: number;
    discountPrice?: number | null;
    fromPrice?: number;
    thumbnailUrl: string;
    destinationName: string;
  }[];
};

const svcLabels: Record<number, string> = {
  0: "Homestay",
  1: "Tour",
};

function formatCurrency(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export default function ComboScreen() {
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);

  useEffect(() => {
    const fetchCombos = async () => {
      setIsLoading(true);
      try {
        const res = await comboService.getActiveCombos();
        const data = res?.data || res || [];
        setCombos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.log("Lỗi tải combo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCombos();
  }, []);

  const renderCombo = ({ item }: { item: ComboItem }) => {
    const fromOriginal = Number(item.fromOriginalPrice ?? item.originalPrice ?? 0);
    const fromCombo = Number(item.fromComboPrice ?? item.comboPrice ?? 0);
    const discountPercent = Number(item.discountPercent ?? item.discount ?? 0);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.78}
        onPress={() => setExpandedCombo(expandedCombo === item.id ? null : item.id)}
      >
        <Image
          source={item.thumbnailUrl ? { uri: item.thumbnailUrl } : require("@/assets/images/halong.jpg")}
          style={styles.cardImage}
        />

        {discountPercent > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        ) : null}

        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.name}</Text>

          {item.partnerName ? (
            <View style={styles.partnerRow}>
              <Ionicons name="business-outline" size={13} color="#8d95a3" />
              <Text style={styles.partnerText}>{item.partnerName}</Text>
            </View>
          ) : null}

          {item.description ? (
            <Text style={styles.descText} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.serviceList}>
            {(item.services || []).map((svc, index) => (
              <View key={`${svc.serviceId}-${index}`} style={styles.serviceChip}>
                <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                <Text style={styles.serviceChipText} numberOfLines={1}>
                  {svcLabels[svc.serviceType] || "Dịch vụ"}: {svc.name}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            {fromOriginal > fromCombo ? (
              <Text style={styles.originalPrice}>Từ {formatCurrency(fromOriginal)}</Text>
            ) : null}
            <Text style={styles.comboPrice}>Từ {formatCurrency(fromCombo)}</Text>
          </View>

          <Text style={styles.priceHint}>
            Giá cuối cùng phụ thuộc vào ngày ở, loại phòng và lịch khởi hành tour.
          </Text>

          <View style={styles.countRow}>
            <Ionicons name="layers-outline" size={14} color="#008fa0" />
            <Text style={styles.countText}>{item.serviceCount} dịch vụ trong combo</Text>
          </View>

          {expandedCombo === item.id ? (
            <View style={styles.comboDetail}>
              <Text style={styles.comboDetailTitle}>Chi tiết ưu đãi</Text>

              {(item.services || []).map((svc, index) => (
                <TouchableOpacity
                  key={`${svc.serviceId}-${index}`}
                  style={styles.comboDetailItem}
                  onPress={() =>
                    router.push({
                      pathname: "/service-detail",
                      params: { id: svc.serviceId },
                    } as any)
                  }
                >
                  <Image
                    source={svc.thumbnailUrl ? { uri: svc.thumbnailUrl } : require("@/assets/images/halong.jpg")}
                    style={styles.comboDetailImage}
                  />
                  <View style={styles.comboDetailInfo}>
                    <Text style={styles.comboDetailName}>{svc.name}</Text>
                    <Text style={styles.comboDetailType}>
                      {svcLabels[svc.serviceType] || "Dịch vụ"}
                      {svc.destinationName ? ` • ${svc.destinationName}` : ""}
                    </Text>
                    <Text style={styles.comboDetailPrice}>
                      Từ {formatCurrency(Number(svc.fromPrice ?? svc.discountPrice ?? svc.basePrice ?? 0))}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8d95a3" />
                </TouchableOpacity>
              ))}

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  Khi đặt combo, bạn sẽ chọn ngày ở, loại phòng, gói tour và lịch khởi hành trong cùng một lần checkout.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.bookComboBtn}
                onPress={() =>
                  router.push({
                    pathname: "/combo-booking" as any,
                    params: {
                      comboId: item.id,
                      comboData: JSON.stringify(item),
                    },
                  })
                }
              >
                <Ionicons name="cart-outline" size={20} color="#fff" />
                <Text style={styles.bookComboBtnText}>Cấu hình và đặt combo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combo ưu đãi</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : combos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetags-outline" size={60} color="#DDD" />
          <Text style={styles.emptyText}>Chưa có combo nào</Text>
        </View>
      ) : (
        <FlatList
          data={combos}
          keyExtractor={(item) => item.id}
          renderItem={renderCombo}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1a2332" },
  backBtn: {
    position: "absolute",
    left: 16,
    bottom: 14,
    zIndex: 1,
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#8d95a3" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 16, color: "#8d95a3" },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  cardImage: { width: "100%", height: 180 },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardBody: { padding: 16 },
  cardName: { fontSize: 18, fontWeight: "700", color: "#1a2332", marginBottom: 6 },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  partnerText: { fontSize: 13, color: "#8d95a3" },
  descText: { fontSize: 13, color: "#5a6577", lineHeight: 20, marginBottom: 10 },
  serviceList: { marginBottom: 12, gap: 4 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  serviceChipText: { fontSize: 13, color: "#1a2332", flex: 1 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  originalPrice: { fontSize: 14, color: "#8d95a3", textDecorationLine: "line-through" },
  comboPrice: { fontSize: 20, fontWeight: "700", color: "#FF6B00" },
  priceHint: { fontSize: 12, lineHeight: 18, color: "#8d95a3", marginBottom: 10 },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e6f5f7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  countText: { fontSize: 12, color: "#008fa0", fontWeight: "500" },
  comboDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e8ecf0",
  },
  comboDetailTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 10,
  },
  comboDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  comboDetailImage: { width: 56, height: 56, borderRadius: 10 },
  comboDetailInfo: { flex: 1, marginLeft: 10 },
  comboDetailName: { fontSize: 14, fontWeight: "600", color: "#1a2332" },
  comboDetailType: { fontSize: 12, color: "#8d95a3", marginTop: 2 },
  comboDetailPrice: { fontSize: 13, fontWeight: "700", color: "#FF6B00", marginTop: 4 },
  infoBox: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#eef8fa",
    padding: 12,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#0f5660",
  },
  bookComboBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#008fa0",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  bookComboBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
