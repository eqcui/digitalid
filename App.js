import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './AuthContext';
import HomeScreen       from './HomeScreen';
import LicenceScreen    from './LicenceScreen';
import PinLoginScreen   from './PinLoginScreen';
import VerifyScreen     from './VerifyScreen';
import AccountScreen    from './AccountScreen';
import ServicesScreen   from './ServicesScreen';
import WalletScreen     from './WalletScreen';

const Stack = createNativeStackNavigator();

// ─── Navigator — swaps between auth and app stacks based on login state ───────
function RootNavigator() {
  const { user, loading } = useAuth();

  // While SecureStore is rehydrating, show a plain splash so there's no flicker
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
          // ── Authenticated screens ──────────────────────────────────────────
          <>
            <Stack.Screen name="Home"     component={HomeScreen}     />
            <Stack.Screen name="Licence"  component={LicenceScreen}  />
            <Stack.Screen name="Verify"   component={VerifyScreen}   />
            <Stack.Screen name="Account"  component={AccountScreen}  />
            <Stack.Screen name="Services" component={ServicesScreen} />
            <Stack.Screen name="Wallet"   component={WalletScreen}   />
          </>
        ) : (
          // ── Unauthenticated screens ────────────────────────────────────────
          <Stack.Screen name="PinLogin" component={PinLoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
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
  },
});