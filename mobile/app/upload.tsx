import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadVideo, analyzeVideo, AnalyzeResponse } from '../utils/api';

type UploadStep = 'uploading' | 'analyzing' | 'done' | 'error';

export default function UploadScreen() {
    const { videoUri } = useLocalSearchParams<{ videoUri: string }>();
    const router = useRouter();
    const [step, setStep] = useState<UploadStep>('uploading');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalyzeResponse | null>(null);

    useEffect(() => {
        if (videoUri) {
            processVideo(videoUri);
        }
    }, [videoUri]);

    const processVideo = async (uri: string) => {
        try {
            // Generate filename from timestamp
            const filename = `video_${Date.now()}.mp4`;

            // Step 1: Upload
            setStep('uploading');
            setProgress(20);

            const uploadResult = await uploadVideo(uri, filename);
            setProgress(40);

            // Step 2: Analyze
            setStep('analyzing');
            setProgress(60);

            const analyzeResult = await analyzeVideo(uploadResult.filename);
            setProgress(100);

            // Done!
            setStep('done');
            setResult(analyzeResult);

            // Navigate to editor after brief delay
            setTimeout(() => {
                router.replace({
                    pathname: '/editor',
                    params: {
                        videoPath: analyzeResult.video_path,
                        timeline: JSON.stringify(analyzeResult.timeline),
                        edlFile: analyzeResult.edl_file,
                    },
                });
            }, 1000);

        } catch (err) {
            console.error('Processing error:', err);
            setStep('error');
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const getStepText = () => {
        switch (step) {
            case 'uploading':
                return 'Uploading video...';
            case 'analyzing':
                return 'Analyzing with AI...\nThis may take a few minutes';
            case 'done':
                return 'Done! Opening editor...';
            case 'error':
                return 'Something went wrong';
        }
    };

    const getStepEmoji = () => {
        switch (step) {
            case 'uploading':
                return '📤';
            case 'analyzing':
                return '🤖';
            case 'done':
                return '✅';
            case 'error':
                return '❌';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>{getStepEmoji()}</Text>
                <Text style={styles.text}>{getStepText()}</Text>

                {step !== 'error' && step !== 'done' && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                )}

                {step === 'analyzing' && (
                    <ActivityIndicator size="large" color="#FFD700" style={styles.spinner} />
                )}

                {error && (
                    <Text style={styles.error}>{error}</Text>
                )}

                {result && (
                    <View style={styles.stats}>
                        <Text style={styles.statText}>
                            📊 Kept {Math.round(result.stats.compression_ratio * 100)}% of video
                        </Text>
                        <Text style={styles.statText}>
                            ✂️ {result.stats.segments_kept} segments
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 24,
    },
    text: {
        fontSize: 20,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 28,
    },
    progressContainer: {
        width: '80%',
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 4,
    },
    spinner: {
        marginTop: 32,
    },
    error: {
        color: '#ff4444',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    stats: {
        marginTop: 24,
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        color: '#888',
        fontSize: 16,
    },
});
