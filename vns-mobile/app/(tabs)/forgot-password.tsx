// app/(tabs)/forgot-password.tsx
import { authService } from "@/api/auth.service";
import { t } from "@/i18n";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setEmailError(t("forgotPassword.emailRequired"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t("forgotPassword.emailInvalid"));
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert(
        t("forgotPassword.otpSent"),
        t("forgotPassword.otpSentDesc"),
        [
          {
            text: "OK",
            onPress: () =>
              router.push({
                pathname: "/otp-verification",
                params: { email },
              } as any),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("forgotPassword.otpSendFail"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Image
            source={require("@/assets/images/forgot-password.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Form section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>{t("forgotPassword.title")}</Text>
          <Text style={styles.subtitle}>{t("forgotPassword.subtitle")}</Text>

          <View
            style={[
              styles.inputContainer,
              emailError ? styles.errorInput : null,
            ]}
          >
            <MaterialIcons
              name="email"
              size={20}
              color="#8d95a3"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder={t("forgotPassword.enterEmail")}
              placeholderTextColor="#8d95a3"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleResetPassword}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {t("forgotPassword.sendOtp")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.push("/signin")}
          >
            <Text style={styles.backText}>
              <MaterialIcons name="arrow-back" size={16} color="#008fa0" />{" "}
              {t("forgotPassword.backToLogin")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#008fa0",
  },
  heroSection: {
    height: height * 0.3,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  heroImage: {
    width: 180,
    height: 180,
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
    color: "#1a2332",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#5a6577",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 12,
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
  backLink: {
    marginTop: 24,
    alignSelf: "center",
  },
  backText: {
    color: "#008fa0",
    fontSize: 14,
    fontWeight: "600",
  },
});
