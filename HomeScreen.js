import React, { useState } from 'react';
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

// ─── Home tab: service quick-links ───────────────────────────────────────────
const SERVICE_LINKS = [
  { label: 'Registrations',             icon: require('./assets/icon-registrations.png'), url: 'https://www.service.nsw.gov.au/transaction/registration' },
  { label: 'Fines and demerits',        icon: require('./assets/icon-fines.png'),         url: 'https://www.service.nsw.gov.au/transaction/pay-a-fine' },
  { label: 'Vouchers',                  icon: require('./assets/icon-vouchers.png'),       url: 'https://www.service.nsw.gov.au/campaign/service-nsw-vouchers', badge: 'New' },
  { label: 'Disaster support & grants', icon: require('./assets/icon-disaster.png'),       url: 'https://www.service.nsw.gov.au/campaign/disaster-assistance' },
  { label: 'Locations',                 icon: require('./assets/icon-locations.png'),      url: 'https://www.service.nsw.gov.au/find-a-service-centre' },
  { label: 'QR code check-in',          icon: require('./assets/icon-qr.png'),             url: 'https://www.service.nsw.gov.au/transaction/check-in-using-qr-code' },
  { label: 'Check a licence or credential', icon: require('./assets/icon-verify.png'),     url: 'https://www.service.nsw.gov.au/transaction/check-a-licence-or-credential', isVerify: true },
];

