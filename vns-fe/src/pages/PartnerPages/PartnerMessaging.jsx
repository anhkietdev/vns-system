import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  User,
  Filter,
  Loader2,
} from "lucide-react";
import * as signalR from "@microsoft/signalr";
import { chatService } from "../../services/chatService";

const PartnerMessaging = () => {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const connectionRef = useRef(null);
  const activeConvRef = useRef(null); // Track active conversation for SignalR callback

  // Lấy ID người dùng hiện tại từ localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("vns_user");
      if (userStr) {
        const stored = JSON.parse(userStr);
        // vns_user có thể lưu dạng {token, user: {id,...}, role} hoặc {id, email,...}
        const uid = stored.user?.id || stored.id || stored.userId || null;
        setCurrentUserId(uid);
        console.log("Current user ID for chat:", uid);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation]);

  // SignalR realtime connection
  useEffect(() => {
    const token = localStorage.getItem("vns_token");
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL || "http://localhost:5272"}/hubs/chat`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Lắng nghe tin nhắn mới realtime
    connection.on("ReceiveMessage", (messageDto) => {
      const convId = activeConvRef.current;
      if (!convId) return;

      // Chỉ xử lý tin nhắn thuộc conversation đang mở
      if (messageDto.conversationId === convId) {
        setMessages((prev) => {
          // Tránh duplicate
          if (prev.some((m) => m.id === messageDto.id)) return prev;
          // Thay thế optimistic message
          const withoutTemp = prev.filter((m) => !m.id?.startsWith?.("temp-"));
          return [...withoutTemp, messageDto];
        });
        // Mark as read
        chatService.markAsRead(convId).catch(() => {});
      }

      // Cập nhật conversation list (last message, unread count)
      setConversations((prev) =>
        prev.map((c) => {
          const cId = c.id || c.conversationId;
          if (cId === messageDto.conversationId) {
            return {
              ...c,
              lastMessage: messageDto.content,
              lastMessageAt: messageDto.sentAt || new Date().toISOString(),
              unreadCount: cId === convId ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    });

    // Khi reconnect, tự động join lại conversation đang mở
    connection.onreconnected(() => {
      const convId = activeConvRef.current;
      if (convId) {
        connection.invoke("JoinConversation", convId).catch(() => {});
      }
    });

    connection.start()
      .then(() => {
        connectionRef.current = connection;
        console.log("SignalR chat connected");
        // Join conversation nếu đã có active
        const convId = activeConvRef.current;
        if (convId) {
          connection.invoke("JoinConversation", convId).catch(() => {});
        }
      })
      .catch((err) => console.log("SignalR connection failed:", err));

    return () => {
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [currentUserId]);

  // Join/Leave conversation group khi đổi active conversation
  useEffect(() => {
    const conn = connectionRef.current;
    const prevConv = activeConvRef.current;

    // Leave previous conversation
    if (conn && conn.state === signalR.HubConnectionState.Connected && prevConv) {
      conn.invoke("LeaveConversation", prevConv).catch(() => {});
    }

    activeConvRef.current = activeConversation;

    // Join new conversation
    if (conn && conn.state === signalR.HubConnectionState.Connected && activeConversation) {
      conn.invoke("JoinConversation", activeConversation).catch(() => {});
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await chatService.getConversations();
      const list = res?.data?.items || res?.data || res?.items || [];
      const convs = Array.isArray(list) ? list : [];
      setConversations(convs);
      if (convs.length > 0 && !activeConversation) {
        const targetId = location.state?.targetUserId;
        const targetConv = targetId
          ? convs.find((c) => String(c.userId) === String(targetId))
          : null;
        setActiveConversation(targetConv?.id || targetConv?.conversationId || convs[0].id || convs[0].conversationId);
      }
    } catch (err) {
      console.error("Lỗi tải hội thoại:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const res = await chatService.getMessages(conversationId, 1, 50);
      const msgs = res?.data?.items || res?.data || res?.items || [];
      setMessages(Array.isArray(msgs) ? msgs : []);
      // Mark as read
      try {
        await chatService.markAsRead(conversationId);
        setConversations((prev) =>
          prev.map((c) =>
            (c.id || c.conversationId) === conversationId
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      } catch (_) {}
    } catch (err) {
      console.error("Lỗi tải tin nhắn:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic: add to UI immediately
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender: "partner",
      senderRole: "Partner",
      content,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await chatService.sendMessage({
        conversationId: activeConversation,
        content,
      });
      const sent = res?.data || res;
      // Replace optimistic with real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...sent, sender: "partner", senderRole: "Partner" } : m
        )
      );
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          (c.id || c.conversationId) === activeConversation
            ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "failed" } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Hôm nay";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
    return d.toLocaleDateString("vi-VN");
  };

  const isSentByPartner = (msg) => {
    // So sánh senderId với currentUserId để xác định tin nhắn của mình
    if (currentUserId && msg.senderId) {
      return msg.senderId === currentUserId;
    }
    // Fallback cho optimistic messages
    return msg.sender === "partner" || msg.senderRole === "Partner" || msg.isOwn === true;
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const name = conv.userName || conv.customerName || conv.name || "";
    const service = conv.serviceName || "";
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnread = !filterUnread || (conv.unreadCount || 0) > 0;
    return matchesSearch && matchesUnread;
  });

  const activeConv = conversations.find(
    (conv) => (conv.id || conv.conversationId) === activeConversation
  );

  const getBookingStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50 text-green-700";
      case "pending":
        return "bg-amber-50 text-amber-700";
      case "completed":
        return "bg-blue-50 text-blue-700";
      case "cancelled":
        return "bg-red-50 text-red-700";
      default:
        return "bg-[#f9fafb] text-[#5a6577]";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed": return "Đã xác nhận";
      case "pending": return "Chờ xác nhận";
      case "completed": return "Hoàn thành";
      case "cancelled": return "Đã hủy";
      default: return status || "";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#008fa0] animate-spin" />
          <p className="text-[#5a6577]">Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f6f8]">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r border-[#e8ecf0] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#e8ecf0]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[#1a2332]">Tin nhắn</h1>
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`p-2 rounded-lg transition-colors ${filterUnread ? "bg-[#008fa0] text-white" : "text-[#5a6577] hover:bg-[#f9fafb]"}`}
              title="Lọc tin chưa đọc"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8d95a3] w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng, dịch vụ..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {filterUnread && (
            <div className="mt-2 text-xs text-[#5a6577] flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Hiển thị{" "}
              {filteredConversations.filter((c) => (c.unreadCount || 0) > 0).length}{" "}
              tin chưa đọc
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <Search className="w-12 h-12 text-[#8d95a3] mb-3" />
              <p className="text-sm text-[#5a6577]">
                {searchTerm
                  ? `Không tìm thấy "${searchTerm}"`
                  : "Chưa có tin nhắn nào"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const convId = conversation.id || conversation.conversationId;
              const name = conversation.userName || conversation.customerName || conversation.otherUserName || "Khách hàng";
              const avatar = name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
              const lastMsg = conversation.lastMessage || conversation.lastMessageContent || "";
              const timestamp = formatTime(conversation.lastMessageAt || conversation.updatedAt);
              const serviceType = conversation.serviceType || "";
              const bookingStatus = conversation.bookingStatus || "";

              return (
                <div
                  key={convId}
                  className={`p-4 border-b border-[#f0f2f4] cursor-pointer transition-colors duration-200 hover:bg-[#f9fafb] ${
                    activeConversation === convId
                      ? "bg-[#E6F3F4] border-l-4 border-l-[#008fa0]"
                      : ""
                  }`}
                  onClick={() => setActiveConversation(convId)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-[#008fa0] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {avatar}
                      </div>
                      {conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-[#1a2332] truncate text-sm">
                          {name}
                        </h3>
                        <span className="text-xs text-[#5a6577] flex-shrink-0 ml-2">
                          {timestamp}
                        </span>
                      </div>

                      <p className="text-sm text-[#5a6577] truncate mb-2">
                        {lastMsg}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {serviceType && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[#f9fafb] text-[#5a6577]">
                              {serviceType === "Homestay"
                                ? "Lưu trú"
                                : serviceType === "Tour"
                                  ? "Tour"
                                  : serviceType === "Car Rental" || serviceType === "CarRental"
                                    ? "Thuê xe"
                                    : serviceType}
                            </span>
                          )}
                          {bookingStatus && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${getBookingStatusColor(bookingStatus)}`}
                            >
                              {getStatusLabel(bookingStatus)}
                            </span>
                          )}
                        </div>
                        {(conversation.unreadCount || 0) > 0 && (
                          <div className="bg-[#008fa0] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Area - Message Thread */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-[#e8ecf0] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-[#008fa0] rounded-full flex items-center justify-center text-white font-semibold">
                    {(activeConv.userName || activeConv.customerName || activeConv.otherUserName || "K")
                      .split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                    </div>
                    {activeConv.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                    <div>
                      <h2 className="font-semibold text-[#1a2332] flex items-center">
                        {activeConv.userName || activeConv.customerName || activeConv.otherUserName || "Khách hàng"}
                        {activeConv.isOnline && (
                          <span className="ml-2 text-xs text-green-600 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Đang online
                          </span>
                        )}
                      </h2>
                      {activeConv.serviceName && (
                        <p className="text-sm text-[#5a6577]">
                          {activeConv.serviceName}
                        </p>
                      )}
                      {(location.state?.bookingCode || location.state?.serviceName) && !activeConv.serviceName ? (
                        <p className="text-sm text-[#5a6577]">
                          {location.state.serviceName}{location.state.bookingCode ? ` - ${location.state.bookingCode}` : ""}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 mt-1">
                        {activeConv.bookingId && (
                          <span className="text-xs text-[#5a6577]">
                            ID: {activeConv.bookingId}
                          </span>
                        )}
                        {activeConv.bookingStatus && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${getBookingStatusColor(activeConv.bookingStatus)}`}
                          >
                            {getStatusLabel(activeConv.bookingStatus)}
                          </span>
                        )}
                      </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-[#5a6577] hover:text-[#008fa0] hover:bg-[#f9fafb] rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f9fafb]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-[#008fa0] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#8d95a3] text-sm">Chưa có tin nhắn nào</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const msgDate = formatDate(message.sentAt || message.createdAt || message.timestamp);
                  const prevDate =
                    index > 0
                      ? formatDate(messages[index - 1].sentAt || messages[index - 1].createdAt || messages[index - 1].timestamp)
                      : null;
                  const showDateDivider = index === 0 || msgDate !== prevDate;
                  const isPartner = isSentByPartner(message);

                  return (
                    <React.Fragment key={message.id || index}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-4">
                          <div className="px-4 py-1 bg-[#e8ecf0] rounded-full text-xs text-[#5a6577]">
                            {msgDate}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex ${isPartner ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isPartner
                              ? "bg-[#008fa0] text-white rounded-br-none"
                              : "bg-white text-[#1a2332] border border-[#e8ecf0] rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content || message.text || ""}
                          </p>
                          <div
                            className={`flex items-center justify-between mt-1 text-xs ${
                              isPartner ? "text-[#E6F3F4]" : "text-[#5a6577]"
                            }`}
                          >
                            <span>{formatTime(message.sentAt || message.createdAt || message.timestamp)}</span>
                            {isPartner && (
                              <span className="ml-2">
                                {message.status === "sending" && "..."}
                                {message.status === "failed" && "✗"}
                                {message.status === "sent" && "✓"}
                                {message.status === "delivered" && "✓✓"}
                                {(message.status === "read" || message.isRead) && (
                                  <span className="text-white">✓✓</span>
                                )}
                                {!message.status && !message.isRead && "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-[#e8ecf0] p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                    className="w-full px-4 py-2 border border-[#e8ecf0] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none"
                    rows={1}
                    style={{
                      minHeight: "40px",
                      maxHeight: "120px",
                    }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-[#008fa0] text-white rounded-lg hover:bg-[#007a8a] disabled:bg-[#e8ecf0] disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#f9fafb] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-[#8d95a3]" />
              </div>
              <h3 className="text-lg font-medium text-[#1a2332] mb-2">
                Chọn cuộc trò chuyện
              </h3>
              <p className="text-[#5a6577]">
                Chọn một khách hàng để bắt đầu nhắn tin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerMessaging;
