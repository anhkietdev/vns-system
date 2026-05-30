// app/(tabs)/chat-detail.tsx
import { chatService } from "@/api/chat.service";
import { API_BASE_URL } from "@/api/config";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as signalR from "@microsoft/signalr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Message = {
  id: string;
  text: string;
  sender: "me" | "partner";
  time: string;
  type: "text" | "image";
  imageUri?: string;
};

export default function ChatDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
  }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Chỉ chấp nhận id dạng GUID hợp lệ
  const isValidGuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const [conversationId, setConversationId] = useState(
    params.id && isValidGuid(params.id) ? params.id : ""
  );
  const flatListRef = useRef<FlatList>(null);

  const partnerName = params.partnerName || t("chat.partner");
  const partnerAvatar = params.partnerAvatar || "https://picsum.photos/seed/default/100/100";

  const currentUserIdRef = useRef<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Load current user ID once
  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const stored = JSON.parse(userStr);
        // Hỗ trợ cả {id,...} và {user: {id,...}}
        currentUserIdRef.current = stored.id || stored.user?.id || stored.userId || null;
      }
    })();
  }, []);

  const parseMessages = (items: any[], currentUserId: string | null): Message[] => {
    return items.map((item: any) => ({
      id: item.id,
      text: item.content || "",
      sender: item.senderId === currentUserId ? "me" : "partner",
      time: (item.sentAt || item.createdAt)
        ? new Date(item.sentAt || item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : "",
      type: item.messageType === 1 || item.imageUrl ? "image" : "text",
      imageUri: item.imageUrl || undefined,
    }));
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        if (!conversationId) {
          setMessages([]);
          setIsLoading(false);
          return;
        }
        const res = await chatService.getMessages(conversationId, 1, 50);
        const data = res.data || res;
        const msgData = data.messages || data;
        const items = Array.isArray(msgData) ? msgData : (msgData.items || []);
        setMessages(parseMessages(items, currentUserIdRef.current));
        // Mark as read
        try {
          await chatService.markAsRead(conversationId);
        } catch {}
      } catch (error) {
        console.log("Lỗi tải tin nhắn:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, [conversationId]);

  // SignalR realtime connection
  useEffect(() => {
    if (!conversationId) return;

    let connection: signalR.HubConnection | null = null;

    const startSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        // Tạo hub URL từ API_BASE_URL (bỏ /api)
        const hubUrl = API_BASE_URL.replace(/\/api$/, "") + "/hubs/chat";

        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        // Lắng nghe tin nhắn mới realtime
        connection.on("ReceiveMessage", (messageDto: any) => {
          const currentUserId = currentUserIdRef.current;
          const newMsg: Message = {
            id: messageDto.id,
            text: messageDto.content || "",
            sender: messageDto.senderId === currentUserId ? "me" : "partner",
            time: messageDto.sentAt
              ? new Date(messageDto.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
              : new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            type: messageDto.messageType === 1 || messageDto.imageUrl ? "image" : "text",
            imageUri: messageDto.imageUrl || undefined,
          };

          setMessages((prev) => {
            // Tránh duplicate - kiểm tra id đã tồn tại chưa
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Thay thế optimistic message nếu là tin nhắn của mình
            if (newMsg.sender === "me") {
              const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
              return [...withoutTemp, newMsg];
            }
            return [...prev, newMsg];
          });

          // Tự động scroll xuống cuối
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);

          // Mark as read
          chatService.markAsRead(conversationId).catch(() => {});
        });

        await connection.start();
        connectionRef.current = connection;

        // Join conversation group để nhận tin nhắn
        await connection.invoke("JoinConversation", conversationId);
        console.log("SignalR connected & joined conversation:", conversationId);
      } catch (err) {
        console.log("SignalR connection error, falling back to polling:", err);
        // Fallback polling nếu SignalR không kết nối được
        startPollingFallback();
      }
    };

    // Fallback polling nếu SignalR fail
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    const startPollingFallback = () => {
      pollingInterval = setInterval(async () => {
        try {
          const res = await chatService.getMessages(conversationId, 1, 50);
          const data = res.data || res;
          const msgData = data.messages || data;
          const items = Array.isArray(msgData) ? msgData : (msgData.items || []);
          const newMessages = parseMessages(items, currentUserIdRef.current);
          setMessages((prev) => {
            if (newMessages.length !== prev.length ||
                (newMessages.length > 0 && prev.length > 0 &&
                 newMessages[newMessages.length - 1].id !== prev[prev.length - 1].id)) {
              return newMessages;
            }
            return prev;
          });
          chatService.markAsRead(conversationId).catch(() => {});
        } catch {}
      }, 3000);
    };

    startSignalR();

    return () => {
      // Cleanup: leave conversation & stop connection
      if (connection && connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("LeaveConversation", conversationId).catch(() => {});
        connection.stop().catch(() => {});
      }
      connectionRef.current = null;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [isLoading]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      text: inputText.trim(),
      sender: "me",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    };
    setMessages((prev) => [...prev, newMsg]);
    const messageText = inputText.trim();
    setInputText("");
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const sendData: any = {
        content: messageText,
        messageType: 0,
      };
      if (conversationId && isValidGuid(conversationId)) {
        sendData.conversationId = conversationId;
      } else if (params.partnerId && isValidGuid(params.partnerId)) {
        sendData.partnerId = params.partnerId;
      } else {
        Alert.alert("Lỗi", "Không tìm thấy thông tin đối tác để gửi tin nhắn.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      const res = await chatService.sendMessage(sendData);
      // Nếu chưa có conversationId, lấy từ response
      if (!conversationId) {
        const resData = res.data || res;
        const newConvId = resData.conversationId || resData.id;
        if (newConvId) setConversationId(newConvId);
      }
    } catch (error) {
      console.log("Lỗi gửi tin nhắn:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert(t("common.error"), t("chat.sendError"));
    }
  };

  const pickAndSendImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t("common.warning"), t("chat.imagePermissionNeeded"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const imageUri = result.assets[0].uri;
      const tempId = `temp-img-${Date.now()}`;
      const newMsg: Message = {
        id: tempId,
        text: "",
        sender: "me",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        type: "image",
        imageUri,
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      try {
        const sendData: any = {
          imageUrl: imageUri,
          messageType: 1,
        };
        if (conversationId) {
          sendData.conversationId = conversationId;
        } else if (params.partnerId) {
          sendData.partnerId = params.partnerId;
        }
        const res = await chatService.sendMessage(sendData);
        if (!conversationId) {
          const resData = res.data || res;
          const newConvId = resData.conversationId || resData.id;
          if (newConvId) setConversationId(newConvId);
        }
      } catch (error) {
        console.log("Lỗi gửi hình ảnh:", error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert(t("common.error"), t("chat.sendImageError"));
      }
    } catch (error) {
      console.log("Lỗi chọn ảnh:", error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender === "me";
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <Image source={{ uri: partnerAvatar }} style={styles.msgAvatar} />
        )}
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
          {item.type === "image" && item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
          )}
          {item.text.length > 0 && (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Image source={{ uri: partnerAvatar }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {partnerName}
          </Text>
          <Text style={styles.headerStatus}>{t("chat.online")}</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={22} color="#008fa0" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={22} color="#5a6577" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008fa0" />
          <Text style={styles.loadingText}>{t("chat.loadingMessages")}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachButton} onPress={pickAndSendImage}>
          <Ionicons name="image-outline" size={24} color="#008fa0" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor="#8d95a3"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color={inputText.trim() ? "#FFF" : "#CCC"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
  },
  headerStatus: {
    fontSize: 12,
    color: "#16a34a",
    marginTop: 1,
  },
  headerAction: {
    padding: 8,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  messageRowMe: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "75%",
  },
  bubbleMe: {
    backgroundColor: "#008fa0",
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-end",
  },
  bubblePartner: {
    backgroundColor: "#f4f6f8",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: "#1a2332",
    lineHeight: 21,
  },
  messageTextMe: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    color: "#8d95a3",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageTimeMe: {
    color: "rgba(255,255,255,0.7)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 30 : 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
    gap: 10,
  },
  attachButton: {
    padding: 4,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#f4f6f8",
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#1a2332",
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#e8ecf0",
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
});
