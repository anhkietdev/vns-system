// app/(tabs)/chat.tsx
import { chatService } from "@/api/chat.service";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Conversation = {
  id: string;
  partnerName: string;
  partnerAvatar: string;
  partnerType: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
};

export default function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t("chat.yesterday");
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations();
      const data = res.data || res;
      const items = Array.isArray(data) ? data : (data.items || []);
      setConversations(items.map((item: any) => ({
        id: item.id || item.conversationId,
        partnerName: item.partnerName || t("chat.partner"),
        partnerAvatar: item.partnerLogo || item.partnerAvatar || `https://picsum.photos/seed/${item.id}/100/100`,
        partnerType: item.partnerType || t("chat.partner"),
        lastMessage: item.lastMessage || "",
        lastMessageTime: formatTime(item.lastMessageAt),
        unreadCount: item.unreadCount || 0,
        isOnline: false,
      })));
    } catch (error) {
      console.log("Lỗi tải cuộc trò chuyện:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const filteredConversations = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/chat-detail",
          params: {
            id: item.id.toString(),
            partnerName: item.partnerName,
            partnerAvatar: item.partnerAvatar,
          },
        })
      }
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.partnerAvatar }} style={styles.chatAvatar} />
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.chatInfoCol}>
        <Text style={[styles.chatName, item.unreadCount > 0 && styles.boldText]} numberOfLines={1}>
          {item.partnerName}
        </Text>
        <Text
          style={[styles.chatLastMsg, item.unreadCount > 0 && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      <View style={styles.chatRight}>
        <Text style={[styles.chatTime, item.unreadCount > 0 && styles.timeUnread]}>
          {item.lastMessageTime}
        </Text>
        {item.unreadCount > 0 && <View style={styles.chatUnreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("chat.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8d95a3" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("chat.searchPlaceholder")}
          placeholderTextColor="#8d95a3"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#8d95a3" />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>{t("chat.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#008fa0"]} />
          }
          renderItem={renderConversation}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>{t("chat.noConversations")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("chat.noConversationsDesc")}
              </Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    marginLeft: 10,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
    gap: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16a34a",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfoCol: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },
  boldText: {
    fontWeight: "700",
  },
  chatLastMsg: {
    fontSize: 13,
    color: "#8d95a3",
    marginTop: 3,
  },
  lastMessageUnread: {
    color: "#1a2332",
    fontWeight: "500",
  },
  chatRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  chatTime: {
    fontSize: 12,
    color: "#8d95a3",
  },
  timeUnread: {
    color: "#008fa0",
    fontWeight: "600",
  },
  chatUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#008fa0",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a2332",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 14,
    color: "#8d95a3",
    marginTop: 12,
  },
});
