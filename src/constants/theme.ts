// src/constants/theme.ts

export const COLORS = {
  // Base
  background: '#121212', // Dark modern background
  surface: '#1E1E1E',    // Cards/Input fields
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',

  // Brand / Actions
  primary: '#B6F09C',    // A "Gen-Z" neon lime green (Healthy & Tech)
  secondary: '#82CFFF',  // Soft blue for information
  
  // Status (Critical for your Rule Engine alerts)
  success: '#B6F09C',    // Safe
  warning: '#FFD56B',    // Moderate
  danger: '#FF6B6B',     // Avoid
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16, // Standard padding
  l: 24,
  xl: 32,
};

export const FONTS = {
  // We can stick to system fonts for efficiency, but weight matters
  bold: '700',
  medium: '500',
  regular: '400',
};