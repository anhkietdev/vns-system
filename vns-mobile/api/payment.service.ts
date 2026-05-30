import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

class PaymentService {
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
    this.api.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error?.response?.status === 401) {
          await AsyncStorage.multiRemove(["token", "accessToken", "user"]);
        }
        return Promise.reject(error);
      }
    );
  }

  async createVnPayUrl(bookingId: string) {
    try {
      const response = await this.api.post(`/Payment/vnpay/${bookingId}`);
      return response.data;
    } catch (error) {
      console.log("CreateVnPayUrl API error:", error);
      throw error;
    }
  }

  async payWithWallet(bookingId: string) {
    try {
      const response = await this.api.post(`/Payment/wallet/${bookingId}`);
      return response.data;
    } catch (error) {
      console.log("PayWithWallet API error:", error);
      throw error;
    }
  }

  // Gọi backend xác nhận VNPay payment bằng query params từ redirect URL
  async confirmVnPay(vnpParams: Record<string, string>) {
    try {
      const response = await this.api.post("/Payment/confirm-vnpay", vnpParams);
      return response.data;
    } catch (error) {
      console.log("ConfirmVnPay API error:", error);
      throw error;
    }
  }

  // Gọi backend xác nhận VNPay bằng raw query string (bọc trong JSON)
  async confirmVnPayRaw(rawQueryString: string) {
    try {
      const response = await this.api.post("/Payment/confirm-vnpay-raw", {
        queryString: rawQueryString,
      });
      return response.data;
    } catch (error) {
      console.log("ConfirmVnPayRaw API error:", error);
      throw error;
    }
  }

  async payCombined(bookingId: string, walletAmount: number) {
    try {
      const response = await this.api.post(
        `/Payment/combined/${bookingId}`,
        null,
        { params: { walletAmount } },
      );
      return response.data;
    } catch (error) {
      console.log("PayCombined API error:", error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
