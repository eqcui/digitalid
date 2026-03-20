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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Service card data ────────────────────────────────────────────────────────
const ALL_SERVICES = [
  {
    id: 'all-services',
    title: 'All Services',
    description: 'Browse all services available at Service NSW',
    img: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/services',
    category: 'all',
  },
  {
    id: 'driving',
    title: 'Driving and transport',
    description: 'Driver licences, vehicle registrations, buying and selling a vehicle and toll relief.',
    img: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/services/driving-and-transport',
    category: 'all',
  },
  {
    id: 'savings',
    title: 'Savings Finder',
    description: 'Discover more than 70 ways to save with NSW Government rebates and vouchers. Check the Savings Finder and apply online',
    img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/campaign/savings-finder',
    category: 'all',
  },
  {
    id: 'flood',
    title: 'Storm and flood preparation and recovery',
    description: 'Information and resources to help before, during, and after a storm or flood',
    img: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/campaign/floods',
    category: 'disasters',
  },
  {
    id: 'more-apps',
    title: 'Discover more apps from NSW Government',
    description: 'Download apps to help you find the cheapest fuel, find and pay for parking, and more',
    img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    external: false,
    url: 'https://www.service.nsw.gov.au/campaign/more-apps',
    category: 'all',
  },
  {
    id: 'aed',
    title: 'Register an Automated External Defibrillator (AED)',
    description: 'Help people find publicly available AEDs in an emergency.',
    img: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/transaction/register-aed',
    category: 'all',
  },
  {
    id: 'health',
    title: 'Health and care',
    description: 'Access general health information, support, and advice for customers',
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    external: false,
    url: 'https://www.service.nsw.gov.au/services/health-and-care',
    category: 'all',
  },
  {
    id: 'bushfire',
    title: 'Bushfire resources',
    description: 'Information, support, and advice for bushfires in NSW',
    img: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&q=80',
    external: true,
    url: 'https://www.service.nsw.gov.au/campaign/bushfire-recovery',
    category: 'disasters',
  },
];

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'disasters', label: 'Natural disasters' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ServicesScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [feedback, setFeedback] = useState(null); // 'good' | 'bad' | null

  const filtered = activeFilter === 'all'
    ? ALL_SERVICES
    : ALL_SERVICES.filter(s => s.category === activeFilter);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── FILTER TABS ── */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterBtn, activeFilter === f.id && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SERVICE CARDS ── */}
        <View style={styles.cardsContainer}>
          {filtered.map(service => (
            <TouchableOpacity
              key={service.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => Linking.openURL(service.url)}
            >
              <Image source={{ uri: service.img }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{service.title}</Text>
                <Text style={styles.cardDesc}>{service.description}</Text>
                <View style={styles.cardIcon}>
                  {service.external
                    ? <Ionicons name="open-outline" size={20} color="white" />
                    : <Ionicons name="arrow-forward" size={20} color="white" />
                  }
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── FEEDBACK ── */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackQuestion}>How was your experience finding services?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'good' && styles.feedbackBtnActive]}
              onPress={() => setFeedback('good')}
            >
              <Ionicons name="thumbs-up-outline" size={20} color="white" />
              <Text style={styles.feedbackBtnText}>Good</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'bad' && styles.feedbackBtnActive]}
              onPress={() => setFeedback('bad')}
            >
              <Ionicons name="thumbs-down-outline" size={20} color="white" />
              <Text style={styles.feedbackBtnText}>Not so good</Text>
            </TouchableOpacity>
          </View>
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

        <TouchableOpacity style={styles.footerTab}>
          <View style={styles.activeTabIndicator} />
          <MaterialCommunityIcons name="storefront-outline" size={24} color="#F28B9D" />
          <Text style={[styles.footerText, { color: '#F28B9D' }]}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerTab}
          onPress={() => navigation.navigate('Wallet')}
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

  header: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },

  scroll: { flex: 1 },

  // ── Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterBtnActive: {
    backgroundColor: '#AED6F1',
    borderColor: '#AED6F1',
  },
  filterText: { color: 'white', fontSize: 15, fontWeight: '600' },
  filterTextActive: { color: '#121212' },

  // ── Cards
  cardsContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: '#1E2428',
  },
  cardImage: { width: '100%', height: 180 },
  cardBody: { padding: 16 },
  cardTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardIcon: { marginTop: 2 },

  // ── Feedback
  feedbackSection: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
  feedbackQuestion: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  feedbackButtons: { flexDirection: 'row', gap: 12 },
  feedbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  feedbackBtnActive: { borderColor: '#F28B9D' },
  feedbackBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },

  // ── Footer
  footer: { flexDirection: 'row', backgroundColor: '#121212', height: 60, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  footerTab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', position: 'relative' },
  activeTabIndicator: { position: 'absolute', top: -10, width: '100%', height: 3, backgroundColor: '#F28B9D' },
  footerText: { color: 'white', fontSize: 12, marginTop: 5, fontWeight: '600' },
});
