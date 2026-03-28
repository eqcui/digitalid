import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// getTor() is imported but NOT called here at module level.
// It is only called inside useEffect, after the native bridge is ready.
import { getTor } from './tor';

import { AuthProvider, useAuth } from './AuthContext';
import HomeScreen     from './HomeScreen';
import LicenceScreen  from './LicenceScreen';
import PinLoginScreen from './PinLoginScreen';
import VerifyScreen   from './VerifyScreen';
import AccountScreen  from './AccountScreen';
import ServicesScreen from './ServicesScreen';
import WalletScreen   from './WalletScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home"     component={HomeScreen}     />
            <Stack.Screen name="Licence"  component={LicenceScreen}  />
            <Stack.Screen name="Verify"   component={VerifyScreen}   />
            <Stack.Screen name="Account"  component={AccountScreen}  />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="Wallet"   component={WalletScreen}   />
          </>
        ) : (
          <Stack.Screen name="PinLogin" component={PinLoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [torReady,    setTorReady]    = useState(false);
  const [torProgress, setTorProgress] = useState(0);
  const [torError,    setTorError]    = useState(null);

  useEffect(() => {
    // getTor() is safe to call here — the native bridge is ready
    // by the time any useEffect runs.
    let cancelled = false;

    async function bootstrap() {
      try {
        const tor = getTor();

        if (!tor) {
          setTorError('Failed to initialize Tor. Please restart the app.');
          return;
        }

        await tor.startIfNotStarted();

        let attempts = 0;
        while (attempts < 60) {
          if (cancelled) return;

          const status = await tor.getDaemonStatus();

          if (status === 'DONE') {
            setTorReady(true);
            return;
          }

          const match = status.match(/PROGRESS=(\d+)/);
          if (match) setTorProgress(Number(match[1]));

          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }

        setTorError('Tor bootstrap timed out. Check your connection.');
      } catch (err) {
        if (!cancelled) setTorError(err.message || 'Failed to start Tor.');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      // getTor() is safe here too — cleanup runs after mount
      const tor = getTor();
      if (tor) tor.stopIfRunning().catch(() => {});
    };
  }, []);

  if (torError) {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorText}>⚠️ {torError}</Text>
      </View>
    );
  }

  if (!torReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.torText}>
          Connecting securely…{torProgress > 0 ? ` ${torProgress}%` : ''}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  torText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});