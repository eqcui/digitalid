import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
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

const MAX_AUTO_RETRIES = 3;

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
  const [torError,    setTorError]    = useState(null);
  const [attempt,     setAttempt]     = useState(1);
  const [retryKey,    setRetryKey]    = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function tryBootstrap(attemptNum) {
      // Always stop and recreate so bootstrapPromise is never a stale
      // rejected Promise from a previous failed attempt.
      if (attemptNum > 1) {
        await stopAndResetTor();
        if (cancelled) return;
      }

      const tor = getTor();
      if (!tor) {
        setTorError('Failed to initialize Tor. Please restart the app.');
        return;
      }

      try {
        await tor.startIfNotStarted();
      } catch (err) {
        if (cancelled) return;
        if (attemptNum < MAX_AUTO_RETRIES) {
          setAttempt(attemptNum + 1);
          setTorProgress(0);
          await new Promise(r => setTimeout(r, 2000));
          if (!cancelled) tryBootstrap(attemptNum + 1);
        } else {
          setTorError('failed');
        }
        return;
      }

      let polls = 0;
      while (polls < 60) {
        if (cancelled) return;
        const status = await tor.getDaemonStatus();
        if (status === 'DONE') { setTorReady(true); return; }
        const match = status.match(/PROGRESS=(\d+)/);
        if (match) setTorProgress(Number(match[1]));
        await new Promise(r => setTimeout(r, 1000));
        polls++;
      }

      if (cancelled) return;
      if (attemptNum < MAX_AUTO_RETRIES) {
        setAttempt(attemptNum + 1);
        setTorProgress(0);
        await new Promise(r => setTimeout(r, 2000));
        if (!cancelled) tryBootstrap(attemptNum + 1);
      } else {
        setTorError('failed');
      }
    }

    setAttempt(1);
    setTorProgress(0);
    tryBootstrap(1);

    return () => {
      cancelled = true;
      const tor = getTor();
      if (tor) tor.stopIfRunning().catch(() => {});
    };
  }, [retryKey]);

  const handleRetry = useCallback(async () => {
    setTorError(null);
    setTorProgress(0);
    setAttempt(1);
    await stopAndResetTor();
    setRetryKey(k => k + 1);
  }, []);

  if (torError) {
    return (
      <View style={styles.splash}>
        <Text style={styles.errorText}>
          Unable to connect to Tor.{'\n'}Check your network and try again.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!torReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.torText}>
          Connecting securely…
          {torProgress > 0 ? ` ${torProgress}%` : ''}
          {attempt > 1 ? `  (attempt ${attempt}/${MAX_AUTO_RETRIES})` : ''}
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
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});