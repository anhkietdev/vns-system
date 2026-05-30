import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CALENDAR_PADDING = 20;
const CALENDAR_CELL_SIZE = Math.floor(
  (SCREEN_WIDTH - CALENDAR_PADDING * 2 - 6 * 4) / 7,
);
const CARD_GAP = 8;
const SECTION_PADDING = 20;
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - SECTION_PADDING * 2 - CARD_GAP * 4) / 4,
);

const PRIMARY_COLOR = "#008fa0";

const cancellationPolicySummaries: Record<number, string> = {
  0: "Hoàn tiền 100% nếu hủy trước 24 giờ. Không hoàn tiền sau đó.",
  1: "Hoàn tiền 100% nếu hủy trước 5 ngày. Hoàn 50% từ 5 ngày đến giờ khởi hành.",
  2: "Hoàn tiền 100% nếu hủy trước 30 ngày. Hoàn 50% từ 30 đến 7 ngày trước khởi hành.",
  3: "Không được hoàn tiền.",
};

function getCheapestTierPrice(pricingTiers: any[] = []) {
  const prices = pricingTiers
    .map((tier) => Number(tier.unitPrice || 0))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function getScheduleTotalCapacity(schedule: any): number {
  return Math.max(Number(schedule?.runCount || 1) || 1, 1) *
    Math.max(Number(schedule?.availableSlots || 0) || 0, 0);
}

function getScheduleRemainingCapacity(schedule: any): number {
  return Math.max(
    0,
    getScheduleTotalCapacity(schedule) - Math.max(Number(schedule?.bookedSlots || 0) || 0, 0),
  );
}

function getScheduleTierPrice(
  schedule: any,
  tier: any,
  tierIndex: number,
): number {
  const override = (schedule?.pricingOverrides || []).find(
    (item: any) =>
      item?.tourPricingTierId === tier?.id ||
      Number(item?.tierDisplayOrder) ===
        Number(tier?.displayOrder ?? tierIndex),
  );

  const customPrice = Number(override?.customPrice || 0);
  if (customPrice > 0) return customPrice;

  const tierPrice = Number(tier?.unitPrice || 0);
  if (tierPrice > 0) return tierPrice;

  const legacyPrice = Number(schedule?.priceOverride || 0);
  return legacyPrice > 0 ? legacyPrice : 0;
}

function getSchedulePrice(schedule: any, pricingTiers: any[]): number {
  const prices = pricingTiers
    .map((tier, tierIndex) => getScheduleTierPrice(schedule, tier, tierIndex))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length) return Math.min(...prices);

  const legacyPrice = Number(schedule?.priceOverride || 0);
  if (legacyPrice > 0) return legacyPrice;

  return getCheapestTierPrice(pricingTiers);
}

function getPackageGuestBounds(activePackage: any, pricingTiers: any[] = []) {
  const minParticipants = Math.max(
    Number(activePackage?.minParticipants || 1) || 1,
    1,
  );
  const maxParticipants = Math.max(
    Number(activePackage?.maxParticipants || minParticipants) || minParticipants,
    minParticipants,
  );

  const bracketBounds = pricingTiers
    .map((tier: any) => ({
      minGuests: Math.max(
        Number(tier?.groupMinGuests ?? tier?.minQuantity ?? 0) || 0,
        0,
      ),
      maxGuests: Math.max(
        Number(tier?.groupMaxGuests ?? tier?.maxQuantity ?? 0) || 0,
        0,
      ),
    }))
    .filter((tier) => tier.minGuests > 0 && tier.maxGuests >= tier.minGuests);

  if (!bracketBounds.length) {
    return { minGuests: minParticipants, maxGuests: maxParticipants };
  }

  return {
    minGuests: Math.min(...bracketBounds.map((tier) => tier.minGuests)),
    maxGuests: Math.max(...bracketBounds.map((tier) => tier.maxGuests)),
  };
}

