import axios from "axios";
import { API_BASE_URL } from "./config";

class ComboService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  async getActiveCombos() {
    try {
      const response = await this.api.get("/Combo");
      return response.data;
    } catch (error) {
      console.log("GetCombos API error:", error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const response = await this.api.get(`/Combo/${id}`);
      return response.data;
    } catch (error) {
      console.log("GetComboById API error:", error);
      throw error;
    }
  }
}

export const comboService = new ComboService();
