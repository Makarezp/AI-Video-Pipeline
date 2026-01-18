/**
 * Upload Screen - CapCut-style processing view with step indicators
 * 
 * Features:
 * - Video thumbnail preview
 * - Step indicator: Upload → Transcribe → Analyze → Done
 * - Gradient progress bar
 * - Animated loading state
 */

import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadVideo, analyzeVideo, AnalyzeResponse } from '../utils/api';
import { colors, gradients, typography, spacing, radii } from '../utils/theme';

type ProcessingStep = 'upload' | 'transcribe' | 'analyze' | 'done' | 'error';

interface StepConfig {
    id: ProcessingStep;
    label: string;
    icon: string;
}

const STEPS: StepConfig[] = [
    { id: 'upload', label: 'Upload', icon: '📤' },
    { id: 'transcribe', label: 'Transcribe', icon: '🎙️' },
    { id: 'analyze', label: 'Analyze', icon: '🤖' },
    { id: 'done', label: 'Done', icon: '✅' },
];

export default function UploadScreen() {
    const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<ProcessingStep>('upload');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalyzeResponse | null>(null);

    // Animated values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation for current step
    useEffect(() => {
        if (currentStep !== 'done' && currentStep !== 'error') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [currentStep]);

    // Smooth progress animation
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    useEffect(() => {
        if (videoUri) {
            processVideo(videoUri);
        }
    }, [videoUri]);

    const processVideo = async (uri: string) => {
        try {
            const filename = `video_${Date.now()}.mp4`;

            // Step 1: Upload
            setCurrentStep('upload');
            setProgress(15);

            const uploadResult = await uploadVideo(uri, filename);
            setProgress(30);

            // Step 2: Transcribe (part of analyze on backend, but shown as step)
            setCurrentStep('transcribe');
            setProgress(45);

            // Step 3: Analyze
            setCurrentStep('analyze');
            setProgress(60);

            const analyzeResult = await analyzeVideo(uploadResult.filename);
            setProgress(100);

            // Done!
            setCurrentStep('done');
            setResult(analyzeResult);

            // Navigate to editor
            setTimeout(() => {
                router.replace({
                    pathname: '/editor',
                    params: {
                        videoPath: analyzeResult.video_path,
                        timeline: JSON.stringify(analyzeResult.timeline),
                        edlFile: analyzeResult.edl_file,
                    },
                });
            }, 1500);

        } catch (err) {
            console.error('Processing error:', err);
            setCurrentStep('error');
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const getStepIndex = (step: ProcessingStep): number => {
        return STEPS.findIndex(s => s.id === step);
    };

    const currentStepIndex = getStepIndex(currentStep);

    return (
        <SafeAreaView style={styles.container}>
            {/* Close button */}
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.back()}
            >
                <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                {/* Video thumbnail placeholder */}
                <View style={styles.thumbnailContainer}>
                    <View style={styles.thumbnail}>
                        <Text style={styles.thumbnailIcon}>🎬</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>
                    {currentStep === 'error' ? 'Processing Failed' : 'Processing Video'}
                </Text>
                <Text style={styles.subtitle}>
                    {currentStep === 'done'
                        ? 'Ready to edit!'
                        : currentStep === 'error'
                            ? error
                            : 'This may take a few minutes'}
                </Text>

                {/* Step indicators */}
                <View style={styles.stepsContainer}>
                    {STEPS.map((step, index) => {
                        const isActive = index === currentStepIndex;
                        const isCompleted = index < currentStepIndex;
                        const isPending = index > currentStepIndex;

                        return (
                            <View key={step.id} style={styles.stepWrapper}>
                                <Animated.View
                                    style={[
                                        styles.stepCircle,
                                        isCompleted && styles.stepCompleted,
                                        isActive && styles.stepActive,
                                        isPending && styles.stepPending,
                                        isActive && { transform: [{ scale: pulseAnim }] },
                                    ]}
                                >
                                    <Text style={styles.stepIcon}>
                                        {isCompleted ? '✓' : step.icon}
                                    </Text>
                                </Animated.View>
                                <Text style={[
                                    styles.stepLabel,
                                    isActive && styles.stepLabelActive,
                                    isCompleted && styles.stepLabelCompleted,
                                ]}>
                                    {step.label}
                                </Text>

                                {/* Connector line */}
                                {index < STEPS.length - 1 && (
                                    <View style={[
                                        styles.connector,
                                        isCompleted && styles.connectorCompleted,
                                    ]} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Progress bar */}
                {currentStep !== 'error' && (
                    <View style={styles.progressContainer}>
                        <LinearGradient
                            colors={gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.progressGradient}
                        >
                            <Animated.View
                                style={[
                                    styles.progressMask,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['100%', '0%'],
                                        })
                                    },
                                ]}
                            />
                        </LinearGradient>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                    </View>
                )}

                {/* Stats when done */}
                {result && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {Math.round(result.stats.compression_ratio * 100)}%
                            </Text>
                            <Text style={styles.statLabel}>Kept</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {result.stats.segments_kept}
                            </Text>
                            <Text style={styles.statLabel}>Segments</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {Math.round(result.stats.final_duration)}s
                            </Text>
                            <Text style={styles.statLabel}>Final</Text>
                        </View>
                    </View>
                )}

                {/* Retry button on error */}
                {currentStep === 'error' && (
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeIcon: {
        color: colors.textSecondary,
        fontSize: 18,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    thumbnailContainer: {
        marginBottom: spacing['2xl'],
    },
    thumbnail: {
        width: 120,
        height: 120,
        borderRadius: radii['2xl'],
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.bgTertiary,
    },
    thumbnailIcon: {
        fontSize: 48,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing['2xl'],
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: spacing['2xl'],
        paddingHorizontal: spacing.base,
    },
    stepWrapper: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    stepCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderWidth: 2,
        borderColor: colors.bgTertiary,
    },
    stepActive: {
        backgroundColor: colors.accentSecondary,
        borderColor: colors.accentPrimary,
    },
    stepCompleted: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    stepPending: {
        opacity: 0.5,
    },
    stepIcon: {
        fontSize: 20,
    },
    stepLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: colors.accentPrimary,
    },
    stepLabelCompleted: {
        color: colors.success,
    },
    connector: {
        position: 'absolute',
        top: 24,
        left: '75%',
        width: '50%',
        height: 2,
        backgroundColor: colors.bgTertiary,
    },
    connectorCompleted: {
        backgroundColor: colors.success,
    },
    progressContainer: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    progressGradient: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    progressMask: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bgTertiary,
    },
    progressText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: spacing.base,
        marginTop: spacing.lg,
    },
    statCard: {
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        borderRadius: radii.lg,
        minWidth: 80,
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.accentPrimary,
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    retryButton: {
        backgroundColor: colors.danger,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.base,
        borderRadius: radii.lg,
        marginTop: spacing.lg,
    },
    retryText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
    },
});
