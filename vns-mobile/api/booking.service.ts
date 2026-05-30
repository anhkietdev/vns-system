import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export interface ICreateBookingData {
  serviceId: string;
  numberOfGuests: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests?: string;
  checkInDate?: string;
  checkOutDate?: string;
  voucherCode?: string;
  paymentMethod?: number;
  details: IBookingDetailItem[];
  comboId?: string;
  comboName?: string;
  comboQuoteId?: string;
  comboSelections?: IComboBookingSelection[];
  idempotencyKey?: string;
}

export interface ICreateComboQuoteData {
  comboId: string;
  numberOfGuests: number;
  checkInDate?: string;
  checkOutDate?: string;
  tourScheduleId?: string;
  roomId?: string;
  tierSelections?: { tourPricingTierId: string; quantity: number }[];
}

export interface IBookingDetailItem {
  roomId?: string;
  tourScheduleId?: string;
  tourPricingTierId?: string;
  quantity: number;
}

export interface IComboBookingSelection {
  comboItemId?: string;
  serviceId: string;
  roomId?: string;
  tourScheduleId?: string;
  tourPricingTierId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  quantity: number;
}

export interface IBookingFilter {
  status?: number;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

class BookingService {
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

  async getScheduleAvailability(scheduleId: string) {
    try {
      const response = await this.api.get(`/Booking/schedule-availability/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.log("GetScheduleAvailability API error:", error);
      throw error;
    }
  }

  async createBooking(data: ICreateBookingData) {
    try {
      const response = await this.api.post("/Booking", data);
      return response.data;
    } catch (error) {
      console.log("CreateBooking API error:", error);
      throw error;
    }
  }

  async createComboQuote(data: ICreateComboQuoteData) {
    try {
      const response = await this.api.post("/Booking/combo-quote", data);
      return response.data;
    } catch (error) {
      console.log("CreateComboQuote API error:", error);
      throw error;
    }
  }

  async getMyBookings(filter: IBookingFilter = {}) {
    try {
      const params = {
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
        ...(filter.status !== undefined && { status: filter.status }),
        ...(filter.fromDate && { fromDate: filter.fromDate }),
        ...(filter.toDate && { toDate: filter.toDate }),
        ...(filter.keyword && { keyword: filter.keyword }),
      };
      const response = await this.api.get("/Booking", { params });
      return response.data;
    } catch (error) {
      console.log("GetMyBookings API error:", error);
      throw error;
    }
  }

  async getBookingById(id: string) {
    try {
      const response = await this.api.get(`/Booking/${id}`);
      return response.data;
    } catch (error) {
      console.log("GetBookingById API error:", error);
      throw error;
    }
  }

  async cancelBooking(id: string, reason?: string) {
    try {
      const response = await this.api.put(`/Booking/${id}/cancel`, {
        reason: reason ?? "",
      });
      return response.data;
    } catch (error) {
      console.log("CancelBooking API error:", error);
      throw error;
    }
  }
}

export const bookingService = new BookingService();
