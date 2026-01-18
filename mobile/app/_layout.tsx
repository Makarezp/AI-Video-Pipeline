import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#1a1a1a',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    contentStyle: {
                        backgroundColor: '#0a0a0a',
                    },
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'GIGO',
                        headerLargeTitle: true,
                    }}
                />
                <Stack.Screen
                    name="upload"
                    options={{
                        title: 'Processing',
                        presentation: 'modal',
                    }}
                />
                <Stack.Screen
                    name="editor"
                    options={{
                        title: 'Edit Timeline',
                    }}
                />
            </Stack>
        </>
    );
}
