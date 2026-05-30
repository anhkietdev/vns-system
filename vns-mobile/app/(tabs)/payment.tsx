// app/payment.tsx
import { bookingService } from "@/api/booking.service";
import { paymentService } from "@/api/payment.service";
import { t } from "@/i18n";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PaymentInfoType = {
  paymentMethod: string;
  paymentAmount: number;
  totalPrice: number;
  items: {
    id: string;
    name: string;
    location: string;
    price: number;
    quantity: number;
    image: any;
  }[];
  customerInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    note: string;
  };
};

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ bookingId?: string; paymentType?: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfoType>({
    paymentMethod: "full",
    paymentAmount: 0,
    totalPrice: 0,
    items: [],
    customerInfo: { fullName: "", email: "", phone: "", address: "", note: "" },
  });

  useEffect(() => {
    const fetchPaymentData = async () => {
      setIsLoading(true);
      try {
        // Lấy thông tin user
        const userStr = await AsyncStorage.getItem("user");
        let customerInfo = { fullName: "", email: "", phone: "", address: "", note: "" };
        if (userStr) {
          const user = JSON.parse(userStr);
          customerInfo = {
            fullName: user.fullName || user.name || "",
            email: user.email || "",
            phone: user.phone || user.phoneNumber || "",
            address: user.address || "",
            note: "",
          };
        }

        // Lấy thông tin booking
        if (params.bookingId) {
          const res = await bookingService.getBookingById(params.bookingId);
          const data = res.data || res;
          const totalPrice = data.finalAmount || data.totalAmount || 0;
          const paymentAmount = params.paymentType === "deposit"
            ? Math.round(totalPrice * 0.3)
            : totalPrice;

          setPaymentInfo({
            paymentMethod: params.paymentType || "full",
            paymentAmount,
            totalPrice,
            items: [{
              id: data.id,
              name: data.serviceName || "",
              location: data.destinationName || "",
              price: data.details?.[0]?.unitPrice || totalPrice,
              quantity: data.numberOfGuests || data.details?.[0]?.quantity || 1,
              image: data.thumbnailUrl ? { uri: data.thumbnailUrl } : require("@/assets/images/halong.jpg"),
            }],
            customerInfo,
          });
        } else {
          setPaymentInfo((prev) => ({ ...prev, customerInfo }));
        }
      } catch (error) {
        console.log("Lỗi tải thông tin thanh toán:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaymentData();
  }, [params.bookingId]);

  // Xử lý thanh toán
  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      if (params.bookingId) {
        // Tạo URL thanh toán VNPay
        const res = await paymentService.createVnPayUrl(params.bookingId);
        const data = res.data || res;
        const paymentUrl = data.paymentUrl || data.url || data;

        if (typeof paymentUrl === "string" && paymentUrl.startsWith("http")) {
          await Linking.openURL(paymentUrl);
          setIsProcessing(false);
          Alert.alert(
            t("payment.title"),
            "Hãy hoàn tất thanh toán trong VNPay. Ứng dụng sẽ cập nhật khi bạn quay lại từ kết quả thanh toán.",
          );
        } else {
          setIsProcessing(false);
          Alert.alert(t("common.error"), t("payment.vnpayError"));
        }
      } else {
        Alert.alert(t("common.error"), t("payment.noBookingInfo"));
        setIsProcessing(false);
      }
    } catch (error) {
      console.log("Lỗi thanh toán:", error);
      Alert.alert(t("common.error"), t("payment.error"));
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#008fa0" />
        <Text style={{ marginTop: 12, color: "#5a6577" }}>{t("payment.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#008fa0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("payment.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Nội dung chính */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      >
        {/* Thông tin khách hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person-outline" size={20} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("payment.customerInfo")}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.fullName")}</Text>
            <Text style={styles.infoValue}>
              {paymentInfo.customerInfo.fullName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.email")}</Text>
            <Text style={styles.infoValue}>
              {paymentInfo.customerInfo.email}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.phone")}</Text>
            <Text style={styles.infoValue}>
              {paymentInfo.customerInfo.phone}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.address")}</Text>
            <Text style={styles.infoValue}>
              {paymentInfo.customerInfo.address}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.notes")}</Text>
            <Text style={styles.infoValue}>
              {paymentInfo.customerInfo.note}
            </Text>
          </View>
        </View>

        {/* Thông tin đơn hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="shopping-cart" size={20} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("payment.orderInfo")}</Text>
          </View>

          {paymentInfo.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image source={item.image} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemLocation}>
                  <MaterialIcons name="location-on" size={12} color="#5a6577" />
                  {item.location}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>
                    {item.price.toLocaleString()} VND × {item.quantity}
                  </Text>
                  <Text style={styles.itemTotal}>
                    {(item.price * item.quantity).toLocaleString()} VND
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Thông tin thanh toán */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={20} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("payment.paymentInfo")}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("payment.paymentMethod")}</Text>
            <Text style={[styles.infoValue, styles.methodText]}>
              {t("payment.fullPayment")}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={[styles.infoLabel, styles.totalLabel]}>
              {t("payment.totalPayment")}
            </Text>
            <Text style={[styles.infoValue, styles.totalValue]}>
              {paymentInfo.totalPrice.toLocaleString()} VND
            </Text>
          </View>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="credit-card" size={20} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("payment.paymentMethodTitle")}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Image
              source={require("@/assets/images/zalopay.png")}
              style={styles.zalopayLogo}
            />
            <Text style={styles.paymentMethodText}>VNPay</Text>
          </View>
        </View>
      </ScrollView>

      {/* Nút thanh toán */}
      <View style={styles.paymentFooter}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.disabledButton]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>{t("payment.payVNPay")}</Text>
              <Text style={styles.payButtonAmount}>
                {paymentInfo.paymentAmount.toLocaleString()} VND
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal thông báo thành công */}
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2332",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
  },
  infoLabel: {
    fontSize: 14,
    color: "#5a6577",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a2332",
    maxWidth: "60%",
    textAlign: "right",
  },
  methodText: {
    color: "#008fa0",
    fontWeight: "600",
  },
  totalSection: {
    backgroundColor: "#e6f3f5",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2332",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FF6B00",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2332",
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FF6B00",
  },
  orderItem: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
    gap: 14,
  },
  orderItemImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
  },
  orderItemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF6B00",
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: "#5a6577",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 13,
    color: "#5a6577",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF6B00",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  zalopayLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a2332",
  },
  paymentFooter: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
  },
  payButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  payButtonDisabled: {
    backgroundColor: "#b0b8c1",
  },
  disabledButton: {
    backgroundColor: "#b0b8c1",
  },
  payButtonAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 24,
    width: "88%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a2332",
    textAlign: "center",
    marginVertical: 12,
  },
  modalText: {
    fontSize: 15,
    color: "#5a6577",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
});
