/**
 * GradientButton - A premium button with animated gradient border
 * 
 * Used for primary actions like "New Project" and "Render Video"
 */

import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    View,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, spacing, radii } from '../utils/theme';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'gold' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}

export default function GradientButton({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    icon,
    disabled = false,
    loading = false,
    style,
}: GradientButtonProps) {
    const gradientColors = {
        primary: gradients.primary,
        gold: gradients.gold,
        danger: gradients.danger,
    }[variant];

    const sizeStyles: Record<string, { padding: number; fontSize: number }> = {
        sm: { padding: spacing.sm, fontSize: typography.fontSize.sm },
        md: { padding: spacing.base, fontSize: typography.fontSize.base },
        lg: { padding: spacing.lg, fontSize: typography.fontSize.lg },
    };

    const { padding, fontSize } = sizeStyles[size];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[styles.container, style]}
        >
            <LinearGradient
                colors={disabled ? [colors.bgTertiary, colors.bgTertiary] : gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
            >
                <View style={[styles.inner, { padding }]}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text
                        style={[
                            styles.text,
                            { fontSize },
                            disabled && styles.textDisabled,
                        ]}
                    >
                        {loading ? '⏳' : title}
                    </Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radii.xl,
        overflow: 'hidden',
    },
    gradientBorder: {
        padding: 2, // Border width
        borderRadius: radii.xl,
    },
    inner: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.xl - 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: spacing.sm,
    },
    text: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        textAlign: 'center',
    },
    textDisabled: {
        color: colors.textMuted,
    },
});
