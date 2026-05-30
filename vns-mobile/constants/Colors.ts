/**
 * VNS App Color System - Đồng bộ với web (primary teal #008fa0)
 */

// Brand colors - đồng bộ với vns-fe
export const Brand = {
  primary: "#008fa0",
  primaryHover: "#007a8a",
  primaryLight: "#e6f3f5",
  accent: "#FF6B00",
  accentLight: "#FFF3E8",
  success: "#16a34a",
  error: "#dc2626",
  warning: "#d97706",
  rating: "#F59E0B",
};

// Text colors
export const TextColors = {
  primary: "#1a2332",
  secondary: "#5a6577",
  muted: "#8d95a3",
  inverse: "#ffffff",
};

// Background colors
export const BgColors = {
  page: "#f4f6f8",
  card: "#ffffff",
  input: "#f8fafc",
  hover: "#f1f5f9",
};

// Border colors
export const BorderColors = {
  default: "#e8ecf0",
  light: "#f0f2f4",
};

// Gradient overlay
const overlayTransparent = "rgba(0,0,0,0.5)";
const overlayDark30 = "rgba(0,0,0,0.3)";
const overlayPrimary75 = "rgba(0,143,160,0.75)";
const overlayWhiteTransparent = "rgba(255,255,255,0.2)";

export const OverlayColors = {
  dark50: overlayTransparent,
  dark30: overlayDark30,
  primary75: overlayPrimary75,
  white20: overlayWhiteTransparent,
};

// Common spacing values
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Spacing = {
  ...spacing,
  screenPaddingHoriz: 20,
  screenPaddingTop: 20,
  sectionMarginTop: 24,
  cardBorderRadius: 20,
  buttonBorderRadius: 14,
  inputBorderRadius: 12,
  smallBorderRadius: 8,
};

// Typography sizes
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

const tintColorLight = Brand.primary;
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: TextColors.primary,
    background: BgColors.card,
    tint: tintColorLight,
    icon: TextColors.muted,
    tabIconDefault: TextColors.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
