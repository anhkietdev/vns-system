// app/(tabs)/signin.tsx
import { t } from "@/i18n";
import { authService } from "@/api/auth.service";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError("");
  };

  const handleLogin = async () => {
    let isValid = true;

    if (!email) {
      setEmailError(t("validation.emailRequired"));
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t("validation.emailInvalid"));
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError(t("validation.passwordRequired"));
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (isValid) {
      setIsLoading(true);
      try {
        const response = await authService.login({ email, password });
        await AsyncStorage.setItem("token", response.token);
        await AsyncStorage.setItem("accessToken", response.token);
        if (response.user) {
          await AsyncStorage.setItem("user", JSON.stringify(response.user));
        }
        router.replace("/");
      } catch (error: any) {
        Alert.alert(
          t("auth.loginFailTitle"),
          error?.message || t("auth.loginFail"),
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#008fa0" />

      <View style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Image
          source={require("@/assets/images/halong.jpg")}
          style={styles.heroBg}
          resizeMode="cover"
        />
        <View style={styles.heroContent}>
          <Image
            source={require("@/assets/images/logo.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>VNS Travel</Text>
          <Text style={styles.heroSub}>
            {t("auth.signin")}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formSection}
      >
        <ScrollView
          contentContainerStyle={styles.formScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.label}>{t("auth.email")}</Text>
          <View style={[styles.inputRow, emailError && styles.inputRowError]}>
            <Ionicons name="mail-outline" size={20} color="#8d95a3" />
            <TextInput
              style={styles.input}
              placeholder={t("auth.enterEmail")}
              placeholderTextColor="#b0b8c1"
              value={email}
              onChangeText={(text) => { setEmail(text); setEmailError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <Text style={styles.label}>{t("auth.password")}</Text>
          <View style={[styles.inputRow, passwordError && styles.inputRowError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#8d95a3" />
            <TextInput
              style={styles.input}
              placeholder={t("auth.enterPassword")}
              placeholderTextColor="#b0b8c1"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8d95a3" />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <TouchableOpacity style={styles.forgotRow} onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t("auth.signin")}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{t("auth.noAccount")}</Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.bottomLink}> {t("auth.signup")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },

  hero: {
    height: "35%",
    position: "relative",
    overflow: "hidden",
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 143, 160, 0.75)",
    zIndex: 1,
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  heroSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "500",
  },

  formSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    zIndex: 10,
  },
  formScroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a2332",
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputRowError: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    paddingVertical: 0,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },

  forgotRow: {
    alignSelf: "flex-end",
    marginTop: 12,
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 13,
    color: "#008fa0",
    fontWeight: "600",
  },

  btn: {
    backgroundColor: "#008fa0",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8ecf0",
  },
  dividerText: {
    fontSize: 13,
    color: "#8d95a3",
    fontWeight: "500",
  },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e8ecf0",
    gap: 10,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a2332",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  bottomText: {
    fontSize: 14,
    color: "#5a6577",
  },
  bottomLink: {
    fontSize: 14,
    color: "#008fa0",
    fontWeight: "700",
  },
});
