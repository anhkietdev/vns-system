import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

class WalletService {
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

  async getWallet() {
    try {
      const response = await this.api.get("/Wallet");
      return response.data;
    } catch (error) {
      console.log("GetWallet API error:", error);
      throw error;
    }
  }

  async getTransactions(page = 1, pageSize = 20) {
    try {
      const response = await this.api.get("/Wallet/transactions", {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.log("GetTransactions API error:", error);
      throw error;
    }
  }

  async topUp(amount: number) {
    try {
      const response = await this.api.post("/Wallet/topup", { amount });
      return response.data;
    } catch (error) {
      console.log("TopUp API error:", error);
      throw error;
    }
  }

  async confirmTopUpRaw(rawQuery: string) {
    try {
      const response = await this.api.post("/Wallet/confirm-topup-raw", { rawQuery });
      return response.data;
    } catch (error) {
      console.log("ConfirmTopUpRaw API error:", error);
      throw error;
    }
  }
}

export const walletService = new WalletService();
