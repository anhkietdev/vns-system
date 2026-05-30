import { t } from "@/i18n";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const EditProfileScreen = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [includePhone, setIncludePhone] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/300");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          // Split fullName into first/last name
          if (user.fullName) {
            const parts = user.fullName.trim().split(/\s+/);
            if (parts.length > 1) {
              setLastName(parts[0]);
              setFirstName(parts.slice(1).join(" "));
            } else {
              setFirstName(parts[0]);
              setLastName("");
            }
          }
          if (user.email) {
            setEmail(user.email);
          }
          if (user.phoneNumber) {
            setPhoneNumber(user.phoneNumber);
          }
          if (user.avatar) {
            setAvatar(user.avatar);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  // Hàm validate số điện thoại Việt Nam
  const validatePhoneNumber = (phone: string) => {
    // Xóa tất cả ký tự không phải số
    const cleaned = phone.replace(/[^\d]/g, "");

    // Kiểm tra độ dài (10 số cho số Việt Nam)
    if (cleaned.length === 0) return "";
    if (cleaned.length < 10) return t("profile.phoneLengthError");
    if (cleaned.length > 10) return t("profile.phoneTooLong");

    // Kiểm tra đầu số Việt Nam (bắt đầu bằng 0)
    if (!cleaned.startsWith("0")) return t("profile.phoneStartError");

    return "";
  };

  // Hàm format số điện thoại
  const formatPhoneNumber = (text: string) => {
    // Chỉ giữ lại số
    const cleaned = text.replace(/[^\d]/g, "");

    // Giới hạn 10 số
    const truncated = cleaned.slice(0, 10);

    // Format theo dạng 0xxx xxx xxx
    if (truncated.length >= 3) {
      const part1 = truncated.slice(0, 3);
      const part2 = truncated.slice(3, 6);
      const part3 = truncated.slice(6, 10);

      if (truncated.length >= 6) {
        return `${part1} ${part2} ${part3}`;
      } else if (truncated.length >= 3) {
        return `${part1} ${part2}`;
      }
    }
    return truncated;
  };

  // Hàm xử lý thay đổi số điện thoại
  const handlePhoneChange = (text: string) => {
    // Format số điện thoại
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);

    // Validate
    const error = validatePhoneNumber(formatted);
    setPhoneError(error);
  };

  // Hàm validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length === 0) return "";
    if (!emailRegex.test(email)) return t("profile.emailInvalidFormat");
    return "";
  };

  // Hàm xử lý thay đổi email
  const handleEmailChange = (text: string) => {
    setEmail(text);
    const error = validateEmail(text);
    setEmailError(error);
  };

  const handleUpdateProfile = async () => {
    // Validate input
    if (includePhone) {
      if (!phoneNumber.trim()) {
        Alert.alert(t("common.error"), t("profile.phoneRequired"));
        return;
      }

      const phoneError = validatePhoneNumber(phoneNumber);
      if (phoneError) {
        Alert.alert(t("common.error"), phoneError);
        return;
      }
    }

    if (includeEmail) {
      if (!email.trim()) {
        Alert.alert(t("common.error"), t("profile.emailRequired"));
        return;
      }

      const emailError = validateEmail(email);
      if (emailError) {
        Alert.alert(t("common.error"), emailError);
        return;
      }
    }

    try {
      // Read existing user data and merge updates
      const userStr = await AsyncStorage.getItem("user");
      const existingUser = userStr ? JSON.parse(userStr) : {};
      const fullName = `${lastName} ${firstName}`.trim();
      const updatedUser = {
        ...existingUser,
        fullName,
        email: includeEmail ? email : existingUser.email,
        phoneNumber: includePhone ? phoneNumber.replace(/\s/g, "") : existingUser.phoneNumber,
        avatar,
      };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      // Hiển thị thông báo thành công và trở về profile
      Alert.alert(
        t("common.success"),
        t("profile.updateSuccess"),
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/profile"),
          },
        ],
      );
    } catch (error) {
      console.error("Error saving user data:", error);
      Alert.alert(t("common.error"), t("profile.updateError"));
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const pickImage = async () => {
    try {
      // Yêu cầu quyền truy cập thư viện
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          t("profile.permissionRequired"),
          t("profile.galleryPermission"),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("profile.settings"), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      // Mở thư viện ảnh
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIsLoading(true);
        // Giả lập upload ảnh lên server
        setTimeout(() => {
          setAvatar(result.assets[0].uri);
          setIsLoading(false);
          Alert.alert(t("common.success"), t("profile.avatarUpdateSuccess"));
        }, 1000);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("common.error"), t("profile.imagePickError"));
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Yêu cầu quyền camera
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          t("profile.permissionRequired"),
          t("profile.cameraPermission"),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("profile.settings"), onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      // Mở camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIsLoading(true);
        // Giả lập upload ảnh lên server
        setTimeout(() => {
          setAvatar(result.assets[0].uri);
          setIsLoading(false);
          Alert.alert(t("common.success"), t("profile.avatarUpdateSuccess"));
        }, 1000);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert(t("common.error"), t("profile.cameraError"));
      setIsLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      t("profile.changeAvatar"),
      t("profile.chooseImageSource"),
      [
        {
          text: t("profile.takePhoto"),
          onPress: takePhoto,
        },
        {
          text: t("profile.chooseFromGallery"),
          onPress: pickImage,
        },
        { text: t("common.cancel"), style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.editTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#008fa0" />
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={showImageOptions}
                disabled={isLoading}
              >
                <MaterialIcons
                  name={isLoading ? "hourglass-empty" : "photo-camera"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.userName}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Personal Information */}
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person-outline" size={22} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("profile.personalInfo")}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("profile.firstName")}</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t("profile.enterFirstName")}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("profile.lastName")}</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="person"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t("profile.enterLastName")}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Contact Information */}
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <MaterialIcons name="contact-phone" size={22} color="#008fa0" />
            <Text style={styles.sectionTitle}>{t("profile.contactInfo")}</Text>
          </View>

          <View style={styles.toggleContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <MaterialIcons name="phone" size={20} color="#008fa0" />
                <Text style={styles.toggleLabel}>{t("profile.phoneLabel")}</Text>
              </View>
              <Switch
                value={includePhone}
                onValueChange={setIncludePhone}
                trackColor={{ false: "#e8ecf0", true: "#008fa0" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {includePhone && (
            <View style={[styles.inputGroup, { marginTop: 8 }]}>
              <View
                style={[
                  styles.inputContainer,
                  phoneError ? styles.inputError : null,
                ]}
              >
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={phoneError ? "#EF4444" : "#94A3B8"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  placeholder={t("profile.phonePlaceholder")}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={12} // 10 số + 2 khoảng trắng
                />
              </View>
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}
              <Text style={styles.hintText}>{t("profile.phoneExample")}</Text>
            </View>
          )}

          <View style={styles.toggleContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <MaterialIcons name="email" size={20} color="#008fa0" />
                <Text style={styles.toggleLabel}>{t("profile.emailLabel")}</Text>
              </View>
              <Switch
                value={includeEmail}
                onValueChange={setIncludeEmail}
                trackColor={{ false: "#e8ecf0", true: "#008fa0" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {includeEmail && (
            <View style={[styles.inputGroup, { marginTop: 8 }]}>
              <View
                style={[
                  styles.inputContainer,
                  emailError ? styles.inputError : null,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color={emailError ? "#EF4444" : "#94A3B8"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder={t("profile.emailPlaceholder")}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              <Text style={styles.hintText}>{t("profile.emailExample")}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBackPress}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.updateButton,
                (includePhone && phoneError) || (includeEmail && emailError)
                  ? styles.disabledButton
                  : null,
              ]}
              onPress={handleUpdateProfile}
              activeOpacity={0.8}
              disabled={
                (includePhone && phoneError !== "") ||
                (includeEmail && emailError !== "")
              }
            >
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>{t("profile.saveChanges")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 14,
    backgroundColor: "#fff",
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
  scrollContent: {
    paddingBottom: 32,
  },
  avatarSection: {
    backgroundColor: "#008fa0",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#008fa0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
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
  formSection: {
    backgroundColor: "#fff",
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e8ecf0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5a6577",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a2332",
    paddingVertical: 0,
    height: 52,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  hintText: {
    color: "#8d95a3",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  toggleContainer: {
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: "#1a2332",
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5a6577",
  },
  updateButton: {
    flex: 1,
    backgroundColor: "#008fa0",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#b0d4d9",
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

export default EditProfileScreen;
