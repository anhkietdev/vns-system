import { getLanguage, loadSavedLanguage, onLanguageChange, t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, usePathname, router } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { HapticTab } from "@/components/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Các màn hình không cần đăng nhập
const AUTH_SCREENS = ["signin", "register", "forgot-password", "otp-verification", "new-password"];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [, forceUpdate] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    setIsAuthenticated(!!token);
    return !!token;
  }, []);

  // Kiểm tra auth mỗi khi pathname thay đổi (sau login/logout navigate)
  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  // Kiểm tra lại khi app quay lại foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAuth();
    });
    return () => sub.remove();
  }, [checkAuth]);

  useEffect(() => {
    loadSavedLanguage().then(() => {
      forceUpdate((n) => n + 1);
    });

    const unsubscribe = onLanguageChange(() => {
      forceUpdate((n) => n + 1);
    });

    return unsubscribe;
  }, []);

  // Chưa login + không ở trang auth → chuyển về signin
  useEffect(() => {
    if (isAuthenticated === false) {
      const currentScreen = pathname.replace("/", "");
      if (!AUTH_SCREENS.includes(currentScreen)) {
        router.replace("/signin");
      }
    }
  }, [isAuthenticated]);

  // Ẩn tab bar nếu chưa đăng nhập
  const isOnAuthScreen = AUTH_SCREENS.includes(pathname.replace("/", ""));
  const shouldHideTabBar = !isAuthenticated || isOnAuthScreen;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#008fa0",
        tabBarInactiveTintColor: "#8d95a3",
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: shouldHideTabBar
          ? { display: "none" as const }
          : Platform.select({
              ios: {
                position: "absolute" as const,
                bottom: 20,
                left: 20,
                right: 20,
                height: 70,
                borderRadius: 20,
                backgroundColor: "#fff",
                borderTopWidth: 0,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
              },
              default: {
                height: 64,
                paddingBottom: 8,
                paddingTop: 8,
                backgroundColor: "#fff",
                borderTopWidth: 1,
                borderTopColor: "#f0f2f4",
                elevation: 0,
              },
            }),
      }}
    >
      {/* === MAIN BOTTOM TABS === */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab.home"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="vouchers"
        options={{
          title: t("tab.vouchers"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="pricetag-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("tab.favorites"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="heart-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Lịch",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="document-text-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab.profile"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="person-outline" color={color} />
          ),
        }}
      />

      {/* === HIDDEN SCREENS - accessible via navigation but not in tab bar === */}
      {/* Auth screens */}
      <Tabs.Screen name="signin" options={{ href: null }} />
      <Tabs.Screen name="register" options={{ href: null }} />
      <Tabs.Screen name="forgot-password" options={{ href: null }} />
      <Tabs.Screen name="otp-verification" options={{ href: null }} />
      <Tabs.Screen name="new-password" options={{ href: null }} />

      {/* Service screens */}
      <Tabs.Screen name="tours" options={{ href: null }} />
      <Tabs.Screen name="homestay" options={{ href: null }} />
      <Tabs.Screen name="service-detail" options={{ href: null }} />
      <Tabs.Screen name="destination-detail" options={{ href: null }} />

      {/* Booking & Payment */}
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="booking-detail" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />

      {/* Chat */}
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="chat-detail" options={{ href: null }} />

      {/* Notifications */}
      <Tabs.Screen name="notifications" options={{ href: null }} />

      {/* Profile related */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="security-settings" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />

      {/* Reviews */}
      <Tabs.Screen name="rate-tours" options={{ href: null }} />
      <Tabs.Screen name="review-booking" options={{ href: null }} />
      <Tabs.Screen name="review-history" options={{ href: null }} />

      {/* Recommendations */}
      <Tabs.Screen name="recommendations" options={{ href: null }} />

      {/* Schedule selection */}
      <Tabs.Screen name="schedule-selection" options={{ href: null }} />

      {/* Combo */}
      <Tabs.Screen name="combo" options={{ href: null }} />
      <Tabs.Screen name="combo-booking" options={{ href: null }} />

      {/* Payment result (deep link from VNPay) */}
      <Tabs.Screen name="payment-result" options={{ href: null }} />
      <Tabs.Screen name="topup-result" options={{ href: null }} />
    </Tabs>
  );
}
