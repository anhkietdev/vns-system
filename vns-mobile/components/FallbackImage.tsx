/**
 * FallbackImage — Renders a service-appropriate placeholder image
 * instead of relying on a generic static image (e.g. halong.jpg).
 *
 * Usage: replace `require("@/assets/images/halong.jpg")` with
 *   <FallbackImage serviceType={item.serviceType} style={styles.image} />
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

export type ServiceType = 0 | 1;

/** Map service type → icon + color scheme */
const FALLBACK_CONFIG: Record<
  ServiceType,
  { icon: keyof typeof Ionicons.glyphMap; colors: [string, string] }
> = {
  // Homestay
  0: { icon: "bed-outline", colors: ["#e6f3f5", "#008fa0"] },
  // Tour
  1: { icon: "airplane-outline", colors: ["#FFF3E0", "#FF6B00"] },
};

/** Default fallback for unknown types */
const DEFAULT_CONFIG = {
  icon: "image-outline" as keyof typeof Ionicons.glyphMap,
  colors: ["#f4f6f8", "#8d95a3"] as [string, string],
};

interface FallbackImageProps {
  serviceType?: ServiceType | number;
  style?: ViewStyle;
  iconSize?: number;
}

export default function FallbackImage({
  serviceType,
  style,
  iconSize = 32,
}: FallbackImageProps) {
  const cfg =
    (serviceType === 0 || serviceType === 1)
      ? FALLBACK_CONFIG[serviceType]
      : DEFAULT_CONFIG;

  return (
    <View
      style={[
        localStyles.container,
        { backgroundColor: cfg.colors[0] },
        style,
      ]}
    >
      <Ionicons name={cfg.icon} size={iconSize} color={cfg.colors[1]} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
