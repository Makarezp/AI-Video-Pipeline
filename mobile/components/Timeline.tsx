/**
 * Timeline - CapCut-style Fixed Playhead Scrubber with Thumbnails & Zoom
 * 
 * Architecture:
 * - Fixed playhead in screen center
 * - Animated.ScrollView (Simple & Robust)
 * - Pinch-to-Zoom (Updates pixelsPerSecond)
 * - Restored "Traffic Light" Visuals & Context Panel
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    Dimensions,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedRef,
    runOnJS,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { TimelineSegment, getThumbnailUrl } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CENTER_OFFSET = SCREEN_WIDTH / 2;

// Zoom Limits
const MIN_PPS = 10;
const MAX_PPS = 150;
const INITIAL_PPS = 50;

interface TimelineProps {
    segments: TimelineSegment[];
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    onToggleSegment: (index: number) => void;
    projectId?: string;
    thumbnailCount?: number;
}

/**
 * ThumbnailImage - Lazy-loaded thumbnail with retry
 */
function ThumbnailImage({
    projectId,
    index,
    width
}: {
    projectId: string;
    index: number;
    width: number;
}) {
    const [hasError, setHasError] = useState(false);
    const uri = getThumbnailUrl(projectId, index);

    if (hasError) return <View style={[styles.thumbnailPlaceholder, { width }]} />;

    return (
        <Image
            source={{ uri }}
            style={[styles.thumbnail, { width }]}
            resizeMode="cover"
            onError={() => setHasError(true)}
        />
    );
}

