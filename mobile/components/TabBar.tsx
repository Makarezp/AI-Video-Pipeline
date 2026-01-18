/**
 * TabBar - Custom floating tab navigation with glassmorphism
 * 
 * Used for main app navigation: Home, Templates, Profile
 */

import React from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
} from 'react-native';
import { colors, spacing, radii, shadows } from '../utils/theme';

export interface TabItem {
    id: string;
    icon: string;
    label: string;
}

interface TabBarProps {
    tabs: TabItem[];
    activeTab: string;
    onTabPress: (tabId: string) => void;
    style?: object;
}

export default function TabBar({ tabs, activeTab, onTabPress, style }: TabBarProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.tabBar}>
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, isActive && styles.tabActive]}
                            onPress={() => onTabPress(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.icon, isActive && styles.iconActive]}>
                                {tab.icon}
                            </Text>
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        // Glassmorphism effect
        borderWidth: 1,
        borderColor: colors.overlayLight,
        ...shadows.lg,
    },
    tab: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
    },
    tabActive: {
        backgroundColor: colors.bgTertiary,
    },
    icon: {
        fontSize: 22,
        marginBottom: spacing.xs,
        opacity: 0.6,
    },
    iconActive: {
        opacity: 1,
    },
    label: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    labelActive: {
        color: colors.accentPrimary,
    },
});
