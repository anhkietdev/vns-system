import {
  getLanguage,
  Language,
  loadSavedLanguage,
  onLanguageChange,
  setLanguage,
  t,
} from "@/i18n";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ProfileScreen = () => {
  const [userName, setUserName] = useState("Người dùng");
  const [userEmail, setUserEmail] = useState("");
  const [currentLang, setCurrentLang] = useState<Language>(getLanguage());
  const [, forceUpdate] = useState(0);

  const loadUserData = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.fullName || "Người dùng");
        setUserEmail(user.email || "");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  useEffect(() => {
    loadSavedLanguage().then((lang) => {
      setCurrentLang(lang);
    });

    const unsubscribe = onLanguageChange((lang) => {
      setCurrentLang(lang);
      forceUpdate((n) => n + 1);
    });

    return unsubscribe;
  }, []);

  const handleToggleLanguage = async () => {
    const newLang: Language = currentLang === "vi" ? "en" : "vi";
    await setLanguage(newLang);
  };

  const handleLogout = async () => {
    try {
      // Clear all auth data from AsyncStorage
      await AsyncStorage.multiRemove([
        "token",
        "accessToken",
        "refreshToken",
        "user",
      ]);
      router.replace("/signin");
    } catch (error) {
      console.error("Error during logout:", error);
      // Navigate anyway even if clearing storage fails
      router.replace("/signin");
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEditProfile = () => {
    router.push("/edit-profile");
  };

  const handleSecuritySettings = () => {
    router.push("/security-settings");
  };

  const handleWallet = () => {
    router.push("/wallet");
  };

  const handleReviewHistory = () => {
    router.push("/review-history");
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar Hero Card */}
        <View style={styles.avatarSection}>
          <Image
            source={require("@/assets/images/user.jpg")}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleEditProfile}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={styles.editProfileText}>{t("profile.editTitle")}</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {/* Language */}
          <TouchableOpacity style={styles.menuItem} onPress={handleToggleLanguage}>
            <View style={[styles.menuIcon, { backgroundColor: "#E3F2FD" }]}>
              <Text style={styles.flagIcon}>
                {currentLang === "vi" ? "\u{1F1FB}\u{1F1F3}" : "\u{1F1EC}\u{1F1E7}"}
              </Text>
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>
                {currentLang === "vi" ? "Tiếng Việt" : "English"}
              </Text>
              <Text style={styles.menuSub}>{t("profile.languageDesc")}</Text>
            </View>
            <View style={styles.languageToggle}>
              <Text style={styles.languageToggleText}>
                {currentLang === "vi" ? "VI" : "EN"}
              </Text>
              <MaterialIcons name="swap-horiz" size={18} color="#008fa0" />
            </View>
          </TouchableOpacity>

          {/* Wallet VNS */}
          <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
            <View style={[styles.menuIcon, { backgroundColor: "#E0F7FA" }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#008fa0" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Ví VNS</Text>
              <Text style={styles.menuSub}>Quản lý số dư và giao dịch</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#8d95a3" />
          </TouchableOpacity>

          {/* Review History */}
          <TouchableOpacity style={styles.menuItem} onPress={handleReviewHistory}>
            <View style={[styles.menuIcon, { backgroundColor: "#FFF3E0" }]}>
              <MaterialIcons name="rate-review" size={20} color="#F57C00" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Lịch sử đánh giá</Text>
              <Text style={styles.menuSub}>Xem lại đánh giá của bạn</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#8d95a3" />
          </TouchableOpacity>

          {/* Security Settings */}
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleSecuritySettings}>
            <View style={[styles.menuIcon, { backgroundColor: "#EDE7F6" }]}>
              <Feather name="lock" size={18} color="#673AB7" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t("profile.securitySettings")}</Text>
              <Text style={styles.menuSub}>{t("profile.securityDesc")}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#8d95a3" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>{t("profile.logout")}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
  },
  container: {
    flex: 1,
  },
  avatarSection: {
    backgroundColor: "#008fa0",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 14,
    gap: 6,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },
  menuSub: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 2,
  },
  flagIcon: {
    fontSize: 20,
  },
  languageToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f5f7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  languageToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#008fa0",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#dc2626",
  },
});

export default ProfileScreen;