export default function Timeline({
    segments,
    duration,
    currentTime,
    onSeek,
    onToggleSegment,
    projectId,
    thumbnailCount = 0,
}: TimelineProps) {
    // State
    const [pixelsPerSecond, setPixelsPerSecond] = useState(INITIAL_PPS);

    // Reanimated Shared Values
    const scrollX = useSharedValue(0);
    const isScrubbing = useSharedValue(false);
    const lastSeekTime = useSharedValue(0);
    const scale = useSharedValue(1); // Visual scale during pinch

    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    // Derived Geometry
    const currentPPS = pixelsPerSecond; // We use state for layout to ensure consistency
    const timelineWidth = duration * currentPPS;

    // Zoom Gesture
    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = e.scale;
        })
        .onEnd((e) => {
            let newPPS = pixelsPerSecond * e.scale;
            newPPS = Math.max(MIN_PPS, Math.min(newPPS, MAX_PPS));
            runOnJS(setPixelsPerSecond)(newPPS);
            scale.value = withTiming(1);
        });

    // Scroll Handler
    const isScrubbingRef = useRef(false);
    const setScrubbingRef = (val: boolean) => { isScrubbingRef.current = val; };

    const performSeek = useCallback((time: number) => {
        if (Math.abs(time - lastSeekTime.value) > 0.05) {
            lastSeekTime.value = time;
            onSeek(Math.max(0, Math.min(duration, time)));
        }
    }, [onSeek, duration]);

    const scrollHandler = useAnimatedScrollHandler({
        onBeginDrag: () => {
            isScrubbing.value = true;
            runOnJS(setScrubbingRef)(true);
        },
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
            if (isScrubbing.value) {
                const time = event.contentOffset.x / currentPPS;
                runOnJS(performSeek)(time);
            }
        },
        onMomentumEnd: () => {
            isScrubbing.value = false;
            runOnJS(setScrubbingRef)(false);
        },
    });

    // Sync Playback -> Scroll
    useEffect(() => {
        if (!isScrubbingRef.current && scrollRef.current) {
            const targetX = currentTime * currentPPS;
            (scrollRef.current as any).scrollTo?.({ x: targetX, animated: false });
        }
    }, [currentTime, currentPPS]);

    // Current Segment Computation
    const currentSegmentIndex = segments.findIndex(
        seg => currentTime >= seg.start && currentTime < seg.end
    );
    const currentSegment = currentSegmentIndex >= 0 ? segments[currentSegmentIndex] : null;

    // Rendering Helpers
    const thumbnailSeconds = thumbnailCount > 0 ? thumbnailCount : Math.ceil(duration);
    const thumbnailWidth = timelineWidth / thumbnailSeconds;
    const thumbnailIndices = Array.from({ length: thumbnailSeconds }, (_, i) => i + 1);

    // Animated Container Style (for Pinch visual feedback)
    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: scale.value }],
        // Pivot point? Default is center. We might want pivot to be playhead.
        // For simplicity, we just scale. The "jump" on end is acceptable for MVP.
    }));

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {/* Header / Stats */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => setPixelsPerSecond(p => Math.max(MIN_PPS, p - 25))}
                    style={styles.zoomButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="remove-circle-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.timeStats}>
                    <Text style={styles.timeCodeText}>
                        {formatTime(currentTime)}
                        <Text style={styles.durationCodeText}> / {formatTime(duration)}</Text>
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => setPixelsPerSecond(p => Math.min(MAX_PPS, p + 25))}
                    style={styles.zoomButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Scale Container */}
            <GestureDetector gesture={pinch}>
                <View style={styles.scrubberContainer}>
                    {/* Fixed Playhead */}
                    <View style={styles.playhead} pointerEvents="none">
                        <View style={styles.playheadHead} />
                        <View style={styles.playheadLine} />
                    </View>

                    <Animated.ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: CENTER_OFFSET }}
                    >
                        {/* The Scalable Content */}
                        <Animated.View style={[{ width: timelineWidth, height: '100%' }, containerAnimatedStyle]}>

                            {/* Thumbnails - Adaptive Sampling */}
                            {projectId && thumbnailCount > 0 && (
                                <View style={styles.thumbnailsTrack}>
                                    {thumbnailIndices.filter((_, i) => {
                                        // LOD: At low zoom, show fewer thumbnails to avoid 1px slivers
                                        // PPS < 20: Show every 5th second (50px width)
                                        // PPS < 40: Show every 2nd second
                                        // Else: Show every second
                                        const stride = currentPPS < 20 ? 5 : currentPPS < 40 ? 2 : 1;
                                        return i % stride === 0;
                                    }).map((index) => {
                                        const stride = currentPPS < 20 ? 5 : currentPPS < 40 ? 2 : 1;
                                        // Width of this thumbnail block covers 'stride' seconds
                                        const thumbWidth = currentPPS * stride;

                                        return (
                                            <ThumbnailImage
                                                key={index}
                                                projectId={projectId}
                                                index={index}
                                                width={thumbWidth}
                                            />
                                        );
                                    })}
                                </View>
                            )}

                            {/* Markers */}
                            <View style={styles.timeMarkersRow}>
                                {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => {
                                    const t = i * 5;
                                    return (
                                        <View key={t} style={[styles.timeMarker, { left: t * currentPPS }]}>
                                            <Text style={styles.timeMarkerText}>{formatTime(t)}</Text>
                                            <View style={styles.timeMarkerTick} />
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Segments */}
                            <View style={styles.segmentsTrack}>
                                {segments.map((segment, index) => {
                                    const isKeep = segment.action === 'keep';
                                    const width = (segment.end - segment.start) * currentPPS;
                                    const left = segment.start * currentPPS;

                                    // Minimum width for touch target
                                    const displayWidth = Math.max(width - 2, 2);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.segmentBlock,
                                                {
                                                    left,
                                                    width: displayWidth,
                                                    backgroundColor: isKeep ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                                                    borderColor: isKeep ? colors.success : colors.danger,
                                                    borderTopWidth: 4, // Traffic Light
                                                }
                                            ]}
                                            onPress={() => onToggleSegment(index)}
                                            activeOpacity={0.7}
                                        />
                                    );
                                })}
                            </View>
                        </Animated.View>
                    </Animated.ScrollView>
                </View>
            </GestureDetector>

            {/* Context Panel (RESTORED) */}
            {currentSegment && (
                <View style={styles.segmentInfoContainer}>
                    <View style={styles.textWrapper}>
                        <Text style={[
                            styles.segmentReasonText,
                            currentSegment.action !== 'keep' && { color: colors.textSecondary }
                        ]}>
                            {currentSegment.reason || `Segment ${currentSegmentIndex + 1}`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => onToggleSegment(currentSegmentIndex)}
                        style={styles.visibilityButton}
                    >
                        <Ionicons
                            name={currentSegment.action === 'keep' ? "eye" : "eye-off"}
                            size={24}
                            color={currentSegment.action === 'keep' ? colors.textPrimary : colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgSecondary,
        marginVertical: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    timeStats: {
        alignItems: 'center',
    },
    zoomButton: {
        padding: 4,
    },
    timeCodeText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    durationCodeText: {
        color: colors.textMuted,
        fontWeight: 'normal',
    },
    scrubberContainer: {
        height: 100,
        position: 'relative',
    },
    playhead: {
        position: 'absolute',
        left: CENTER_OFFSET - 1,
        top: 0,
        bottom: 0,
        width: 2,
        zIndex: 100,
        alignItems: 'center',
    },
    playheadHead: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#fff',
        marginTop: 4,
    },
    playheadLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#fff',
    },
    timeMarkersRow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 20,
    },
    timeMarker: {
        position: 'absolute',
        alignItems: 'center',
    },
    timeMarkerText: {
        fontSize: 9,
        color: colors.textMuted,
        fontFamily: typography.fontFamily.mono,
    },
    timeMarkerTick: {
        width: 1,
        height: 4,
        backgroundColor: colors.textMuted,
        marginTop: 2,
    },
    thumbnailsTrack: {
        position: 'absolute',
        top: 20,
        left: 0,
        flexDirection: 'row',
        height: 70,
        borderRadius: radii.sm,
        overflow: 'hidden',
    },
    thumbnail: {
        height: 70,
    },
    thumbnailPlaceholder: {
        height: 70,
        backgroundColor: colors.bgTertiary,
    },
    segmentsTrack: {
        position: 'absolute',
        top: 20,
        left: 0,
        height: 70,
    },
    segmentBlock: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        borderRadius: radii.sm,
    },
    segmentInfoContainer: {
        padding: spacing.base,
        borderTopWidth: 1,
        borderTopColor: colors.bgTertiary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        minHeight: 80,
    },
    textWrapper: {
        flex: 1,
    },
    segmentReasonText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
    visibilityButton: {
        padding: spacing.sm,
        backgroundColor: colors.bgTertiary,
        borderRadius: radii.md,
    },
});
