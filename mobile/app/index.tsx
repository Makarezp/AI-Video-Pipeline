/**
 * Home Screen - CapCut-style landing page with premium design
 * 
 * Features:
 * - GIGO logo header with settings icon
 * - Large "New Project" gradient button
 * - Recent Projects carousel (placeholder)
 * - Floating tab navigation
 */

import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, typography, spacing, radii, shadows } from '../utils/theme';
import TabBar, { TabItem } from '../components/TabBar';
import { listProjects, ProjectMetadata, createProject } from '../utils/api';

const TABS: TabItem[] = [
    { id: 'home', iconName: 'home', label: 'Home' },
    { id: 'templates', iconName: 'albums', label: 'Templates' },
    { id: 'profile', iconName: 'person', label: 'Profile' },
];

export default function HomeScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('home');
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadProjects();
        }, [])
    );

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const data = await listProjects();
            setProjects(data);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (uri: string) => {
        setIsUploading(true);
        try {
            const filename = `video_${Date.now()}.mp4`;
            // Upload & Create Project
            const project = await createProject(uri, filename);

            // Navigate directly to editor
            router.push({
                pathname: '/editor',
                params: { projectId: project.id }
            });
        } catch (error) {
            console.error('Upload failed:', error);
            Alert.alert('Upload Failed', 'Could not upload video. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const pickVideo = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photo library.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                await handleUpload(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to pick video');
        }
    };

    const recordVideo = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();

            if (!permission.granted) {
                Alert.alert('Permission Required', 'Please allow access to your camera.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 1,
                videoMaxDuration: 600,
            });

            if (!result.canceled && result.assets[0]) {
                await handleUpload(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record video');
        }
    };

    const handleTabPress = (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === 'templates') {
            Alert.alert('Coming Soon', 'Templates feature is under development.');
        } else if (tabId === 'profile') {
            Alert.alert('Coming Soon', 'Profile feature is under development.');
        }
    };
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logoG}>Ai</Text>
                    <Ionicons name="flash" size={20} color={colors.accentAi} style={{ marginHorizontal: -2 }} />
                    <Text style={styles.logoGO}>Vid</Text>
                </View>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* New Project Card */}
                <TouchableOpacity style={styles.newProjectCard} onPress={pickVideo} activeOpacity={0.9}>
                    <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.newProjectGradient}
                    >
                        <View style={styles.newProjectInner}>
                            <Ionicons name="add" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.sm }} />
                            <Text style={styles.newProjectText}>New Project</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickAction} onPress={pickVideo}>
                        <View style={styles.quickActionIcon}>
                            <Ionicons name="folder-open-outline" size={28} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.quickActionText}>Import</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction} onPress={recordVideo}>
                        <View style={styles.quickActionIcon}>
                            <Ionicons name="videocam-outline" size={28} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.quickActionText}>Record</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => Alert.alert('Coming Soon', 'Drafts feature is under development.')}
                    >
                        <View style={styles.quickActionIcon}>
                            <Ionicons name="document-text-outline" size={28} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.quickActionText}>Drafts</Text>
                    </TouchableOpacity>
                </View>

                {/* Projects List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Projects</Text>

                    {projects.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="film-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.base }} />
                            <Text style={styles.emptyStateText}>No projects yet</Text>
                            <Text style={styles.emptyStateHint}>
                                Start a new project to see it here
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.projectsGrid}>
                            {projects.map((project) => (
                                <TouchableOpacity
                                    key={project.id}
                                    style={styles.projectCard}
                                    onPress={() => router.push({
                                        pathname: '/editor',
                                        params: { projectId: project.id }
                                    })}
                                >
                                    <View style={styles.thumbnailPlaceholder}>
                                        <Ionicons
                                            name={project.status === 'analyzing' || project.status === 'created' ? "hourglass-outline" : "images-outline"}
                                            size={24}
                                            color={colors.textSecondary}
                                        />
                                        {(project.status === 'analyzing' || project.status === 'created') && (
                                            <View style={styles.analyzingBadge}>
                                                <Text style={styles.analyzingText}>
                                                    {project.status === 'analyzing' ? 'Analyzing...' : 'Waiting'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.projectInfo}>
                                        <Text style={styles.projectTitle} numberOfLines={1}>
                                            {project.name}
                                        </Text>
                                        <Text style={styles.projectDate}>
                                            {new Date(project.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Tab Bar */}
            <TabBar
                tabs={TABS}
                activeTab={activeTab}
                onTabPress={handleTabPress}
            />

            {/* Uploading Overlay */}
            {isUploading && (
                <View style={[styles.loadingOverlay, StyleSheet.absoluteFill]}>
                    <View style={styles.loadingCard}>
                        <Ionicons name="cloud-upload-outline" size={48} color={colors.accentPrimary} style={{ marginBottom: spacing.md }} />
                        <Text style={styles.loadingText}>Uploading...</Text>
                        <Text style={styles.loadingSubtext}>This will just take a moment</Text>
                    </View>
                </View>
            )}
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoG: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    logoLightning: {
        fontSize: typography.fontSize['2xl'],
        marginHorizontal: -4,
    },
    logoGO: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: radii.lg,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsIcon: {
        fontSize: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 120, // Space for tab bar
    },
    newProjectCard: {
        marginTop: spacing.lg,
        borderRadius: radii.xl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    newProjectGradient: {
        padding: 3, // Border width
        borderRadius: radii.xl,
    },
    newProjectInner: {
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.xl - 3,
        paddingVertical: spacing['3xl'],
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusIcon: {
        fontSize: 48,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    newProjectText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    quickAction: {
        alignItems: 'center',
    },
    quickActionIcon: {
        width: 64,
        height: 64,
        borderRadius: radii.xl,
        backgroundColor: colors.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
        // Removed border
    },
    // quickActionEmoji removed
    quickActionText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.base,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.xl,
    },
    // emptyStateIcon removed
    emptyStateText: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    emptyStateHint: {
        fontSize: typography.fontSize.sm,
        color: colors.textMuted,
    },
    projectsGrid: {
        gap: spacing.md,
    },
    projectCard: {
        flexDirection: 'row',
        backgroundColor: colors.bgSecondary,
        borderRadius: radii.lg,
        padding: spacing.sm,
        alignItems: 'center',
    },
    thumbnailPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: radii.md,
        backgroundColor: colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    // thumbnailEmoji removed
    analyzingBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 2,
        borderBottomLeftRadius: radii.md,
        borderBottomRightRadius: radii.md,
    },
    analyzingText: {
        color: colors.textPrimary,
        fontSize: 8,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    projectInfo: {
        marginLeft: spacing.md,
        flex: 1,
    },
    projectTitle: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: 2,
    },
    projectDate: {
        color: colors.textMuted,
        fontSize: typography.fontSize.xs,
    },
    loadingOverlay: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingCard: {
        backgroundColor: colors.bgSecondary,
        padding: spacing.xl,
        borderRadius: radii.xl,
        alignItems: 'center',
        ...shadows.lg,
    },
    // loadingEmoji removed
    loadingText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    loadingSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
    },
});
