import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { useAuth } from './AuthContext';

// ─── Accent colours per licence type ─────────────────────────────────────────
const ACCENT = {
  driverLicence:        { bar: '#fff364', barDark: '#b0a832' },
  boatLicence:          { bar: '#73C6B6', barDark: '#3a9e8e' },
  contractorLicence:    { bar: '#8499cf', barDark: '#5a6aa0' },
  workingWithChildren:  { bar: '#F28B9D', barDark: '#b85f70' },
  default:              { bar: '#8499cf', barDark: '#5a6aa0' },
};

const accentFor = (type) => ACCENT[type] ?? ACCENT.default;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletScreen({ navigation }) {
  const { licences = [] } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const favourites = licences.filter(l => l.favourite);
  const displayed  = activeTab === 'all' ? licences : favourites;

  const [focused, setFocused] = useState(licences[0]?.id ?? null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.menuBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({licences.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favourites' && styles.tabActive]}
          onPress={() => setActiveTab('favourites')}
        >
          <Text style={[styles.tabText, activeTab === 'favourites' && styles.tabTextActive]}>
            Favourites ({favourites.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {displayed.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>No licences found</Text>
            </View>
          )}

          {displayed.map((lic, index) => {
            const accent    = accentFor(lic.type);
            const isFocused = lic.id === focused;
            const isFirst   = index === 0;

            return (
              <TouchableOpacity
                key={lic.id}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  isFirst && styles.cardFocused,
                  !isFirst && styles.cardUnfocused,
                ]}
                onPress={() => {
                  setFocused(lic.id);
                  navigation.navigate('Licence', { licenceId: lic.id });
                }}
              >
                {/* Card top row */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, isFirst && styles.cardTitleFocused]}>
                      {lic.label}
                    </Text>
                    <Text style={[styles.cardExpiry, isFirst && styles.cardExpiryFocused]}>
                      Expiry: {lic.expiryLong ?? lic.expiryShort}
                    </Text>
                    {lic.status && lic.status !== 'active' && (
                      <Text style={[
                        styles.statusBadge,
                        lic.status === 'expired'   && styles.statusExpired,
                        lic.status === 'suspended' && styles.statusSuspended,
                      ]}>
                        {lic.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Image
                    source={require('./assets/nsw-logo-card.png')}
                    style={[styles.nswLogo, isFirst && styles.nswLogoFocused]}
                  />
                </View>

                {/* Spacer so the accent bar has room */}
                <View style={{ height: isFirst ? 60 : 30 }} />

                {/* Accent bar */}
                <View style={styles.accentBar}>
                  <Svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                    <Polygon points="0,10 400,20 400,0 0,0" fill={accent.barDark} />
                    <Polygon points="0,20 400,20 0,0"         fill={accent.bar}     />
                  </Svg>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerTab}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={24} color="white" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerTab}
          onPress={() => navigation.navigate('Services')}
        >
          <MaterialCommunityIcons name="storefront-outline" size={24} color="white" />
          <Text style={styles.footerText}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab}>
          <View style={styles.activeTabIndicator} />
          <Ionicons name="card-outline" size={24} color="#F28B9D" />
          <Text style={[styles.footerText, { color: '#F28B9D' }]}>Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: { padding: 4 },
  menuBtn: { padding: 4 },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },

  // ── Filter tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tabActive: {
    backgroundColor: '#AED6F1',
    borderColor: '#AED6F1',
  },
  tabText: { color: 'white', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#121212' },

  // ── Cards
  scroll: { flex: 1 },
  cardsContainer: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },

  card: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardFocused: {
    backgroundColor: '#FFFFFF',
    minHeight: 160,
  },
  cardUnfocused: {
    backgroundColor: '#22272B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 110,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 4 },
  cardTitleFocused: { color: '#111' },
  cardExpiry: { fontSize: 14, color: '#555' },
  cardExpiryFocused: { color: '#555' },

  // Unfocused card text overrides
  cardUnfocusedTitle: { color: 'white' },
  cardUnfocusedExpiry: { color: 'rgba(255,255,255,0.6)' },

  statusBadge: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  statusExpired: { color: '#FF3B30' },
  statusSuspended: { color: '#FF9500' },

  nswLogo: { width: 28, height: 28, resizeMode: 'contain' },
  nswLogoFocused: { width: 36, height: 36 },

  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },

  // ── Footer
  footer: { flexDirection: 'row', backgroundColor: '#121212', height: 60, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  activeTabIndicator: { position: 'absolute', top: -10, width: '100%', height: 3, backgroundColor: '#F28B9D' },
  footerText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
});
