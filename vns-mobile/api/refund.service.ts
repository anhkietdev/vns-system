import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

class RefundService {
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

  async getMyRequests() {
    try {
      const response = await this.api.get("/Refund/my-requests");
      return response.data;
    } catch (error) {
      console.log("GetMyRefundRequests API error:", error);
      throw error;
    }
  }
}

export const refundService = new RefundService();
