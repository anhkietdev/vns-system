import { t } from "@/i18n";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SecuritySettingsScreen = () => {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    const loadBiometricSetting = async () => {
      try {
        const value = await AsyncStorage.getItem("biometricEnabled");
        if (value !== null) {
          setIsBiometricEnabled(value === "true");
        }
      } catch (error) {
        console.error("Error loading biometric setting:", error);
      }
    };
    loadBiometricSetting();
  }, []);

  const handleChangePassword = () => {
    router.push("/change-password");
  };

  const handleBiometricToggle = async (newValue: boolean) => {
    setIsBiometricEnabled(newValue);
    try {
      await AsyncStorage.setItem("biometricEnabled", String(newValue));
    } catch (error) {
      console.error("Error saving biometric setting:", error);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <MaterialIcons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("security.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Bảo mật */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("security.sectionTitle")}</Text>

          {/* Đổi mật khẩu */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePassword}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: "#FFF3E0" }]}>
                <Feather name="lock" size={18} color="#FF7043" />
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{t("security.changePassword")}</Text>
                <Text style={styles.itemSubtitle}>{t("security.changePasswordDesc")}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#8d95a3" />
          </TouchableOpacity>

          {/* Xác thực sinh trắc học */}
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: "#E8F5E9" }]}>
                <Feather name="user" size={18} color="#16a34a" />
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{t("security.faceAuth")}</Text>
                <Text style={styles.itemSubtitle}>
                  {isBiometricEnabled ? t("security.enabled") : t("security.disabled")}
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: "#e8ecf0", true: "#008fa0" }}
              thumbColor={isBiometricEnabled ? "#fff" : "#f4f6f8"}
            />
          </View>
        </View>

        {/* Thông tin phiên bản */}
        <View style={styles.versionSection}>
          <Image
            source={require("@/assets/images/logo.jpg")}
            style={styles.logo}
          />
          <Text style={styles.versionText}>{t("security.appVersion")}: 1.0.0</Text>
        </View>
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
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8d95a3",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f6f8",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    color: "#1a2332",
    fontWeight: "600",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 2,
  },
  versionSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 13,
    color: "#8d95a3",
  },
});

export default SecuritySettingsScreen;
