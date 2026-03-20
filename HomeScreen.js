import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { useAuth } from './AuthContext';

// ─── Static service links ─────────────────────────────────────────────────────
const SERVICE_LINKS = [
  {
    label: 'Registrations',
    icon: <MaterialCommunityIcons name="card-account-details-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/transaction/registration',
  },
  {
    label: 'Fines and demerits',
    icon: <MaterialCommunityIcons name="file-document-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/transaction/pay-a-fine',
  },
  {
    label: 'Vouchers',
    icon: <MaterialCommunityIcons name="ticket-confirmation-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/campaign/service-nsw-vouchers',
    badge: 'New',
  },
  {
    label: 'Disaster support & grants',
    icon: <MaterialCommunityIcons name="hand-heart-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/campaign/disaster-assistance',
  },
  {
    label: 'Locations',
    icon: <Ionicons name="location-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/find-a-service-centre',
  },
  {
    label: 'QR code check-in',
    icon: <MaterialCommunityIcons name="qrcode-scan" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/transaction/check-in-using-qr-code',
  },
  {
    label: 'Check a licence or credential',
    icon: <MaterialCommunityIcons name="card-search-outline" size={30} color="#B0CBDF" />,
    url: 'https://www.service.nsw.gov.au/transaction/check-a-licence-or-credential',
  },
];

