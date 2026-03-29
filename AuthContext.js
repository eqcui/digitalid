import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginWithPin, logout, fetchMe, fetchLicences, fetchLicencePhotos, fetchPhotoAsDataUri } from './api';

const TOKEN_KEY   = 'auth_token';
const USER_ID_KEY = 'user_id';

const DEFAULT_USER_ID = 'a1b2c3d4-0002-0002-0002-000000000002';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,      setToken]      = useState(null);
  const [user,       setUser]       = useState(null);
  const [licences,   setLicences]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  // In-memory photo cache: { [licenceId]: { profilePhotoUrl, signaturePhotoUrl } }
  const [photoCache, setPhotoCache] = useState({});

  // Always require login on app start
  useEffect(() => {
    SecureStore.deleteItemAsync(TOKEN_KEY)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch and cache photos for all licences in the background
  const prefetchPhotos = useCallback(async (licenceList, authToken) => {
    for (const licence of licenceList) {
      try {
        const { profilePhotoUrl, signaturePhotoUrl } = await fetchLicencePhotos(authToken, licence.id);
        const [profile, signature] = await Promise.all([
          profilePhotoUrl   ? fetchPhotoAsDataUri(profilePhotoUrl)   : Promise.resolve(null),
          signaturePhotoUrl ? fetchPhotoAsDataUri(signaturePhotoUrl) : Promise.resolve(null),
        ]);
        setPhotoCache(prev => {
          if (prev[licence.id]) return prev; // already cached, skip
          return { ...prev, [licence.id]: { profilePhotoUrl: profile, signaturePhotoUrl: signature } };
        });
      } catch (_) {}
    }
  }, []);

  const signIn = useCallback(async (pin) => {
    const savedId = await SecureStore.getItemAsync(USER_ID_KEY).catch(() => null);
    const userId  = savedId?.trim() || DEFAULT_USER_ID;

    const { token: newToken, user: newUser } = await loginWithPin(userId, pin);
    const { licences: licenceList } = await fetchLicences(newToken);

    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setLicences(licenceList ?? []);

    // Prefetch photos in background — don't block sign-in
    prefetchPhotos(licenceList ?? [], newToken);
  }, [prefetchPhotos]);

  const signOut = useCallback(async () => {
    try {
      if (token) await logout(token);
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
    setLicences([]);
    setPhotoCache({});
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const userData = await fetchMe(token);
    const { licences: licenceList } = await fetchLicences(token);
    setUser(userData);
    setLicences(licenceList ?? []);
    // Refresh photos in background
    prefetchPhotos(licenceList ?? [], token);
  }, [token, prefetchPhotos]);

  const updateUserLocally = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  const value = {
    token,
    user,
    licences,
    loading,
    photoCache,
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
