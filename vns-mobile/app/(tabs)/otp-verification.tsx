import { authService } from "@/api/auth.service";
import { t } from "@/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

const OTPVerificationScreen = () => {
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(90); // 1:30 timer
  const [isLoading, setIsLoading] = useState(false);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  // Auto focus next input and handle OTP change
  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto focus next input
    if (text && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async () => {
    if (otp.some((digit) => digit === "")) {
      Alert.alert(t("common.error"), t("otp.enterFullOtp"));
      return;
    }
    setIsLoading(true);
    try {
      const otpCode = otp.join("");
      const response = await authService.verifyOtp(email, otpCode);
      router.push({
        pathname: "/new-password",
        params: { email, resetToken: response.token },
      } as any);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error?.response?.data?.message || t("otp.invalidOtp"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    try {
      await authService.forgotPassword(email);
      setTimer(90);
      Alert.alert(t("common.success"), t("otp.resendSuccess"));
    } catch (error: any) {
      Alert.alert(t("common.error"), t("otp.resendFail"));
    }
  };

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>{">"}</Text>
          </View>
        </View>

        {/* Form section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>{t("otp.title")}</Text>
          <Text style={styles.subtitle}>
            {t("otp.subtitle")}{" "}
            <Text style={styles.email}>{email || t("otp.yourEmail")}</Text> {t("otp.subtitleSuffix")}
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                ref={(ref) => {
                  if (ref && inputsRef.current) {
                    inputsRef.current[index] = ref;
                  }
                }}
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity style={[styles.button, isLoading && { opacity: 0.7 }]} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t("otp.verify")}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {t("otp.resendAfter")} {Math.floor(timer / 60)}:
              {timer % 60 < 10 ? `0${timer % 60}` : timer % 60}
            </Text>
            {timer === 0 && (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>{t("otp.resend")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#008fa0",
  },
  heroSection: {
    height: height * 0.28,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  heroIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroIcon: {
    fontSize: 40,
    color: "#FFF",
    fontWeight: "700",
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#5a6577",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  email: {
    fontWeight: "700",
    color: "#1a2332",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    color: "#1a2332",
  },
  otpInputFilled: {
    backgroundColor: "#e8f5f6",
    borderWidth: 1,
    borderColor: "#008fa0",
  },
  button: {
    backgroundColor: "#008fa0",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    color: "#5a6577",
    fontSize: 14,
    marginRight: 8,
  },
  resendLink: {
    color: "#008fa0",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default OTPVerificationScreen;
