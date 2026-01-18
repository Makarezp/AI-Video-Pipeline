import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { TimelineSegment } from '../utils/api';

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
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handlePress = (event: any) => {
        const { locationX } = event.nativeEvent;
        // Approximate scale based on screen width padding
        const trackWidth = 300;
        const percent = locationX / trackWidth;
        const time = percent * duration;
        onSeek(Math.max(0, Math.min(duration, time)));
    };

    return (
        <View style={styles.container}>
            {/* Time display */}
            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Segments track */}
            <View style={styles.track}>
                {segments.map((segment, index) => {
                    const left = (segment.start / duration) * 100;
                    const width = ((segment.end - segment.start) / duration) * 100;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.segment,
                                {
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    backgroundColor: segment.action === 'keep' ? '#22c55e' : '#ef4444',
                                },
                            ]}
                            onPress={() => onToggleSegment(index)}
                            activeOpacity={0.7}
                        />
                    );
                })}

                {/* Playhead */}
                <View
                    style={[
                        styles.playhead,
                        { left: `${progressPercent}%` },
                    ]}
                />
            </View>

            {/* Seek bar (invisible touch area) */}
            <TouchableOpacity
                style={styles.seekArea}
                onPress={handlePress}
                activeOpacity={1}
            />
        </View>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        margin: 16,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    timeText: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'monospace',
    },
    track: {
        height: 48,
        backgroundColor: '#333',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    segment: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 4,
    },
    playhead: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#fff',
        marginLeft: -1.5,
        zIndex: 10,
    },
    seekArea: {
        ...StyleSheet.absoluteFillObject,
    },
});
