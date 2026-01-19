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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows } from '../utils/theme';

export interface ToolbarAction {
    id: string;
    iconName: keyof typeof Ionicons.glyphMap;
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
                        <Ionicons
                            name={action.iconName}
                            size={24}
                            color={action.disabled ? colors.iconInactive : (action.active ? colors.accentPrimary : colors.icon)}
                            style={{ marginBottom: 4 }}
                        />
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
        borderRadius: radii.xl, // Sharper than pill
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        // Removed glassmorphism border
        ...shadows.lg,
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
