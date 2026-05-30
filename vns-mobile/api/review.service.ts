import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export interface ICreateReviewData {
  bookingId: string;
  rating: number;
  comment?: string;
  images?: { uri: string; name: string; type: string }[];
}

class ReviewService {
  private api = axios.create({
    baseURL: API_BASE_URL,
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

  async createReview(data: ICreateReviewData) {
    try {
      // Nếu không có hình → dùng endpoint JSON đơn giản (tránh vấn đề multipart trên RN)
      if (!data.images || data.images.length === 0) {
        const response = await this.api.post(
          "/Review/text",
          {
            bookingId: data.bookingId,
            rating: data.rating,
            comment: data.comment || null,
          },
          { headers: { "Content-Type": "application/json" } }
        );
        return response.data;
      }

      // Có hình → dùng multipart
      const formData = new FormData();
      formData.append("bookingId", data.bookingId);
      formData.append("rating", data.rating.toString());
      if (data.comment) {
        formData.append("comment", data.comment);
      }
      data.images.forEach((image) => {
        formData.append("images", {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);
      });
      const response = await this.api.post("/Review", formData, {
        transformRequest: (d) => d,
      });
      return response.data;
    } catch (error) {
      console.log("CreateReview API error:", error);
      throw error;
    }
  }

  async getServiceReviews(
    serviceId: string,
    page = 1,
    pageSize = 10,
    sortBy?: string,
  ) {
    try {
      const response = await this.api.get(`/Review/service/${serviceId}`, {
        params: { page, pageSize, ...(sortBy && { sortBy }) },
      });
      return response.data;
    } catch (error) {
      console.log("GetServiceReviews API error:", error);
      throw error;
    }
  }

  async getMyReviews() {
    try {
      const response = await this.api.get("/Review/my-reviews");
      return response.data;
    } catch (error) {
      console.log("GetMyReviews API error:", error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
