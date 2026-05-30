// app/(tabs)/wallet.tsx
import { walletService } from "@/api/wallet.service";
import { t } from "@/i18n";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

type TransactionType = "topup" | "payment" | "refund" | "withdraw";

type Transaction = {
  id: string;
  type: TransactionType;
  title: string;
  description: string;
  amount: number;
  date: string;
  time: string;
};

const typeConfig: Record<TransactionType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  topup: { icon: "arrow-down-circle", color: "#16a34a", bg: "#E8F5E9" },
  payment: { icon: "cart", color: "#F44336", bg: "#FFEBEE" },
  refund: { icon: "refresh-circle", color: "#FF9800", bg: "#FFF3E0" },
  withdraw: { icon: "arrow-up-circle", color: "#9C27B0", bg: "#F3E5F5" },
};

const filterTabs = [
  { key: "all", labelKey: "wallet.filterAll" },
  { key: "topup", labelKey: "wallet.topUp" },
  { key: "payment", labelKey: "wallet.filterPayment" },
  { key: "refund", labelKey: "wallet.filterRefund" },
  { key: "withdraw", labelKey: "wallet.withdraw" },
];

export default function WalletScreen() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [balance, setBalance] = useState(0);
  const [transactionsData, setTransactionsData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [showVnPayWebView, setShowVnPayWebView] = useState(false);
  const [vnPayUrl, setVnPayUrl] = useState("");
  const webViewRef = useRef<WebView>(null);

  const mapTransactionType = (type: string): TransactionType => {
    const typeMap: Record<string, TransactionType> = {
      topup: "topup",
      top_up: "topup",
      payment: "payment",
      refund: "refund",
      withdraw: "withdraw",
    };
    return typeMap[type?.toLowerCase()] || "payment";
  };

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch wallet balance
      const walletRes = await walletService.getWallet();
      const walletData = walletRes.data || walletRes;
      setBalance(walletData.balance || walletData.availableBalance || 0);

      // Fetch transactions
      const transRes = await walletService.getTransactions(1, 50);
      const transData = transRes.data || transRes;
      const items = Array.isArray(transData) ? transData : (transData.items || []);
      const walletTypeMap: Record<number, string> = { 0: "topup", 1: "payment", 2: "refund", 3: "commission", 4: "payout" };
      setTransactionsData(items.map((item: any) => ({
        id: item.id,
        type: mapTransactionType(typeof item.type === "number" ? (walletTypeMap[item.type] || "payment") : (item.type || "payment")),
        title: item.description || "",
        description: "",
        amount: item.amount || 0,
        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "",
        time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
      })));
    } catch (error) {
      console.log("Lỗi tải ví:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  }, [fetchWalletData]);

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount.replace(/\D/g, ""), 10);
    if (!amount || amount < 10000) {
      Alert.alert(t("common.error"), t("wallet.errorMinAmount"));
      return;
    }
    setIsTopUpLoading(true);
    try {
      const res = await walletService.topUp(amount);
      const data = res.data || res;
      const paymentUrl = data.paymentUrl || data.url;
      if (typeof paymentUrl === "string" && paymentUrl.startsWith("http")) {
        setShowTopUpModal(false);
        setTopUpAmount("");
        setVnPayUrl(paymentUrl);
        setShowVnPayWebView(true);
      } else {
        Alert.alert(t("common.error"), "Không tạo được liên kết thanh toán");
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("wallet.topUpError"));
    } finally {
      setIsTopUpLoading(false);
    }
  };

  // Ref lưu callback URL để tránh xử lý trùng
  const topUpCallbackRef = useRef<string>("");

  // Bắt callback URL TRƯỚC khi WebView load (đáng tin cậy nhất)
  const handleTopUpShouldStartLoad = (request: any): boolean => {
    const url = request.url || "";
    if (url.includes("topup-callback") || url.includes("/api/Wallet/topup-callback")) {
      topUpCallbackRef.current = url;
      processTopUpResult(url);
      return false; // Chặn WebView load localhost
    }
    return true;
  };

  // Backup: onNavigationStateChange
  const handleTopUpNavigationChange = async (navState: any) => {
    const url = navState.url || "";
    if (
      (url.includes("topup-callback") || url.includes("/api/Wallet/topup-callback")) &&
      !topUpCallbackRef.current
    ) {
      topUpCallbackRef.current = url;
      processTopUpResult(url);
    }
  };

  // Xử lý kết quả nạp tiền
  const processTopUpResult = async (url: string) => {
    setShowVnPayWebView(false);
    setVnPayUrl("");

    try {
      const rawQuery = url.includes("?") ? url.split("?")[1] : "";
      const responseCodeMatch = rawQuery.match(/vnp_ResponseCode=([^&]*)/);
      const responseCode = responseCodeMatch ? responseCodeMatch[1] : "";

      console.log("TopUp callback URL:", url.substring(0, 100));
      console.log("TopUp responseCode:", responseCode);

      // Gọi backend xác nhận nạp tiền (retry 3 lần)
      let confirmed = false;
      if (rawQuery) {
        for (let attempt = 0; attempt < 3 && !confirmed; attempt++) {
          try {
            console.log(`Confirm topup attempt ${attempt + 1}...`);
            const confirmRes = await walletService.confirmTopUpRaw(rawQuery);
            const resData = confirmRes?.data || confirmRes;
            confirmed = resData?.success === true;
            console.log(`Attempt ${attempt + 1} result:`, JSON.stringify(resData));
            if (confirmed) break;
          } catch (err: any) {
            console.log(`Attempt ${attempt + 1} error:`, err?.response?.data?.message || err?.message);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      // Refresh wallet data (balance + transactions)
      await fetchWalletData();

      if (confirmed || responseCode === "00") {
        Alert.alert(t("common.success"), t("wallet.topUpSuccess"), [
          { text: "OK" },
        ]);
      } else {
        Alert.alert(t("common.error"), "Nạp tiền thất bại. Vui lòng thử lại.", [
          { text: "OK" },
        ]);
      }
    } catch {
      await fetchWalletData();
      Alert.alert(t("common.warning"), "Kiểm tra số dư ví để xác nhận kết quả.");
    } finally {
      topUpCallbackRef.current = "";
    }
  };

  const handleFeatureInDevelopment = () => {
    Alert.alert(t("common.warning"), t("wallet.featureInDevelopment"));
  };

  const filteredTransactions =
    activeFilter === "all"
      ? transactionsData
      : transactionsData.filter((t) => t.type === activeFilter);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const config = typeConfig[item.type];
    const isPositive = item.amount > 0;
    return (
      <View style={styles.transCard}>
        <View style={[styles.transIcon, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.transInfo}>
          <Text style={styles.transTitle}>{item.title}</Text>
          <Text style={styles.transDesc}>{item.description}</Text>
          <Text style={styles.transDate}>
            {item.date} - {item.time}
          </Text>
        </View>
        <Text style={[styles.transAmount, { color: isPositive ? "#16a34a" : "#F44336" }]}>
          {isPositive ? "+" : ""}
          {item.amount.toLocaleString()}đ
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("wallet.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t("wallet.availableBalance")}</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()}đ</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowTopUpModal(true)}>
            <Ionicons name="add-circle-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>{t("wallet.topUp")}</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionButton} onPress={handleFeatureInDevelopment}>
            <Ionicons name="arrow-up-circle-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>{t("wallet.withdraw")}</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionButton} onPress={handleFeatureInDevelopment}>
            <Ionicons name="swap-horizontal-outline" size={22} color="#FFF" />
            <Text style={styles.actionText}>{t("wallet.transfer")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            +{transactionsData
              .filter((t) => t.amount > 0)
              .reduce((s, t) => s + t.amount, 0)
              .toLocaleString()}đ
          </Text>
          <Text style={styles.statLabel}>{t("wallet.totalReceived")}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: "#F44336" }]}>
            {transactionsData
              .filter((t) => t.amount < 0)
              .reduce((s, t) => s + t.amount, 0)
              .toLocaleString()}đ
          </Text>
          <Text style={styles.statLabel}>{t("wallet.totalSpent")}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === item.key && styles.filterTabActive]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === item.key && styles.filterTabTextActive,
                ]}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>{t("wallet.transactionHistory")}</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>{t("wallet.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
          }
          renderItem={renderTransaction}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>{t("wallet.noTransactions")}</Text>
              <Text style={styles.emptySubtitle}>{t("wallet.noTransactionsDesc")}</Text>
            </View>
          }
        />
      )}

      {/* VNPay WebView Modal - nạp tiền */}
      <Modal
        visible={showVnPayWebView}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert("Hủy nạp tiền?", "Bạn có chắc muốn hủy nạp tiền?", [
            { text: "Tiếp tục", style: "cancel" },
            {
              text: "Hủy",
              style: "destructive",
              onPress: () => {
                setShowVnPayWebView(false);
                setVnPayUrl("");
              },
            },
          ]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.vnpayHeader}>
            <TouchableOpacity
              style={styles.vnpayHeaderBtn}
              onPress={() => {
                Alert.alert("Hủy nạp tiền?", "Bạn có chắc muốn hủy nạp tiền?", [
                  { text: "Tiếp tục", style: "cancel" },
                  {
                    text: "Hủy",
                    style: "destructive",
                    onPress: () => {
                      setShowVnPayWebView(false);
                      setVnPayUrl("");
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="close" size={24} color="#1a2332" />
            </TouchableOpacity>
            <Text style={styles.vnpayHeaderTitle}>Nạp tiền VNPay</Text>
            <View style={{ width: 40 }} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: vnPayUrl }}
            onShouldStartLoadWithRequest={handleTopUpShouldStartLoad}
            onNavigationStateChange={handleTopUpNavigationChange}
            startInLoadingState
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            originWhitelist={["https://*", "http://*"]}
            renderLoading={() => (
              <View style={styles.vnpayLoading}>
                <ActivityIndicator size="large" color="#008fa0" />
                <Text style={{ marginTop: 12, color: "#5a6577" }}>Đang tải trang thanh toán...</Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Top-up Modal */}
      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("wallet.topUpTitle")}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("wallet.enterAmount")}
              placeholderTextColor="#8d95a3"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />
            <View style={styles.quickAmounts}>
              {[50000, 100000, 200000, 500000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmountBtn}
                  onPress={() => setTopUpAmount(amt.toString())}
                >
                  <Text style={styles.quickAmountText}>{amt.toLocaleString()}đ</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowTopUpModal(false); setTopUpAmount(""); }}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isTopUpLoading && { opacity: 0.6 }]}
                onPress={handleTopUp}
                disabled={isTopUpLoading}
              >
                {isTopUpLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("wallet.topUp")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  // Balance
  balanceCard: {
    backgroundColor: "#008fa0",
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 16,
    width: "100%",
    justifyContent: "space-around",
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionText: {
    fontSize: 12,
    color: "#FFF",
    marginTop: 4,
    fontWeight: "500",
  },
  actionDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
  },
  statLabel: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e8ecf0",
  },
  // Filter
  filterContainer: {
    backgroundColor: "#fff",
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: "#008fa0",
  },
  filterTabText: {
    fontSize: 13,
    color: "#5a6577",
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  transIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  transInfo: {
    flex: 1,
  },
  transTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
  },
  transDesc: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 2,
  },
  transDate: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 2,
  },
  transAmount: {
    fontSize: 15,
    fontWeight: "700",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
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
    textAlign: "center",
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: "#1a2332",
  },
  quickAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 24,
  },
  quickAmountBtn: {
    backgroundColor: "#f4f6f8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickAmountText: {
    fontSize: 13,
    color: "#008fa0",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5a6577",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  // VNPay WebView styles
  vnpayHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ecf0",
  },
  vnpayHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  vnpayHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1a2332",
    textAlign: "center" as const,
  },
  vnpayLoading: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "#f4f6f8",
  },
});
