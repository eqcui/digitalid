import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getTor, resetTor } from './tor';

import { AuthProvider, useAuth } from './AuthContext';
import HomeScreen     from './HomeScreen';
import LicenceScreen  from './LicenceScreen';
import PinLoginScreen from './PinLoginScreen';
import VerifyScreen   from './VerifyScreen';
import AccountScreen  from './AccountScreen';
import ServicesScreen from './ServicesScreen';
import WalletScreen   from './WalletScreen';

// Keep the native splash screen visible until Tor is ready
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const KEEP_AWAKE_TAG = 'tor-bootstrap';

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
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

async function stopAndResetTor() {
  try {
    const tor = getTor();
    if (tor) await tor.stopIfRunning();
  } catch (_) {}
  resetTor();
}

export default function App() {
  const [torReady, setTorReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);

    async function tryBootstrap(attemptNum) {
      if (attemptNum > 1) {
        await stopAndResetTor();
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 2000));
        if (cancelled) return;
      }

      const tor = getTor();
      if (!tor) { tryBootstrap(attemptNum + 1); return; }

      try {
        await tor.startIfNotStarted();
      } catch (_) {
        if (cancelled) return;
        tryBootstrap(attemptNum + 1);
        return;
      }

      let polls = 0;
      while (true) {
        if (cancelled) return;
        const status = await tor.getDaemonStatus().catch(() => '');
        if (status.replace(/"/g, '').toUpperCase() === 'DONE') {
          deactivateKeepAwake(KEEP_AWAKE_TAG);
          SplashScreen.hideAsync();
          setTorReady(true);
          return;
        }
        await new Promise(r => setTimeout(r, 1000));
        polls++;
        if (polls >= 90) { tryBootstrap(attemptNum + 1); return; }
      }
    }

    tryBootstrap(1);

    return () => {
      cancelled = true;
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      const tor = getTor();
      if (tor) tor.stopIfRunning().catch(() => {});
    };
  }, []);

  if (!torReady) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
