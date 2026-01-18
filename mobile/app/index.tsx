import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

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
                // Navigate to upload screen with video URI
                router.push({
                    pathname: '/upload',
                    params: { videoUri: result.assets[0].uri },
                });
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
                videoMaxDuration: 600, // 10 minutes
            });

            if (!result.canceled && result.assets[0]) {
                router.push({
                    pathname: '/upload',
                    params: { videoUri: result.assets[0].uri },
                });
            }
        } catch (error) {
            console.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record video');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.content}>
                <Text style={styles.title}>🎬 Garbage In</Text>
                <Text style={styles.subtitle}>Gold Out</Text>
                <Text style={styles.description}>
                    Transform rambling videos into{'\n'}tight, viral content
                </Text>
            </View>

            <View style={styles.buttons}>
                <TouchableOpacity style={styles.primaryButton} onPress={pickVideo}>
                    <Text style={styles.buttonIcon}>📁</Text>
                    <Text style={styles.buttonText}>Choose Video</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={recordVideo}>
                    <Text style={styles.buttonIcon}>🎥</Text>
                    <Text style={styles.secondaryButtonText}>Record New</Text>
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 32,
        fontWeight: '600',
        color: '#FFD700',
        marginBottom: 24,
    },
    description: {
        fontSize: 18,
        color: '#888',
        textAlign: 'center',
        lineHeight: 26,
    },
    buttons: {
        padding: 24,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    secondaryButton: {
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
        borderColor: '#333',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    buttonIcon: {
        fontSize: 24,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
});
