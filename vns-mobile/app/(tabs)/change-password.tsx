import { authService } from "@/api/auth.service";
import { t } from "@/i18n";
import { isPasswordStrongEnough } from "@/utils/registrationValidation";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePasswordChange = (text: string, type: string) => {
    switch (type) {
      case "current":
        setCurrentPassword(text);
        break;
      case "new":
        setNewPassword(text);
        break;
      case "confirm":
        setConfirmPassword(text);
        break;
    }

    // Xóa thông báo lỗi khi người dùng thay đổi input
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    // Reset error message
    setErrorMessage("");

    // Validate các trường bắt buộc
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage(t("changePassword.fillAllFields"));
      return;
    }

    if (!isPasswordStrongEnough(newPassword)) {
      setErrorMessage(t("changePassword.passwordMinLength"));
      return;
    }

    // Validate mật khẩu mới không được giống mật khẩu cũ
    if (newPassword === currentPassword) {
      setErrorMessage(t("changePassword.newPasswordSameAsCurrent"));
      return;
    }

    // Validate mật khẩu mới và xác nhận mật khẩu phải khớp
    if (newPassword !== confirmPassword) {
      setErrorMessage(t("changePassword.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setIsLoading(false);
      Alert.alert(
        t("common.success"),
        t("changePassword.success"),
        [
          {
            text: "OK",
            onPress: () => router.replace("/profile"),
          },
        ]
      );
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(
        error?.response?.data?.message || t("changePassword.fail"),
      );
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.wrapper}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={20} color="#1a2332" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("changePassword.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form */}
        <View style={styles.formContainer}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("changePassword.currentPassword")}</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("changePassword.enterCurrentPassword")}
                placeholderTextColor="#8d95a3"
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={(text) => handlePasswordChange(text, "current")}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#8d95a3"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("changePassword.newPassword")}</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("changePassword.enterNewPassword")}
                placeholderTextColor="#8d95a3"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={(text) => handlePasswordChange(text, "new")}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#8d95a3"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t("changePassword.confirmNewPassword")}</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t("changePassword.enterConfirmNewPassword")}
                placeholderTextColor="#8d95a3"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => handlePasswordChange(text, "confirm")}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#8d95a3"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hiển thị thông báo lỗi hoặc hướng dẫn */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={styles.noteText}>{t("changePassword.passwordNote")}</Text>
          )}

          {/* Nút đổi mật khẩu */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.disabledButton,
              (!currentPassword || !newPassword || !confirmPassword) &&
                styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={
              isLoading || !currentPassword || !newPassword || !confirmPassword
            }
          >
            {isLoading ? (
              <Text style={styles.submitButtonText}>{t("changePassword.processing")}</Text>
            ) : (
              <Text style={styles.submitButtonText}>{t("changePassword.submit")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8ecf0",
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#5a6577",
    marginBottom: 8,
    fontWeight: "500",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    paddingVertical: 0,
    height: 52,
  },
  eyeIcon: {
    padding: 8,
  },
  noteText: {
    fontSize: 12,
    color: "#8d95a3",
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#b0d4d9",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ChangePasswordScreen;
