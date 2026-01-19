/**
 * GIGO Design System - CapCut-inspired theme
 * 
 * A comprehensive design token system for consistent styling across the app.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
    // Backgrounds
    bgPrimary: '#050505',      // Deep black
    bgSecondary: '#121212',    // Professional card bg
    bgTertiary: '#1E1E1E',     // Inputs, tracks
    bgElevated: '#252525',     // Hovers, modals

    // Accent Colors
    accentPrimary: '#3B82F6',   // High-vis Blue (Standard Pro)
    accentSecondary: '#8B5CF6', // Purple (Creative)
    accentGold: '#FFD700',      // Gold (Keep/Premium)

    // Semantic Colors
    success: '#10B981',         // Green (Subtle)
    danger: '#EF4444',          // Red
    warning: '#F59E0B',         // Amber
    info: '#3B82F6',            // Blue

    // Text Colors
    textPrimary: '#F2F2F2',     // Off-white (easier on eyes)
    textSecondary: '#A1A1AA',   // Light grey
    textMuted: '#52525B',       // Dark grey

    // Icon Colors
    icon: '#E4E4E7',
    iconInactive: '#52525B',

    // Overlay Colors
    overlay: 'rgba(0, 0, 0, 0.8)',
    overlayLight: 'rgba(255, 255, 255, 0.05)', // Very subtle
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
    // Primary gradient (purple to cyan)
    primary: ['#A855F7', '#00D4FF'] as const,

    // Accent gradient (cyan to purple)
    accent: ['#00D4FF', '#A855F7'] as const,

    // Gold gradient for premium actions
    gold: ['#FFD700', '#FFA500'] as const,

    // Danger gradient for remove actions
    danger: ['#EF4444', '#DC2626'] as const,
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
    // Font families
    fontFamily: {
        primary: 'System',        // SF Pro on iOS, Roboto on Android
        mono: 'monospace',        // For timestamps
    },

    // Font sizes
    fontSize: {
        xs: 10,
        sm: 12,
        md: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 28,
        '4xl': 32,
    },

    // Font weights
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },

    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radii = {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,   // Sharper
    xl: 12,  // Sharper
    '2xl': 16,
    '3xl': 20,
    pill: 999,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    }),
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
    // Durations (ms)
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
    },

    // Easing curves
    easing: {
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
    },
} as const;

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
    // Common sizes
    headerHeight: 56,
    tabBarHeight: 64,
    toolbarHeight: 56,

    // Timeline specific
    timeline: {
        trackHeight: 56,
        segmentPadding: 4,
        playheadWidth: 3,
        waveformHeight: 40,
    },

    // Touch targets (accessibility)
    minTouchTarget: 44,
} as const;

// ============================================================================
// THEME OBJECT (Combined)
// ============================================================================

export const theme = {
    colors,
    gradients,
    typography,
    spacing,
    radii,
    shadows,
    animation,
    layout,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Gradients = typeof gradients;

export default theme;
