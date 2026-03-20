import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIN_LENGTH = 4;
const USER_ID_KEY = 'user_id';

export default function PinLoginScreen() {
  const { signIn } = useAuth();

  const [pin,         setPin]         = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userIdInput,  setUserIdInput]  = useState('');
  const [savedUserId,  setSavedUserId]  = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef(null);

  // Load saved user ID on mount
  useEffect(() => {
    SecureStore.getItemAsync(USER_ID_KEY).then(val => {
      if (val) setSavedUserId(val);
    }).catch(() => {});
  }, []);

  // Auto-focus the hidden input when the screen mounts
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // ── Animations ─────────────────────────────────────────────────────────────
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── PIN input handler ───────────────────────────────────────────────────────
  const handleChangeText = async (text) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (error) setError('');
    setPin(digits);

    if (digits.length === PIN_LENGTH) {
      setLoading(true);
      try {
        await signIn(digits);
      } catch (err) {
        setLoading(false);
        shake();
        const msg =
          err.status === 401
            ? 'Incorrect PIN. Try again.'
            : err.status === 429
            ? 'Too many attempts. Please wait and try again.'
            : err.message || 'Something went wrong. Check your connection.';
        setError(msg);
        setTimeout(() => {
          setPin('');
          setError('');
          inputRef.current?.focus();
        }, 1200);
      }
    }
  };

  // ── User ID modal ───────────────────────────────────────────────────────────
  const openModal = () => {
    setUserIdInput(savedUserId);
    setModalVisible(true);
  };

  const saveUserId = async () => {
    const trimmed = userIdInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a User ID.');
      return;
    }
    try {
      await SecureStore.setItemAsync(USER_ID_KEY, trimmed);
      setSavedUserId(trimmed);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save User ID.');
    }
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Hidden TextInput — brings up native number pad */}
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        maxLength={PIN_LENGTH}
        secureTextEntry
        caretHidden
        style={styles.hiddenInput}
        autoFocus
        editable={!loading}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            <Image source={require('./assets/nsw-logo.png')}         style={styles.nswLogo} />
            <Image source={require('./assets/service-nsw-logo.png')} style={styles.serviceLogoImg} />
          </View>
          <TouchableOpacity style={styles.menuDots} onPress={openModal}>
            <MaterialCommunityIcons name="dots-vertical" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* PIN section */}
        <TouchableOpacity
          style={styles.pinSection}
          onPress={focusInput}
          activeOpacity={1}
        >
          <Text style={styles.pinTitle}>Log in with PIN</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
          ) : (
            <Animated.View
              style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < pin.length
                      ? error ? styles.dotError : styles.dotFilled
                      : styles.dotEmpty,
                  ]}
                />
              ))}
            </Animated.View>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity onPress={focusInput} disabled={loading}>
            <Text style={[styles.resetLink, loading && { opacity: 0.4 }]}>
              Reset PIN with email and password
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* ── User ID Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>User ID</Text>
            <Text style={styles.modalSubtitle}>
              Enter the UUID of the account to log into
            </Text>
            <TextInput
              style={styles.modalInput}
              value={userIdInput}
              onChangeText={setUserIdInput}
              placeholder="a1b2c3d4-0001-0001-0001-000000000001"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              selectTextOnFocus
            />
            {!!savedUserId && (
              <Text style={styles.modalCurrent} numberOfLines={1}>
                Current: {savedUserId}
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={saveUserId}
              >
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 20,
  },
  menuDots: { padding: 4 },
  nswLogo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  serviceLogoImg: {
    width: 120,
    height: 36,
    resizeMode: 'contain',
  },
  pinSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  pinTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 28,
  },
  spinner: {
    marginBottom: 16,
    height: 52,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  dot: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dotError: {
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resetLink: {
    color: '#5DADE2',
    fontSize: 15,
    textDecorationLine: 'underline',
    marginTop: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalCurrent: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBtnCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
  modalBtnSave: {
    backgroundColor: '#0A84FF',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});