// app/(tabs)/new-password.tsx
import { authService } from "@/api/auth.service";
import { t } from "@/i18n";
import { isPasswordStrongEnough } from "@/utils/registrationValidation";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function NewPasswordScreen() {
  const params = useLocalSearchParams<{ email: string; resetToken: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (
    text: string,
    field: "password" | "confirm"
  ) => {
    if (field === "password") {
      setPassword(text);
      setPasswordError("");
    } else {
      setConfirmPassword(text);
      setConfirmError("");
    }
  };

  const handleSubmit = async () => {
    let isValid = true;

    if (!password) {
      setPasswordError(t("newPassword.passwordRequired"));
      isValid = false;
    } else if (!isPasswordStrongEnough(password)) {
      setPasswordError(t("newPassword.passwordMinLength"));
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmError(t("newPassword.confirmRequired"));
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmError(t("newPassword.passwordMismatch"));
      isValid = false;
    }

    if (isValid) {
      setIsLoading(true);
      try {
        await authService.resetPassword(params.email || "", password);
        Alert.alert(t("common.success"), t("newPassword.success"), [
          {
            text: "OK",
            onPress: () => router.replace("/signin"),
          },
        ]);
      } catch (error: any) {
        Alert.alert(
          t("common.error"),
          error?.response?.data?.message || t("newPassword.fail"),
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Image
            source={require("@/assets/images/logo.jpg")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
        </View>

        {/* Form section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>{t("newPassword.title")}</Text>
          <Text style={styles.subtitle}>
            {t("newPassword.subtitle")}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t("newPassword.label")}</Text>
            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.errorInput : null,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder={t("newPassword.enterPassword")}
                placeholderTextColor="#8d95a3"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => handlePasswordChange(text, "password")}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#8d95a3"
                />
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t("newPassword.confirmLabel")}</Text>
            <View
              style={[
                styles.inputContainer,
                confirmError ? styles.errorInput : null,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder={t("newPassword.enterConfirmPassword")}
                placeholderTextColor="#8d95a3"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => handlePasswordChange(text, "confirm")}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#8d95a3"
                />
              </TouchableOpacity>
            </View>
            {confirmError && <Text style={styles.errorText}>{confirmError}</Text>}
          </View>

          <TouchableOpacity style={[styles.button, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t("newPassword.submit")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#008fa0",
  },
  heroSection: {
    height: height * 0.25,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  heroLogo: {
    width: 140,
    height: 80,
    tintColor: "#FFF",
  },
  formSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#1a2332",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5a6577",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1a2332",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
  },
  eyeIcon: {
    padding: 8,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  button: {
    backgroundColor: "#008fa0",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