// ─── Licence card accent colours ──────────────────────────────────────────────
const LICENCE_ACCENT = {
  driverLicence:      { bar: '#fff364', barDark: '#6f6b32' },
  workingWithChildren: { bar: '#73C6B6', barDark: '#73C6B6' },
  default:            { bar: '#8499cf', barDark: '#5a6aa0' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, licences } = useAuth();

  // First name for the greeting
  const firstName = user?.firstName ?? '';

  // Split licences: first one is the "focused" card, rest are "unfocused"
  const [focusedLicence, ...otherLicences] = licences;

  const accentFor = (type) => LICENCE_ACCENT[type] ?? LICENCE_ACCENT.default;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('./assets/logo.png')} style={styles.customLogoImage} />
          <View>
            <Text style={styles.logoText}>Service</Text>
            <Text style={styles.logoText}>NSW</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <View style={styles.notificationDot} />
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
          {/* Profile icon → Account screen */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Account')}
          >
            {user?.profilePhotoUrl ? (
              <Image
                source={{ uri: user.profilePhotoUrl }}
                style={styles.headerAvatar}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN SCROLL ───────────────────────────────────────────────────── */}
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>

        {/* === FAVOURITES SECTION === */}
        <View style={styles.favouritesContainer}>
          <Text style={styles.sectionTitle}>
            {firstName ? `Hi ${firstName}` : 'Favourites'}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favouritesScrollContent}
          >
            {/* Add button */}
            <TouchableOpacity style={styles.addFavouriteBtn}>
              <Ionicons name="star-outline" size={20} color="white" />
            </TouchableOpacity>

            {/* Focused (first) licence card */}
            {focusedLicence ? (
              <TouchableOpacity
                style={styles.focusedCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Licence', { licenceId: focusedLicence.id })}
              >
                <View style={styles.licenceTopRow}>
                  <View>
                    <Text style={styles.focusedTitle}>{focusedLicence.label}</Text>
                    <Text style={styles.focusedExpiry}>
                      Expiry: {focusedLicence.expiryShort}
                    </Text>
                    {focusedLicence.status !== 'active' && (
                      <Text style={[
                        styles.statusBadge,
                        focusedLicence.status === 'expired'   && styles.statusExpired,
                        focusedLicence.status === 'suspended' && styles.statusSuspended,
                      ]}>
                        {focusedLicence.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Image
                    source={require('./assets/nsw-logo-card.png')}
                    style={styles.focusedLogo}
                  />
                </View>
                <View style={styles.licenceYellowBar}>
                  <Svg width="100%" height="18" viewBox="0 0 260 18" preserveAspectRatio="none">
                    <Polygon
                      points="0,9 260,18 260,0 0,0"
                      fill={accentFor(focusedLicence.type).barDark}
                    />
                    <Polygon
                      points="0,18 260,18 0,0"
                      fill={accentFor(focusedLicence.type).bar}
                    />
                  </Svg>
                </View>
              </TouchableOpacity>
            ) : (
              // Placeholder when no licences have loaded yet
              <View style={[styles.focusedCard, styles.placeholderCard]}>
                <Text style={styles.placeholderText}>No licences found</Text>
              </View>
            )}

            {/* Additional licence cards */}
            {otherLicences.map((lic) => {
              const accent = accentFor(lic.type);
              return (
                <TouchableOpacity
                  key={lic.id}
                  style={styles.unfocusedCard}
                  onPress={() => navigation.navigate('Licence', { licenceId: lic.id })}
                >
                  <View style={styles.licenceTopRow}>
                    <Text style={styles.unfocusedTitle}>{lic.label}</Text>
                    <Image
                      source={require('./assets/nsw-logo.png')}
                      style={styles.unfocusedLogo}
                    />
                  </View>
                  <Text style={styles.unfocusedExpiry}>Expiry: {lic.expiryShort}</Text>
                  <View style={[styles.licenceYellowBar, { backgroundColor: accent.bar }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Pagination dots — one per licence */}
          {licences.length > 0 && (
            <View style={styles.paginationDots}>
              {licences.map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* === BOTTOM SHEET === */}
        <View style={styles.bottomSheet}>

          <Text style={styles.sectionTitle}>Featured</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {[
              { url: 'https://www.service.nsw.gov.au/transaction/rate-our-app',           img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500&q=80', label: 'Rate your app experience',   icon: <Ionicons name="open-outline" size={16} color="#A0A0A0" /> },
              { url: 'https://www.service.nsw.gov.au/campaign/savings-finder',             img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=500&q=80', label: 'Use the Savings Finder',      icon: <Ionicons name="open-outline" size={16} color="#A0A0A0" /> },
              { url: 'https://www.service.nsw.gov.au/transaction/enrol-driver-knowledge-test', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500&q=80', label: 'Enrol in the DKT online',  icon: <Ionicons name="open-outline" size={16} color="#A0A0A0" /> },
              { url: 'https://www.service.nsw.gov.au/campaign/more-apps',                 img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80', label: 'Discover more apps',         icon: <Feather name="arrow-right" size={16} color="#A0A0A0" /> },
              { url: 'https://www.service.nsw.gov.au/transaction/claim-toll-relief',       img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&q=80', label: 'Claim toll relief $60 cap',  icon: <Ionicons name="open-outline" size={16} color="#A0A0A0" /> },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.card}
                onPress={() => Linking.openURL(item.url)}
              >
                <Image source={{ uri: item.img }} style={styles.cardImage} />
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardText}>{item.label}</Text>
                  {item.icon}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 35 }]}>Services</Text>

          {SERVICE_LINKS.map((service) => (
            <TouchableOpacity
              key={service.label}
              style={styles.serviceRow}
              onPress={() => {
                if (service.label === 'Check a licence or credential') {
                  navigation.navigate('Verify');
                } else {
                  Linking.openURL(service.url);
                }
              }}
            >
              <View style={styles.serviceIconContainer}>{service.icon}</View>
              <Text style={styles.serviceText}>{service.label}</Text>
              {service.badge && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{service.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.feedbackRow}
            onPress={() => Linking.openURL('https://www.service.nsw.gov.au/feedback')}
          >
            <Text style={styles.feedbackText}>Share your feedback</Text>
            <Ionicons name="chatbox-outline" size={20} color="#cdeefe" />
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </View>
      </ScrollView>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab}>
          <View style={styles.activeTabIndicator} />
          <Ionicons name="home-outline" size={24} color="#F28B9D" />
          <Text style={[styles.footerText, { color: '#F28B9D' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerTab}
          onPress={() => Linking.openURL('https://www.service.nsw.gov.au/services')}
        >
          <MaterialCommunityIcons name="storefront-outline" size={24} color="white" />
          <Text style={styles.footerText}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerTab}
          onPress={() => navigation.navigate('Licence', { licenceId: focusedLicence?.id })}
        >
          <Ionicons name="card-outline" size={24} color="white" />
          <Text style={styles.footerText}>Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#121212' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  customLogoImage: { width: 35, height: 35, borderRadius: 18, marginRight: 10 },
  logoText: { color: 'white', fontSize: 14, fontWeight: 'bold', lineHeight: 16 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 20, position: 'relative' },
  notificationDot: { position: 'absolute', top: 0, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E32636', zIndex: 1 },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  mainScroll: { flex: 1 },

  favouritesContainer: { paddingTop: 10, paddingBottom: 25 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20 },
  favouritesScrollContent: { paddingRight: 20, alignItems: 'center' },

  addFavouriteBtn: {
    width: 55, height: 115,
    borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed',
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },

  focusedCard: {
    width: 260, height: 145,
    backgroundColor: '#282A2D', borderRadius: 8,
    padding: 20, marginRight: 15,
    position: 'relative', overflow: 'hidden',
  },
  focusedTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  focusedLogo: { width: 26, height: 26, resizeMode: 'contain' },
  focusedExpiry: { color: '#A0A0A0', fontSize: 14, marginTop: 4 },

  statusBadge: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  statusExpired: { color: '#FF3B30' },
  statusSuspended: { color: '#FF9500' },

  unfocusedCard: {
    width: 190, height: 115,
    backgroundColor: '#282A2D', borderRadius: 12,
    padding: 15, marginRight: 15,
    position: 'relative', overflow: 'hidden',
  },
  unfocusedTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', width: '75%' },
  unfocusedLogo: { width: 24, height: 24, resizeMode: 'contain', borderRadius: 12 },
  unfocusedExpiry: { color: '#A0A0A0', fontSize: 12, marginTop: 15 },

  placeholderCard: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  licenceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  licenceYellowBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, overflow: 'hidden' },

  paginationDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  activeDot: { backgroundColor: 'white' },

  bottomSheet: { backgroundColor: '#22272B', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 25, minHeight: 500 },
  horizontalScroll: { paddingLeft: 20 },
  card: { width: 160, backgroundColor: '#2C3135', borderRadius: 8, marginRight: 15, overflow: 'hidden' },
  cardImage: { width: '100%', height: 90 },
  cardTextContainer: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', height: 70 },
  cardText: { color: 'white', fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 5 },

  serviceRow: { flexDirection: 'row', backgroundColor: '#2C3135', borderRadius: 4, padding: 15, marginHorizontal: 20, marginBottom: 12, alignItems: 'center' },
  serviceIconContainer: { marginRight: 15 },
  serviceText: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1 },
  newBadge: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  newBadgeText: { color: 'white', fontSize: 13, fontWeight: '600' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 10 },
  feedbackText: { color: '#cdeefe', fontSize: 16, fontWeight: '600' },

  footer: { flexDirection: 'row', backgroundColor: '#121212', height: 60, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  activeTabIndicator: { position: 'absolute', top: -10, width: '100%', height: 3, backgroundColor: '#F28B9D' },
  footerText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
});
