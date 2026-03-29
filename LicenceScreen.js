import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HologramLotus   from './HologramLotus';
import NSWLogoAnimated from './NSWLogoAnimated';
import { useAuth }     from './AuthContext';
import { fetchQRCode, fetchLicencePhotos, fetchPhotoAsDataUri } from './api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLACEHOLDER_QR = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/330px-QR_code_for_mobile_English_Wikipedia.svg.png';
const PULL_THRESHOLD = 70;
const SPINNER_HEIGHT = 60;

export default function LicenceScreen({ navigation, route }) {
  const { user, token, licences, photoCache, refreshUser } = useAuth();

  const licenceId = route?.params?.licenceId;
  const licence   = licences.find((l) => l.id === licenceId) ?? licences[0] ?? null;

  const [qrUrl,      setQrUrl]      = useState(PLACEHOLDER_QR);
  const [qrLoading,  setQrLoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDate, setRefreshDate] = useState(new Date());

  const cached = photoCache[licence?.id];
  const [licenceProfilePhotoUrl,   setLicenceProfilePhotoUrl]   = useState(cached?.profilePhotoUrl   ?? null);
  const [licenceSignaturePhotoUrl, setLicenceSignaturePhotoUrl] = useState(cached?.signaturePhotoUrl ?? null);

  // Pull-to-refresh animation
  const pullY        = useRef(new Animated.Value(0)).current;
  const isRefreshing = useRef(false);
  const isAtTop      = useRef(true);

  // ── Fetch QR ───────────────────────────────────────────────────────────────
  const loadQR = useCallback(async () => {
    if (!licence?.id || !token) return;
    setQrLoading(true);
    try {
      const { qrCodeUrl } = await fetchQRCode(token, licence.id);
      setQrUrl(qrCodeUrl);
    } catch {}
    finally { setQrLoading(false); }
  }, [licence?.id, token]);

  useEffect(() => { loadQR(); }, [loadQR]);

  // ── Sync photos from cache when cache updates ──────────────────────────────
  useEffect(() => {
    const c = photoCache[licence?.id];
    if (c?.profilePhotoUrl)   setLicenceProfilePhotoUrl(c.profilePhotoUrl);
    if (c?.signaturePhotoUrl) setLicenceSignaturePhotoUrl(c.signaturePhotoUrl);
  }, [photoCache, licence?.id]);

  // ── Fetch photos only if not already cached ────────────────────────────────
  const loadPhotos = useCallback(async () => {
    if (!licence?.id || !token) return;
    if (photoCache[licence.id]) return; // already cached by AuthContext
    try {
      const { profilePhotoUrl, signaturePhotoUrl } = await fetchLicencePhotos(token, licence.id);
      if (profilePhotoUrl)   setLicenceProfilePhotoUrl(await fetchPhotoAsDataUri(profilePhotoUrl));
      if (signaturePhotoUrl) setLicenceSignaturePhotoUrl(await fetchPhotoAsDataUri(signaturePhotoUrl));
    } catch {}
  }, [licence?.id, token, photoCache]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // ── Trigger refresh ────────────────────────────────────────────────────────
  const triggerRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setRefreshing(true);

    const MIN_VISIBLE_MS = 1500;
    const startedAt = Date.now();

    // pullY is already locked to SPINNER_HEIGHT by the PanResponder on release

    try {
      await Promise.all([refreshUser(), loadQR()]);
      setRefreshDate(new Date());
    } catch {
      setRefreshDate(new Date());
    } finally {
      // Always hold the spinner visible for at least MIN_VISIBLE_MS
      const elapsed   = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        Animated.spring(pullY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start(() => {
          isRefreshing.current = false;
          setRefreshing(false);
        });
      }, remaining);
    }
  }, [refreshUser, loadQR, loadPhotos, pullY]);

  // Keep a ref to triggerRefresh so PanResponder always calls the latest version
  const triggerRefreshRef = useRef(triggerRefresh);
  useEffect(() => { triggerRefreshRef.current = triggerRefresh; }, [triggerRefresh]);

  // ── PanResponder ───────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        isAtTop.current && g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (isRefreshing.current) return;
        const val = g.dy * 0.4;
        if (val > 0) pullY.setValue(val);
      },
      onPanResponderRelease: (_, g) => {
        if (isRefreshing.current) return;
        if (g.dy * 0.4 >= PULL_THRESHOLD) {
          // Lock position immediately so nothing snaps back before the spring runs
          pullY.setValue(SPINNER_HEIGHT);
          triggerRefreshRef.current();
        } else {
          Animated.spring(pullY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const onScroll = useCallback((e) => {
    isAtTop.current = e.nativeEvent.contentOffset.y <= 0;
  }, []);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatDate = (date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  const formatTime = (date) => {
    let h = date.getHours(), m = date.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' + m : m}${ampm}`;
  };

  const NSW_LOGO_STATIC = require('./assets/nsw-logo-static.png');
  const BOTTOM_BANNER   = require('./assets/bottom-banner.png');
  const SIGNATURE_PHOTO = require('./assets/signature.png');

  const profilePhotoSource = licenceProfilePhotoUrl
    ? { uri: licenceProfilePhotoUrl }
    : user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require('./assets/photo.png');
  const signaturePhotoSource = licenceSignaturePhotoUrl
    ? { uri: licenceSignaturePhotoUrl }
    : user?.signaturePhotoUrl ? { uri: user.signaturePhotoUrl } : SIGNATURE_PHOTO;

  const spinnerOpacity = pullY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (!licence) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', fontSize: 16 }}>No licence found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#5DADE2' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provisional Driver Licence</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── PULL CONTAINER ── */}
      <View style={styles.pullContainer} {...panResponder.panHandlers}>

        {/* Spinner revealed behind scroll content */}
        <Animated.View style={[styles.spinnerZone, { opacity: spinnerOpacity }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </Animated.View>

        {/* Scroll content slides down to reveal spinner */}
        <Animated.View style={[styles.scrollWrapper, { transform: [{ translateY: pullY }] }]}>
          <ScrollView
            style={styles.mainScroll}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            bounces={false}
            onScroll={onScroll}
          >
            {/* Diagonal accent bar */}
            <View style={styles.topYellowBar}>
              <Svg width="100%" height="24" viewBox="0 0 400 24" preserveAspectRatio="none">
                <Polygon points="0,12 400,0 400,24 0,24" fill="#cc6969" />
                <Polygon points="0,0 400,0 0,24"          fill="#c9535b" />
              </Svg>
            </View>

            {/* ── TOP CARD ── */}
            <View style={styles.topScreenViewport}>
              <View style={styles.topPhotoRow}>
                <View style={styles.nswLogoAnimated}>
                  <NSWLogoAnimated size={38} />
                </View>
                <View style={[styles.photoNameCenter, { zIndex: 4 }]}>
                  <Image source={profilePhotoSource} style={[styles.profilePhoto, { zIndex: 1 }]} />
                  <Text style={[styles.firstName, { zIndex: 4 }]}>{user?.firstName ?? ''}</Text>
                  <Text style={[styles.lastName,  { zIndex: 4 }]}>{user?.lastName  ?? ''}</Text>
                </View>
                <View style={[styles.refreshedBlock, { zIndex: 4 }]}>
                  <Text style={styles.refreshedLabel}>Refreshed</Text>
                  <Text style={styles.refreshedValue}>{formatDate(refreshDate)}</Text>
                  <Text style={styles.refreshedValue}>{formatTime(refreshDate)}</Text>
                </View>
              </View>

              <View style={styles.hologramBg} pointerEvents="none">
                <HologramLotus />
              </View>

              <View style={[styles.fieldsQrRow, { zIndex: 4 }]}>
                <View style={styles.divider} />
                <View style={styles.fieldsAndQr}>
                  <View style={styles.fieldsColumn}>
                    <View style={styles.detailBlock}>
                      <Text style={styles.fieldLabel}>LICENCE NUMBER</Text>
                      <Text style={styles.fieldValue}>{licence.licenceNumber}</Text>
                    </View>
                    <View style={styles.detailBlock}>
                      <Text style={styles.fieldLabel}>EXPIRY</Text>
                      <Text style={styles.fieldValueMed}>{licence.expiry}</Text>
                    </View>
                  </View>
                  <View style={styles.qrContainer}>
                    {qrLoading
                      ? <ActivityIndicator color="#000" />
                      : <Image source={{ uri: qrUrl }} style={styles.qrCode} />
                    }
                  </View>
                </View>
                <View style={styles.dividerBottom} />
                <View style={styles.detailBlock}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                  <Text style={styles.fieldValueMed}>{user?.dateOfBirth ?? ''}</Text>
                </View>
              </View>
            </View>

            {/* ── CLASS & CONDITIONS ── */}
            {licence.licenceClass !== null && (
              <View style={styles.classConditionsContainer}>
                <View style={styles.ccBlockLeft}>
                  <View style={styles.ccHeader}>
                    <Text style={styles.ccLabel}>CLASS</Text>
                    <View style={styles.infoIcon}><Text style={styles.infoIconText}>i</Text></View>
                  </View>
                  <Text style={styles.ccValue}>{licence.licenceClass}</Text>
                </View>
                <View style={styles.ccBlockRight}>
                  <View style={styles.ccHeader}>
                    <Text style={styles.ccLabel}>CONDITIONS</Text>
                  </View>
                  <Text style={styles.ccValue}>{licence.conditions ?? 'None'}</Text>
                </View>
              </View>
            )}

            {/* ── BELOW THE FOLD ── */}
            <View style={styles.bottomSection}>
              <View style={styles.addressRow}>
                <View style={styles.addressContent}>
                  <Image source={profilePhotoSource} style={styles.addressPhoto} />
                  <Text style={styles.addressLabel}>ADDRESS</Text>
                  <Text style={styles.addressValue}>{user?.address ?? ''}</Text>
                </View>
              </View>

              <View style={styles.signatureContainer}>
                <View style={styles.signatureWhiteBox}>
                  <Image source={signaturePhotoSource} style={styles.signaturePhoto} />
                </View>
              </View>

              <View style={styles.bannerWrapper}>
                <Image source={BOTTOM_BANNER} style={styles.bottomBannerImage} />
                <View style={styles.bottomYellowBox}>
                  <View style={styles.bottomCardInfo}>
                    <Text style={styles.bottomCardNumber}>{licence.cardNumber}</Text>
                    <Text style={styles.bottomCardLabel}>CARD NUMBER</Text>
                  </View>
                  <Image source={NSW_LOGO_STATIC} style={styles.bottomNswLogo} />
                </View>
              </View>
            </View>

          </ScrollView>
        </Animated.View>
      </View>

    </SafeAreaView>
  );
}

const SPINNER_HEIGHT_CONST = 60;

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: '#121212' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 56, backgroundColor: '#121212' },
  headerIcon:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  pullContainer: { flex: 1, backgroundColor: '#121212', overflow: 'hidden' },
  spinnerZone:   { position: 'absolute', top: 0, left: 0, right: 0, height: SPINNER_HEIGHT_CONST, alignItems: 'center', justifyContent: 'center' },
  scrollWrapper: { flex: 1, backgroundColor: '#121212' },
  mainScroll:    { flex: 1, backgroundColor: '#121212' },

  topYellowBar:      { height: 24, width: '100%' },
  topScreenViewport: { minHeight: SCREEN_WIDTH * 0.50 + 110 + SCREEN_WIDTH * 0.42 + 80, backgroundColor: '#121212', position: 'relative', flex: 1, justifyContent: 'space-between' },
  hologramBg:        { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.25, zIndex: 3, transform: [{ scale: 1 }, { translateY: 85 }] },
  topPhotoRow:       { alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 4, paddingHorizontal: 18, zIndex: 2, position: 'relative' },
  photoNameCenter:   { alignItems: 'center' },
  profilePhoto:      { width: SCREEN_WIDTH * 0.40, height: SCREEN_WIDTH * 0.50, borderRadius: 0, backgroundColor: '#1A3A2A' },
  firstName:         { fontSize: 34, color: '#8499cf', marginTop: 8, fontWeight: '400', textAlign: 'center' },
  lastName:          { fontSize: 32, fontWeight: '700', color: '#8499cf', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },
  nswLogoAnimated:   { position: 'absolute', left: 13, top: 12, width: 54, height: 44 },
  refreshedBlock:    { position: 'absolute', right: 18, top: 14, alignItems: 'flex-end', width: 90 },
  refreshedLabel:    { fontSize: 10, color: '#FFFFFF', fontWeight: '600', letterSpacing: 0.4, textAlign: 'right' },
  refreshedValue:    { fontSize: 11, color: '#FFFFFF', marginTop: 1, textAlign: 'right' },
  fieldsQrRow:       { flexDirection: 'column', paddingHorizontal: 18, paddingBottom: 18, position: 'absolute', top: SCREEN_WIDTH * 0.50 + 110, left: 0, right: 0, zIndex: 2 },
  fieldsAndQr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fieldsColumn:      { flex: 1, alignItems: 'flex-start', paddingRight: 12 },
  detailBlock:       { marginBottom: 12 },
  fieldLabel:        { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  fieldValue:        { fontSize: 26, fontWeight: '700', color: '#8499cf' },
  fieldValueMed:     { fontSize: 21, fontWeight: '700', color: '#8499cf' },
  divider:           { height: 2, backgroundColor: '#000000', width: SCREEN_WIDTH * 0.5 - 18, marginBottom: 10 },
  dividerBottom:     { height: 2, backgroundColor: '#000000', width: SCREEN_WIDTH * 0.5 - 18, marginTop: 16, marginBottom: 12 },
  qrContainer:       { width: SCREEN_WIDTH * 0.42, height: SCREEN_WIDTH * 0.42, backgroundColor: '#FFFFFF', borderRadius: 0, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', padding: 8, marginTop: -10, marginBottom: -10 },
  qrCode:            { width: SCREEN_WIDTH * 0.44, height: SCREEN_WIDTH * 0.46, borderRadius: 0, resizeMode: 'contain' },

  classConditionsContainer: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#1e1e1e', width: '100%' },
  ccBlockLeft:  { flex: 1, paddingVertical: 14, paddingLeft: 18, paddingRight: 14, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#1e1e1e' },
  ccBlockRight: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 18, backgroundColor: '#1e1e1e' },
  ccHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ccLabel:      { fontSize: 9, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  ccValue:      { fontSize: 18, fontWeight: '700', color: '#8499cf' },
  infoIcon:     { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1E5C8A', justifyContent: 'center', alignItems: 'center' },
  infoIconText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },

  bottomSection:      { backgroundColor: '#121212', paddingBottom: 0, position: 'relative' },
  bannerWrapper:      { position: 'relative', width: '100%' },
  bottomBannerImage:  { width: SCREEN_WIDTH, height: undefined, aspectRatio: 4, resizeMode: 'stretch' },
  bottomYellowBox:    { position: 'absolute', bottom: 8, left: 0, right: 0, backgroundColor: 'transparent', paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  addressRow:         { flexDirection: 'row', zIndex: 2, position: 'relative' },
  addressContent:     { flex: 1, paddingHorizontal: 18, paddingVertical: 24, position: 'relative', minHeight: SCREEN_WIDTH * 0.50 },
  addressPhoto:       { position: 'absolute', left: 18, top: 16, width: SCREEN_WIDTH * 0.30, height: SCREEN_WIDTH * 0.38, opacity: 0.15 },
  addressLabel:       { fontSize: 9, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1, marginBottom: 7, textTransform: 'uppercase' },
  addressValue:       { fontSize: 17, fontWeight: '700', color: '#8499cf', lineHeight: 24, letterSpacing: 0.5 },
  signatureContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, backgroundColor: 'transparent', marginTop: -12, zIndex: 2, position: 'relative' },
  signatureWhiteBox:  { backgroundColor: '#FFFFFF', padding: 6, borderRadius: 0, width: 120, height: 60, alignItems: 'center', justifyContent: 'center' },
  signaturePhoto:     { width: 108, height: 48, resizeMode: 'contain' },
  bottomCardInfo:     { position: 'absolute', left: 40, bottom: 12, zIndex: 2 },
  bottomCardNumber:   { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  bottomCardLabel:    { fontSize: 8, fontWeight: '700', color: '#ffffff', marginTop: 1, letterSpacing: 0.5 },
  bottomNswLogo:      { position: 'absolute', right: 40, bottom: 12, width: 36, height: 30, resizeMode: 'contain', zIndex: 2 },
});