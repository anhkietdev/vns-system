import axios from "axios";
import { API_BASE_URL } from "./config";

export interface IServiceFilter {
  keyword?: string;
  serviceType?: number;
  destinationId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

class ServiceService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  async getAll(filter: IServiceFilter = {}) {
    try {
      const params = {
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
        ...(filter.keyword && { keyword: filter.keyword }),
        ...(filter.serviceType !== undefined && { serviceType: filter.serviceType }),
        ...(filter.destinationId && { destinationId: filter.destinationId }),
        ...(filter.minPrice !== undefined && { minPrice: filter.minPrice }),
        ...(filter.maxPrice !== undefined && { maxPrice: filter.maxPrice }),
        ...(filter.minRating !== undefined && { minRating: filter.minRating }),
        ...(filter.date && { date: filter.date }),
        ...(filter.startDate && { startDate: filter.startDate }),
        ...(filter.endDate && { endDate: filter.endDate }),
        ...(filter.sortBy && { sortBy: filter.sortBy }),
      };
      const response = await this.api.get("/Service", { params });
      return response.data;
    } catch (error) {
      console.log("GetServices API error:", error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const response = await this.api.get(`/Service/${id}`);
      return response.data;
    } catch (error) {
      console.log("GetServiceById API error:", error);
      throw error;
    }
  }

  async search(keyword: string, page = 1, pageSize = 10) {
    try {
      const response = await this.api.get("/Service/search", {
        params: { keyword, page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.log("SearchServices API error:", error);
      throw error;
    }
  }

  async getPopular(count = 10) {
    try {
      const response = await this.api.get("/Service/popular", {
        params: { count },
      });
      return response.data;
    } catch (error) {
      console.log("GetPopularServices API error:", error);
      throw error;
    }
  }

  async getNearby(lat: number, lng: number, radiusKm = 50) {
    try {
      const response = await this.api.get("/Service/nearby", {
        params: { lat, lng, radiusKm },
      });
      return response.data;
    } catch (error) {
      console.log("GetNearbyServices API error:", error);
      throw error;
    }
  }
}

export const serviceService = new ServiceService();
