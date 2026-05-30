import { comboService } from "@/api/combo.service";
import { voucherService } from "@/api/voucher.service";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ComboItem } from "./combo";

type Voucher = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountValue: number;
  voucherType: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  userUsageLimit: number;
  serviceType: number | null;
  isActive: boolean;
};

export default function VouchersScreen() {
  const [activeTab, setActiveTab] = useState<"combos" | "vouchers">("combos");
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCombos = useCallback(async () => {
    try {
      const res = await comboService.getActiveCombos();
      const data = res.data || res;
      const items: ComboItem[] = Array.isArray(data) ? data : (data.items || data.Items || []);
      setCombos(items);
    } catch {
      console.log("Lỗi tải combo");
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await voucherService.getActiveVouchers();
      const data = res.data || res;
      const items: Voucher[] = Array.isArray(data) ? data : (data.items || data.Items || []);
      setVouchers(items);
    } catch {
      console.log("Lỗi tải voucher");
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchCombos(), fetchVouchers()]);
    setIsLoading(false);
  }, [fetchCombos, fetchVouchers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCombos(), fetchVouchers()]);
    setRefreshing(false);
  };

  const handleVoucherCode = (code: string) => {
    try {
      const Clipboard = require("react-native").Clipboard;
      Clipboard.setString(code);
      Alert.alert("Thành công", `Đã sao chép mã "${code}". Dán vào ô voucher khi thanh toán.`);
    } catch {
      Alert.alert("Mã voucher", code);
    }
  };

  const getServiceTypeLabel = (type: number | null) => {
    switch (type) {
      case 0: return "Homestay";
      case 1: return "Tour";
      case 3: return "Combo";
      default: return "Tất cả";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatCompactPrice = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return `${value}đ`;
  };

  const svcLabels: Record<number, string> = { 0: "Homestay", 1: "Tour" };

  const renderComboCard = ({ item }: { item: ComboItem }) => (
    (() => {
      const fromOriginal = Number(item.fromOriginalPrice ?? item.originalPrice ?? 0);
      const fromCombo = Number(item.fromComboPrice ?? item.comboPrice ?? 0);
      const discountPercent = Number(item.discountPercent ?? item.discount ?? 0);
      return (
    <TouchableOpacity
      style={styles.comboCard}
      activeOpacity={0.7}
      onPress={() => setExpandedCombo(expandedCombo === item.id ? null : item.id)}
    >
      <Image
        source={
          item.thumbnailUrl
            ? { uri: item.thumbnailUrl }
            : require("@/assets/images/halong.jpg")
        }
        style={styles.comboImage}
      />
      {discountPercent > 0 && (
        <View style={styles.comboDiscountBadge}>
          <Text style={styles.comboDiscountText}>-{discountPercent}%</Text>
        </View>
      )}
      <View style={styles.comboBody}>
        <Text style={styles.comboName}>{item.name}</Text>
        {item.partnerName ? (
          <View style={styles.partnerRow}>
            <Ionicons name="business-outline" size={13} color="#8d95a3" />
            <Text style={styles.partnerText}>{item.partnerName}</Text>
          </View>
        ) : null}
        {item.description ? (
          <Text style={styles.comboDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.comboServiceList}>
          {item.services.slice(0, 3).map((svc, i) => (
            <View key={i} style={styles.comboServiceChip}>
              <MaterialIcons name="check-circle" size={14} color="#16a34a" />
              <Text style={styles.comboServiceChipText} numberOfLines={1}>
                {svcLabels[svc.serviceType]}: {svc.name}
              </Text>
            </View>
          ))}
          {item.services.length > 3 && (
            <Text style={styles.moreText}>
              +{item.services.length - 3} dịch vụ khác
            </Text>
          )}
        </View>
        <View style={styles.comboPriceRow}>
          <Text style={styles.comboOriginalPrice}>
            Từ {fromOriginal.toLocaleString()}đ
          </Text>
          <Text style={styles.comboSalePrice}>
            Từ {fromCombo.toLocaleString()}đ
          </Text>
        </View>
        <View style={styles.comboCountRow}>
          <Ionicons name="layers-outline" size={14} color="#008fa0" />
          <Text style={styles.comboCountText}>
            {item.serviceCount} dịch vụ trong combo
          </Text>
        </View>
        {expandedCombo === item.id && (
          <View style={styles.comboDetail}>
            <Text style={styles.comboDetailTitle}>Chi tiết dịch vụ trong combo</Text>
            {item.services.map((svc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.comboDetailItem}
                onPress={() =>
                  router.push({
                    pathname: "/service-detail",
                    params: {
                      id: svc.serviceId,
                      type: svc.serviceType === 0 ? "homestay" : "tour",
                    },
                  } as any)
                }
              >
                <Image
                  source={
                    svc.thumbnailUrl
                      ? { uri: svc.thumbnailUrl }
                      : require("@/assets/images/halong.jpg")
                  }
                  style={styles.comboDetailImage}
                />
                <View style={styles.comboDetailInfo}>
                  <Text style={styles.comboDetailName}>{svc.name}</Text>
                  <Text style={styles.comboDetailType}>
                    {svcLabels[svc.serviceType]}
                    {svc.destinationName ? ` - ${svc.destinationName}` : ""}
                  </Text>
                  <Text style={styles.comboDetailPrice}>
                    {svc.basePrice.toLocaleString()}đ
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8d95a3" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.bookComboBtn}
              onPress={() => {
                router.push({
                  pathname: "/combo-booking" as any,
                  params: {
                    comboId: item.id,
                    comboData: JSON.stringify(item),
                  },
                });
              }}
            >
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.bookComboBtnText}>
                Đặt combo này • Từ {fromCombo.toLocaleString()}đ
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
      );
    })()
  );

  const renderVoucher = ({ item }: { item: Voucher }) => {
    const remaining = item.usageLimit - item.usedCount;
    const isPercentage = item.voucherType === 0;
    const discountDisplay = isPercentage
      ? `${item.discountValue}%`
      : formatCompactPrice(item.discountValue);

    return (
      <View style={styles.voucherCard}>
        <View style={styles.voucherLeft}>
          <View style={styles.voucherDiscountBadge}>
            <Text style={styles.voucherDiscountLabel}>GIẢM</Text>
            <Text style={styles.voucherDiscountValue}>{discountDisplay}</Text>
          </View>
        </View>
        <View style={styles.voucherDivider}>
          <View style={styles.dividerCircleTop} />
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.dividerDash} />
          ))}
          <View style={styles.dividerCircleBottom} />
        </View>
        <View style={styles.voucherRight}>
          <Text style={styles.voucherName} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.voucherDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.voucherMetaList}>
            {item.minOrderAmount ? (
              <View style={styles.voucherMetaItem}>
                <Ionicons name="cart-outline" size={11} color="#8d95a3" />
                <Text style={styles.voucherMetaText}>
                  Đơn tối thiểu {Number(item.minOrderAmount).toLocaleString()}đ
                </Text>
              </View>
            ) : null}
            {isPercentage && item.maxDiscountAmount ? (
              <View style={styles.voucherMetaItem}>
                <Ionicons name="trending-down-outline" size={11} color="#8d95a3" />
                <Text style={styles.voucherMetaText}>
                  Giảm tối đa {Number(item.maxDiscountAmount).toLocaleString()}đ
                </Text>
              </View>
            ) : null}
            <View style={styles.voucherMetaItem}>
              <Ionicons name="calendar-outline" size={11} color="#8d95a3" />
              <Text style={styles.voucherMetaText}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>
          </View>
          <View style={styles.voucherFooter}>
            <View style={styles.serviceTypeTag}>
              <Text style={styles.serviceTypeTagText}>{getServiceTypeLabel(item.serviceType)}</Text>
            </View>
            <Text style={styles.remainingText}>Còn {remaining} lượt</Text>
          </View>
          <TouchableOpacity
            style={styles.codeButton}
            onPress={() => handleVoucherCode(item.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.codeText}>{item.code}</Text>
            <Ionicons name="copy-outline" size={14} color="#008fa0" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ưu đãi</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "combos" && styles.activeTab]}
          onPress={() => setActiveTab("combos")}
        >
          <Text
            style={[styles.tabText, activeTab === "combos" && styles.activeTabText]}
          >
            Gói dịch vụ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "vouchers" && styles.activeTab]}
          onPress={() => setActiveTab("vouchers")}
        >
          <Text
            style={[styles.tabText, activeTab === "vouchers" && styles.activeTabText]}
          >
            Voucher
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : activeTab === "combos" ? (
        combos.length > 0 ? (
          <FlatList
            key="combos-list"
            data={combos}
            keyExtractor={(item) => item.id}
            renderItem={renderComboCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetag-outline" size={64} color="#e8ecf0" />
                <Text style={styles.emptyTitle}>Chưa có gói dịch vụ</Text>
                <Text style={styles.emptyText}>Hiện tại chưa có gói dịch vụ nào.</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color="#e8ecf0" />
            <Text style={styles.emptyTitle}>Chưa có gói dịch vụ</Text>
            <Text style={styles.emptyText}>Hiện tại chưa có gói dịch vụ nào.</Text>
          </View>
        )
      ) : vouchers.length > 0 ? (
        <FlatList
          key="vouchers-list"
          data={vouchers}
          keyExtractor={(item) => item.id}
          renderItem={renderVoucher}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color="#e8ecf0" />
              <Text style={styles.emptyTitle}>Chưa có voucher</Text>
              <Text style={styles.emptyText}>Hiện tại không có mã giảm giá nào.</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color="#e8ecf0" />
          <Text style={styles.emptyTitle}>Chưa có voucher</Text>
          <Text style={styles.emptyText}>Hiện tại không có mã giảm giá nào.</Text>
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
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2332",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#f0f2f4",
    borderRadius: 10,
    padding: 3,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  comboCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  comboImage: { width: "100%", height: 180 },
  comboDiscountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comboDiscountText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  comboBody: { padding: 16 },
  comboName: { fontSize: 18, fontWeight: "700", color: "#1a2332", marginBottom: 6 },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  partnerText: { fontSize: 13, color: "#8d95a3" },
  comboDesc: { fontSize: 13, color: "#5a6577", lineHeight: 20, marginBottom: 10 },
  comboServiceList: { marginBottom: 12 },
  comboServiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  comboServiceChipText: { fontSize: 13, color: "#1a2332", flex: 1 },
  moreText: { fontSize: 12, color: "#008fa0", marginTop: 2 },
  comboPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 8 },
  comboOriginalPrice: {
    fontSize: 14,
    color: "#8d95a3",
    textDecorationLine: "line-through",
  },
  comboSalePrice: { fontSize: 20, fontWeight: "700", color: "#FF6B00" },
  comboCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e6f5f7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  comboCountText: { fontSize: 12, color: "#008fa0", fontWeight: "500" },
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
  comboDetailImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  comboDetailInfo: {
    flex: 1,
    marginLeft: 10,
  },
  comboDetailName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
  },
  comboDetailType: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 2,
  },
  comboDetailPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
    marginTop: 2,
  },
  bookComboBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#008fa0",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
  },
  bookComboBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a2332",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#8d95a3",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  voucherCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  voucherLeft: {
    width: 85,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
  },
  voucherDiscountBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  voucherDiscountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    textAlign: "center",
  },
  voucherDiscountValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
    textAlign: "center",
  },
  voucherDivider: {
    width: 16,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  dividerCircleTop: {
    width: 16,
    height: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#f4f6f8",
  },
  dividerCircleBottom: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#f4f6f8",
  },
  dividerDash: {
    width: 1,
    height: 6,
    backgroundColor: "#e8ecf0",
  },
  voucherRight: {
    flex: 1,
    padding: 12,
  },
  voucherName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  voucherDesc: {
    fontSize: 11,
    color: "#5a6577",
    marginBottom: 6,
    lineHeight: 15,
  },
  voucherMetaList: {
    gap: 3,
    marginBottom: 6,
  },
  voucherMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  voucherMetaText: {
    fontSize: 10,
    color: "#8d95a3",
  },
  voucherFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  serviceTypeTag: {
    backgroundColor: "#f4f6f8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceTypeTagText: {
    fontSize: 10,
    color: "#5a6577",
    fontWeight: "500",
  },
  remainingText: {
    fontSize: 10,
    color: "#8d95a3",
  },
  codeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F3F4",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#008fa0",
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#008fa0",
    letterSpacing: 1,
  },
});
