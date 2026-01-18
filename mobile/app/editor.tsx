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
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import Timeline from '../components/Timeline';
import GradientButton from '../components/GradientButton';
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
    ProjectMetadata
} from '../utils/api';
import { colors, gradients, typography, spacing, radii, shadows } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditorScreen() {
    const { projectId } = useLocalSearchParams<{ projectId: string }>();
    const router = useRouter();
    const videoRef = useRef<Video>(null);

    const [project, setProject] = useState<ProjectMetadata | null>(null);
    const [timeline, setTimeline] = useState<TimelineType>({ segments: [], original_duration: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [instructions, setInstructions] = useState('');
    const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial Load & Polling
    useEffect(() => {
        if (!projectId) return;

        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const loadData = async () => {
            try {
                const proj = await getProject(projectId);

                if (!isMounted) return;
                setProject(proj);

                // If user accidentally lands on editor with "created" status but we started analysis locally
                if (proj.status === 'created' && isStartingAnalysis) {
                    // Do nothing, wait for local state to update or just show analyzing
                }

                if (proj.status === 'ready') {
                    const edl = await getProjectTimeline(projectId);
                    if (isMounted && edl) {
                        setTimeline(edl);
                        setIsLoading(false);
                    }
                } else if (proj.status === 'failed') {
                    Alert.alert('Analysis Failed', 'The AI analysis could not complete.');
                    setIsLoading(false);
                } else if (proj.status === 'analyzing') {
                    // Still analyzing - schedule next poll
                    setIsLoading(true);
                    timeoutId = setTimeout(loadData, 3000);
                }
            } catch (error) {
                console.error('Failed to load project:', error);
                if (isMounted) {
                    Alert.alert('Error', 'Failed to load project');
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [projectId]);

    const handleStartAnalysis = async () => {
        if (!project) return;
        setIsStartingAnalysis(true);
        try {
            await startAnalysis(project.id, instructions);
            // Optimistically update status to trigger polling UI
            setProject({ ...project, status: 'analyzing' });
            setIsLoading(true);
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

    const showCalibration = project?.status === 'created' || isStartingAnalysis;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.headerButtonText}>✕</Text>
                </TouchableOpacity>

                <View style={styles.headerStats}>
                    {isLoading || showCalibration ? (
                        <View style={[styles.statBadge, { backgroundColor: colors.bgTertiary }]}>
                            <Text style={styles.statBadgeText}>
                                {showCalibration ? '🛠️ Calibration' : '🤖 Analyzing...'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.statBadge}>
                                <Text style={styles.statBadgeText}>✓ {keepCount}</Text>
                            </View>
                            <View style={[styles.statBadge, styles.statBadgeDanger]}>
                                <Text style={styles.statBadgeText}>✕ {removeCount}</Text>
                            </View>
                        </>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => Alert.alert('Settings', 'Editor settings coming soon.')}
                >
                    <Text style={styles.headerButtonText}>⚙️</Text>
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

                {showCalibration ? (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.calibrationContainer}>
                            <Text style={styles.calibrationTitle}>Calibrate Your AI ⚡</Text>
                            <Text style={styles.calibrationSubtitle}>
                                The AI analyzes visuals and audio automatically.
                                Add specific instructions if you want, or leave blank for auto-magic.
                            </Text>

                            <TextInput
                                style={styles.instructionInput}
                                placeholder="(Optional) e.g. 'Remove all pauses', 'Keep only the funny parts'..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                value={instructions}
                                onChangeText={setInstructions}
                            />

                            <GradientButton
                                title="Start Magic ✨"
                                onPress={handleStartAnalysis}
                                loading={isStartingAnalysis}
                                style={styles.startButton}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                ) : (
                    <>
                        {/* Timeline */}
                        <Timeline
                            segments={timeline.segments}
                            duration={timeline.original_duration}
                            currentTime={currentTime}
                            onSeek={handleSeek}
                            onToggleSegment={handleToggleSegment}
                        />

                        {/* Render Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.renderButton}
                                onPress={handleRender}
                                disabled={isRendering || isSaving || isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={isRendering || isSaving || isLoading ? [colors.bgTertiary, colors.bgTertiary] : gradients.gold}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.renderButtonGradient}
                                >
                                    <Text style={styles.renderButtonText}>
                                        {isLoading ? '🤖 Analyzing Video...' : isRendering ? '⏳ Rendering...' : isSaving ? '💾 Saving...' : '🎬 Export Video'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
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
    footer: {
        padding: spacing.base,
        paddingBottom: spacing.sm,
    },
    renderButton: {
        borderRadius: radii.xl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    renderButtonGradient: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
        borderRadius: radii.xl,
    },
    renderButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.bgPrimary,
    },
    calibrationContainer: {
        flex: 1,
        padding: spacing.lg,
        alignItems: 'center',
    },
    calibrationTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    calibrationSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    instructionInput: {
        width: '100%',
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        padding: spacing.md,
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: spacing.xl,
    },
    startButton: {
        width: '100%',
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
});
