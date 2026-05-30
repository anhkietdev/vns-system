// app/(tabs)/notifications.tsx
import { notificationService } from "@/api/notification.service";
import { t } from "@/i18n";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type NotificationType = "booking" | "promo" | "system" | "review" | "payment" | "chat" | "wallet";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  date: string;
  read: boolean;
  referenceId?: string;
};

const iconMap: Record<NotificationType, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  booking: { name: "calendar", color: "#008fa0", bg: "#E8F0FE" },
  promo: { name: "pricetag", color: "#FF6B00", bg: "#FFF3E0" },
  system: { name: "settings", color: "#5a6577", bg: "#F0F0F0" },
  review: { name: "star", color: "#FFC107", bg: "#FFF8E1" },
  payment: { name: "wallet", color: "#16a34a", bg: "#E8F5E9" },
  wallet: { name: "wallet", color: "#16a34a", bg: "#E8F5E9" },
  chat: { name: "chatbubble", color: "#9C27B0", bg: "#F3E5F5" },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const mapNotificationType = (type: string): NotificationType => {
    const typeMap: Record<string, NotificationType> = {
      booking: "booking",
      promo: "promo",
      promotion: "promo",
      system: "system",
      review: "review",
      payment: "payment",
      wallet: "wallet",
      chat: "chat",
    };
    return typeMap[type?.toLowerCase()] || "system";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("notification.today");
    if (diffDays === 1) return t("notification.yesterday");
    return date.toLocaleDateString("vi-VN");
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      const res = await notificationService.getAll(1, 50);
      const data = res.data || res;
      const items = Array.isArray(data) ? data : (data.items || []);
      const typeMap: Record<number, string> = { 0: "booking", 1: "booking", 2: "payment", 3: "payment", 4: "refund", 5: "review", 6: "reminder", 7: "promo", 8: "message", 9: "payout" };
      setNotifications(items.map((item: any) => ({
        id: item.id,
        type: mapNotificationType(typeof item.type === "number" ? (typeMap[item.type] || "system") : (item.type || "system")),
        title: item.title || "",
        message: item.content || "",
        time: formatTime(item.createdAt),
        date: formatDate(item.createdAt),
        read: item.isRead || false,
        referenceId: item.referenceId || undefined,
      })));
    } catch (error) {
      console.log("Lỗi tải thông báo:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.log("Lỗi đánh dấu đã đọc:", error);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    await markAsRead(item.id);
    switch (item.type) {
      case "booking":
        if (item.referenceId) {
          router.push({ pathname: "/booking-detail", params: { id: item.referenceId } });
        }
        break;
      case "payment":
      case "wallet":
        router.push("/wallet");
        break;
      case "review":
        router.push("/review-history");
        break;
      case "chat":
        router.push("/chat");
        break;
      default:
        // Just mark as read, no navigation
        break;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.log("Lỗi đánh dấu tất cả đã đọc:", error);
    }
  };

  // Group by date
  const grouped = notifications.reduce<Record<string, NotificationItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([date, items]) => ({
    date,
    items,
  }));

  const renderNotification = (item: NotificationItem) => {
    const icon = iconMap[item.type];
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.notifItem, !item.read && styles.notifUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {!item.read && <View style={styles.notifDot} />}
        <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notification.title")}</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>{t("notification.markAllRead")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* Badge */}
      {unreadCount > 0 && (
        <View style={styles.badgeBar}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} {t("notification.newCount")}</Text>
          </View>
        </View>
      )}

      {/* Notification list */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={styles.dateHeader}>{section.date}</Text>
            {section.items.map(renderNotification)}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>{t("notification.noNotifications")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
  },
  markAllText: {
    fontSize: 14,
    color: "#008fa0",
    fontWeight: "600",
  },
  badgeBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  badge: {
    backgroundColor: "#f0fafb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#008fa0",
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 100,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8d95a3",
    marginBottom: 4,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
    position: "relative",
  },
  notifUnread: {
    backgroundColor: "#f0fafb",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 14,
    color: "#5a6577",
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 12,
    color: "#8d95a3",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#008fa0",
    position: "absolute",
    top: 20,
    left: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#8d95a3",
    marginTop: 16,
  },
});
