import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { voucherService } from "@/api/voucher.service";
import { bookingService, ICreateBookingData } from "@/api/booking.service";
import { paymentService } from "@/api/payment.service";
import { serviceService } from "@/api/service.service";
import { walletService } from "@/api/wallet.service";

const PRIMARY_COLOR = "#008fa0";

const cancellationPolicySummaries: Record<number, string> = {
  0: "Hoàn tiền 100% nếu hủy trước 24 giờ. Không hoàn tiền sau đó.",
  1: "Hoàn tiền 100% nếu hủy trước 5 ngày. Hoàn 50% từ 5 ngày đến giờ khởi hành.",
  2: "Hoàn tiền 100% nếu hủy trước 30 ngày. Hoàn 50% từ 30 đến 7 ngày trước khởi hành.",
  3: "Không được hoàn tiền.",
};

const cancellationPolicyLabels: Record<number, string> = {
  0: "Linh hoạt",
  1: "Vừa phải",
  2: "Chặt chẽ",
  3: "Không hoàn tiền",
};

function formatFullPrice(price: number): string {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function parseServiceType(raw: any): "tour" | "homestay" | "combo" {
  if (raw === "homestay" || raw === 0) return "homestay";
  if (raw === "tour" || raw === 1) return "tour";
  if (raw === "combo" || raw === 3) return "combo";
  return "tour";
}

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ checkoutData?: string }>();
  const rawData = params.checkoutData ? JSON.parse(params.checkoutData) : null;
  const serviceType = rawData ? parseServiceType(rawData.serviceType) : "tour";

  const basePrice = (() => {
    if (!rawData) return 0;
    if (serviceType === "combo") return rawData.comboPrice || rawData.unitPrice || 0;
    if (serviceType === "homestay") {
      if (rawData.precomputedTotal) return rawData.precomputedTotal;
      const unit = rawData.unitPrice || 0;
      if (rawData.checkInDate && rawData.checkOutDate) {
        const nights = Math.max(1, Math.round(
          (new Date(rawData.checkOutDate).getTime() - new Date(rawData.checkInDate).getTime()) / 86400000
        ));
        return unit * nights * (rawData.maxRooms > 1 ? 1 : 1);
      }
      return unit;
    }
    return rawData.totalFromTiers > 0 ? rawData.totalFromTiers : rawData.schedulePrice || rawData.unitPrice || 0;
  })();

  const [user, setUser] = useState<any>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "wallet" | "combined">("vnpay");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVnPayWebView, setShowVnPayWebView] = useState(false);
  const [vnPayUrl, setVnPayUrl] = useState("");
  const [vnPayBookingId, setVnPayBookingId] = useState("");
  const submittingRef = useRef(false);
  const vnpCallbackUrlRef = useRef<string>("");
  const prevBasePriceRef = useRef(0);
  const createdBookingIdRef = useRef<string | null>(null);

  // Homestay-specific state
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [maxRooms, setMaxRooms] = useState<number | null>(null);
  const [checkInDate, setCheckInDate] = useState<string | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<string | undefined>();
  const [precomputedTotal, setPrecomputedTotal] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [roomMaxGuests, setRoomMaxGuests] = useState<number | null>(null);
  const [minNights, setMinNights] = useState<number | null>(null);
  const [maxNightsAllowed, setMaxNightsAllowed] = useState<number | null>(null);

  // Combo-specific state
  const [isCombo, setIsCombo] = useState(false);
  const [comboId, setComboId] = useState<string | undefined>();
  const [comboName, setComboName] = useState<string | undefined>();
  const [comboQuoteId, setComboQuoteId] = useState<string | undefined>();
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboGuestCount, setComboGuestCount] = useState(1);
  const [comboSummary, setComboSummary] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("user").then((userStr) => {
      if (userStr) {
        const u = JSON.parse(userStr);
        setUser(u);
        setContactName(u.fullName || "");
        setContactPhone(u.phoneNumber || "");
        setContactEmail(u.email || "");
      }
    });
  }, []);

  useEffect(() => {
    fetchAvailableVouchers();
  }, []);

  useEffect(() => {
    if (prevBasePriceRef.current !== basePrice) {
      setAppliedVoucher(null);
      setVoucherError("");
      prevBasePriceRef.current = basePrice;
    }
  }, [basePrice]);

  // Parse service-specific data from route params
  useEffect(() => {
    if (!rawData) return;
    if (serviceType === "homestay") {
      setRoomName(rawData.roomName || "");
      setRoomId(rawData.roomId || undefined);
      if (rawData.maxRooms) setMaxRooms(Number(rawData.maxRooms));
      setCheckInDate(rawData.checkInDate || undefined);
      setCheckOutDate(rawData.checkOutDate || undefined);
      if (rawData.precomputedTotal) setPrecomputedTotal(Number(rawData.precomputedTotal));
      if (rawData.quantity) setQuantity(Number(rawData.quantity));
      setGuestCount(Number(rawData.guestCount || 1));
      if (rawData.roomMaxGuests) setRoomMaxGuests(Number(rawData.roomMaxGuests));
      if (rawData.minNights) setMinNights(Number(rawData.minNights));
      if (rawData.maxNights) setMaxNightsAllowed(Number(rawData.maxNights));
    }
    if (serviceType === "combo") {
      setIsCombo(true);
      setComboPrice(Number(rawData.comboPrice || rawData.unitPrice || 0));
      setComboId(rawData.comboId || undefined);
      setComboName(rawData.comboName || undefined);
      setComboQuoteId(rawData.comboQuoteId || undefined);
      setComboGuestCount(Number(rawData.comboGuestCount || rawData.numberOfGuests || 1));
      setComboSummary(Array.isArray(rawData.comboSummary) ? rawData.comboSummary : []);
      setCheckInDate(rawData.checkInDate || undefined);
      setCheckOutDate(rawData.checkOutDate || undefined);
    }
  }, []);

  const numberOfNights = (serviceType === "homestay" && checkInDate && checkOutDate)
    ? Math.max(1, Math.round(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000
      ))
    : 0;

  const finalAmount = Math.max(0, basePrice - (appliedVoucher?.discountAmount || 0));

  const fetchAvailableVouchers = async () => {
    setIsLoadingVouchers(true);
    try {
      const res = await voucherService.getActiveVouchers();
      const data = res.data || res;
      const vouchers = Array.isArray(data) ? data : data.items || data.Items || [];
      const serviceTypeNum = serviceType === "homestay" ? 0 : serviceType === "tour" ? 1 : 2;
      const filtered = vouchers.filter(
        (v: any) => v.serviceType === null || v.serviceType === serviceTypeNum,
      );
      setAvailableVouchers(filtered);
    } catch (err) {
      console.log("Error fetching available vouchers:", err);
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  useEffect(() => {
    if (serviceType !== "homestay") return;
    const maxGuestsForSelection = Math.max(
      1,
      Number(roomMaxGuests || 1) * Math.max(1, quantity),
    );
    setGuestCount((current) => Math.max(1, Math.min(current, maxGuestsForSelection)));
  }, [quantity, roomMaxGuests, serviceType]);

  if (!rawData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#8d95a3" }}>Không có dữ liệu đặt chỗ</Text>
      </View>
    );
  }

  const {
    serviceName, serviceImage, serviceLocation, policyType, policySummary,
  } = rawData;

  // Tour-specific destructured data
  const tourData = serviceType === "tour" ? rawData : {};
  const {
    scheduleStartDate, packageName, pricingTiers, tierQuantities,
    totalFromTiers, selectedScheduleId,
    remainingSlots,
  } = tourData as any;
  const usesNamedTourTiers = Array.isArray(pricingTiers) && pricingTiers.length > 0;
  const tourGuestCount = Number(tourData?.guestCount || 0);

  const handleApplyVoucher = async (code: string) => {
    if (!code) return;
    setIsApplyingVoucher(true);
    setVoucherError("");
    try {
      const serviceTypeNum = serviceType === "homestay" ? 0 : serviceType === "tour" ? 1 : 2;
      const res = await voucherService.applyVoucher({
        code,
        orderAmount: basePrice,
        serviceType: serviceTypeNum,
      });
      const voucherData = res.data || res;
      setAppliedVoucher({
        code: voucherData.code || code,
        name: voucherData.name,
        discountAmount: voucherData.discountAmount || voucherData.discount || 0,
        voucherType: voucherData.voucherType,
        discountValue: voucherData.discountValue,
        maxDiscountAmount: voucherData.maxDiscountAmount,
        minOrderAmount: voucherData.minOrderAmount,
      });
      setShowVoucherModal(false);
    } catch (err: any) {
      setVoucherError(err?.response?.data?.message || "Mã voucher không hợp lệ");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
  };

  const handlePayment = async () => {
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin liên hệ");
      return;
    }
    if (serviceType === "homestay") {
      const totalGuestCapacity = Math.max(
        1,
        Number(roomMaxGuests || 1) * Math.max(1, quantity),
      );
      if (!checkInDate || !checkOutDate) {
        Alert.alert("Thiếu thông tin", "Vui lòng chọn ngày nhận và trả phòng.");
        return;
      }
      if (numberOfNights < Math.max(1, Number(minNights || 1))) {
        Alert.alert(
          "Số đêm không hợp lệ",
          `Homestay yêu cầu tối thiểu ${Math.max(1, Number(minNights || 1))} đêm.`,
        );
        return;
      }
      if (maxNightsAllowed && numberOfNights > maxNightsAllowed) {
        Alert.alert(
          "Số đêm không hợp lệ",
          `Homestay chỉ cho phép tối đa ${maxNightsAllowed} đêm.`,
        );
        return;
      }
      if (guestCount > totalGuestCapacity) {
        Alert.alert(
          "Số khách không hợp lệ",
          `Lựa chọn hiện tại chỉ phục vụ tối đa ${totalGuestCapacity} khách.`,
        );
        return;
      }
    }
    if (serviceType === "combo" && !comboQuoteId) {
      Alert.alert("Thieu thong tin", "Combo nay chua co bao gia hop le. Vui long quay lai tao bao gia moi.");
      return;
    }
    setPaymentMethod("vnpay");
    setIsLoadingWallet(true);
    setShowPaymentModal(true);
    try {
      const res = await walletService.getWallet();
      const balance = res?.balance ?? res?.data?.balance ?? 0;
      setWalletBalance(balance);
      setWalletAmount(Math.min(balance, finalAmount));
    } catch {
      setWalletBalance(0);
      setWalletAmount(0);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const submitPayment = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (createdBookingIdRef.current) {
      const existingId = createdBookingIdRef.current;
      if (paymentMethod === "vnpay" || paymentMethod === "combined") {
        try {
          const payRes = paymentMethod === "combined"
            ? await paymentService.payCombined(existingId, walletAmount)
            : await paymentService.createVnPayUrl(existingId);
          const data = payRes.data || payRes;
          const paymentUrl = data.paymentUrl || data.url || data;
          if (typeof paymentUrl === "string" && paymentUrl.startsWith("http")) {
            setVnPayUrl(paymentUrl);
            setVnPayBookingId(existingId);
            setShowPaymentModal(false);
            setIsSubmitting(false);
            setShowVnPayWebView(true);
            submittingRef.current = false;
            return;
          }
        } catch (e: any) {
          Alert.alert("Lỗi", e?.response?.data?.message || "Không thể tạo thanh toán");
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }
      } else {
        try {
          await paymentService.payWithWallet(existingId);
          setShowPaymentModal(false);
          setIsSubmitting(false);
          submittingRef.current = false;
          Alert.alert("Thanh toán thành công", "Đã thanh toán bằng ví thành công", [
            { text: "OK", onPress: () => router.replace("/trips") },
          ]);
          return;
        } catch (e: any) {
          Alert.alert("Lỗi", e?.response?.data?.message || "Không thể thanh toán");
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      let details: any[] = [];
      let bookingData: ICreateBookingData;

      if (serviceType === "tour") {
        const tierGuestCount = pricingTiers?.reduce(
          (sum: number, tier: any) => sum + (tierQuantities?.[tier.id] || 0), 0,
        ) || 0;
        const totalGuests = usesNamedTourTiers
          ? tierGuestCount
          : Number(tourGuestCount || tierGuestCount || 0);

        if (remainingSlots != null && totalGuests > remainingSlots) {
          Alert.alert("Hết chỗ", `Tour này chỉ còn ${remainingSlots} chỗ trống.`);
          setIsSubmitting(false);
          return;
        }

        if (selectedScheduleId && serviceType === "tour") {
          try {
            const availRes = await bookingService.getScheduleAvailability(selectedScheduleId);
            const availData = availRes?.data || availRes;
            const realtimeRemaining = availData?.remainingSlots;
            if (realtimeRemaining != null && totalGuests > realtimeRemaining) {
              Alert.alert("Hết chỗ", `Tour này chỉ còn ${realtimeRemaining} chỗ trống.`);
              setIsSubmitting(false);
              return;
            }
          } catch {}
        }

        details = usesNamedTourTiers
          ? pricingTiers
              ?.filter((tier: any) => (tierQuantities?.[tier.id] || 0) > 0)
              .map((tier: any) => ({
                tourScheduleId: selectedScheduleId,
                tourPricingTierId: tier.id,
                quantity: tierQuantities[tier.id],
              })) || []
          : [{ tourScheduleId: selectedScheduleId, quantity: totalGuests || 1 }];

        if (details.length === 0) {
          details.push({ tourScheduleId: selectedScheduleId, quantity: 1 });
        }

        bookingData = {
          serviceId: rawData.serviceId,
          numberOfGuests: totalGuests || 1,
          contactName, contactPhone, contactEmail,
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod === "vnpay" ? 0 : paymentMethod === "combined" ? 2 : 1,
          details,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else if (serviceType === "homestay") {
        const latestServiceResponse = await serviceService.getById(rawData.serviceId);
        const latestService = latestServiceResponse?.data || latestServiceResponse;
        const latestRoom = latestService?.homestay?.rooms?.find((room: any) => room.id === roomId);

        if (!latestRoom) {
          Alert.alert("Phòng không khả dụng", "Loại phòng này không còn khả dụng. Vui lòng chọn lại.");
          setIsSubmitting(false);
          return;
        }

        const latestMinNights = Number(latestService?.homestay?.minNights || minNights || 1);
        const latestMaxNights = Number(latestService?.homestay?.maxNights || maxNightsAllowed || 0);
        if (numberOfNights < latestMinNights) {
          Alert.alert("Số đêm không hợp lệ", `Homestay yêu cầu tối thiểu ${latestMinNights} đêm.`);
          setIsSubmitting(false);
          return;
        }
        if (latestMaxNights > 0 && numberOfNights > latestMaxNights) {
          Alert.alert("Số đêm không hợp lệ", `Homestay chỉ cho phép tối đa ${latestMaxNights} đêm.`);
          setIsSubmitting(false);
          return;
        }

        const latestMaxRooms = Number(latestRoom.quantity || maxRooms || 0);
        const availabilityList = Array.isArray(latestRoom.availability) ? latestRoom.availability : [];
        let maxAvailableRooms = latestMaxRooms;
        if (availabilityList.length > 0 && checkInDate && checkOutDate) {
          const cursor = new Date(checkInDate);
          const end = new Date(checkOutDate);
          while (cursor < end) {
            const dateKey = cursor.toISOString().split("T")[0];
            const availability = availabilityList.find((item: any) =>
              String(item.date || "").startsWith(dateKey),
            );
            if (!availability || availability.isBlocked || Number(availability.availableCount || 0) <= 0) {
              Alert.alert(
                "Phòng không khả dụng",
                `Phòng không còn khả dụng vào ngày ${cursor.toLocaleDateString("vi-VN")}.`,
              );
              setIsSubmitting(false);
              return;
            }
            maxAvailableRooms = Math.min(maxAvailableRooms, Number(availability.availableCount || 0));
            cursor.setDate(cursor.getDate() + 1);
          }
        }

        if (maxAvailableRooms > 0 && quantity > maxAvailableRooms) {
          Alert.alert(
            "Số phòng không hợp lệ",
            `Hiện chỉ còn ${maxAvailableRooms} phòng cho khoảng ngày đã chọn.`,
          );
          setIsSubmitting(false);
          return;
        }

        const latestRoomMaxGuests = Number(latestRoom.maxGuests || roomMaxGuests || 1);
        const totalGuestCapacity = Math.max(1, latestRoomMaxGuests * quantity);
        if (guestCount > totalGuestCapacity) {
          Alert.alert(
            "Số khách không hợp lệ",
            `Lựa chọn hiện tại chỉ phục vụ tối đa ${totalGuestCapacity} khách.`,
          );
          setIsSubmitting(false);
          return;
        }

        details = [{ roomId, quantity }];
        bookingData = {
          serviceId: rawData.serviceId,
          numberOfGuests: guestCount,
          contactName, contactPhone, contactEmail,
          checkInDate, checkOutDate,
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod === "vnpay" ? 0 : paymentMethod === "combined" ? 2 : 1,
          details,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else if (serviceType === "combo") {
        bookingData = {
          serviceId: rawData.serviceId,
          numberOfGuests: comboGuestCount,
          contactName, contactPhone, contactEmail,
          checkInDate,
          checkOutDate,
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod === "vnpay" ? 0 : paymentMethod === "combined" ? 2 : 1,
          details: [],
          comboId, comboName, comboQuoteId,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        bookingData = {
          serviceId: rawData.serviceId,
          numberOfGuests: 1,
          contactName, contactPhone, contactEmail,
          voucherCode: appliedVoucher?.code || undefined,
          paymentMethod: paymentMethod === "vnpay" ? 0 : paymentMethod === "combined" ? 2 : 1,
          details: [],
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      const bookingResult = await bookingService.createBooking(bookingData);
      const bookingId = bookingResult.id || bookingResult.data?.id;

      if (!bookingId) {
        Alert.alert("Lỗi", "Không thể tạo đơn đặt chỗ");
        setIsSubmitting(false);
        return;
      }

      createdBookingIdRef.current = bookingId;

      if (paymentMethod === "vnpay" || paymentMethod === "combined") {
        const payRes = paymentMethod === "combined"
          ? await paymentService.payCombined(bookingId, walletAmount)
          : await paymentService.createVnPayUrl(bookingId);
        const data = payRes.data || payRes;
        const paymentUrl = data.paymentUrl || data.url || data;
        if (typeof paymentUrl === "string" && paymentUrl.startsWith("http")) {
          setVnPayUrl(paymentUrl);
          setVnPayBookingId(bookingId);
          setShowPaymentModal(false);
          setIsSubmitting(false);
          setShowVnPayWebView(true);
        } else {
          Alert.alert("Lỗi", "Không lấy được URL thanh toán VNPay");
          setIsSubmitting(false);
        }
      } else {
        await paymentService.payWithWallet(bookingId);
        setShowPaymentModal(false);
        setIsSubmitting(false);
        Alert.alert("Thanh toán thành công", "Đã thanh toán bằng ví thành công", [
          { text: "OK", onPress: () => router.replace("/trips") },
        ]);
      }
    } catch (error: any) {
      const serverMsg = error?.response?.data?.message || "";
      const statusCode = error?.response?.status;
      let msg = serverMsg || error?.message || "Đã xảy ra lỗi";
      if (statusCode) msg = `[${statusCode}] ${msg}`;
      if (serverMsg.includes("đủ chỗ") || serverMsg.includes("chỗ trống")) {
        Alert.alert("Hết chỗ", msg, [
          { text: "Quay lại chọn lịch", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Lỗi", msg);
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleShouldStartLoad = (request: any): boolean => {
    const url = request.url || "";
    if (url.includes("vnpay-callback") || url.includes("/api/Payment/vnpay-callback")) {
      vnpCallbackUrlRef.current = url;
      processVnPayResult(url);
      return false;
    }
    return true;
  };

  const handleVnPayNavigationChange = (navState: any) => {
    const url = navState.url || "";
    if (
      (url.includes("vnpay-callback") || url.includes("/api/Payment/vnpay-callback")) &&
      !vnpCallbackUrlRef.current
    ) {
      vnpCallbackUrlRef.current = url;
      processVnPayResult(url);
    }
  };

  const processVnPayResult = async (url: string) => {
    setShowVnPayWebView(false);
    setVnPayUrl("");

    const rawQuery = url.includes("?") ? url.split("?")[1] : "";
    const responseCode = (() => {
      const m = rawQuery.match(/vnp_ResponseCode=([^&]*)/);
      return m ? m[1] : "";
    })();

    try {
      let confirmed = false;
      for (let attempt = 0; attempt < 6 && rawQuery && !confirmed; attempt++) {
        try {
          const confirmRes = await paymentService.confirmVnPayRaw(rawQuery);
          const resData = confirmRes?.data || confirmRes;
          confirmed = resData?.success === true;
          if (confirmed) break;
        } catch {
          if (attempt < 5) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (vnPayBookingId) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const bookingRes = await bookingService.getBookingById(vnPayBookingId);
          const bk = bookingRes.data || bookingRes;
          const paymentStatus = bk.payment?.paymentStatus;
          if (paymentStatus === 1 || confirmed) {
            Alert.alert("Thanh toán thành công", "Đơn đặt chỗ đã được thanh toán. Email xác nhận đã gửi.", [
              { text: "OK", onPress: () => { createdBookingIdRef.current = null; router.replace("/trips"); } },
            ]);
            vnpCallbackUrlRef.current = "";
            return;
          }
        } catch {}
      }

      if (confirmed || responseCode === "00") {
        Alert.alert("Thanh toán thành công", "Đơn đặt chỗ đã được thanh toán.", [
          { text: "OK", onPress: () => { createdBookingIdRef.current = null; router.replace("/trips"); } },
        ]);
      } else {
        Alert.alert("Thanh toán thất bại", `Mã lỗi VNPay: ${responseCode || "không xác định"}. Bạn có thể thử thanh toán lại trong lịch sử đặt chỗ.`, [{ text: "OK" }]);
      }
    } catch (err) {
      Alert.alert("Thông báo", "Vui lòng kiểm tra trạng thái trong lịch sử đặt chỗ.", [
        { text: "OK", onPress: () => router.replace("/trips") },
      ]);
    } finally {
      vnpCallbackUrlRef.current = "";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#1a2332" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Xác nhận đặt chỗ
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Section 1: Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Thông tin đặt chỗ</Text>
          </View>

          <Text style={styles.serviceName}>{serviceName}</Text>

          {/* Tour-specific info */}
          {serviceType === "tour" && scheduleStartDate ? (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color="#5a6577" />
                <Text style={styles.infoRowText}>{formatTime(scheduleStartDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color="#5a6577" />
                <Text style={styles.infoRowText}>{formatDateShort(scheduleStartDate)}</Text>
              </View>
              {packageName ? (
                <View style={styles.infoRow}>
                  <Ionicons name="layers-outline" size={18} color="#5a6577" />
                  <Text style={styles.infoRowText}>{packageName}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {/* Homestay-specific info */}
          {serviceType === "homestay" ? (
            <>
              {roomName ? (
                <View style={styles.infoRow}>
                  <Ionicons name="bed-outline" size={18} color="#5a6577" />
                  <Text style={styles.infoRowText}>{roomName}</Text>
                </View>
              ) : null}
              {checkInDate ? (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color="#5a6577" />
                  <Text style={styles.infoRowText}>
                    {new Date(checkInDate).toLocaleDateString("vi-VN")}
                    {checkOutDate ? ` - ${new Date(checkOutDate).toLocaleDateString("vi-VN")}` : ""}
                  </Text>
                </View>
              ) : null}
              {numberOfNights > 0 ? (
                <View style={styles.infoRow}>
                  <Ionicons name="moon-outline" size={18} color="#5a6577" />
                  <Text style={styles.infoRowText}>{numberOfNights} đêm</Text>
                </View>
              ) : null}
              {maxRooms != null ? (
                <View style={styles.infoRow}>
                  <Ionicons name="layers-outline" size={18} color="#5a6577" />
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{quantity} phòng</Text>
                    <TouchableOpacity
                      onPress={() => setQuantity(Math.min(maxRooms, quantity + 1))}
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                    {quantity >= maxRooms ? (
                      <Text style={styles.quantityMaxLabel}>(tối đa {maxRooms})</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {roomMaxGuests != null ? (
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={18} color="#5a6577" />
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{guestCount} khách</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setGuestCount(
                          Math.min(
                            Math.max(1, Number(roomMaxGuests || 1) * Math.max(1, quantity)),
                            guestCount + 1,
                          ),
                        )
                      }
                      style={styles.quantityBtn}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                    {guestCount >= Math.max(1, Number(roomMaxGuests || 1) * Math.max(1, quantity)) ? (
                      <Text style={styles.quantityMaxLabel}>
                        (tối đa {Math.max(1, Number(roomMaxGuests || 1) * Math.max(1, quantity))})
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {/* Combo-specific info */}
          {serviceType === "combo" && comboSummary.length > 0 ? (
            <View style={styles.comboSummary}>
              {comboSummary.map((item: any, index: number) => (
                <View key={index} style={styles.comboItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.comboItemService}>{item.serviceName}</Text>
                    <Text style={styles.comboItemDetail}>
                      {item.roomName || item.tierName || ""}
                      {item.scheduleInfo ? ` • ${item.scheduleInfo}` : ""}
                      {item.checkInDate ? ` • ${new Date(item.checkInDate).toLocaleDateString("vi-VN")}` : ""}
                    </Text>
                    {item.unitPrice > 0 ? (
                      <Text style={styles.comboItemPrice}>{formatFullPrice(item.unitPrice)} x {item.quantity}</Text>
                    ) : null}
                  </View>
                  {item.subTotal > 0 ? (
                    <Text style={styles.comboItemTotal}>{formatFullPrice(item.subTotal)}</Text>
                  ) : (
                    <Text style={styles.comboItemQty}>x{item.quantity}</Text>
                  )}
                </View>
              ))}
              {comboGuestCount > 0 ? (
                <View style={styles.infoRow}>
                  <Ionicons name="people-outline" size={18} color="#5a6577" />
                  <Text style={styles.infoRowText}>{comboGuestCount} khách</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.priceSummaryDivider} />

          {/* Tour pricing tiers */}
          {serviceType === "tour" && pricingTiers?.length > 0
            ? pricingTiers.map((tier: any) => {
                const qty = tierQuantities?.[tier.id] || 0;
                if (totalFromTiers > 0 && qty <= 0) return null;
                return (
                  <View key={tier.id} style={styles.priceSummaryRow}>
                    <Text style={styles.priceSummaryLabel}>
                      {tier.name}{qty > 0 ? ` x ${qty}` : ""}
                    </Text>
                    <Text style={styles.priceSummaryValue}>
                      {formatFullPrice(qty > 0 ? qty * tier.unitPrice : tier.unitPrice)}
                    </Text>
                  </View>
                );
              })
            : null}

          {serviceType === "combo" ? (
            <>
              <View style={styles.priceSummaryRow}>
                <Text style={styles.priceSummaryLabel}>Tạm tính dịch vụ</Text>
                <Text style={styles.priceSummaryValue}>{formatFullPrice(Number(rawData?.comboSubtotalBeforeDiscount || 0))}</Text>
              </View>
              <View style={styles.priceSummaryRow}>
                <Text style={styles.priceSummaryLabel}>Giảm combo</Text>
                <Text style={[styles.priceSummaryValue, { color: "#E5484D" }]}>
                  -{formatFullPrice(Number(rawData?.comboDiscountAmount || 0))}
                </Text>
              </View>
              <View style={styles.priceSummaryTotal}>
                <Text style={styles.priceSummaryTotalLabel}>Tổng cộng</Text>
                <Text style={styles.priceSummaryTotalValue}>{formatFullPrice(basePrice)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.priceSummaryTotal}>
              <Text style={styles.priceSummaryTotalLabel}>Tạm tính</Text>
              <Text style={styles.priceSummaryTotalValue}>{formatFullPrice(basePrice)}</Text>
            </View>
          )}
        </View>

        {/* Section 2: Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          </View>
          <View style={styles.contactField}>
            <Text style={styles.contactLabel}>Họ và tên</Text>
            <TextInput
              style={styles.contactInput}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#c0c7d1"
            />
          </View>
          <View style={styles.contactField}>
            <Text style={styles.contactLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.contactInput}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#c0c7d1"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.contactField}>
            <Text style={styles.contactLabel}>Email</Text>
            <TextInput
              style={styles.contactInput}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Nhập email"
              placeholderTextColor="#c0c7d1"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Section 3: Discounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Mã giảm giá</Text>
          </View>

          {appliedVoucher ? (
            <View style={styles.appliedVoucherCard}>
              <View style={styles.appliedVoucherInfo}>
                <Ionicons name="pricetag" size={18} color={PRIMARY_COLOR} />
                <View>
                  <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                  <Text style={styles.appliedVoucherDiscount}>
                    {appliedVoucher.voucherType === 0
                      ? `Giảm ${appliedVoucher.discountValue}%${appliedVoucher.maxDiscountAmount ? ` (tối đa ${formatFullPrice(appliedVoucher.maxDiscountAmount)})` : ""}`
                      : appliedVoucher.voucherType === 1
                        ? `Giảm ${formatFullPrice(appliedVoucher.discountAmount)}`
                        : `Giảm ${formatFullPrice(appliedVoucher.discountAmount)}`}
                  </Text>
                  {appliedVoucher.minOrderAmount ? (
                    <Text style={styles.appliedVoucherMinOrder}>
                      Đơn tối thiểu {formatFullPrice(appliedVoucher.minOrderAmount)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveVoucher}>
                <Ionicons name="close-circle" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.selectVoucherButton}
                onPress={() => setShowVoucherModal(true)}
              >
                <Ionicons name="pricetag-outline" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.selectVoucherText}>Chọn mã giảm giá</Text>
                <Ionicons name="chevron-forward" size={20} color="#8d95a3" />
              </TouchableOpacity>
              {voucherError ? <Text style={styles.voucherError}>{voucherError}</Text> : null}
            </View>
          )}

          {appliedVoucher ? (
            <View style={styles.priceSummary}>
              <View style={styles.priceSummaryDivider} />
              <View style={styles.priceSummaryRow}>
                <Text style={styles.priceSummaryLabel}>Tạm tính</Text>
                <Text style={styles.priceSummaryValue}>{formatFullPrice(basePrice)}</Text>
              </View>
              <View style={styles.priceSummaryRow}>
                <Text style={styles.priceSummaryLabel}>Giảm giá</Text>
                <Text style={[styles.priceSummaryValue, { color: "#22c55e" }]}>
                  -{formatFullPrice(appliedVoucher.discountAmount)}
                </Text>
              </View>
              <View style={styles.priceSummaryTotal}>
                <Text style={styles.priceSummaryTotalLabel}>Tổng cộng</Text>
                <Text style={styles.priceSummaryTotalValue}>
                  {formatFullPrice(Math.max(0, basePrice - appliedVoucher.discountAmount))}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Policy */}
        <View style={styles.policySection}>
          <View style={styles.policySectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.policySectionTitle}>Chính sách hủy</Text>
          </View>
          {serviceType === "combo" && comboSummary.length > 0 ? (
            comboSummary.map((item: any, index: number) => (
              <View key={index} style={{ marginBottom: index < comboSummary.length - 1 ? 10 : 0 }}>
                <Text style={[styles.policyLabel, { fontSize: 13 }]}>{item.serviceName}</Text>
                <Text style={styles.policyDesc}>
                  {cancellationPolicySummaries[item.cancellationPolicyType] || ""}
                </Text>
              </View>
            ))
          ) : (
            <>
              {policyType != null ? (
                <Text style={styles.policyLabel}>{cancellationPolicyLabels[policyType] || ""}</Text>
              ) : null}
              <Text style={styles.policyDesc}>
                {policySummary || cancellationPolicySummaries[policyType] || ""}
              </Text>
            </>
          )}
        </View>

        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={22} color="#b45309" />
          <Text style={styles.warningText}>
            Sau khi xác nhận, thông tin sẽ không thể thay đổi. Vui lòng kiểm tra kỹ trước khi tiếp tục.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Tổng cộng</Text>
          <Text style={styles.bottomPriceValue}>
            {formatFullPrice(Math.max(0, basePrice - (appliedVoucher?.discountAmount || 0)))}
          </Text>
        </View>
        <TouchableOpacity style={styles.confirmButton} onPress={handlePayment}>
          <Text style={styles.confirmButtonText}>Thanh toán</Text>
        </TouchableOpacity>
      </View>

      {/* Voucher Modal */}
      <Modal
        visible={showVoucherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoucherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowVoucherModal(false)}>
                <Ionicons name="close" size={24} color="#1a2332" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chọn mã giảm giá</Text>
              <View style={{ width: 24 }} />
            </View>
            {isLoadingVouchers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </View>
            ) : availableVouchers.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="pricetag-outline" size={48} color="#c0c7d1" />
                <Text style={styles.modalEmptyText}>Không có mã giảm giá nào khả dụng</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {availableVouchers.map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.modalVoucherItem}
                    onPress={() => handleApplyVoucher(v.code)}
                    disabled={isApplyingVoucher}
                  >
                    <View style={styles.modalVoucherLeft}>
                      <Text style={styles.modalVoucherCode}>{v.code}</Text>
                      {v.name ? <Text style={styles.modalVoucherName}>{v.name}</Text> : null}
                      <Text style={styles.modalVoucherDesc}>
                        {v.voucherType === 0
                          ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` (tối đa ${formatFullPrice(v.maxDiscountAmount)})` : ""}`
                          : `Giảm ${formatFullPrice(v.discountAmount || v.discountValue)}`}
                      </Text>
                      {v.minOrderAmount ? (
                        <Text style={styles.modalVoucherMinOrder}>Đơn tối thiểu {formatFullPrice(v.minOrderAmount)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.modalVoucherApplyBtn}>
                      {isApplyingVoucher ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.modalVoucherApplyText}>Áp dụng</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { if (!isSubmitting) setShowPaymentModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.paymentModalTitle}>Chọn phương thức thanh toán</Text>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "vnpay" && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod("vnpay")}
            >
              <MaterialIcons
                name={paymentMethod === "vnpay" ? "radio-button-checked" : "radio-button-unchecked"}
                size={24} color={PRIMARY_COLOR}
              />
              <View style={styles.paymentOptionTextContainer}>
                <Text style={styles.paymentOptionTitle}>VNPay</Text>
                <Text style={styles.paymentOptionDescription}>Thanh toán qua cổng VNPay</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "wallet" && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod("wallet")}
            >
              <MaterialIcons
                name={paymentMethod === "wallet" ? "radio-button-checked" : "radio-button-unchecked"}
                size={24} color={PRIMARY_COLOR}
              />
              <View style={styles.paymentOptionTextContainer}>
                <Text style={styles.paymentOptionTitle}>Ví thanh toán</Text>
                <Text style={styles.paymentOptionDescription}>Thanh toán bằng số dư ví</Text>
                {isLoadingWallet ? null : (
                  <Text style={styles.paymentOptionBalance}>Số dư: {walletBalance.toLocaleString("vi-VN")}đ</Text>
                )}
              </View>
            </TouchableOpacity>

            {!isLoadingWallet && walletBalance > 0 && walletBalance < finalAmount ? (
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === "combined" && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod("combined")}
              >
                <MaterialIcons
                  name={paymentMethod === "combined" ? "radio-button-checked" : "radio-button-unchecked"}
                  size={24} color={PRIMARY_COLOR}
                />
                <View style={styles.paymentOptionTextContainer}>
                  <Text style={styles.paymentOptionTitle}>Ví + VNPay</Text>
                  <Text style={styles.paymentOptionDescription}>Dùng hết số dư ví, phần còn lại thanh toán qua VNPay</Text>
                  {paymentMethod === "combined" ? (
                    <View style={styles.combinedSplit}>
                      <Text style={styles.combinedSplitText}>Ví: {walletAmount.toLocaleString("vi-VN")}đ</Text>
                      <Text style={styles.combinedSplitText}>VNPay: {(finalAmount - walletAmount).toLocaleString("vi-VN")}đ</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={styles.paymentModalButtons}>
              <TouchableOpacity
                style={[styles.paymentModalBtn, styles.paymentModalCancel]}
                onPress={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.paymentModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentModalBtn, styles.paymentModalConfirm]}
                onPress={submitPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.paymentModalConfirmText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VNPay WebView Modal */}
      <Modal
        visible={showVnPayWebView}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert("Hủy thanh toán?", "Bạn có chắc muốn hủy thanh toán VNPay?", [
            { text: "Tiếp tục", style: "cancel" },
            { text: "Hủy", onPress: () => { setShowVnPayWebView(false); setVnPayUrl(""); } },
          ]);
        }}
      >
        <View style={{ flex: 1, marginTop: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#FFF" }}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Hủy thanh toán?", "Bạn có chắc muốn hủy thanh toán VNPay?", [
                  { text: "Tiếp tục", style: "cancel" },
                  { text: "Hủy", onPress: () => { setShowVnPayWebView(false); setVnPayUrl(""); } },
                ]);
              }}
            >
              <Ionicons name="close" size={24} color="#1a2332" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", fontFamily: "Inter" }}>
              Thanh toán VNPay
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <WebView
            source={{ uri: vnPayUrl }}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={handleVnPayNavigationChange}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#f0f2f4",
  },
  headerBack: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#1a2332", textAlign: "center", fontFamily: "Inter" },
  section: { backgroundColor: "#FFF", padding: 20, marginTop: 16 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionHeaderLine: { width: 4, height: 22, backgroundColor: PRIMARY_COLOR, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 22, fontWeight: "600", color: "#1a2332", fontFamily: "Inter" },
  serviceName: { fontSize: 20, fontWeight: "700", color: "#1a2332", marginBottom: 12, fontFamily: "Inter" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  infoRowText: { fontSize: 15, color: "#5a6577", fontFamily: "Inter" },
  priceSummary: { marginTop: 0 },
  priceSummaryDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 12 },
  priceSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  priceSummaryLabel: { fontSize: 15, color: "#5a6577", fontFamily: "Inter" },
  priceSummaryValue: { fontSize: 15, fontWeight: "600", color: "#1a2332", fontFamily: "Inter" },
  priceSummaryTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  priceSummaryTotalLabel: { fontSize: 17, fontWeight: "700", color: "#1a2332", fontFamily: "Inter" },
  priceSummaryTotalValue: { fontSize: 18, fontWeight: "700", color: "#FF6B00", fontFamily: "Inter" },
  contactField: { marginBottom: 14 },
  contactLabel: { fontSize: 14, fontWeight: "600", color: "#1a2332", marginBottom: 6, fontFamily: "Inter" },
  contactInput: { backgroundColor: "#f4f6f8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1a2332", borderWidth: 1, borderColor: "#e2e8f0", fontFamily: "Inter" },
  selectVoucherButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f4f6f8", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 14 },
  selectVoucherText: { flex: 1, fontSize: 15, color: "#5a6577", fontFamily: "Inter", marginLeft: 10 },
  voucherError: { color: "#ef4444", fontSize: 13, marginTop: 6, fontFamily: "Inter" },
  appliedVoucherCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#e6f5f7", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: PRIMARY_COLOR },
  appliedVoucherInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  appliedVoucherCode: { fontSize: 15, fontWeight: "700", color: "#1a2332", fontFamily: "Inter" },
  appliedVoucherDiscount: { fontSize: 13, color: "#22c55e", fontWeight: "600", fontFamily: "Inter" },
  appliedVoucherMinOrder: { fontSize: 12, color: "#8d95a3", fontFamily: "Inter", marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", minHeight: 300 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f2f4" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a2332", fontFamily: "Inter" },
  modalLoading: { padding: 40, alignItems: "center" },
  modalEmpty: { padding: 40, alignItems: "center" },
  modalEmptyText: { fontSize: 14, color: "#8d95a3", fontFamily: "Inter", marginTop: 12, textAlign: "center" },
  modalList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  modalVoucherItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  modalVoucherLeft: { flex: 1, marginRight: 12 },
  modalVoucherCode: { fontSize: 15, fontWeight: "700", color: "#1a2332", fontFamily: "Inter" },
  modalVoucherName: { fontSize: 13, color: "#5a6577", fontFamily: "Inter", marginTop: 2 },
  modalVoucherDesc: { fontSize: 13, color: "#22c55e", fontWeight: "600", fontFamily: "Inter", marginTop: 4 },
  modalVoucherMinOrder: { fontSize: 12, color: "#8d95a3", fontFamily: "Inter", marginTop: 2 },
  modalVoucherApplyBtn: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center", alignItems: "center", minWidth: 70 },
  modalVoucherApplyText: { color: "#FFF", fontSize: 13, fontWeight: "600", fontFamily: "Inter" },
  paymentModalTitle: { fontSize: 18, fontWeight: "700", color: "#1a2332", fontFamily: "Inter", padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f0f2f4" },
  paymentOption: { flexDirection: "row", alignItems: "center", padding: 16, marginHorizontal: 20, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  paymentOptionSelected: { borderColor: PRIMARY_COLOR, backgroundColor: "#e6f5f7" },
  paymentOptionTextContainer: { marginLeft: 12, flex: 1 },
  paymentOptionTitle: { fontSize: 16, fontWeight: "600", color: "#1a2332", fontFamily: "Inter" },
  paymentOptionDescription: { fontSize: 13, color: "#8d95a3", fontFamily: "Inter", marginTop: 2 },
  paymentModalButtons: { flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: "#f0f2f4", marginTop: 20 },
  paymentModalBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  paymentModalCancel: { backgroundColor: "#f4f6f8", borderWidth: 1, borderColor: "#e2e8f0" },
  paymentModalCancelText: { fontSize: 15, fontWeight: "600", color: "#5a6577", fontFamily: "Inter" },
  paymentModalConfirm: { backgroundColor: PRIMARY_COLOR },
  paymentModalConfirmText: { fontSize: 15, fontWeight: "600", color: "#FFF", fontFamily: "Inter" },
  paymentOptionBalance: { fontSize: 12, color: "#5a6577", fontFamily: "Inter", marginTop: 2 },
  combinedSplit: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#e2e8f0", gap: 2 },
  combinedSplitText: { fontSize: 13, fontWeight: "600", color: "#1a2332", fontFamily: "Inter" },
  policySection: { backgroundColor: "#FFF", marginTop: 16, marginHorizontal: 20, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: PRIMARY_COLOR, borderLeftWidth: 4 },
  policySectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  policySectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a2332", fontFamily: "Inter" },
  policyLabel: { fontSize: 14, fontWeight: "600", color: PRIMARY_COLOR, marginBottom: 4, fontFamily: "Inter" },
  policyDesc: { fontSize: 14, color: "#5a6577", lineHeight: 20, fontFamily: "Inter" },
  warningBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fffbeb", marginTop: 12, marginHorizontal: 20, marginBottom: 20, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#fde68a" },
  warningText: { flex: 1, fontSize: 14, color: "#b45309", lineHeight: 20, fontFamily: "Inter" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingHorizontal: 20, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#f0f2f4" },
  bottomPriceLabel: { fontSize: 14, color: "#8d95a3", fontFamily: "Inter" },
  bottomPriceValue: { fontSize: 20, fontWeight: "700", color: "#FF6B00", fontFamily: "Inter" },
  confirmButton: { backgroundColor: PRIMARY_COLOR, borderRadius: 14, height: 52, paddingHorizontal: 32, justifyContent: "center", alignItems: "center" },
  confirmButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600", fontFamily: "Inter" },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  quantityBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e2e8f0", justifyContent: "center", alignItems: "center" },
  quantityBtnText: { fontSize: 16, fontWeight: "700", color: "#1a2332" },
  quantityValue: { fontSize: 15, fontWeight: "600", color: "#1a2332", minWidth: 60, textAlign: "center" },
  quantityMaxLabel: { fontSize: 12, color: "#8d95a3" },
  comboSummary: { marginBottom: 8 },
  comboItemRow: { flexDirection: "row", backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 6 },
  comboItemService: { fontSize: 14, fontWeight: "600", color: "#1a2332", flex: 1 },
  comboItemDetail: { fontSize: 12, color: "#5a6577", marginTop: 2 },
  comboItemQty: { fontSize: 12, fontWeight: "600", color: PRIMARY_COLOR, marginTop: 2 },
  comboItemPrice: { fontSize: 12, color: "#5a6577", marginTop: 2 },
  comboItemTotal: { fontSize: 14, fontWeight: "700", color: "#1a2332" },
});
