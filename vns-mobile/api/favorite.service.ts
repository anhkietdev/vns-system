import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

class FavoriteService {
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

  async toggle(serviceId: string) {
    try {
      const response = await this.api.post(`/Favorite/${serviceId}`);
      return response.data;
    } catch (error) {
      console.log("ToggleFavorite API error:", error);
      throw error;
    }
  }

  async getMyFavorites(page = 1, pageSize = 20) {
    try {
      const response = await this.api.get("/Favorite", {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.log("GetMyFavorites API error:", error);
      throw error;
    }
  }
}

export const favoriteService = new FavoriteService();
