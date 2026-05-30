import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export interface ISendMessageData {
  conversationId?: string;
  partnerId?: string;
  content?: string;
  imageUrl?: string;
  messageType?: number;
}

class ChatService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  constructor() {
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getConversations() {
    try {
      const response = await this.api.get("/Chat/conversations");
      return response.data;
    } catch (error) {
      console.log("GetConversations API error:", error);
      throw error;
    }
  }

  async getMessages(conversationId: string, page = 1, pageSize = 30) {
    try {
      const response = await this.api.get(
        `/Chat/${conversationId}/messages`,
        { params: { page, pageSize } },
      );
      return response.data;
    } catch (error) {
      console.log("GetMessages API error:", error);
      throw error;
    }
  }

  async sendMessage(data: ISendMessageData) {
    try {
      const response = await this.api.post("/Chat", data);
      return response.data;
    } catch (error) {
      console.log("SendMessage API error:", error);
      throw error;
    }
  }

  async markAsRead(conversationId: string) {
    try {
      const response = await this.api.put(`/Chat/${conversationId}/read`);
      return response.data;
    } catch (error) {
      console.log("MarkAsRead API error:", error);
      throw error;
    }
  }
}

export const chatService = new ChatService();
