// i18n/index.ts - Hệ thống đa ngôn ngữ đơn giản
// Gói cần cài: @react-native-async-storage/async-storage
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en";
import vi from "./vi";

export type Language = "vi" | "en";

const LANGUAGE_KEY = "VNS_LANGUAGE";

let currentLang: Language = "vi";
const translations: Record<Language, Record<string, string>> = { vi, en };

// Danh sách các listener để thông báo khi ngôn ngữ thay đổi
type LanguageListener = (lang: Language) => void;
const listeners: LanguageListener[] = [];

/**
 * Lấy bản dịch theo key
 */
export const t = (key: string): string => {
  return translations[currentLang][key] || key;
};

/**
 * Đổi ngôn ngữ và lưu vào AsyncStorage
 */
export const setLanguage = async (lang: Language): Promise<void> => {
  currentLang = lang;
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.log("Lỗi lưu ngôn ngữ:", error);
  }
  // Thông báo cho tất cả listener
  listeners.forEach((listener) => listener(lang));
};

/**
 * Lấy ngôn ngữ hiện tại
 */
export const getLanguage = (): Language => currentLang;

/**
 * Tải ngôn ngữ đã lưu từ AsyncStorage
 */
export const loadSavedLanguage = async (): Promise<Language> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === "vi" || saved === "en") {
      currentLang = saved;
    }
  } catch (error) {
    console.log("Lỗi tải ngôn ngữ:", error);
  }
  return currentLang;
};

/**
 * Đăng ký listener khi ngôn ngữ thay đổi
 * Trả về hàm unsubscribe
 */
export const onLanguageChange = (listener: LanguageListener): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};
