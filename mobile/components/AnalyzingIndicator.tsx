/**
 * AnalyzingIndicator Component
 * 
 * Minimal, professional loading indicator.
 * Follows "Invisible Precision" design philosophy.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../utils/theme';

export function AnalyzingIndicator() {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        // Subtle pulse animation - professional, not flashy
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    return (
        <View style={styles.container}>
            {/* Simple pulsing aperture icon - like a camera processing */}
            <Animated.View style={{ opacity: pulseAnim }}>
                <Ionicons name="aperture" size={28} color={colors.textSecondary} />
            </Animated.View>

            {/* Minimal status text */}
            <Text style={styles.statusText}>Analyzing</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing['2xl'],
    },
    statusText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: 0.5,
    },
});

export default AnalyzingIndicator;
