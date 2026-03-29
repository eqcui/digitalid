import React, { useState, useRef, useEffect, useCallback } from 'react';
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
// How long (ms) to show the digit before masking it
const DIGIT_SHOW_MS = 600;

export default function PinLoginScreen() {
  const { signIn } = useAuth();

  const [pin,          setPin]          = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userIdInput,  setUserIdInput]  = useState('');
  const [savedUserId,  setSavedUserId]  = useState('');
  // Track which digit index is currently "revealing" its value
  const [revealIndex,  setRevealIndex]  = useState(-1);

  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const inputRef    = useRef(null);
  const revealTimer = useRef(null);

  // Animated dots for "Logging in" screen
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!loading) return;
    const pulse = (dot, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
    pulse(dot1, 0);
    pulse(dot2, 200);
    pulse(dot3, 400);
    return () => { dot1.stopAnimation(); dot2.stopAnimation(); dot3.stopAnimation(); };
  }, [loading]);

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

  // Clean up reveal timer on unmount
  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);

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

    const newLen = digits.length;
    const oldLen = pin.length;

    setPin(digits);

    // If a digit was added, reveal it briefly
    if (newLen > oldLen) {
      const idx = newLen - 1;
      setRevealIndex(idx);
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => setRevealIndex(-1), DIGIT_SHOW_MS);
    }

    if (digits.length === PIN_LENGTH) {
      // Hide any reveal immediately before submitting
      setRevealIndex(-1);
      if (revealTimer.current) clearTimeout(revealTimer.current);

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
            : err.message || 'Something went wrong.';
        setError(msg);
        setTimeout(() => {
          setPin('');
          setError('');
          setRevealIndex(-1);
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

  // ── Dot renderer ────────────────────────────────────────────────────────────
  const renderDot = (index) => {
    const filled   = index < pin.length;
    const hasError = !!error;
    const isActive = index === pin.length; // next slot to be filled = "cursor"
    const showing  = revealIndex === index && filled && !hasError;

    // Outer ring colour
    let outerStyle;
    if (hasError && filled) {
      outerStyle = styles.dotOuterError;
    } else if (isActive) {
      outerStyle = styles.dotOuterActive;   // white border highlight
    } else {
      outerStyle = styles.dotOuterDefault;
    }

    return (
      <View key={index} style={[styles.dotOuter, outerStyle]}>
        {showing ? (
          // Reveal mode: show digit centred, no inner dot
          <Text style={styles.dotDigit}>{pin[index]}</Text>
        ) : filled ? (
          // Filled + masked: small inner circle
          <View style={[
            styles.dotInner,
            hasError ? styles.dotInnerError : styles.dotInnerFilled,
          ]} />
        ) : null}
      </View>
    );
  };

  // ── Logging in screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            <Image source={require('./assets/nsw-logo.png')}         style={styles.nswLogo} />
            <Image source={require('./assets/service-nsw-logo.png')} style={styles.serviceLogoImg} />
          </View>
          <View style={styles.menuDots} />
        </View>
        <View style={styles.loggingInPage}>
          <Text style={styles.loggingInText}>Logging in</Text>
          <View style={styles.dotsRowSmall}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[styles.loadingDot, { opacity: dot }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Hidden TextInput — brings up native number pad */}
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        maxLength={PIN_LENGTH}
        secureTextEntry={false}
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

        {/* PIN section — sits tight below the header */}
        <TouchableOpacity
          style={styles.pinSection}
          onPress={focusInput}
          activeOpacity={1}
        >
          <Text style={styles.pinTitle}>Log in with PIN</Text>

          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => renderDot(i))}
          </Animated.View>

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

const DOT_SIZE = 58;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 0,
  },
  headerLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
    marginLeft: 26,   // offset for the dots button to keep logos centred
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

  // ── PIN section ─────────────────────────────────────────────────────────────
  pinSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',   // hug the top (header)
    paddingTop: 24,
  },
  pinTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 22,
  },
  loggingInPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 70, // offset for header so content appears visually centred on screen
  },
  loggingInText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  dotsRowSmall: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#5DADE2',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },

  // ── Individual dot ───────────────────────────────────────────────────────────
  dotOuter: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#495054',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotOuterDefault: {
    borderColor: 'transparent',
  },
  dotOuterActive: {
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
  },
  dotOuterError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255,59,48,0.25)',
  },
  dotInner: {
    width: DOT_SIZE * 0.16,
    height: DOT_SIZE * 0.16,
    borderRadius: (DOT_SIZE * 0.16) / 2,
  },
  dotInnerFilled: {
    backgroundColor: '#FFFFFF',
  },
  dotInnerError: {
    backgroundColor: '#FF3B30',
  },
  dotDigit: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Links / errors ───────────────────────────────────────────────────────────
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resetLink: {
    color: '#5DADE2',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 6,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
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