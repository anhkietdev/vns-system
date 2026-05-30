import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

class NotificationService {
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

    // Xử lý 401 - token hết hạn, xoá token để user đăng nhập lại
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("accessToken");
        }
        return Promise.reject(error);
      }
    );
  }

  private async hasToken(): Promise<boolean> {
    const token = await AsyncStorage.getItem("token");
    return !!token;
  }

  async getAll(page = 1, pageSize = 20) {
    try {
      if (!(await this.hasToken())) {
        return { success: true, data: { items: [] } };
      }
      const response = await this.api.get("/Notification", {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        return { success: true, data: { items: [] } };
      }
      console.log("GetNotifications API error:", error);
      throw error;
    }
  }

  async getUnreadCount() {
    try {
      if (!(await this.hasToken())) {
        return { success: true, data: 0 };
      }
      const response = await this.api.get("/Notification/unread-count");
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        return { success: true, data: 0 };
      }
      console.log("GetUnreadCount API error:", error);
      throw error;
    }
  }

  async markAsRead(id: string) {
    try {
      const response = await this.api.put(`/Notification/${id}/read`);
      return response.data;
    } catch (error) {
      console.log("MarkAsRead API error:", error);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      const response = await this.api.put("/Notification/read-all");
      return response.data;
    } catch (error) {
      console.log("MarkAllAsRead API error:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
