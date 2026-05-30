import axios from "axios";
import { API_BASE_URL } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RecommendedService {
  id: string;
  name: string;
  serviceType: number;
  thumbnailUrl: string | null;
  basePrice: number;
  discountPrice: number | null;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  destinationName: string;
  partnerName: string;
  recommendationScore: number;
  recommendationReason: string;
}

export interface RecommendedDestination {
  id: string;
  name: string;
  province: string;
  imageUrl: string | null;
  description: string | null;
  serviceCount: number;
  recommendationReason: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class RecommendationService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  private async getAuthHeader(): Promise<Record<string, string>> {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch {}
    return {};
  }

  async getPersonalizedRecommendations(
    count: number = 10
  ): Promise<RecommendedService[]> {
    try {
      const headers = await this.getAuthHeader();
      const response = await this.api.get<ApiResponse<RecommendedService[]>>(
        `/Recommendation/personalized?count=${count}`,
        { headers }
      );
      return response.data.data;
    } catch {
      console.log("Lỗi lấy gợi ý cá nhân hóa");
      return [];
    }
  }

  async getTrendingServices(
    count: number = 10
  ): Promise<RecommendedService[]> {
    try {
      const response = await this.api.get<ApiResponse<RecommendedService[]>>(
        `/Recommendation/trending?count=${count}`
      );
      return response.data.data;
    } catch {
      console.log("Lỗi lấy dịch vụ thịnh hành");
      return [];
    }
  }

  async getSimilarServices(
    serviceId: string,
    count: number = 5
  ): Promise<RecommendedService[]> {
    try {
      const response = await this.api.get<ApiResponse<RecommendedService[]>>(
        `/Recommendation/similar/${serviceId}?count=${count}`
      );
      return response.data.data;
    } catch {
      console.log("Lỗi lấy dịch vụ tương tự");
      return [];
    }
  }

  async getRecommendedDestinations(
    count: number = 5
  ): Promise<RecommendedDestination[]> {
    try {
      const headers = await this.getAuthHeader();
      const response = await this.api.get<
        ApiResponse<RecommendedDestination[]>
      >(`/Recommendation/destinations?count=${count}`, { headers });
      return response.data.data;
    } catch {
      console.log("Lỗi lấy điểm đến gợi ý");
      return [];
    }
  }
}

export const recommendationService = new RecommendationService();
