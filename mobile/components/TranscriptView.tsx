import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Transcript } from '../utils/api';
import { colors, typography, spacing, radii } from '../utils/theme';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TranscriptViewProps {
    transcript: Transcript;
    currentTime: number;
    onSeek: (time: number) => void;
}

export default function TranscriptView({
    transcript,
    currentTime,
    onSeek,
}: TranscriptViewProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    // Find active word index
    // We find the LAST word that starts before or at currentTime
    const activeWordIndex = transcript.segments.findIndex((word, i) => {
        const nextWord = transcript.segments[i + 1];
        if (!nextWord) return true; // It's the last word
        return currentTime >= word.start && currentTime < nextWord.start;
    });

    // Auto-scroll logic could go here, but might be jarring during reading.
    // Let's keep it simple for v1.

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <Text style={styles.headerTitle}>Transcript</Text>
                <Text style={styles.headerIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.content}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollArea}
                        contentContainerStyle={styles.textContainer}
                        nestedScrollEnabled={true}
                    >
                        <Text style={styles.paragraph}>
                            {transcript.segments.map((word, index) => {
                                const isActive = index === activeWordIndex;
                                return (
                                    <Text
                                        key={`${index}-${word.start}`}
                                        onPress={() => onSeek(word.start)}
                                        style={[
                                            styles.word,
                                            isActive && styles.activeWord
                                        ]}
                                    >
                                        {word.word}{' '}
                                    </Text>
                                );
                            })}
                        </Text>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgSecondary,
        // marginHorizontal: spacing.base, // Removed for edge-to-edge
        marginBottom: spacing.base,
        // borderRadius: radii.md, // Removed for edge-to-edge
        // overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.bgTertiary,
    },
    headerTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    headerIcon: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
    content: {
        height: 200, // Fixed height when expanded
        padding: spacing.md,
    },
    scrollArea: {
        flex: 1,
    },
    textContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    paragraph: {
        lineHeight: 24,
    },
    word: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        fontFamily: typography.fontFamily.primary,
    },
    activeWord: {
        color: colors.accentPrimary,
        fontWeight: typography.fontWeight.bold,
        backgroundColor: 'rgba(255, 215, 0, 0.1)', // Subtle gold highlight
    },
});
