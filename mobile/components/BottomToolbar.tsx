/**
 * BottomToolbar - Context-aware toolbar with glassmorphism effect
 * 
 * Displays action buttons for the currently selected context in the editor.
 */

import React from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
} from 'react-native';
import { colors, spacing, radii, shadows } from '../utils/theme';

export interface ToolbarAction {
    id: string;
    icon: string;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    active?: boolean;
}

interface BottomToolbarProps {
    actions: ToolbarAction[];
    style?: object;
}

export default function BottomToolbar({ actions, style }: BottomToolbarProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.toolbar}>
                {actions.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={[
                            styles.button,
                            action.active && styles.buttonActive,
                            action.disabled && styles.buttonDisabled,
                        ]}
                        onPress={action.onPress}
                        disabled={action.disabled}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.icon,
                                action.active && styles.iconActive,
                                action.disabled && styles.iconDisabled,
                            ]}
                        >
                            {action.icon}
                        </Text>
                        <Text
                            style={[
                                styles.label,
                                action.active && styles.labelActive,
                                action.disabled && styles.labelDisabled,
                            ]}
                        >
                            {action.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        // Glassmorphism effect
        borderWidth: 1,
        borderColor: colors.overlayLight,
        ...shadows.md,
    },
    button: {
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        minWidth: 56,
    },
    buttonActive: {
        backgroundColor: colors.bgTertiary,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    icon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    iconActive: {
        // Icon styling for active state
    },
    iconDisabled: {
        // Icon styling for disabled state
    },
    label: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    labelActive: {
        color: colors.accentPrimary,
    },
    labelDisabled: {
        color: colors.textMuted,
    },
});
