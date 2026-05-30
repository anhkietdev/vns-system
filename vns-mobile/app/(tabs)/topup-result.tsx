import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TopUpResultScreen() {
  const params = useLocalSearchParams<{
    success?: string;
    txnRef?: string;
    message?: string;
  }>();

  const isSuccess = params.success === "true";
  const txnRef = params.txnRef || "";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isSuccess ? "#dcfce7" : "#fef2f2" },
          ]}
        >
          <Ionicons
            name={isSuccess ? "checkmark-circle" : "close-circle"}
            size={64}
            color={isSuccess ? "#16a34a" : "#dc2626"}
          />
        </View>

        <Text style={styles.title}>
          {isSuccess ? "Nạp tiền thành công" : "Nạp tiền thất bại"}
        </Text>

        {txnRef ? <Text style={styles.reference}>Mã giao dịch: {txnRef}</Text> : null}

        <Text style={styles.message}>
          {params.message ||
            (isSuccess
              ? "Số dư ví sẽ được cập nhật sau khi xác nhận thanh toán hoàn tất."
              : "Giao dịch chưa hoàn tất. Vui lòng kiểm tra lại hoặc thử lại sau.")}
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/wallet")}
        >
          <Text style={styles.primaryBtnText}>Quay lại ví</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 8,
  },
  reference: {
    fontSize: 15,
    fontWeight: "600",
    color: "#008fa0",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#5a6577",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryBtn: {
    backgroundColor: "#008fa0",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#f4f6f8",
  },
  secondaryBtnText: {
    color: "#5a6577",
    fontSize: 16,
    fontWeight: "600",
  },
});
