import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export interface ItineraryFilter {
  period?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

class ItineraryService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
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

  async getTimeline(filter: ItineraryFilter = {}) {
    try {
      const response = await this.api.get("/Itinerary/timeline", {
        params: {
          page: filter.page ?? 1,
          pageSize: filter.pageSize ?? 50,
          ...(filter.period && { period: filter.period }),
          ...(filter.fromDate && { fromDate: filter.fromDate }),
          ...(filter.toDate && { toDate: filter.toDate }),
          ...(filter.status && { status: filter.status }),
        },
      });
      return response.data;
    } catch (error) {
      console.log("GetTimeline API error:", error);
      throw error;
    }
  }

  async getTripDetail(tripId: string) {
    try {
      const response = await this.api.get(`/Itinerary/trips/${tripId}`);
      return response.data;
    } catch (error) {
      console.log("GetTripDetail API error:", error);
      throw error;
    }
  }

  async getUpcoming() {
    try {
      const response = await this.api.get("/Itinerary/upcoming");
      return response.data;
    } catch (error) {
      console.log("GetUpcoming API error:", error);
      throw error;
    }
  }

  async cancelBooking(bookingId: string, reason?: string) {
    try {
      const response = await this.api.post(
        `/Itinerary/bookings/${bookingId}/cancel`,
        { reason: reason ?? "" }
      );
      return response.data;
    } catch (error) {
      console.log("CancelBookingFromItinerary API error:", error);
      throw error;
    }
  }
}

export const itineraryService = new ItineraryService();
