import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const ICON_COLOR = '#F28B9D';

const SERVICES = [
  {
    id: 'registrations',
    title: 'Registrations',
    url: 'https://www.service.nsw.gov.au/services/driving-and-transport/vehicle-registration',
    icon: <MaterialCommunityIcons name="card-search-outline" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'fines',
    title: 'Fines and demerits',
    url: 'https://www.service.nsw.gov.au/services/driving-and-transport/fines-and-tolls',
    icon: <MaterialCommunityIcons name="cash-remove" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'vouchers',
    title: 'Vouchers',
    badge: 'New',
    url: 'https://www.service.nsw.gov.au/services/vouchers',
    icon: <MaterialCommunityIcons name="ticket-percent-outline" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'disaster',
    title: 'Disaster support & grants',
    url: 'https://www.service.nsw.gov.au/campaign/floods',
    icon: <MaterialCommunityIcons name="hand-heart-outline" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'locations',
    title: 'Locations',
    url: 'https://www.service.nsw.gov.au/service-centre',
    icon: <Ionicons name="location-outline" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'qr',
    title: 'QR code check-in',
    url: 'https://www.service.nsw.gov.au/transaction/check-in-qr-code',
    icon: <MaterialCommunityIcons name="qrcode-scan" size={34} color={ICON_COLOR} />,
  },
  {
    id: 'verify',
    title: 'Check a licence or credential',
    url: 'https://www.service.nsw.gov.au/transaction/check-licence-credential',
    icon: <MaterialCommunityIcons name="card-account-details-outline" size={34} color={ICON_COLOR} />,
  },
];

export default function ServicesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SERVICE ROWS ── */}
        <View style={styles.listContainer}>
          {SERVICES.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(service.url)}
            >
              <View style={styles.rowIcon}>{service.icon}</View>
              <Text style={styles.rowTitle}>{service.title}</Text>
              {service.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{service.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── FEEDBACK ── */}
        <TouchableOpacity style={styles.feedbackRow}>
          <Text style={styles.feedbackText}>Share your feedback</Text>
          <MaterialCommunityIcons name="message-outline" size={22} color="white" />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={24} color="white" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab}>
          <View style={styles.activeTabIndicator} />
          <MaterialCommunityIcons name="storefront-outline" size={24} color={ICON_COLOR} />
          <Text style={[styles.footerText, { color: ICON_COLOR }]}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerTab} onPress={() => navigation.navigate('Wallet')}>
          <Ionicons name="card-outline" size={24} color="white" />
          <Text style={styles.footerText}>Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '700' },

  scroll: { flex: 1 },

  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 16,
  },
  rowIcon: {
    width: 44,
    alignItems: 'center',
  },
  rowTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  feedbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    height: 60,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  activeTabIndicator: {
    position: 'absolute',
    top: -10,
    width: '100%',
    height: 3,
    backgroundColor: ICON_COLOR,
  },
  footerText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
});
