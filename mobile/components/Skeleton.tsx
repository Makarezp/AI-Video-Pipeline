/**
 * Skeleton Loading Component
 * 
 * Minimal shimmer effect for loading states.
 * Follows "Invisible Precision" design philosophy.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors, radii, spacing } from '../utils/theme';

interface SkeletonProps {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: object;
}

export function Skeleton({ width, height, borderRadius = radii.sm, style }: SkeletonProps) {
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 0.6,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity: shimmerAnim },
                style
            ]}
        />
    );
}

/**
 * Timeline skeleton - mimics real segment structure
 */
export function TimelineSkeleton() {
    return (
        <View style={styles.timelineContainer}>
            <Skeleton width="40%" height={56} borderRadius={radii.sm} />
            <View style={styles.gap} />
            <Skeleton width="25%" height={56} borderRadius={radii.sm} />
            <View style={styles.gap} />
            <Skeleton width="35%" height={56} borderRadius={radii.sm} />
        </View>
    );
}

/**
 * Transcript skeleton - minimal lines
 */
export function TranscriptSkeleton() {
    return (
        <View style={styles.transcriptContainer}>
            <Skeleton width="75%" height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="90%" height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="60%" height={14} />
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: colors.bgTertiary,
    },
    timelineContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        height: 72,
        alignItems: 'center',
    },
    gap: {
        width: 2,
    },
    transcriptContainer: {
        padding: spacing.base,
    },
});

export default Skeleton;
