import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export interface IApplyVoucherData {
  code: string;
  orderAmount: number;
  serviceType?: number;
}

class VoucherService {
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

  async getActiveVouchers() {
    try {
      const response = await this.api.get("/Voucher/active");
      return response.data;
    } catch (error) {
      console.log("GetActiveVouchers API error:", error);
      throw error;
    }
  }

  async applyVoucher(data: IApplyVoucherData) {
    try {
      const response = await this.api.post("/Voucher/apply", data);
      return response.data;
    } catch (error) {
      console.log("ApplyVoucher API error:", error);
      throw error;
    }
  }
}

export const voucherService = new VoucherService();