function buildCalendarData(schedules: any[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startMonth = now.getMonth();
  let minYear = currentYear;
  let maxYear = currentYear;
  for (const s of schedules) {
    const y = new Date(s.startDate).getFullYear();
    if (y < minYear) minYear = y;
    if (y > maxYear) maxYear = y;
  }
  const months: any[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const monthStart = y === minYear ? startMonth : 0;
    const monthEnd = y === maxYear ? 11 : 11;
    for (let m = monthStart; m <= monthEnd; m++) {
      const firstDay = new Date(y, m, 1).getDay();
      months.push({
        year: y,
        month: m,
        monthName: new Date(y, m).toLocaleDateString("vi-VN", {
          month: "long",
          year: "numeric",
        }),
        firstDayIndex: firstDay === 0 ? 6 : firstDay - 1,
        daysInMonth: new Date(y, m + 1, 0).getDate(),
        schedules: [],
      });
    }
  }
  for (const s of schedules) {
    const d = new Date(s.startDate);
    const dYear = d.getFullYear();
    const dMonth = d.getMonth();
    const idx = months.findIndex(m => m.year === dYear && m.month === dMonth);
    if (idx >= 0) months[idx].schedules.push(s);
  }
  return months;
}

function formatShortPrice(price: number): string {
  if (price >= 1000000) {
    const t = (price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1);
    return `${t}tr`;
  }
  if (price >= 1000) {
    const k = Math.round(price / 1000);
    return `${k}k`;
  }
  return `${price}`;
}

function isMultiDay(schedule: any): boolean {
  if (!schedule.startDate || !schedule.endDate) return false;
  const s = new Date(schedule.startDate);
  const e = new Date(schedule.endDate);
  return s.toDateString() !== e.toDateString();
}

function resolvePreferredScheduleId(
  schedules: any[] = [],
  preferredStartDate?: string | null,
  preferredEndDate?: string | null,
) {
  if (!preferredStartDate) return null;
  const preferredStart = new Date(preferredStartDate).getTime();
  const preferredEnd = preferredEndDate ? new Date(preferredEndDate).getTime() : null;
  const matchingSchedule = schedules.find((schedule) => {
    const scheduleStart = new Date(schedule.startDate).getTime();
    const scheduleEnd = new Date(schedule.endDate || schedule.startDate).getTime();
    if (Number.isNaN(scheduleStart) || Number.isNaN(scheduleEnd)) return false;
    if (preferredEnd != null) {
      return scheduleStart >= preferredStart && scheduleEnd <= preferredEnd;
    }
    return scheduleStart >= preferredStart;
  });
  return matchingSchedule?.id || null;
}

export default function ScheduleSelectionScreen() {
  const params = useLocalSearchParams<{ serviceData?: string }>();
  const service = params.serviceData ? JSON.parse(params.serviceData) : null;
  const initialPackage = service?.tourPackages?.find((p: any) => p.id === (service?.selectedPackageId || service?.tourPackages?.[0]?.id))
    || service?.tourPackages?.[0];

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    service?.selectedPackageId || service?.tourPackages?.[0]?.id || null,
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    resolvePreferredScheduleId(
      initialPackage?.schedules || [],
      service?.preferredStartDate,
      service?.preferredEndDate,
    ),
  );
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [tierQuantities, setTierQuantities] = useState<Record<string, number>>(
    {},
  );
  const [guestCount, setGuestCount] = useState(0);

  if (!service) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#8d95a3" }}>Không có dữ liệu dịch vụ</Text>
      </View>
    );
  }

  const activePackage =
    service.tourPackages?.find((p: any) => p.id === selectedPackageId) ||
    service.tourPackages?.[0];

  const schedules = activePackage?.schedules || [];
  const pricingTiers = activePackage?.pricingTiers || [];
  const packageGuestBounds = getPackageGuestBounds(activePackage, pricingTiers);
  const policyType =
    activePackage?.cancellationPolicyType ?? service.cancellationPolicyType;
  const policySummary = cancellationPolicySummaries[policyType] || "";

  const selectedSchedule = schedules.find(
    (s: any) => s.id === selectedScheduleId,
  );
  const totalFromTiers = selectedScheduleId
    ? pricingTiers.reduce(
        (sum: number, tier: any) =>
          sum +
          (tierQuantities[tier.id] || 0) *
            getScheduleTierPrice(
              selectedSchedule,
              tier,
              pricingTiers.findIndex((item: any) => item.id === tier.id),
            ),
        0,
      )
    : 0;
  const hasAnyTierQuantity = Object.values(tierQuantities).some((q) => q > 0);
  const usesNamedPricingTiers = pricingTiers.length > 0;
  const totalRequestedGuests = usesNamedPricingTiers
    ? Object.values(tierQuantities).reduce(
        (sum: number, quantity) => sum + (quantity || 0),
        0,
      )
    : guestCount;
  const hasValidQuantitySelection = usesNamedPricingTiers
    ? hasAnyTierQuantity
    : guestCount > 0;
  const displayTotal = usesNamedPricingTiers
    ? (hasAnyTierQuantity ? totalFromTiers : 0)
    : (selectedSchedule ? guestCount * getSchedulePrice(selectedSchedule, pricingTiers) : 0);

  const availableSchedules = schedules.filter(
    (s: any) =>
      s.status !== "cancelled" &&
      getScheduleRemainingCapacity(s) > 0 &&
      new Date(s.startDate) >= new Date(new Date().toDateString()),
  );

  const displaySchedules = (() => {
    const firstThree = availableSchedules.slice(0, 3);
    if (
      selectedScheduleId &&
      !firstThree.some((s: any) => s.id === selectedScheduleId)
    ) {
      const picked = availableSchedules.find(
        (s: any) => s.id === selectedScheduleId,
      );
      if (picked) return [...firstThree, picked];
    }
    return availableSchedules.slice(0, 4);
  })();

  const handleSelectSchedule = (scheduleId: string) => {
    setSelectedScheduleId(
      selectedScheduleId === scheduleId ? null : scheduleId,
    );
    setTierQuantities({});
    setGuestCount(0);
  };

  const handleBook = () => {
    if (!selectedScheduleId || !selectedSchedule) return;

    const totalRequested = totalRequestedGuests;
    const remaining = getScheduleRemainingCapacity(selectedSchedule);

    if (totalRequested < 1) {
      Alert.alert("Thieu so luong", "Vui long chon so khach truoc khi dat.");
      return;
    }

    if (
      !usesNamedPricingTiers &&
      (totalRequested < packageGuestBounds.minGuests ||
        totalRequested > packageGuestBounds.maxGuests)
    ) {
      Alert.alert(
        "So luong khong hop le",
        `Goi nay nhan tu ${packageGuestBounds.minGuests} den ${packageGuestBounds.maxGuests} khach moi lan dat.`,
      );
      return;
    }

    if (totalRequested > remaining) {
      Alert.alert(
        "Không đủ chỗ",
        `Tour này chỉ còn ${remaining} chỗ trống. Bạn đang chọn ${totalRequested} khách. Vui lòng giảm số lượng hoặc chọn lịch khác.`
      );
      return;
    }

    const checkoutData = {
      serviceId: service.id,
      serviceName: service.name,
      serviceImage: service.images?.[0] || "",
      serviceLocation: service.location,
      serviceType: "tour",
      selectedPackageId,
      selectedScheduleId,
      tourScheduleId: selectedScheduleId,
      unitPrice: displayTotal,
      schedulePrice: getSchedulePrice(selectedSchedule, pricingTiers),
      scheduleStartDate: selectedSchedule.startDate,
      scheduleEndDate: selectedSchedule.endDate,
      packageName: activePackage?.name || "",
      pricingTiers,
      tierQuantities,
      guestCount,
      totalFromTiers: displayTotal,
      policyType,
      policySummary,
      remainingSlots: remaining,
    };
    router.push({
      pathname: "/checkout",
      params: { checkoutData: JSON.stringify(checkoutData) },
    } as any);
  };

  const allSchedulesFlat = (service.tourPackages || [])
    .flatMap((pkg: any) =>
      (pkg.schedules || [])
        .filter((s: any) => s.status !== "cancelled")
        .map((s: any) => ({
          ...s,
          packageId: pkg.id,
          packageName: pkg.name,
          pricingTiers: pkg.pricingTiers || [],
        })),
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  const calendarMonths = buildCalendarData(allSchedulesFlat);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={24} color="#1a2332" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {service.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Section 1: Service info + Policy */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Thông tin dịch vụ</Text>
          </View>
          <Text style={styles.serviceName}>{service.name}</Text>
          {policySummary ? (
            <View style={styles.policyRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.policyText}>{policySummary}</Text>
            </View>
          ) : null}
        </View>

        {/* Section 2: Select date */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>Chọn ngày khởi hành</Text>
          </View>

          {availableSchedules.length > 0 ? (
            <View>
              <View style={styles.dateGrid}>
                {displaySchedules.map((schedule: any) => {
                  const isSelected = selectedScheduleId === schedule.id;
                  const d = new Date(schedule.startDate);
                  const month = d.toLocaleDateString("vi-VN", {
                    month: "short",
                  });
                  const day = d.getDate();
                  const multiDay = isMultiDay(schedule);
                  const endD = multiDay ? new Date(schedule.endDate) : null;
                  const endDay = endD ? endD.getDate() : null;
                  const price = getSchedulePrice(schedule, pricingTiers);
                  const durationText = activePackage?.duration || "";
                  return (
                    <TouchableOpacity
                      key={schedule.id}
                      style={[
                        styles.dateCard,
                        multiDay && styles.dateCardMultiDay,
                        isSelected && styles.dateCardSelected,
                      ]}
                      onPress={() => handleSelectSchedule(schedule.id)}
                    >
                      <Text
                        style={[
                          styles.dateCardMonth,
                          isSelected && styles.dateCardMonthSelected,
                        ]}
                      >
                        {month} {!multiDay ? "" : `- ${endD?.toLocaleDateString("vi-VN", { month: "short" })}`}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardDay,
                          isSelected && styles.dateCardDaySelected,
                        ]}
                      >
                        {multiDay ? `${day} - ${endDay}` : day}
                      </Text>
                      <Text
                        style={[
                          styles.dateCardPrice,
                          isSelected && styles.dateCardPriceSelected,
                        ]}
                      >
                        {formatShortPrice(price)}
                      </Text>
                      {multiDay && durationText ? (
                        <Text style={styles.dateCardDuration}>
                          {durationText}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => {
                  setCurrentMonthIndex(0);
                  setShowFullSchedule(true);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.seeAllButtonText}>
                  Xem tất cả lịch khởi hành
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={PRIMARY_COLOR}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={40} color="#c0c7d1" />
              <Text style={styles.emptyText}>Chưa có lịch khởi hành nào</Text>
            </View>
          )}
        </View>

        {/* Section 3: Packages */}
        {service.tourPackages?.length > 1 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Gói dịch vụ</Text>
            </View>
            <View style={styles.packageList}>
              {service.tourPackages.map((pkg: any) => {
                const active = selectedPackageId === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      active && styles.packageCardActive,
                    ]}
                    onPress={() => {
                      setSelectedPackageId(pkg.id);
                      setSelectedScheduleId(
                        resolvePreferredScheduleId(
                          pkg.schedules || [],
                          service?.preferredStartDate,
                          service?.preferredEndDate,
                        ),
                      );
                      setTierQuantities({});
                      setGuestCount(0);
                    }}
                  >
                    <Text
                      style={[
                        styles.packageCardName,
                        active && styles.packageCardNameActive,
                      ]}
                    >
                      {pkg.name}
                    </Text>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? PRIMARY_COLOR : "#c0c7d1"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Section 4: Select quantity */}
        {selectedScheduleId ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionTitle}>Chọn số lượng</Text>
            </View>
            {!usesNamedPricingTiers ? (
              <View style={styles.tierList}>
                <View style={styles.tierRow}>
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>
                      {pricingTiers[0]?.name || "Gia chung"}
                    </Text>
                    <Text style={styles.tierPrice}>
                      {formatShortPrice(
                        getSchedulePrice(selectedSchedule, pricingTiers),
                      )}
                    </Text>
                    <Text style={{ color: "#5a6577", fontSize: 13 }}>
                      {`Ap dung cho ${packageGuestBounds.minGuests}-${packageGuestBounds.maxGuests} khach`}
                    </Text>
                  </View>
                  <View style={styles.tierStepper}>
                    <TouchableOpacity
                      style={[
                        styles.stepperBtn,
                        guestCount <= packageGuestBounds.minGuests &&
                          styles.stepperBtnDisabled,
                      ]}
                      onPress={() =>
                        setGuestCount((prev) =>
                          Math.max(packageGuestBounds.minGuests, prev - 1),
                        )
                      }
                      disabled={guestCount <= packageGuestBounds.minGuests}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={
                          guestCount <= packageGuestBounds.minGuests
                            ? "#c0c7d1"
                            : "#1a2332"
                        }
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{guestCount || 0}</Text>
                    <TouchableOpacity
                      style={[
                        styles.stepperBtn,
                        guestCount >= packageGuestBounds.maxGuests &&
                          styles.stepperBtnDisabled,
                      ]}
                      onPress={() =>
                        setGuestCount((prev) => {
                          const seed =
                            prev > 0 ? prev : packageGuestBounds.minGuests - 1;
                          return Math.min(packageGuestBounds.maxGuests, seed + 1);
                        })
                      }
                      disabled={guestCount >= packageGuestBounds.maxGuests}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={
                          guestCount >= packageGuestBounds.maxGuests
                            ? "#c0c7d1"
                            : "#1a2332"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.tierList}>
                {pricingTiers.map((tier: any) => {
                  const qty = tierQuantities[tier.id] || 0;
                  const minQ = tier.minQuantity || 0;
                  const maxQ = tier.maxQuantity || 99;
                  return (
                    <View key={tier.id} style={styles.tierRow}>
                      <View style={styles.tierInfo}>
                        <Text style={styles.tierName}>{tier.name}</Text>
                        <Text style={styles.tierPrice}>
                          {formatShortPrice(tier.unitPrice)}
                        </Text>
                      </View>
                      <View style={styles.tierStepper}>
                        <TouchableOpacity
                          style={[
                            styles.stepperBtn,
                            qty <= 0 && styles.stepperBtnDisabled,
                          ]}
                          onPress={() =>
                            setTierQuantities((prev) => ({
                              ...prev,
                              [tier.id]:
                                (prev[tier.id] || 0) <= Math.max(minQ, 1)
                                  ? 0
                                  : (prev[tier.id] || 0) - 1,
                            }))
                          }
                          disabled={qty <= 0}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={qty <= 0 ? "#c0c7d1" : "#1a2332"}
                          />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{qty}</Text>
                        <TouchableOpacity
                          style={[
                            styles.stepperBtn,
                            qty >= maxQ && styles.stepperBtnDisabled,
                          ]}
                          onPress={() =>
                            setTierQuantities((prev) => {
                              const current = prev[tier.id] || 0;
                              const next =
                                current === 0
                                  ? Math.max(minQ, 1)
                                  : current + 1;
                              if (next > maxQ) return prev;
                              return { ...prev, [tier.id]: next };
                            })
                          }
                          disabled={qty >= maxQ}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={qty >= maxQ ? "#c0c7d1" : "#1a2332"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Tổng tiền</Text>
          <Text style={styles.bottomPriceValue}>
            {displayTotal.toLocaleString("vi-VN")}đ
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedScheduleId ||
              !hasValidQuantitySelection) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBook}
          disabled={
            !selectedScheduleId ||
            !hasValidQuantitySelection
          }
        >
          <Text style={styles.bookButtonText}>
            {selectedScheduleId ? "Xác nhận đặt chỗ" : "Chọn lịch"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full schedule modal */}
      <Modal
        visible={showFullSchedule}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFullSchedule(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch khởi hành</Text>
              <TouchableOpacity onPress={() => setShowFullSchedule(false)}>
                <Ionicons name="close" size={24} color="#1a2332" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {calendarMonths.length > 0 ? (
                <View>
                  <View style={styles.calendarNav}>
                    <TouchableOpacity
                      style={styles.calendarNavArrow}
                      onPress={() =>
                        setCurrentMonthIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentMonthIndex === 0}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={22}
                        color={
                          currentMonthIndex === 0 ? "#c0c7d1" : PRIMARY_COLOR
                        }
                      />
                    </TouchableOpacity>
                    <Text style={styles.calendarNavLabel}>
                      {calendarMonths[currentMonthIndex]?.monthName}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarNavArrow}
                      onPress={() =>
                        setCurrentMonthIndex((prev) =>
                          Math.min(calendarMonths.length - 1, prev + 1),
                        )
                      }
                      disabled={currentMonthIndex === calendarMonths.length - 1}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={22}
                        color={
                          currentMonthIndex === calendarMonths.length - 1
                            ? "#c0c7d1"
                            : PRIMARY_COLOR
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  {(() => {
                    const month = calendarMonths[currentMonthIndex];
                    if (!month) return null;
                    return (
                      <View style={styles.calendarMonth}>
                        <View style={styles.calendarWeekdayRow}>
                          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(
                            (wd) => (
                              <View key={wd} style={styles.calendarWeekdayCell}>
                                <Text style={styles.calendarWeekdayText}>
                                  {wd}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                        <View style={styles.calendarGrid}>
                          {Array.from({ length: month.firstDayIndex }).map(
                            (_, i) => (
                              <View
                                key={`empty-${i}`}
                                style={styles.calendarCell}
                              />
                            ),
                          )}
                            {Array.from(
                              { length: month.daysInMonth },
                              (_, i) => i + 1,
                            ).map((day) => {
                              const daySchedules = month.schedules.filter(
                                (s: any) =>
                                  new Date(s.startDate).getDate() === day,
                              );
                              const schedule = daySchedules[0];
                              const isPast =
                                schedule &&
                                new Date(schedule.startDate) <
                                  new Date(new Date().toDateString());
                              const isSoldOut =
                                schedule &&
                                schedule.availableSlots - schedule.bookedSlots <=
                                  0;
                              const isCancelled =
                                schedule?.status === "cancelled";
                              const hasSchedule =
                                !!schedule && !isCancelled && !isPast;
                              const price = hasSchedule
                                ? getSchedulePrice(
                                    schedule,
                                    schedule.pricingTiers,
                                  )
                                : 0;
                              const isSelected =
                                hasSchedule && selectedScheduleId === schedule.id;
                              return (
                                <TouchableOpacity
                                  key={day}
                                  style={[
                                    styles.calendarCell,
                                    (isSoldOut || isPast) &&
                                      styles.calendarCellSoldOut,
                                    isSelected && styles.calendarCellSelected,
                                  ]}
                                  onPress={() => {
                                    if (!hasSchedule || isSoldOut) return;
                                    handleSelectSchedule(schedule.id);
                                    setSelectedPackageId(schedule.packageId);
                                    setShowFullSchedule(false);
                                  }}
                                  disabled={!hasSchedule || isSoldOut}
                                >
                                  <Text
                                    style={[
                                      styles.calendarCellDay,
                                      isSelected &&
                                        styles.calendarCellDaySelected,
                                      (isSoldOut || isPast) &&
                                        styles.calendarCellDaySoldOut,
                                    ]}
                                  >
                                    {day}
                                  </Text>
                                  {hasSchedule && !isSoldOut ? (
                                    <Text
                                      style={[
                                        styles.calendarCellPrice,
                                        isSelected &&
                                          styles.calendarCellPriceSelected,
                                      ]}
                                    >
                                      {formatShortPrice(price)}
                                    </Text>
                                  ) : isSoldOut ? (
                                    <Text style={styles.calendarCellSoldOutLabel}>
                                      Hết
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                      </View>
                    );
                  })()}
                  <View style={styles.modalFooter}>
                    <View style={styles.modalFooterRow}>
                      <Ionicons name="cash-outline" size={16} color="#8d95a3" />
                      <Text style={styles.modalFooterText}>
                        Đơn vị tiền: VND
                      </Text>
                    </View>
                    <View style={styles.modalFooterRow}>
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color="#ef4444"
                      />
                      <Text style={styles.modalFooterText}>Hết chỗ</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={40} color="#c0c7d1" />
                  <Text style={styles.emptyText}>
                    Chưa có lịch khởi hành nào
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1a2332",
    textAlign: "center",
    fontFamily: "Inter",
  },
  section: {
    backgroundColor: "#FFF",
    padding: 20,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeaderLine: {
    width: 4,
    height: 22,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 10,
    fontFamily: "Inter",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    color: "#1a2332",
    lineHeight: 22,
    fontFamily: "Inter",
  },
  dateGrid: {
    flexDirection: "row",
    gap: CARD_GAP,
    marginBottom: 14,
  },
  dateCard: {
    width: CARD_WIDTH,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  dateCardMultiDay: {
    backgroundColor: "#fff8e6",
    borderColor: "#f0b400",
  },
  dateCardSelected: {
    backgroundColor: "#e6f5f7",
    borderColor: PRIMARY_COLOR,
  },
  dateCardDuration: {
    fontSize: 9,
    fontWeight: "600",
    color: "#f0b400",
    marginTop: 2,
    fontFamily: "Inter",
  },
  dateCardMonth: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8d95a3",
    textTransform: "capitalize",
    marginBottom: 4,
    fontFamily: "Inter",
  },
  dateCardMonthSelected: {
    color: PRIMARY_COLOR,
  },
  dateCardDay: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 6,
    fontFamily: "Inter",
  },
  dateCardDaySelected: {
    color: "#006f7d",
  },
  dateCardPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  dateCardPriceSelected: {
    color: "#FF6B00",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f4f6f8",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  seeAllButtonText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "500",
    fontFamily: "Inter",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  packageList: {
    gap: 10,
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f4f6f8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  packageCardActive: {
    backgroundColor: "#e6f5f7",
    borderColor: PRIMARY_COLOR,
  },
  packageCardLeft: {
    flex: 1,
    gap: 4,
  },
  packageCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  packageCardNameActive: {
    color: "#006f7d",
  },
  packageCardMeta: {
    fontSize: 13,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  packageCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  packageCardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  tierList: {
    gap: 12,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f4f6f8",
    borderRadius: 12,
    padding: 14,
  },
  tierInfo: {
    gap: 4,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  tierPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  tierStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stepperBtnDisabled: {
    backgroundColor: "#f4f6f8",
    borderColor: "#e2e8f0",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    minWidth: 20,
    textAlign: "center",
    fontFamily: "Inter",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
  },
  bottomPriceLabel: {
    fontSize: 14,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF6B00",
    fontFamily: "Inter",
  },
  bookButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  bookButtonDisabled: {
    backgroundColor: "#c0c7d1",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f4",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  modalScroll: {
    padding: CALENDAR_PADDING,
    paddingBottom: 30,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarNavLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  calendarMonth: {
    marginBottom: 24,
  },
  calendarMonthLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a2332",
    marginBottom: 10,
    fontFamily: "Inter",
  },
  calendarWeekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calendarWeekdayCell: {
    width: CALENDAR_CELL_SIZE,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
  },
  calendarWeekdayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8d95a3",
    fontFamily: "Inter",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE + 18,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: "#f4f6f8",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  calendarCellSelected: {
    backgroundColor: "#e6f5f7",
    borderColor: PRIMARY_COLOR,
  },
  calendarCellSoldOut: {
    backgroundColor: "#f4f6f8",
    borderColor: "#e2e8f0",
    opacity: 0.5,
  },
  calendarCellDay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a2332",
    fontFamily: "Inter",
  },
  calendarCellDaySelected: {
    color: "#006f7d",
  },
  calendarCellDaySoldOut: {
    color: "#b0b8c1",
  },
  calendarCellPrice: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FF6B00",
    marginTop: 2,
    fontFamily: "Inter",
  },
  calendarCellPriceSelected: {
    color: "#FF6B00",
  },
  calendarCellSoldOutLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ef4444",
    marginTop: 2,
    fontFamily: "Inter",
  },
  modalFooter: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f2f4",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalFooterText: {
    fontSize: 13,
    color: "#8d95a3",
    fontFamily: "Inter",
  },
});
