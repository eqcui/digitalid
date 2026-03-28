import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// getTor() is imported but NOT called here at module level.
// It is only called inside useEffect, after the native bridge is ready.
import { getTor, resetTor } from './tor';

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

const KEEP_AWAKE_TAG = 'tor-bootstrap';

async function stopAndResetTor() {
  try {
    const tor = getTor();
    if (tor) await tor.stopIfRunning();
  } catch (_) {}
  resetTor();
}

export default function App() {
  const [torReady,    setTorReady]    = useState(false);
  const [torProgress, setTorProgress] = useState(0);
  const [attempt,     setAttempt]     = useState(1);
  const [retryKey,    setRetryKey]    = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Keep screen on so the device doesn't lock mid-bootstrap
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);

    async function tryBootstrap(attemptNum) {
      if (attemptNum > 1) {
        await stopAndResetTor();
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 2000));
        if (cancelled) return;
      }

      const tor = getTor();
      if (!tor) return;

      try {
        await tor.startIfNotStarted();
      } catch (_) {
        if (cancelled) return;
        setAttempt(a => a + 1);
        setTorProgress(0);
        tryBootstrap(attemptNum + 1);
        return;
      }

      // Poll until DONE — no hard limit, retry on stall
      let polls = 0;
      while (true) {
        if (cancelled) return;
        const status = await tor.getDaemonStatus().catch(() => '');
        if (status === 'DONE') {
          deactivateKeepAwake(KEEP_AWAKE_TAG);
          setTorReady(true);
          return;
        }
        const match = status.match(/PROGRESS=(\d+)/);
        if (match) setTorProgress(Number(match[1]));
        await new Promise(r => setTimeout(r, 1000));
        polls++;
        // After 90s of polling with no DONE, restart the daemon and try again
        if (polls >= 90) {
          setAttempt(a => a + 1);
          setTorProgress(0);
          tryBootstrap(attemptNum + 1);
          return;
        }
      }
    }

    tryBootstrap(1);

    return () => {
      cancelled = true;
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      const tor = getTor();
      if (tor) tor.stopIfRunning().catch(() => {});
    };
  }, [retryKey]);

  const handleRetry = useCallback(async () => {
    setAttempt(1);
    setTorProgress(0);
    await stopAndResetTor();
    setRetryKey(k => k + 1);
  }, []);

  if (!torReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.torText}>
          Connecting securely…
          {torProgress > 0 ? ` ${torProgress}%` : ''}
          {attempt > 1 ? `  (attempt ${attempt})` : ''}
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
});