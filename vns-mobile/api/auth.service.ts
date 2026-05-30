import axios from "axios";
import { API_BASE_URL } from "./config";

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: number;
  partnerId?: string;
}

export interface IAuthResponse {
  success: boolean;
  token: string;
  message: string;
  user: IAuthUser;
}

export interface IRegisterData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

type ApiError = Error & {
  status?: number;
  payload?: unknown;
  details?: string[];
};

function buildApiError(error: any, fallbackMessage: string): ApiError {
  const apiError = new Error(
    error?.response?.data?.message ||
      error?.response?.data?.title ||
      fallbackMessage
  ) as ApiError;

  apiError.status = error?.response?.status;
  apiError.payload = error?.response?.data;

  const fieldErrors = error?.response?.data?.errors as
    | Record<string, unknown[]>
    | undefined;
  apiError.details = fieldErrors
    ? Object.values(fieldErrors)
        .flat()
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  return apiError;
}

class AuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  async login(credentials: ILoginCredentials): Promise<IAuthResponse> {
    try {
      const response = await this.api.post("/auth/login", credentials);
      return response.data.data || response.data;
    } catch (error: any) {
      throw buildApiError(error, "Dang nhap that bai");
    }
  }

  async register(data: IRegisterData): Promise<IAuthResponse> {
    try {
      const response = await this.api.post("/auth/register", data);
      return response.data.data || response.data;
    } catch (error: any) {
      throw buildApiError(error, "Dang ky that bai");
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await this.api.post("/auth/forgot-password", { email });
    } catch (error: any) {
      throw buildApiError(error, "Gui OTP that bai");
    }
  }

  async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
    try {
      const response = await this.api.post("/auth/verify-otp", { email, otp });
      return response.data.data || response.data;
    } catch (error: any) {
      throw buildApiError(error, "Xac minh OTP that bai");
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<void> {
    try {
      await this.api.post("/auth/reset-password", { email, newPassword });
    } catch (error: any) {
      throw buildApiError(error, "Dat lai mat khau that bai");
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const token = await AsyncStorage.getItem("token");

      await this.api.put(
        "/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error: any) {
      throw buildApiError(error, "Doi mat khau that bai");
    }
  }

  async logout(): Promise<void> {
    // Client-side logout - clear AsyncStorage
  }
}

export const authService = new AuthService();
