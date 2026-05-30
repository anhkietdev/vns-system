// app/(tabs)/register.tsx
import { authService } from "@/api/auth.service";
import { useAppSnackbar } from "@/components/feedback/AppFeedbackProvider";
import { t } from "@/i18n";
import { normalizeError } from "@/utils/normalizeError";
import { validateRegistrationValues } from "@/utils/registrationValidation";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

export default function RegisterScreen() {
  const showSnackbar = useAppSnackbar();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (text: string, field: "password" | "confirm") => {
    if (field === "password") {
      setPassword(text);
      if (text.length === 0) {
        setPasswordError("");
      }
      if (confirmError) {
        setConfirmError("");
      }
      return;
    }

    setConfirmPassword(text);
    setConfirmError("");
  };

  const handleRegister = async () => {
    setFullNameError("");
    setEmailError("");
    setPhoneError("");
    setPasswordError("");
    setConfirmError("");

    const validationErrors = validateRegistrationValues({
      fullName,
      email,
      phoneNumber: phone,
      password,
      confirmPassword,
    });

    setFullNameError(validationErrors.fullName || "");
    setEmailError(validationErrors.email || "");
    setPhoneError(validationErrors.phoneNumber || "");
    setPasswordError(validationErrors.password || "");
    setConfirmError(validationErrors.confirmPassword || "");

    if (Object.keys(validationErrors).length > 0) {
      showSnackbar({
        title: t("common.warning"),
        message: t("validation.fixHighlightedFields"),
        tone: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phone.replace(/\s/g, "").trim(),
      });

      showSnackbar({
        title: t("common.success"),
        message: t("auth.registerSuccess"),
        tone: "success",
      });
      router.replace("/signin");
    } catch (error) {
      const normalized = normalizeError(error);
      showSnackbar({
        title: normalized.title || t("common.error"),
        message: normalized.message || t("auth.registerFail"),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string,
    onChange: (text: string) => void,
    error: string,
    placeholder: string,
    opts?: { secure?: boolean; toggle?: () => void; showPw?: boolean; keyboard?: any }
  ) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <Ionicons name={icon} size={20} color={error ? "#dc2626" : "#8d95a3"} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#b0b8c1"
          value={value}
          onChangeText={onChange}
          secureTextEntry={opts?.secure && !opts?.showPw}
          keyboardType={opts?.keyboard || "default"}
          autoCapitalize="none"
        />
        {opts?.toggle && (
          <TouchableOpacity onPress={opts.toggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={opts.showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#8d95a3" />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#008fa0" />

      <View style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Image source={require("@/assets/images/danang.jpg")} style={styles.heroBg} resizeMode="cover" />
        <View style={styles.heroContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>{t("auth.createAccount")}</Text>
          <Text style={styles.heroSub}>VNS Travel & Booking</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formSection}>
        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, styles.stepActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </View>

          {renderField("person-outline", t("auth.fullName"), fullName, (text) => {
            setFullName(text);
            setFullNameError("");
          }, fullNameError, t("auth.enterFullName"))}
          {renderField("mail-outline", t("auth.email"), email, (text) => {
            setEmail(text);
            setEmailError("");
          }, emailError, t("auth.enterEmail"), { keyboard: "email-address" })}
          {renderField("call-outline", t("auth.phone"), phone, (text) => {
            setPhone(text);
            setPhoneError("");
          }, phoneError, t("auth.enterPhone"), { keyboard: "phone-pad" })}
          {renderField("lock-closed-outline", t("auth.password"), password, (text) => handlePasswordChange(text, "password"), passwordError, t("auth.enterPassword"), {
            secure: true,
            toggle: () => setShowPassword(!showPassword),
            showPw: showPassword,
          })}
          {!passwordError ? (
            <Text style={styles.helperText}>{t("validation.passwordMin")}</Text>
          ) : null}
          {renderField("shield-checkmark-outline", t("auth.confirmPassword"), confirmPassword, (text) => handlePasswordChange(text, "confirm"), confirmError, t("auth.enterConfirmPassword"), {
            secure: true,
            toggle: () => setShowConfirmPassword(!showConfirmPassword),
            showPw: showConfirmPassword,
          })}

          <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("auth.createAccount")}</Text>}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{t("auth.hasAccount")}</Text>
            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text style={styles.bottomLink}> {t("auth.signin")}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  hero: { height: "22%", position: "relative", overflow: "hidden" },
  heroBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,143,160,0.75)", zIndex: 1 },
  heroContent: { ...StyleSheet.absoluteFillObject, zIndex: 2, justifyContent: "flex-end", paddingHorizontal: 24, paddingBottom: 36 },
  backBtn: { position: "absolute", top: Platform.OS === "ios" ? 56 : 44, left: 20, zIndex: 3, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: "500" },

  formSection: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, zIndex: 10 },
  formScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },

  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#e8ecf0" },
  stepActive: { backgroundColor: "#008fa0" },
  stepLine: { width: 40, height: 2, backgroundColor: "#e8ecf0", marginHorizontal: 4 },

  fieldWrap: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#1a2332", marginBottom: 8, marginTop: 14 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f4f6f8", borderRadius: 12, paddingHorizontal: 14, height: 52, gap: 10 },
  inputRowError: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5" },
  input: { flex: 1, fontSize: 15, color: "#1a2332", paddingVertical: 0 },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 4, fontWeight: "500" },
  helperText: { color: "#8d95a3", fontSize: 12, marginTop: 4, marginBottom: 6 },

  btn: { backgroundColor: "#008fa0", height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },

  bottomRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  bottomText: { fontSize: 14, color: "#5a6577" },
  bottomLink: { fontSize: 14, color: "#008fa0", fontWeight: "700" },
});
