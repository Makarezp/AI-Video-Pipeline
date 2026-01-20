import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, typography } from '../utils/theme';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.bgSecondary,
                    },
                    headerTintColor: colors.textPrimary,
                    headerTitleStyle: {
                        fontWeight: typography.fontWeight.bold,
                    },
                    contentStyle: {
                        backgroundColor: colors.bgPrimary,
                    },
                    // Modern header appearance
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'GIGO',
                        headerShown: false, // Custom header in redesign
                    }}
                />

                <Stack.Screen
                    name="editor"
                    options={{
                        title: 'Edit',
                        headerShown: false, // Full-screen editor
                    }}
                />
            </Stack>
        </GestureHandlerRootView>
    );
}
