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
    bgPrimary: '#0D0D0D',      // Main app background
    bgSecondary: '#1A1A1A',    // Cards, containers
    bgTertiary: '#2A2A2A',     // Timeline track, inputs
    bgElevated: '#333333',     // Elevated elements, hover states

    // Accent Colors
    accentPrimary: '#00D4FF',   // Primary actions, active states (cyan)
    accentSecondary: '#A855F7', // Gradients, highlights (purple)
    accentGold: '#FFD700',      // Premium actions, render button

    // Semantic Colors
    success: '#22C55E',         // Keep segments, positive actions
    danger: '#EF4444',          // Remove segments, destructive actions
    warning: '#F59E0B',         // Warnings, cautions
    info: '#3B82F6',            // Information, tips

    // Text Colors
    textPrimary: '#FFFFFF',     // Headings, primary text
    textSecondary: '#888888',   // Labels, hints
    textMuted: '#555555',       // Disabled states, placeholders

    // Overlay Colors
    overlay: 'rgba(0, 0, 0, 0.6)',        // Modal overlays
    overlayLight: 'rgba(255, 255, 255, 0.1)', // Glass effect
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
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
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
