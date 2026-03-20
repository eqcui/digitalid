/**
 * AuthContext.js
 * --------------
 * Provides the authenticated user, their token, and their licences
 * to every screen in the app via React context.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginWithPin, logout, fetchMe, fetchLicences } from './api';

const TOKEN_KEY   = 'auth_token';
const USER_ID_KEY = 'user_id';

// Default user ID — overridden by whatever is saved via the dots menu
const DEFAULT_USER_ID = 'a1b2c3d4-0002-0002-0002-000000000002';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(null);
  const [user,     setUser]     = useState(null);
  const [licences, setLicences] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Always require login on app start ─────────────────────────────────────
  useEffect(() => {
    SecureStore.deleteItemAsync(TOKEN_KEY)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Sign in with PIN ───────────────────────────────────────────────────────
  const signIn = useCallback(async (pin) => {
    // Read the user ID saved via the dots menu, fall back to default
    const savedId = await SecureStore.getItemAsync(USER_ID_KEY).catch(() => null);
    const userId  = savedId?.trim() || DEFAULT_USER_ID;

    const { token: newToken, user: newUser } = await loginWithPin(userId, pin);
    const { licences: licenceList } = await fetchLicences(newToken);

    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setLicences(licenceList ?? []);
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      if (token) await logout(token);
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
    setLicences([]);
  }, [token]);

  // ── Refresh user profile ───────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!token) return;
    const userData = await fetchMe(token);
    const { licences: licenceList } = await fetchLicences(token);
    setUser(userData);
    setLicences(licenceList ?? []);
  }, [token]);

  // ── Update local user fields optimistically ────────────────────────────────
  const updateUserLocally = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  const value = {
    token,
    user,
    licences,
    loading,
    signIn,
    signOut,
    refreshUser,
    updateUserLocally,
    driverLicence: licences.find((l) => l.type === 'driverLicence') ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}