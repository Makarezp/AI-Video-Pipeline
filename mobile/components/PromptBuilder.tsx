/**
 * PromptBuilder Component
 * 
 * A SectionList-based UI for selecting analysis preferences.
 * Users can toggle predefined "blocks" (remove/keep instructions)
 * and optionally add custom instructions.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

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

    // Prepare sections for SectionList
    const sections: Section[] = [
        {
            title: 'AI will remove',
            type: 'remove',
            data: blocks.filter(b => b.type === 'remove'),
        },
        {
            title: 'AI will keep',
            type: 'keep',
            data: blocks.filter(b => b.type === 'keep'),
        },
    ];

    // Render a single block row
    const renderItem = ({ item }: { item: PromptBlock }) => {
        const state = blockStates.get(item.id);
        const isEnabled = state?.enabled ?? true;
        const configValue = state?.config[item.config_options?.param || ''] as number | undefined;

        return (
            <TouchableOpacity
                style={styles.blockRow}
                onPress={() => toggleBlock(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.blockHeader}>
                    <View style={[
                        styles.checkbox,
                        isEnabled && styles.checkboxEnabled,
                        item.type === 'remove' && isEnabled && styles.checkboxRemove,
                        item.type === 'keep' && isEnabled && styles.checkboxKeep,
                    ]}>
                        {isEnabled && (
                            <Ionicons name="checkmark" size={14} color={colors.bgPrimary} />
                        )}
                    </View>
                    <View style={styles.blockText}>
                        <Text style={[styles.blockLabel, !isEnabled && styles.blockLabelDisabled]}>
                            {item.label}
                        </Text>
                        <Text style={[styles.blockDescription, !isEnabled && styles.blockDescriptionDisabled]}>
                            {item.description}
                        </Text>
                    </View>
                </View>

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
                            minimumTrackTintColor={colors.accentPrimary}
                            maximumTrackTintColor={colors.bgTertiary}
                            thumbTintColor={colors.textPrimary}
                        />
                        <Text style={styles.sliderValue}>
                            {configValue ?? item.config_options.default}{item.config_options.unit || ''}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Render section header
    const renderSectionHeader = ({ section }: { section: Section }) => (
        <View style={[
            styles.sectionHeader,
            section.type === 'remove' && styles.sectionHeaderRemove,
            section.type === 'keep' && styles.sectionHeaderKeep,
        ]}>
            <Ionicons
                name={section.type === 'remove' ? 'close-circle' : 'checkmark-circle'}
                size={18}
                color={section.type === 'remove' ? colors.danger : colors.success}
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
    );

    // Loading state
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
                            style={styles.customToggle}
                            onPress={() => setShowCustomInput(!showCustomInput)}
                        >
                            <Ionicons
                                name={showCustomInput ? 'remove-circle-outline' : 'add-circle-outline'}
                                size={20}
                                color={colors.textSecondary}
                            />
                            <Text style={styles.customToggleText}>
                                {showCustomInput ? 'Hide custom instruction' : 'Add custom instruction'}
                            </Text>
                        </TouchableOpacity>

                        {/* Custom instruction input */}
                        {showCustomInput && (
                            <TextInput
                                style={styles.customInput}
                                placeholder="e.g., 'Focus on the product demo section'"
                                placeholderTextColor={colors.textMuted}
                                multiline
                                value={customText}
                                onChangeText={setCustomText}
                            />
                        )}
                    </View>
                )}
            />

            {/* Fixed Bottom Footer */}
            <View style={styles.fixedFooter}>
                <GradientButton
                    title="Begin Analysis"
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
        position: 'relative', // Ensure absolute positioning works for footer
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.base,
        paddingBottom: 100, // Make space for fixed footer
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        marginTop: spacing.md,
    },
    sectionHeaderRemove: {},
    sectionHeaderKeep: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    blockRow: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    blockHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: radii.md,
        borderWidth: 2,
        borderColor: colors.textMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxEnabled: {
        borderColor: 'transparent',
    },
    checkboxRemove: {
        backgroundColor: colors.danger,
    },
    checkboxKeep: {
        backgroundColor: colors.success,
    },
    blockText: {
        flex: 1,
    },
    blockLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    blockLabelDisabled: {
        color: colors.textMuted,
    },
    blockDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    blockDescriptionDisabled: {
        color: colors.textMuted,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        marginLeft: 34, // Align with text (checkbox width + gap)
    },
    slider: {
        flex: 1,
        height: 40,
    },
    sliderValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.accentPrimary,
        minWidth: 30,
        textAlign: 'right',
    },
    footer: {
        marginTop: spacing.xl,
    },
    customToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    customToggleText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
    customInput: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        padding: spacing.md,
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: spacing.lg,
    },
    fixedFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.base,
        backgroundColor: colors.bgPrimary,
        borderTopWidth: 1,
        borderTopColor: colors.bgTertiary,
        paddingBottom: spacing.xl, // Safe area padding
    },
    submitButton: {
        width: '100%',
    },
});

export type { BlockState };