// ─── Services tab: card data ──────────────────────────────────────────────────
const ALL_SERVICES = [
  { id: 'all-services', title: 'All Services',                                    description: 'Browse all services available at Service NSW',                                                                                        img: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/services',                                    category: 'all' },
  { id: 'driving',      title: 'Driving and transport',                            description: 'Driver licences, vehicle registrations, buying and selling a vehicle and toll relief.',                                               img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/services/driving-and-transport',              category: 'all' },
  { id: 'savings',      title: 'Savings Finder',                                   description: 'Discover more than 70 ways to save with NSW Government rebates and vouchers. Check the Savings Finder and apply online',             img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/campaign/savings-finder',                     category: 'all' },
  { id: 'flood',        title: 'Storm and flood preparation and recovery',          description: 'Information and resources to help before, during, and after a storm or flood',                                                       img: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/campaign/floods',                             category: 'disasters' },
  { id: 'more-apps',   title: 'Discover more apps from NSW Government',            description: 'Download apps to help you find the cheapest fuel, find and pay for parking, and more',                                               img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', external: false, url: 'https://www.service.nsw.gov.au/campaign/more-apps',                          category: 'all' },
  { id: 'aed',          title: 'Register an Automated External Defibrillator (AED)', description: 'Help people find publicly available AEDs in an emergency.',                                                                       img: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/transaction/register-aed',                    category: 'all' },
  { id: 'health',       title: 'Health and care',                                  description: 'Access general health information, support, and advice for customers',                                                               img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80', external: false, url: 'https://www.service.nsw.gov.au/services/health-and-care',                    category: 'all' },
  { id: 'bushfire',     title: 'Bushfire resources',                               description: 'Information, support, and advice for bushfires in NSW',                                                                              img: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&q=80', external: true,  url: 'https://www.service.nsw.gov.au/campaign/bushfire-recovery',                  category: 'disasters' },
];

const SERVICE_FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'disasters', label: 'Natural disasters' },
];

// ─── Accent colours per licence type ─────────────────────────────────────────
const LICENCE_ACCENT = {
  driverLicence:        { bar: '#cc6969', barDark: '#c9535b' },
  boatLicence:          { bar: '#73C6B6', barDark: '#3a9e8e' },
  contractorLicence:    { bar: '#8499cf', barDark: '#5a6aa0' },
  workingWithChildren:  { bar: '#F28B9D', barDark: '#b85f70' },
  default:              { bar: '#8499cf', barDark: '#5a6aa0' },
};
const accentFor = (type) => LICENCE_ACCENT[type] ?? LICENCE_ACCENT.default;

// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user, licences = [] } = useAuth();

  const [activeTab,      setActiveTab]      = useState('home');
  const [serviceFilter,  setServiceFilter]  = useState('all');
  const [walletTab,      setWalletTab]      = useState('all');
  const [feedbackChoice, setFeedbackChoice] = useState(null);

  const firstName = user?.firstName ?? '';
  const [focusedLicence, ...otherLicences] = licences;
  const favourites = licences.filter(l => l.favourite);

  // ── TAB HEADER ─────────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (activeTab === 'services') {
      return (
        <View style={styles.centredHeader}>
          <Text style={styles.centredHeaderTitle}>Services</Text>
        </View>
      );
    }
    if (activeTab === 'wallet') {
      return (
        <View style={styles.walletHeader}>
          <Text style={styles.centredHeaderTitle}>Wallet</Text>
          <TouchableOpacity style={styles.menuBtn}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="white" />
          </TouchableOpacity>
        </View>
      );
    }
    // Home header
    return (
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
            <Image source={require('./assets/notification-icon.png')} style={styles.notificationIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Account')}>
            <Image source={require('./assets/profile-icon.png')} style={styles.profileIcon} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── HOME CONTENT ───────────────────────────────────────────────────────────
  const renderHome = () => (
    <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
      {/* Favourites / licence cards */}
      <View style={styles.favouritesContainer}>
        <Text style={styles.sectionTitle}>{firstName ? `Hi ${firstName}` : 'Favourites'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favouritesScrollContent}>
          <TouchableOpacity style={styles.addFavouriteBtn}>
            <Ionicons name="star-outline" size={20} color="white" />
          </TouchableOpacity>

          {focusedLicence ? (
            <TouchableOpacity style={styles.focusedCard} activeOpacity={0.8}
              onPress={() => navigation.navigate('Licence', { licenceId: focusedLicence.id })}>
              <View style={styles.licenceTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.focusedTitle}>{focusedLicence.label}</Text>
                  <Text style={styles.focusedExpiry}>Expiry: {focusedLicence.expiryShort}</Text>
                  {focusedLicence.status !== 'active' && (
                    <Text style={[styles.statusBadge, focusedLicence.status === 'expired' ? styles.statusExpired : styles.statusSuspended]}>
                      {focusedLicence.status.toUpperCase()}
                    </Text>
                  )}
                </View>
                <Image source={require('./assets/nsw-logo-card.png')} style={styles.focusedLogo} />
              </View>
              <View style={styles.licenceYellowBar}>
                <Svg width="100%" height="18" viewBox="0 0 260 18" preserveAspectRatio="none">
                  <Polygon points="0,9 260,18 260,0 0,0" fill={accentFor(focusedLicence.type).barDark} />
                  <Polygon points="0,18 260,18 0,0"       fill={accentFor(focusedLicence.type).bar} />
                </Svg>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.focusedCard, styles.placeholderCard]}>
              <Text style={styles.placeholderText}>No licences found</Text>
            </View>
          )}

          {otherLicences.map((lic) => {
            const accent = accentFor(lic.type);
            return (
              <TouchableOpacity key={lic.id} style={styles.unfocusedCard}
                onPress={() => navigation.navigate('Licence', { licenceId: lic.id })}>
                <View style={styles.licenceTopRow}>
                  <Text style={[styles.unfocusedTitle, { flex: 1 }]}>{lic.label}</Text>
                  <Image source={require('./assets/nsw-logo.png')} style={styles.unfocusedLogo} />
                </View>
                <Text style={styles.unfocusedExpiry}>Expiry: {lic.expiryShort}</Text>
                <View style={[styles.licenceYellowBar, { backgroundColor: accent.bar }]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {licences.length > 0 && (
          <View style={styles.paginationDots}>
            {licences.map((_, i) => <View key={i} style={[styles.dot, i === 0 && styles.activeDot]} />)}
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingRight: 20 }}>
          {[
            { url: 'https://www.service.nsw.gov.au/transaction/rate-our-app',               img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500&q=80', label: 'Rate your app experience',  icon: <Ionicons name="open-outline"  size={16} color="#A0A0A0" /> },
            { url: 'https://www.service.nsw.gov.au/campaign/savings-finder',                 img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=500&q=80',    label: 'Use the Savings Finder',    icon: <Ionicons name="open-outline"  size={16} color="#A0A0A0" /> },
            { url: 'https://www.service.nsw.gov.au/transaction/enrol-driver-knowledge-test', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500&q=80', label: 'Enrol in the DKT online',   icon: <Ionicons name="open-outline"  size={16} color="#A0A0A0" /> },
            { url: 'https://www.service.nsw.gov.au/campaign/more-apps',                     img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80',  label: 'Discover more apps',        icon: <Feather  name="arrow-right"   size={16} color="#A0A0A0" /> },
            { url: 'https://www.service.nsw.gov.au/transaction/claim-toll-relief',           img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&q=80', label: 'Claim toll relief $60 cap', icon: <Ionicons name="open-outline"  size={16} color="#A0A0A0" /> },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.card} onPress={() => Linking.openURL(item.url)}>
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
          <TouchableOpacity key={service.label} style={styles.serviceRow}
            onPress={() => service.isVerify ? navigation.navigate('Verify') : Linking.openURL(service.url)}>
            <View style={styles.serviceIconContainer}>
              <Image source={service.icon} style={styles.serviceIconImg} />
            </View>
            <Text style={styles.serviceText}>{service.label}</Text>
            {service.badge && <View style={styles.newBadge}><Text style={styles.newBadgeText}>{service.badge}</Text></View>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.feedbackRow} onPress={() => Linking.openURL('https://www.service.nsw.gov.au/feedback')}>
          <Text style={styles.feedbackText}>Share your feedback</Text>
          <Ionicons name="chatbox-outline" size={20} color="#cdeefe" />
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </View>
    </ScrollView>
  );

  // ── SERVICES CONTENT ───────────────────────────────────────────────────────
  const renderServices = () => {
    const filtered = serviceFilter === 'all' ? ALL_SERVICES : ALL_SERVICES.filter(s => s.category === serviceFilter);
    return (
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {SERVICE_FILTERS.map(f => (
            <TouchableOpacity key={f.id}
              style={[styles.filterBtn, serviceFilter === f.id && styles.filterBtnActive]}
              onPress={() => setServiceFilter(f.id)}>
              <Text style={[styles.filterText, serviceFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cards */}
        <View style={styles.svcCardsContainer}>
          {filtered.map(service => (
            <TouchableOpacity key={service.id} style={styles.svcCard} activeOpacity={0.85}
              onPress={() => Linking.openURL(service.url)}>
              <Image source={{ uri: service.img }} style={styles.svcCardImage} />
              <View style={styles.svcCardBody}>
                <Text style={styles.svcCardTitle}>{service.title}</Text>
                <Text style={styles.svcCardDesc}>{service.description}</Text>
                <View style={{ marginTop: 2 }}>
                  {service.external
                    ? <Ionicons name="open-outline" size={20} color="white" />
                    : <Ionicons name="arrow-forward" size={20} color="white" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback */}
        <View style={styles.svcFeedbackSection}>
          <Text style={styles.svcFeedbackQuestion}>How was your experience finding services?</Text>
          <View style={styles.svcFeedbackButtons}>
            {[{ id: 'good', label: 'Good', icon: 'thumbs-up-outline' }, { id: 'bad', label: 'Not so good', icon: 'thumbs-down-outline' }].map(btn => (
              <TouchableOpacity key={btn.id}
                style={[styles.svcFeedbackBtn, feedbackChoice === btn.id && styles.svcFeedbackBtnActive]}
                onPress={() => setFeedbackChoice(btn.id)}>
                <Ionicons name={btn.icon} size={20} color="white" />
                <Text style={styles.svcFeedbackBtnText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ── WALLET CONTENT ─────────────────────────────────────────────────────────
  const renderWallet = () => {
    const displayed = walletTab === 'all' ? licences : favourites;
    return (
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {[{ id: 'all', label: `All (${licences.length})` }, { id: 'favourites', label: `Favourites (${favourites.length})` }].map(t => (
            <TouchableOpacity key={t.id}
              style={[styles.filterBtn, walletTab === t.id && styles.filterBtnActive]}
              onPress={() => setWalletTab(t.id)}>
              <Text style={[styles.filterText, walletTab === t.id && styles.filterTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.walletCardsContainer}>
          {displayed.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>No licences found</Text>
            </View>
          )}
          {displayed.map((lic, index) => {
            const accent  = accentFor(lic.type);
            const isFirst = index === 0;
            return (
              <TouchableOpacity key={lic.id} activeOpacity={0.85}
                style={[styles.walletCard, isFirst ? styles.walletCardFocused : styles.walletCardUnfocused]}
                onPress={() => navigation.navigate('Licence', { licenceId: lic.id })}>
                <View style={styles.walletCardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.walletCardTitle, !isFirst && styles.walletCardTitleDark]}>
                      {lic.label}
                    </Text>
                    <Text style={[styles.walletCardExpiry, !isFirst && styles.walletCardExpiryDark]}>
                      Expiry: {lic.expiryLong ?? lic.expiryShort}
                    </Text>
                    {lic.status && lic.status !== 'active' && (
                      <Text style={[styles.statusBadge, lic.status === 'expired' ? styles.statusExpired : styles.statusSuspended]}>
                        {lic.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Image source={require('./assets/nsw-logo-card.png')}
                    style={[styles.walletNswLogo, isFirst && { width: 36, height: 36 }]} />
                </View>
                <View style={{ height: isFirst ? 60 : 30 }} />
                <View style={styles.walletAccentBar}>
                  <Svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                    <Polygon points="0,10 400,20 400,0 0,0" fill={accent.barDark} />
                    <Polygon points="0,20 400,20 0,0"        fill={accent.bar} />
                  </Svg>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  };

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'home',     label: 'Home',     icon: (active) => <Ionicons               name="home-outline"      size={24} color={active ? '#F28B9D' : 'white'} /> },
    { id: 'services', label: 'Services', icon: (active) => <MaterialCommunityIcons name="storefront-outline" size={24} color={active ? '#F28B9D' : 'white'} /> },
    { id: 'wallet',   label: 'Wallet',   icon: (active) => <Ionicons               name="card-outline"      size={24} color={active ? '#F28B9D' : 'white'} /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {renderHeader()}

      {activeTab === 'home'     && renderHome()}
      {activeTab === 'services' && renderServices()}
      {activeTab === 'wallet'   && renderWallet()}

      <View style={styles.footer}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity key={tab.id} style={styles.footerTab} onPress={() => setActiveTab(tab.id)}>
              {active && <View style={styles.activeTabIndicator} />}
              {tab.icon(active)}
              <Text style={[styles.footerText, active && { color: '#F28B9D' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },

  // ── Headers
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 5, backgroundColor: '#121212' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  customLogoImage: { width: 28, height: 28, borderRadius: 14, marginRight: 7 },
  logoText: { color: 'white', fontSize: 15, fontWeight: 'bold', lineHeight: 16 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 20, position: 'relative' },
  profileIcon: { width: 22, height: 22, resizeMode: 'contain' },
  notificationIcon: { width: 20, height: 20, resizeMode: 'contain' },

  centredHeader: { alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  centredHeaderTitle: { color: 'white', fontSize: 17, fontWeight: '600' },

  walletHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)', position: 'relative' },
  menuBtn: { position: 'absolute', right: 16 },

  mainScroll: { flex: 1 },

  // ── Home — favourites
  favouritesContainer: { paddingTop: 10, paddingBottom: 25 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20 },
  favouritesScrollContent: { paddingRight: 20, alignItems: 'center' },
  addFavouriteBtn: { width: 55, height: 115, borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderLeftWidth: 0, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', borderTopRightRadius: 12, borderBottomRightRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  focusedCard: { width: 260, height: 145, backgroundColor: '#282A2D', borderRadius: 8, padding: 20, marginRight: 15, position: 'relative', overflow: 'hidden' },
focusedTitle: { color: 'white', fontSize: 19, fontWeight: 'bold' },
  focusedLogo: { width: 26, height: 26, resizeMode: 'contain', marginRight: 2 },
  focusedExpiry: { color: '#A0A0A0', fontSize: 14, marginTop: 4 },

  unfocusedCard: { width: 190, height: 115, backgroundColor: '#282A2D', borderRadius: 12, padding: 15, marginRight: 15, position: 'relative', overflow: 'hidden' },
  unfocusedTitle: { color: 'white', fontSize: 19, fontWeight: 'bold', width: '75%' },
  unfocusedLogo: { width: 24, height: 24, resizeMode: 'contain', borderRadius: 12, marginRight: 16 },
  unfocusedExpiry: { color: '#A0A0A0', fontSize: 12, marginTop: 15 },

  placeholderCard: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  licenceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  licenceYellowBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, overflow: 'hidden' },

  statusBadge: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  statusExpired: { color: '#FF3B30' },
  statusSuspended: { color: '#FF9500' },

  paginationDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  activeDot: { backgroundColor: 'white' },

  // ── Home — bottom sheet
  bottomSheet: { backgroundColor: '#22272B', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 25, minHeight: 500 },
  horizontalScroll: { paddingLeft: 20 },
  card: { width: 160, backgroundColor: '#2C3135', borderRadius: 8, marginRight: 15, overflow: 'hidden' },
  cardImage: { width: '100%', height: 70 },
  cardTextContainer: { padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', height: 55 },
  cardText: { color: 'white', fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 5 },
  serviceRow: { flexDirection: 'row', backgroundColor: '#2C3135', borderRadius: 4, padding: 15, marginHorizontal: 20, marginBottom: 12, alignItems: 'center' },
  serviceIconContainer: { marginRight: 15, width: 44, alignItems: 'center' },
  serviceIconImg:       { width: 44, height: 44, resizeMode: 'contain' },
  serviceText: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1 },
  newBadge: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  newBadgeText: { color: 'white', fontSize: 13, fontWeight: '600' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 10 },
  feedbackText: { color: '#cdeefe', fontSize: 16, fontWeight: '600' },

  // ── Services tab
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  filterBtnActive: { backgroundColor: '#AED6F1', borderColor: '#AED6F1' },
  filterText: { color: 'white', fontSize: 15, fontWeight: '600' },
  filterTextActive: { color: '#121212' },

  svcCardsContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  svcCard: { borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', backgroundColor: '#1E2428' },
  svcCardImage: { width: '100%', height: 180 },
  svcCardBody: { padding: 16 },
  svcCardTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  svcCardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, marginBottom: 12 },

  svcFeedbackSection: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
  svcFeedbackQuestion: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  svcFeedbackButtons: { flexDirection: 'row', gap: 12 },
  svcFeedbackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  svcFeedbackBtnActive: { borderColor: '#F28B9D' },
  svcFeedbackBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },

  // ── Wallet tab
  walletCardsContainer: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  walletCard: { borderRadius: 10, overflow: 'hidden', position: 'relative' },
  walletCardFocused: { backgroundColor: '#FFFFFF', minHeight: 160 },
  walletCardUnfocused: { backgroundColor: '#22272B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', minHeight: 110 },
  walletCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 18 },
  walletCardTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
  walletCardTitleDark: { color: 'white' },
  walletCardExpiry: { fontSize: 14, color: '#555' },
  walletCardExpiryDark: { color: 'rgba(255,255,255,0.6)' },
  walletNswLogo: { width: 28, height: 28, resizeMode: 'contain' },
  walletAccentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },

  // ── Footer
  footer: { flexDirection: 'row', backgroundColor: '#121212', height: 60, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  activeTabIndicator: { position: 'absolute', top: -10, width: '100%', height: 3, backgroundColor: '#F28B9D' },
  footerText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
});