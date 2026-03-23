// src/constants/theme.ts
// Nutriwise Design System

export const COLORS = {
  // Base Surface Colors
  surface: '#F9F9F9',              // Base background
  surface_container_low: '#F3F3F3', // Sectioning
  surface_container_lowest: '#FFFFFF', // Cards/Elements
  surface_container_highest: '#E2E2E2', // High priority cards
  surface_bright: '#FFFFFF',        // Active/interactive states
  surface_variant: '#F5F5F5',       // Alternative surfaces

  // Primary Palette - Vital Greens
  primary: '#006E1C',               // Foundational anchor
  primary_container: '#4CAF50',     // Fresh Leaf Green
  on_primary: '#FFFFFF',            // Text on primary
  on_primary_container: '#FFFFFF',   // Text on primary container

  // Secondary & Tertiary - Medical Blue-Greens
  secondary: '#3B6663',             // Medical Blue-Grey 1
  tertiary: '#466270',             // Medical Blue-Grey 2
  on_secondary: '#FFFFFF',        // Text on secondary
  on_tertiary: '#FFFFFF',          // Text on tertiary

  // Error & Risk Colors
  error: '#BA1A1A',                // High Risk
  error_container: '#FFDAD6',      // Error background
  on_error: '#FFFFFF',             // Text on error
  on_error_container: '#410002',   // Text on error container

  // Text Colors
  on_surface: '#1A1C1C',           // Primary text (soft professional)
  on_surface_variant: '#49454F',   // Secondary text
  outline_variant: '#CAC4D0',      // Ghost borders

  // Custom Risk Colors
  risk_high: '#BA1A1A',            // High Risk (same as error)
  risk_medium: '#FF8F00',         // Medium Risk (amber)
  risk_low: '#006E1C',             // Low Risk (same as primary)

  // Glassmorphism & Special
  glass_surface: 'rgba(255, 255, 255, 0.7)', // Semi-transparent surface
  ghost_border: 'rgba(202, 196, 208, 0.15)', // Ghost border at 15% opacity

  // Backwards-compatible aliases (older screens reference these keys)
  background: '#F9F9F9',
  textPrimary: '#1A1C1C',
  textSecondary: '#49454F',
  success: '#006E1C',
  warning: '#FF8F00',
  danger: '#BA1A1A',
};

export const SPACING = {
  // Following Material Design 3 spacing scale
  xs: 4,      // 0.25rem
  s: 8,       // 0.5rem
  m: 16,      // 1rem
  l: 24,      // 1.5rem
  xl: 32,     // 2rem
  xxl: 48,    // 3rem
  xxxl: 64,   // 4rem
  spacing_6: 24, // Outer padding for mobile layouts
  spacing_16: 64, // Major content group separation
};

export const TYPOGRAPHY = {
  // Display & Headlines (Manrope - premium editorial)
  display_lg: 56,    // 3.5rem
  display_md: 44,    // 2.75rem
  display_sm: 36,    // 2.25rem
  
  // Headlines (Manrope)
  headline_lg: 32,   // 2rem
  headline_md: 28,   // 1.75rem
  headline_sm: 24,   // 1.5rem
  
  // Body & Labels (Inter - exceptional readability)
  body_lg: 16,       // 1rem
  body_md: 14,       // 0.875rem
  body_sm: 12,       // 0.75rem
  
  // Labels
  label_lg: 14,      // 0.875rem
  label_md: 12,      // 0.75rem
  label_sm: 11,      // 0.6875rem
};

export const FONTS = {
  display: 'Manrope',     // Premium editorial font
  body: 'Inter',          // Highly readable font
  weight_bold: 'bold' as const,
  weight_medium: 'medium' as const,
  weight_regular: 'regular' as const,
};

export const BORDER_RADIUS = {
  sm: 8,      // 0.5rem
  md: 12,     // 0.75rem
  lg: 16,     // 1rem
  xl: 24,     // 1.5rem
  xxl: 32,    // 2rem
};

export const ELEVATION = {
  // Ambient shadows for floating elements
  floating: {
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  card: {
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
};