/**
 * Timeline - Thumbnail card-based segment navigation
 * 
 * Features:
 * - Horizontal scrollable segment cards with thumbnail placeholders
 * - Text overlaid on thumbnail with gradient overlay
 * - Tap to navigate, long-press to toggle
 */

import React, { useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    ScrollView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TimelineSegment } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 180;
const CARD_HEIGHT = 130;

interface TimelineProps {
    segments: TimelineSegment[];
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    onToggleSegment: (index: number) => void;
}

export default function Timeline({
    segments,
    duration,
    currentTime,
    onSeek,
    onToggleSegment,
}: TimelineProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    // Find current segment index
    const currentSegmentIndex = segments.findIndex(
        seg => currentTime >= seg.start && currentTime < seg.end
    );

    // Auto-scroll to current segment
    useEffect(() => {
        if (currentSegmentIndex >= 0 && scrollViewRef.current) {
            const scrollX = currentSegmentIndex * (CARD_WIDTH + spacing.sm) - SCREEN_WIDTH / 2 + CARD_WIDTH / 2;
            scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
        }
    }, [currentSegmentIndex]);

    const formatDuration = (start: number, end: number): string => {
        const secs = Math.round(end - start);
        if (secs < 60) return `${secs}s`;
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    const getReasonLabel = (reason: string): string => {
        return reason || 'Segment';
    };

    // Count stats
    const keepCount = segments.filter(s => s.action === 'keep').length;
    const removeCount = segments.filter(s => s.action === 'remove').length;

    return (
        <View style={styles.container}>
            {/* Header with counts */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Segments</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBadge}>
                        <View style={[styles.statDot, { backgroundColor: colors.success }]} />
                        <Text style={styles.statText}>{keepCount}</Text>
                    </View>
                    <View style={styles.statBadge}>
                        <View style={[styles.statDot, { backgroundColor: colors.danger }]} />
                        <Text style={styles.statText}>{removeCount}</Text>
                    </View>
                </View>
            </View>

            {/* Segment cards */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {segments.map((segment, index) => {
                    const isKeep = segment.action === 'keep';
                    const isCurrent = index === currentSegmentIndex;
                    const segmentDuration = formatDuration(segment.start, segment.end);

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.card,
                                { borderColor: isKeep ? colors.success : colors.danger },
                                isCurrent && styles.cardCurrent,
                            ]}
                            onPress={() => onSeek(segment.start)}
                            onLongPress={() => onToggleSegment(index)}
                            activeOpacity={0.8}
                            delayLongPress={300}
                        >
                            {/* Thumbnail placeholder */}
                            <View style={[
                                styles.thumbnailPlaceholder,
                                { backgroundColor: isKeep ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                            ]}>
                                {/* Future: Image component for actual thumbnail */}
                            </View>

                            {/* Text overlay with gradient */}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.85)']}
                                style={styles.overlay}
                            >
                                <View style={styles.overlayContent}>
                                    <Text style={styles.reasonText}>
                                        {getReasonLabel(segment.reason)}
                                    </Text>
                                    <View style={styles.bottomRow}>
                                        <Text style={styles.durationText}>{segmentDuration}</Text>
                                        <Text style={[
                                            styles.actionIcon,
                                            { color: isKeep ? colors.success : colors.danger }
                                        ]}>
                                            {isKeep ? '✓' : '✕'}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* Current indicator */}
                            {isCurrent && (
                                <View style={styles.currentBadge}>
                                    <Text style={styles.currentText}>▶</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Hint */}
            <Text style={styles.hint}>
                Tap to preview • Hold to toggle
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        marginHorizontal: spacing.base,
        marginVertical: spacing.sm,
        paddingVertical: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
    scrollContent: {
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: radii.md,
        overflow: 'hidden',
        borderWidth: 2,
    },
    cardCurrent: {
        borderColor: colors.accentPrimary,
        borderWidth: 3,
    },
    thumbnailPlaceholder: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    overlayContent: {
        padding: spacing.xs,
    },
    reasonText: {
        fontSize: 12,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
        lineHeight: 15,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    durationText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontFamily: typography.fontFamily.mono,
    },
    actionIcon: {
        fontSize: 12,
        fontWeight: typography.fontWeight.bold,
    },
    currentBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: colors.accentPrimary,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currentText: {
        fontSize: 8,
        color: colors.bgPrimary,
    },
    hint: {
        textAlign: 'center',
        fontSize: 10,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
});
