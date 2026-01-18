/**
 * Timeline - CapCut-style Fixed Playhead Scrubber with Thumbnails
 * 
 * Architecture based on Reanimated best practices:
 * - Fixed playhead in screen center
 * - Animated.ScrollView with UI-thread scroll handler
 * - isScrubbing flag prevents feedback loop
 * - Segment blocks with proportional widths
 * - Thumbnail filmstrip using lazy-loaded images
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    Dimensions,
    Image,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedRef,
    runOnJS,
    scrollTo,
} from 'react-native-reanimated';
import { TimelineSegment, getThumbnailUrl } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_MARGIN = spacing.base * 2; // Left + Right margin
const CONTAINER_WIDTH = SCREEN_WIDTH - CONTAINER_MARGIN;
const CENTER_OFFSET = CONTAINER_WIDTH / 2;
const PIXELS_PER_SECOND = 50; // Zoom level
const THUMBNAIL_WIDTH = 50; // Width of each thumbnail in pixels

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
 * ThumbnailImage - Lazy-loaded thumbnail with retry on error
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
    const [retryCount, setRetryCount] = useState(0);
    const [hasError, setHasError] = useState(false);
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 5000];

    const handleError = useCallback(() => {
        if (retryCount < maxRetries) {
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setHasError(false);
            }, retryDelays[retryCount] || 5000);
        }
        setHasError(true);
    }, [retryCount]);

    const uri = getThumbnailUrl(projectId, index);

    if (hasError && retryCount >= maxRetries) {
        return (
            <View style={[styles.thumbnailPlaceholder, { width }]} />
        );
    }

    return (
        <Image
            key={`${uri}-${retryCount}`}
            source={{ uri }}
            style={[styles.thumbnail, { width }]}
            resizeMode="cover"
            onError={handleError}
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
    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    // Shared values (UI thread)
    const scrollX = useSharedValue(0);
    const isScrubbing = useSharedValue(false);
    const lastSeekTime = useSharedValue(0);

    // Timeline geometry
    const timelineWidth = duration * PIXELS_PER_SECOND;
    const contentWidth = timelineWidth + CENTER_OFFSET * 2;

    // Calculate thumbnail data
    const thumbnailSeconds = thumbnailCount > 0 ? thumbnailCount : Math.ceil(duration);
    const thumbnailWidth = timelineWidth / thumbnailSeconds;

    // JS thread seek function (called from UI thread via runOnJS)
    const performSeek = useCallback((time: number) => {
        // Throttle: only seek if change > 50ms
        if (Math.abs(time - lastSeekTime.value) > 0.05) {
            lastSeekTime.value = time;
            onSeek(Math.max(0, Math.min(duration, time)));
        }
    }, [onSeek, duration]);

    // Sync playback position to scroll (when not scrubbing)
    // Using a ref to track scrubbing state on JS thread
    const isScrubbingRef = React.useRef(false);

    // Helper to update scrubbing ref from UI thread
    const setScrubbingRef = useCallback((value: boolean) => {
        isScrubbingRef.current = value;
    }, []);

    // Animated scroll handler (runs on UI thread)
    const scrollHandler = useAnimatedScrollHandler({
        onBeginDrag: () => {
            isScrubbing.value = true;
            runOnJS(setScrubbingRef)(true); // Immediate update to JS thread
        },
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
            // Only seek when user is actively dragging (not during programmatic scroll)
            if (isScrubbing.value) {
                const time = event.contentOffset.x / PIXELS_PER_SECOND;
                runOnJS(performSeek)(time);
            }
        },
        onEndDrag: () => {
            // Keep scrubbing true during momentum
        },
        onMomentumEnd: () => {
            isScrubbing.value = false;
            runOnJS(setScrubbingRef)(false); // Immediate update to JS thread
        },
    });

    // Sync scroll position to playback time using native scrollTo
    useEffect(() => {
        if (!isScrubbingRef.current && scrollRef.current) {
            const targetX = currentTime * PIXELS_PER_SECOND;
            // Use animated: false for instant updates (video sends 60fps updates)
            (scrollRef.current as any).scrollTo?.({ x: targetX, animated: false });
        }
    }, [currentTime]);

    // Find current segment
    const currentSegmentIndex = segments.findIndex(
        seg => currentTime >= seg.start && currentTime < seg.end
    );
    const currentSegment = currentSegmentIndex >= 0 ? segments[currentSegmentIndex] : null;

    // Generate time markers
    const markerInterval = duration > 60 ? 10 : duration > 30 ? 5 : 2;
    const timeMarkers = [];
    for (let t = 0; t <= duration; t += markerInterval) {
        timeMarkers.push(t);
    }

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Stats
    const keepCount = segments.filter(s => s.action === 'keep').length;
    const removeCount = segments.filter(s => s.action === 'remove').length;

    // Generate thumbnail indices (1-indexed)
    const thumbnailIndices = Array.from({ length: thumbnailSeconds }, (_, i) => i + 1);

    return (
        <View style={styles.container}>
            {/* Header with time display */}
            <View style={styles.header}>
                <Text style={styles.currentTimeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.durationText}>/ {formatTime(duration)}</Text>
                <View style={styles.statsRow}>
                    <View style={[styles.statBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.statText}>✓{keepCount}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: colors.danger }]}>
                        <Text style={styles.statText}>✕{removeCount}</Text>
                    </View>
                </View>
            </View>

            {/* Timeline scrubber */}
            <View style={styles.scrubberContainer}>
                {/* Fixed center playhead */}
                <View style={styles.playhead} pointerEvents="none">
                    <View style={styles.playheadHead} />
                    <View style={styles.playheadLine} />
                </View>

                {/* Animated scrollable timeline */}
                {/* Animated scrollable timeline */}
                <Animated.ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    bounces={false}
                >
                    {/* Left Spacer */}
                    <View style={{ width: CENTER_OFFSET }} />

                    {/* Timeline Content Container */}
                    <View style={{ width: timelineWidth, height: '100%' }}>
                        {/* Time markers row */}
                        <View style={styles.timeMarkersRow}>
                            {timeMarkers.map((time) => (
                                <View
                                    key={time}
                                    style={[styles.timeMarker, { left: time * PIXELS_PER_SECOND }]}
                                >
                                    <Text style={styles.timeMarkerText}>{formatTime(time)}</Text>
                                    <View style={styles.timeMarkerTick} />
                                </View>
                            ))}
                        </View>

                        {/* Thumbnails track (background layer) */}
                        {projectId && thumbnailCount > 0 && (
                            <View style={[styles.thumbnailsTrack, { width: timelineWidth }]}>
                                {thumbnailIndices.map((index) => (
                                    <ThumbnailImage
                                        key={index}
                                        projectId={projectId}
                                        index={index}
                                        width={thumbnailWidth}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Segments track (overlay) */}
                        <View style={[styles.segmentsTrack, { width: timelineWidth }]}>
                            {segments.map((segment, index) => {
                                const isKeep = segment.action === 'keep';
                                const segmentWidth = (segment.end - segment.start) * PIXELS_PER_SECOND;
                                const segmentLeft = segment.start * PIXELS_PER_SECOND;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.segmentBlock,
                                            {
                                                left: segmentLeft,
                                                width: Math.max(segmentWidth, 4), // Min width
                                                borderColor: isKeep ? colors.success : colors.danger,
                                            }
                                        ]}
                                        onPress={() => onToggleSegment(index)}
                                        activeOpacity={0.8}
                                    />
                                );
                            })}
                        </View>
                    </View>

                    {/* Right Spacer */}
                    <View style={{ width: CENTER_OFFSET }} />
                </Animated.ScrollView>
            </View>

            {/* Current segment info */}
            {currentSegment && (
                <TouchableOpacity
                    style={styles.segmentInfo}
                    onPress={() => currentSegmentIndex >= 0 && onToggleSegment(currentSegmentIndex)}
                    activeOpacity={0.8}
                >
                    <View style={[
                        styles.segmentBadge,
                        { backgroundColor: currentSegment.action === 'keep' ? colors.success : colors.danger }
                    ]}>
                        <Text style={styles.segmentBadgeText}>
                            {currentSegment.action === 'keep' ? '✓ Keep' : '✕ Remove'}
                        </Text>
                    </View>
                    <Text style={styles.segmentReasonText} numberOfLines={2}>
                        {currentSegment.reason || `Segment ${currentSegmentIndex + 1}`}
                    </Text>
                    <Text style={styles.segmentHint}>Tap to toggle</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        marginHorizontal: spacing.base,
        marginVertical: spacing.sm,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    currentTimeText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.accentPrimary,
        fontFamily: typography.fontFamily.mono,
    },
    durationText: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
        fontFamily: typography.fontFamily.mono,
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    statBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radii.sm,
    },
    statText: {
        fontSize: typography.fontSize.xs,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    scrubberContainer: {
        height: 120,
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
        height: 20,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
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
        height: 80,
        borderRadius: radii.sm,
        position: 'absolute',
        top: 28,
        left: 0,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    thumbnail: {
        height: 80,
    },
    thumbnailPlaceholder: {
        height: 80,
        backgroundColor: colors.bgTertiary,
    },
    segmentsTrack: {
        height: 80,
        borderRadius: radii.sm,
        position: 'absolute',
        top: 28,
        left: 0,
    },
    segmentBlock: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        borderRadius: radii.sm,
        borderWidth: 3,
        backgroundColor: 'transparent',
    },
    segmentInfo: {
        padding: spacing.base,
        borderTopWidth: 1,
        borderTopColor: colors.bgTertiary,
        alignItems: 'center',
    },
    segmentBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        marginBottom: spacing.sm,
    },
    segmentBadgeText: {
        fontSize: typography.fontSize.sm,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    segmentReasonText: {
        fontSize: typography.fontSize.md,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    segmentHint: {
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
    },
});
