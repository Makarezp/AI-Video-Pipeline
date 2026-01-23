/**
 * PromptBuilder Component
 * 
 * A "Control Panel" style UI for configuring AI analysis.
 * Implements "Invisible Precision" design system:
 * - No Checkboxes (Row is the toggle)
 * - Ghost (Inactive) vs Solid (Active) states
 * - Monospace Headers
 * - Traffic Light Logic (Green/Red accents)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, typography, spacing, radii } from '../utils/theme';
import { PromptBlock, BlockState, getPromptBlocks } from '../utils/api';
import GradientButton from './GradientButton';


interface PromptBuilderProps {
    onSubmit: (blocks: BlockState[], customText: string) => void;
    loading: boolean;
}

interface Section {
    title: string;
    type: 'remove' | 'keep';
    data: PromptBlock[];
}

export default function PromptBuilder({ onSubmit, loading }: PromptBuilderProps) {
    const [blocks, setBlocks] = useState<PromptBlock[]>([]);
    const [blockStates, setBlockStates] = useState<Map<string, BlockState>>(new Map());
    const [customText, setCustomText] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);

    // Fetch blocks from API on mount
    useEffect(() => {
        async function loadBlocks() {
            try {
                const fetchedBlocks = await getPromptBlocks();
                setBlocks(fetchedBlocks);

                // Initialize all blocks as enabled with default config
                const initialStates = new Map<string, BlockState>();
                fetchedBlocks.forEach(block => {
                    const config: Record<string, number | string> = {};
                    if (block.config_options?.param && block.config_options?.default !== undefined) {
                        config[block.config_options.param] = block.config_options.default;
                    }
                    initialStates.set(block.id, {
                        id: block.id,
                        enabled: true,
                        config,
                    });
                });
                setBlockStates(initialStates);
            } catch (error) {
                console.error('Failed to load prompt blocks:', error);
            } finally {
                setIsLoadingBlocks(false);
            }
        }
        loadBlocks();
    }, []);

    // Toggle block enabled state
    const toggleBlock = useCallback((blockId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBlockStates(prev => {
            const newStates = new Map(prev);
            const current = newStates.get(blockId);
            if (current) {
                newStates.set(blockId, { ...current, enabled: !current.enabled });
            }
            return newStates;
        });
    }, []);

    // Update block config (e.g., slider value)
    const updateBlockConfig = useCallback((blockId: string, param: string, value: number) => {
        setBlockStates(prev => {
            const newStates = new Map(prev);
            const current = newStates.get(blockId);
            if (current) {
                newStates.set(blockId, {
                    ...current,
                    config: { ...current.config, [param]: value },
                });
            }
            return newStates;
        });
    }, []);

    // Handle submit
    const handleSubmit = useCallback(() => {
        const statesArray = Array.from(blockStates.values());
        onSubmit(statesArray, customText);
    }, [blockStates, customText, onSubmit]);

    // Prepare sections
    const sections: Section[] = [
        {
            title: 'AUTO-HIDE',
            type: 'remove',
            data: blocks.filter(b => b.type === 'remove'),
        },
        {
            title: 'KEEP VISIBLE',
            type: 'keep',
            data: blocks.filter(b => b.type === 'keep'),
        },
    ];

    // Render a single block row
    const renderItem = ({ item }: { item: PromptBlock }) => {
        const state = blockStates.get(item.id);
        const isEnabled = state?.enabled ?? true;
        const configValue = state?.config[item.config_options?.param || ''] as number | undefined;

        // Dynamic Styles based on Active State
        const activeBorderColor = item.type === 'remove' ? colors.danger : colors.success;

        return (
            <TouchableOpacity
                style={[
                    styles.blockRow,
                    isEnabled && styles.blockRowActive,
                    isEnabled && { borderLeftColor: activeBorderColor }
                ]}
                onPress={() => toggleBlock(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.blockContent}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.blockLabel, !isEnabled && styles.textDim]}>
                            {item.label}
                        </Text>
                        {isEnabled && (
                            <Ionicons
                                name={item.type === 'remove' ? 'eye-off' : 'eye'}
                                size={16}
                                color={activeBorderColor}
                            />
                        )}
                    </View>

                    <Text style={[styles.blockDescription, !isEnabled && styles.textDim]}>
                        {item.description}
                    </Text>

                    {/* Slider for configurable blocks */}
                    {item.config_type === 'slider' && item.config_options && isEnabled && (
                        <View style={styles.sliderContainer}>
                            <Slider
                                style={styles.slider}
                                minimumValue={item.config_options.min || 0}
                                maximumValue={item.config_options.max || 10}
                                step={1}
                                value={configValue ?? item.config_options.default ?? 0}
                                onValueChange={(value) => {
                                    if (item.config_options?.param) {
                                        updateBlockConfig(item.id, item.config_options.param, value);
                                    }
                                }}
                                minimumTrackTintColor={activeBorderColor}
                                maximumTrackTintColor={colors.bgTertiary}
                                thumbTintColor={colors.textPrimary}
                            />
                            <Text style={[styles.sliderValue, { color: activeBorderColor }]}>
                                {configValue ?? item.config_options.default}{item.config_options.unit || ''}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // Render section header
    const renderSectionHeader = ({ section }: { section: Section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
    );

    if (isLoadingBlocks) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={() => (
                    <View style={styles.footer}>
                        {/* Custom instruction toggle */}
                        <TouchableOpacity
                            style={[
                                styles.customToggle,
                                showCustomInput && styles.customToggleActive
                            ]}
                            onPress={() => setShowCustomInput(!showCustomInput)}
                        >
                            <Text style={[
                                styles.customToggleText,
                                showCustomInput ? { color: colors.textPrimary } : { color: colors.textSecondary }
                            ]}>
                                {showCustomInput ? '> HIDE CUSTOM INSTRUCTIONS' : '> ADD CUSTOM INSTRUCTIONS'}
                            </Text>
                        </TouchableOpacity>

                        {/* Custom instruction input */}
                        {showCustomInput && (
                            <View style={styles.terminalInputContainer}>
                                <Text style={styles.terminalPrefix}>$</Text>
                                <TextInput
                                    style={styles.terminalInput}
                                    placeholder="Enter additional constraints..."
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                    value={customText}
                                    onChangeText={setCustomText}
                                    autoFocus
                                />
                            </View>
                        )}
                    </View>
                )}
            />

            {/* Fixed Bottom Footer */}
            <View style={styles.fixedFooter}>
                <GradientButton
                    title="INITIALIZE ANALYSIS"
                    onPress={handleSubmit}
                    loading={loading}
                    style={styles.submitButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.base,
        paddingBottom: 120, // Space for fixed footer
    },
    // Section Headers
    sectionHeader: {
        paddingVertical: spacing.md,
        marginTop: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.bgTertiary,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospaced
        color: colors.textSecondary,
        letterSpacing: 1.5,
    },
    // Block Row (The Card)
    blockRow: {
        backgroundColor: 'transparent', // Ghost by default
        borderLeftWidth: 3,
        borderLeftColor: colors.textMuted, // Inactive accent
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.xs,
        borderRadius: 2, // Technical sharp corners
        borderWidth: 1,
        borderColor: colors.bgTertiary,
        opacity: 0.6, // Dim inactive
    },
    blockRowActive: {
        backgroundColor: colors.bgSecondary, // Solid background
        borderColor: 'transparent',
        opacity: 1, // Full visibility
    },
    blockContent: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    blockLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    blockDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    textDim: {
        color: colors.textMuted,
    },
    // Interactive Elements
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    slider: {
        flex: 1,
        height: 40,
        marginRight: spacing.sm,
    },
    sliderValue: {
        fontSize: typography.fontSize.sm,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: typography.fontWeight.bold,
        minWidth: 40,
        textAlign: 'right',
    },
    // Footer & Custom Input
    footer: {
        marginTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.bgTertiary,
        paddingTop: spacing.md,
    },
    customToggle: {
        paddingVertical: spacing.md,
    },
    customToggleActive: {
        marginBottom: spacing.xs,
    },
    customToggleText: {
        fontSize: typography.fontSize.xs,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        letterSpacing: 1,
    },
    terminalInputContainer: {
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.sm,
        padding: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.accentPrimary,
    },
    terminalPrefix: {
        color: colors.accentPrimary,
        marginRight: spacing.sm,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: typography.fontSize.base,
        marginTop: Platform.OS === 'ios' ? 0 : 4,
    },
    terminalInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    // Fixed Button
    fixedFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.base,
        backgroundColor: colors.bgPrimary,
        borderTopWidth: 1,
        borderTopColor: colors.bgTertiary,
        paddingBottom: spacing.xl,
    },
    submitButton: {
        width: '100%',
        borderRadius: radii.sm, // Technical corners
    },
});

export type { BlockState };
