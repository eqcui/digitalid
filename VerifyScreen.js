import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE_URL } from './api';

const { width: SW } = Dimensions.get('window');

function ScanPage({ onBack }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,  setScanned]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const borderOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const reset = () => { setScanned(false); setResult(null); setError(null); setLoading(false); };

  const handleScan = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not verify this QR code.');
      } else {
        setResult(json);
      }
    } catch (e) {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Permission pending ─────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <SimpleHeader onBack={onBack} title="Result" />
        <View style={s.center}><Text style={s.mutedText}>Checking camera permission…</Text></View>
      </View>
    );
  }

  // ── Permission denied ──────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <SimpleHeader onBack={onBack} title="Result" />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={48} color="#ccc" style={{ marginBottom: 16 }} />
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permSubtitle}>To scan QR codes on digital licences, please allow camera access.</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
            <Text style={s.primaryBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={onBack}>
            <Text style={s.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <SimpleHeader onBack={onBack} title="Result" />
        <View style={s.center}>
          <Text style={s.mutedText}>Verifying licence…</Text>
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={s.container} edges={['top','bottom']}>
        <StatusBar barStyle="light-content" />
        <SimpleHeader onBack={onBack} title="Result" />
        <View style={s.divider} />
        <View style={s.center}>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={reset}>
            <Text style={s.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result — matches screenshot exactly ────────────────────────────────────
  if (result) {
    const { holder } = result;
    return (
      <SafeAreaView style={s.container} edges={['top','bottom']}>
        <StatusBar barStyle="light-content" />
        <SimpleHeader onBack={onBack} title="Result" />
        <View style={s.divider} />

        {/* Name card */}
        <View style={s.nameCard}>
          <Text style={s.holderFirstName}>{holder.firstName}</Text>
          <Text style={s.holderLastName}>{holder.lastName.toUpperCase()}</Text>
        </View>

        <View style={s.divider} />

        {/* Checklist */}
        <View style={s.sectionSeparator} />
        <View style={s.checkSection}>
          <Text style={s.checkHeader}>Check the licence or credential:</Text>
          {[
            'Photo matches the person',
            'Refreshed date is current',
            'Hologram moves',
          ].map((item, i) => (
            <View key={i}>
              <View style={s.checkRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.checkText}>{item}</Text>
              </View>
              <View style={s.rowSeparator} />
            </View>
          ))}
        </View>

        <View style={s.bottomBar}>
          <TouchableOpacity style={s.scanAgainBtn} onPress={reset}>
            <Text style={s.scanAgainText}>Scan another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Live camera ────────────────────────────────────────────────────────────
  return (
    <View style={s.scanFull}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView style={s.cameraHeaderSafe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.headerBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: '#fff' }]}>Verify</Text>
          <TouchableOpacity style={s.headerBtn}>
            <MaterialCommunityIcons name="dots-vertical" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <View style={s.overlay}>
        <View style={s.overlayTop}>
          <Text style={s.scanTitle}>Ready to scan</Text>
          <Text style={s.scanSubtitle}>Place camera over the QR code on the digital licence.</Text>
        </View>
        <View style={s.overlayMiddle}>
          <View style={s.overlaySide} />
          <Animated.View style={[s.viewfinder, { opacity: borderOpacity }]}>
            <View style={[s.corner, s.topLeft]} />
            <View style={[s.corner, s.topRight]} />
            <View style={[s.corner, s.bottomLeft]} />
            <View style={[s.corner, s.bottomRight]} />
          </Animated.View>
          <View style={s.overlaySide} />
        </View>
        <View style={s.overlayBottom} />
      </View>
    </View>
  );
}

function SimpleHeader({ onBack, title = 'Verify' }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.headerBtn}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerBtn} />
    </View>
  );
}

