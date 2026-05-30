import axios from "axios";
import { API_BASE_URL } from "./config";

class DestinationService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  async getAll() {
    try {
      const response = await this.api.get("/Destination");
      return response.data;
    } catch (error) {
      console.log("GetAllDestinations API error:", error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const response = await this.api.get(`/Destination/${id}`);
      return response.data;
    } catch (error) {
      console.log("GetDestinationById API error:", error);
      throw error;
    }
  }

  async getPopular(count = 10) {
    try {
      const response = await this.api.get("/Destination/popular", {
        params: { count },
      });
      return response.data;
    } catch (error) {
      console.log("GetPopularDestinations API error:", error);
      throw error;
    }
  }
}

export const destinationService = new DestinationService();
