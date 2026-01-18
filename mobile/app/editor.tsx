import { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Timeline from '../components/Timeline';
import { TimelineSegment, Timeline as TimelineType, getVideoUrl, renderVideo, getDownloadUrl } from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditorScreen() {
    const params = useLocalSearchParams<{
        videoPath: string;
        timeline: string;
        edlFile: string;
    }>();

    const router = useRouter();
    const videoRef = useRef<Video>(null);

    const [timeline, setTimeline] = useState<TimelineType>(() => {
        try {
            return JSON.parse(params.timeline || '{}');
        } catch {
            return { segments: [], original_duration: 0 };
        }
    });

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isRendering, setIsRendering] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get video filename from path
    const videoFilename = params.videoPath?.split('/').pop() || '';
    const videoUrl = getVideoUrl(videoFilename);

    const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            setCurrentTime(status.positionMillis / 1000);
            setIsPlaying(status.isPlaying);
        }
    }, []);

    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
    };

    const handleSeek = async (time: number) => {
        if (!videoRef.current) return;
        await videoRef.current.setPositionAsync(time * 1000);
    };

    const handleToggleSegment = (index: number) => {
        setTimeline(prev => {
            const newSegments = [...prev.segments];
            const segment = newSegments[index];
            segment.action = segment.action === 'keep' ? 'remove' : 'keep';
            return { ...prev, segments: newSegments };
        });
    };

    const saveToGallery = async (outputPath: string) => {
        setIsSaving(true);
        try {
            // Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to save videos to your gallery.');
                return false;
            }

            // Download the video from the server
            const downloadUrl = getDownloadUrl(outputPath);
            const filename = outputPath.split('/').pop() || 'edited_video.mp4';
            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri);

            if (downloadResult.status !== 200) {
                throw new Error('Failed to download video');
            }

            // Save to gallery
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync('GIGO', asset, false);

            return true;
        } catch (error) {
            console.error('Save to gallery error:', error);
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const handleRender = async () => {
        if (!params.videoPath) return;

        setIsRendering(true);
        try {
            const result = await renderVideo(params.videoPath, timeline);

            if (result.success && result.output_path) {
                Alert.alert(
                    '✅ Render Complete',
                    'Your edited video is ready! Would you like to save it to your gallery?',
                    [
                        { text: 'No Thanks', style: 'cancel', onPress: () => router.replace('/') },
                        {
                            text: '📱 Save to Gallery',
                            onPress: async () => {
                                try {
                                    await saveToGallery(result.output_path!);
                                    Alert.alert(
                                        '✅ Saved!',
                                        'Video saved to your gallery in the "GIGO" album.',
                                        [{ text: 'OK', onPress: () => router.replace('/') }]
                                    );
                                } catch (error) {
                                    Alert.alert(
                                        'Save Failed',
                                        error instanceof Error ? error.message : 'Could not save video',
                                        [{ text: 'OK', onPress: () => router.replace('/') }]
                                    );
                                }
                            }
                        }
                    ]
                );
            } else {
                throw new Error(result.error || 'Render failed');
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Render failed');
        } finally {
            setIsRendering(false);
        }
    };

    // Count segments
    const keepCount = timeline.segments.filter(s => s.action === 'keep').length;
    const removeCount = timeline.segments.filter(s => s.action === 'remove').length;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Video Player */}
            <View style={styles.videoContainer}>
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    isLooping={false}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />

                {/* Play/Pause overlay */}
                <TouchableOpacity
                    style={styles.playOverlay}
                    onPress={togglePlayPause}
                    activeOpacity={0.9}
                >
                    {!isPlaying && (
                        <View style={styles.playButton}>
                            <Text style={styles.playIcon}>▶</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Timeline */}
            <Timeline
                segments={timeline.segments}
                duration={timeline.original_duration}
                currentTime={currentTime}
                onSeek={handleSeek}
                onToggleSegment={handleToggleSegment}
            />

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{keepCount}</Text>
                    <Text style={styles.statLabel}>Keep</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>{removeCount}</Text>
                    <Text style={styles.statLabel}>Remove</Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={styles.legendText}>💡 Tap a segment to toggle keep/remove</Text>
            </View>

            {/* Render Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.renderButton, (isRendering || isSaving) && styles.renderButtonDisabled]}
                    onPress={handleRender}
                    disabled={isRendering || isSaving}
                >
                    <Text style={styles.renderButtonText}>
                        {isRendering ? '⏳ Rendering...' : isSaving ? '💾 Saving...' : '🎬 Render Video'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    videoContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * (9 / 16), // 16:9 aspect ratio
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        flex: 1,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        color: '#fff',
        fontSize: 32,
        marginLeft: 6, // Visual centering for play icon
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 48,
        paddingVertical: 16,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    statLabel: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    legend: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    legendText: {
        color: '#666',
        fontSize: 14,
    },
    footer: {
        padding: 16,
        marginTop: 'auto',
    },
    renderButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    renderButtonDisabled: {
        backgroundColor: '#666',
    },
    renderButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
});