export default function VerifyScreen({ navigation }) {
  const [showScan, setShowScan] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  if (showScan) return <ScanPage onBack={() => setShowScan(false)} />;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Verify</Text>
        <View style={s.headerBtn} />
      </View>
      <View style={s.divider} />

      <View style={s.illustrationContainer}>
        <View style={s.illustrationCircle}>
          <View style={s.centrePhone}>
            <View style={s.phoneScreen}>
              <View style={s.checkCircle}><Ionicons name="checkmark" size={32} color="#2e7d32" /></View>
              <View style={s.scanLine} />
              <View style={[s.scanLine, { width: 50, marginTop: 6 }]} />
            </View>
          </View>
          <View style={[s.sidePhone, s.leftPhone]}>
            <View style={s.sidePhoneYellowBar} />
            <View style={s.sidePhoneContent}>
              <View style={s.sidePhoneAvatar} />
              <Text style={s.sidePhoneName}>Steve{'\n'}CITIZEN</Text>
              <View style={s.sidePhoneQR} />
            </View>
          </View>
          <View style={[s.sidePhone, s.rightPhone]}>
            <View style={s.sidePhoneContent}>
              <Text style={s.sidePhoneName}>Jane{'\n'}CITIZEN</Text>
              <View style={[s.sidePhoneQR, { marginTop: 8 }]} />
            </View>
          </View>
        </View>
      </View>

      <View style={s.textContainer}>
        <Text style={s.mainTitle}>Check any licence</Text>
        <Text style={s.mainBody}>
          Scan the QR code on another person's{' '}
          <Text style={s.bold}>NSW Digital Driver Licence</Text>
          {' '}or other digital credential to confirm it's genuine.
        </Text>
      </View>

      <View style={s.bottomContainer}>
        <TouchableOpacity style={s.scanBtn} onPress={() => setShowScan(true)}>
          <Text style={s.scanBtnText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.checkboxRow} onPress={() => setDontShow(!dontShow)}>
          <View style={[s.checkbox, dontShow && s.checkboxChecked]}>
            {dontShow && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text style={s.checkboxLabel}>Don't show me this again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 28, CORNER_THICKNESS = 4, CORNER_RADIUS = 8, WINDOW_SIZE = SW * 0.65;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scanFull:  { flex: 1, backgroundColor: '#000' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52 },
  cameraHeaderSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mutedText: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  permTitle:    { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 10, textAlign: 'center' },
  permSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  primaryBtn: { backgroundColor: '#007AFF', borderRadius: 12, height: 50, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  ghostBtn: { height: 50, width: '100%', alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 15, color: '#999' },
  errorMsg: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24, lineHeight: 22 },

  // Result screen
  nameCard: { alignItems: 'center', paddingVertical: 36, backgroundColor: '#dce8f8', marginHorizontal: 16, borderRadius: 14, marginTop: 20, marginBottom: 4 },
  holderFirstName: { fontSize: 28, fontWeight: '400', color: '#000', textAlign: 'center' },
  holderLastName:  { fontSize: 28, fontWeight: '700', color: '#000', textAlign: 'center', letterSpacing: 0.5 },

  checkSection: { paddingHorizontal: 24, paddingTop: 20 },
  sectionSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 8 },
  checkHeader:  { fontSize: 15, fontWeight: '500', color: '#fff', marginBottom: 12 },
  checkRow:     { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  bullet:       { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginRight: 8, lineHeight: 22 },
  checkText:    { fontSize: 15, color: 'rgba(255,255,255,0.75)', flex: 1, lineHeight: 22 },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)', marginLeft: 16 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: '#121212' },
  scanAgainBtn: { backgroundColor: '#007AFF', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  scanAgainText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Camera overlay
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: 110, paddingHorizontal: 20, paddingBottom: 16 },
  overlayMiddle: { flexDirection: 'row', height: WINDOW_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanTitle:    { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  scanSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  viewfinder: { width: WINDOW_SIZE, height: WINDOW_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  topLeft:     { top: 0, left: 0,     borderTopWidth: CORNER_THICKNESS,    borderLeftWidth: CORNER_THICKNESS,  borderColor: '#a0e8ff', borderTopLeftRadius: CORNER_RADIUS },
  topRight:    { top: 0, right: 0,    borderTopWidth: CORNER_THICKNESS,    borderRightWidth: CORNER_THICKNESS, borderColor: '#a0e8ff', borderTopRightRadius: CORNER_RADIUS },
  bottomLeft:  { bottom: 0, left: 0,  borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,  borderColor: '#a0e8ff', borderBottomLeftRadius: CORNER_RADIUS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: '#a0e8ff', borderBottomRightRadius: CORNER_RADIUS },

  // Intro illustration
  illustrationContainer: { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  illustrationCircle: { width: SW * 0.65, height: SW * 0.65, borderRadius: SW * 0.325, backgroundColor: '#1a2535', alignItems: 'center', justifyContent: 'center' },
  centrePhone: { width: 80, height: 130, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#ccc', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  phoneScreen: { alignItems: 'center' },
  checkCircle: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#4caf50', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scanLine: { width: 60, height: 4, backgroundColor: '#ddd', borderRadius: 2, marginTop: 4 },
  sidePhone: { position: 'absolute', width: 60, height: 96, backgroundColor: '#e8f0fe', borderRadius: 8, borderWidth: 1, borderColor: '#ccc', overflow: 'hidden' },
  leftPhone:  { left: 8, top: SW * 0.18, zIndex: 2 },
  rightPhone: { right: 8, top: SW * 0.18, zIndex: 2 },
  sidePhoneYellowBar: { height: 5, backgroundColor: '#fff364', width: '100%' },
  sidePhoneContent: { alignItems: 'center', padding: 5 },
  sidePhoneAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#bbb', marginBottom: 3 },
  sidePhoneName: { fontSize: 7, color: '#333', textAlign: 'center', lineHeight: 10 },
  sidePhoneQR: { width: 22, height: 22, backgroundColor: '#ccc', marginTop: 4, borderRadius: 2 },

  textContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  mainTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  mainBody:  { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
  bold: { fontWeight: '600', color: '#fff' },

  bottomContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  scanBtn: { backgroundColor: '#007AFF', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scanBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 4, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});