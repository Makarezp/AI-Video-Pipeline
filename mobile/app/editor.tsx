/**
 * Editor Screen - CapCut-style video editor with multi-track timeline
 * 
 * Features:
 * - Full-screen video preview
 * - Multi-track timeline (video + audio waveform)
 * - Context-aware bottom toolbar
 * - Gradient render button
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Text,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import Timeline from '../components/Timeline';
import TranscriptView from '../components/TranscriptView';
import { TimelineSkeleton, TranscriptSkeleton } from '../components/Skeleton';
import AnalyzingIndicator from '../components/AnalyzingIndicator';
import PromptBuilder from '../components/PromptBuilder';
import {
    TimelineSegment,
    Timeline as TimelineType,
    getVideoUrl,
    renderVideo,
    getDownloadUrl,
    getProject,
    getProjectTimeline,
    updateProjectTimeline,
    startAnalysis,
    ProjectMetadata,
    Transcript,
    getProjectTranscript,
    BlockState,
} from '../utils/api';
import { colors, gradients, typography, spacing, radii, shadows } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditorScreen() {
    const { projectId } = useLocalSearchParams<{ projectId: string }>();
    const router = useRouter();
    const videoRef = useRef<Video>(null);

    const [project, setProject] = useState<ProjectMetadata | null>(null);
    const [timeline, setTimeline] = useState<TimelineType>({ segments: [], original_duration: 0 });
    const [transcript, setTranscript] = useState<Transcript | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Polling function - defined outside useEffect so it can be called from handleStartAnalysis
    const pollForStatus = useCallback(async () => {
        if (!projectId) return;

        try {
            const proj = await getProject(projectId);
            setProject(proj);

            if (proj.status === 'ready') {
                const [edl, transcriptData] = await Promise.all([
                    getProjectTimeline(projectId),
                    getProjectTranscript(projectId)
                ]);

                if (edl) setTimeline(edl);
                if (transcriptData) setTranscript(transcriptData);
                setIsLoading(false);
            } else if (proj.status === 'failed') {
                Alert.alert('Analysis Failed', 'The AI analysis could not complete.');
                setIsLoading(false);
            } else if (proj.status === 'analyzing') {
                // Still analyzing - schedule next poll
                setIsLoading(true);
                setTimeout(pollForStatus, 3000);
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            Alert.alert('Error', 'Failed to load project');
        }
    }, [projectId]);

    // Initial Load on mount
    useEffect(() => {
        if (!projectId) return;
        pollForStatus();
    }, [projectId, pollForStatus]);

    const handleStartAnalysis = async (blocks: BlockState[], customText: string) => {
        if (!project) return;
        setIsStartingAnalysis(true);
        try {
            await startAnalysis(project.id, blocks, customText);
            // Optimistically update status to trigger polling UI
            setProject({ ...project, status: 'analyzing' });
            setIsLoading(true);
            setIsStartingAnalysis(false); // Reset so calibration UI hides

            // Start polling for completion
            setTimeout(pollForStatus, 3000);
        } catch (error) {
            console.error('Failed to start analysis:', error);
            Alert.alert('Error', 'Could not start analysis.');
            setIsStartingAnalysis(false);
        }
    };

    // Auto-save when timeline changes
    const handleToggleSegment = async (index: number) => {
        if (!project) return;

        const newSegments = [...timeline.segments];
        const segment = newSegments[index];
        segment.action = segment.action === 'keep' ? 'remove' : 'keep';

        const newTimeline = { ...timeline, segments: newSegments };
        setTimeline(newTimeline);

        // Optimistic update + Fire & Forget save
        updateProjectTimeline(projectId, newTimeline).catch(err => {
            console.error('Auto-save failed:', err);
        });
    };

    // Video URL from project source (ensure project is loaded)
    const videoUrl = project ? getVideoUrl(project.source_video_path) : '';

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

    const saveToGallery = async (outputPath: string) => {
        setIsSaving(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to save videos to your gallery.');
                return false;
            }

            const downloadUrl = getDownloadUrl(outputPath);
            const filename = outputPath.split('/').pop() || 'edited_video.mp4';
            const localUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri);

            if (downloadResult.status !== 200) {
                throw new Error('Failed to download video');
            }

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
        if (!project) return;

        setIsRendering(true);
        try {
            const result = await renderVideo(project.source_video_path, timeline);

            if (result.success && result.output_path) {
                Alert.alert(
                    '✅ Render Complete',
                    'Your edited video is ready! Would you like to save it to your gallery?',
                    [
                        { text: 'No Thanks', style: 'cancel' },
                        {
                            text: '📱 Save to Gallery',
                            onPress: async () => {
                                try {
                                    await saveToGallery(result.output_path!);
                                    Alert.alert(
                                        '✅ Saved!',
                                        'Video saved to your gallery in the "GIGO" album.'
                                    );
                                } catch (error) {
                                    Alert.alert('Save Failed', 'Could not save video');
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

    const keepCount = timeline.segments.filter(s => s.action === 'keep').length;
    const removeCount = timeline.segments.filter(s => s.action === 'remove').length;

    // --- RENDER ---

    const showCalibration = project?.status === 'created';
    const showAnalyzing = isLoading && project?.status === 'analyzing';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerStats}>
                    {isLoading || showCalibration ? (
                        <View style={[styles.statBadge, { backgroundColor: colors.bgTertiary }]}>
                            <Ionicons
                                name={showCalibration ? 'construct' : 'aperture'}
                                size={14}
                                color={colors.textSecondary}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.statBadgeText}>
                                {showCalibration ? 'Calibration' : 'Analyzing...'}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <TouchableOpacity
                    onPress={handleRender}
                    disabled={isRendering || isSaving || isLoading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isRendering || isSaving || isLoading ? [colors.bgTertiary, colors.bgTertiary] : gradients.ai}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerExportButton}
                    >
                        <Text style={styles.headerExportText}>
                            {isLoading ? 'Wait...' : isRendering ? 'Rendering' : isSaving ? 'Saving' : 'Export'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Video Player */}
                <View style={styles.videoContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        style={styles.video}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                        isLooping={false}
                        progressUpdateIntervalMillis={16}
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
                                <Ionicons name="play" size={32} color={colors.textPrimary} style={{ marginLeft: 4 }} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {showCalibration ? (
                    <PromptBuilder
                        onSubmit={handleStartAnalysis}
                        loading={isStartingAnalysis}
                    />
                ) : showAnalyzing ? (
                    /* Analyzing State - Show skeleton + animated indicator */
                    <>
                        {/* Timeline skeleton */}
                        <TimelineSkeleton />

                        {/* Animated indicator */}
                        <AnalyzingIndicator />

                        {/* Transcript skeleton */}
                        <TranscriptSkeleton />
                    </>
                ) : (
                    <>
                        {/* Timeline */}
                        <Timeline
                            segments={timeline.segments}
                            duration={timeline.original_duration}
                            currentTime={currentTime}
                            onSeek={handleSeek}
                            onToggleSegment={handleToggleSegment}
                            projectId={project?.id}
                            thumbnailCount={project?.thumbnail_count}
                        />

                        {/* Transcript View (Classic) */}
                        {transcript && (
                            <TranscriptView
                                transcript={transcript}
                                currentTime={currentTime}
                                onSeek={handleSeek}
                            />
                        )}


                    </>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonText: {
        fontSize: 18,
    },
    headerStats: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
    },
    statBadgeDanger: {
        backgroundColor: colors.danger,
    },
    statBadgeText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
    },
    videoContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * (9 / 16),
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
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    playIcon: {
        color: colors.textPrimary,
        fontSize: 32,
        marginLeft: 6,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: spacing.lg,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        color: colors.textSecondary,
        fontSize: 20,
    },
    headerExportButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radii.pill,
        minWidth: 80,
        alignItems: 'center',
    },
    headerExportText: {
        color: colors.bgPrimary,
        fontWeight: typography.fontWeight.bold,
        fontSize: typography.fontSize.sm,
    },
});
