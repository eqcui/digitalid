/**
 * AccountScreen.js
 * ----------------
 * Shows the logged-in user's profile, lets them edit contact info,
 * and provides a Sign Out button.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import { updateMe } from './api';

export default function AccountScreen({ navigation }) {
  const { user, token, licences, photoCache, signOut, refreshUser, updateUserLocally } = useAuth();

  // ── Editable fields ────────────────────────────────────────────────────────
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [email,    setEmail]    = useState(user?.email    ?? '');
  const [phone,    setPhone]    = useState(user?.phone    ?? '');
  const [address,  setAddress]  = useState(user?.address  ?? '');

  // ── Save profile changes ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe(token, { email, phone, address });
      updateUserLocally({ email, phone, address });
      setEditing(false);
    } catch (err) {
      Alert.alert('Could not save', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEmail(user?.email   ?? '');
    setPhone(user?.phone   ?? '');
    setAddress(user?.address ?? '');
    setEditing(false);
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // App.js detects user === null and swaps to PinLoginScreen automatically
            } catch {
              // signOut never throws — it always clears local state
            }
          },
        },
      ]
    );
  };

  // ── Profile photo — use cached base64 data URI from first licence ─────────
  const firstLicenceId = licences[0]?.id;
  const cachedPhoto = firstLicenceId ? photoCache[firstLicenceId]?.profilePhotoUrl : null;
  const profilePhotoSource = cachedPhoto
    ? { uri: cachedPhoto }
    : require('./assets/photo.png');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setEditing((e) => !e)}
          disabled={saving}
        >
          <Text style={[styles.editToggle, editing && { color: '#FF3B30' }]}>
            {editing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Avatar + name ─────────────────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <Image source={profilePhotoSource} style={styles.avatar} />
            <Text style={styles.fullName}>
              {user?.firstName ?? ''} {user?.lastName ?? ''}
            </Text>
            <Text style={styles.userId}>ID: {user?.id ?? '—'}</Text>
          </View>

          {/* ── Personal details (read-only) ───────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Date of birth</Text>
              <Text style={styles.rowValue}>{user?.dateOfBirth ?? '—'}</Text>
            </View>

            <View style={styles.rowSeparator} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Address</Text>
              {editing ? (
                <TextInput
                  style={[styles.rowValue, styles.input]}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  placeholder="Your address"
                />
              ) : (
                <Text style={styles.rowValue}>{user?.address ?? '—'}</Text>
              )}
            </View>
          </View>

          {/* ── Contact info (editable) ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONTACT INFO</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={[styles.rowValue, styles.input]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  placeholder="your@email.com"
                  keyboardAppearance="dark"
                />
              ) : (
                <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
              )}
            </View>

            <View style={styles.rowSeparator} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={[styles.rowValue, styles.input]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  placeholder="04XX XXX XXX"
                  keyboardAppearance="dark"
                />
              ) : (
                <Text style={styles.rowValue}>{user?.phone ?? '—'}</Text>
              )}
            </View>
          </View>

          {/* ── Licences summary ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LICENCES</Text>
            {licences.length === 0 ? (
              <Text style={[styles.rowValue, { paddingVertical: 14, paddingHorizontal: 16 }]}>
                No licences on file
              </Text>
            ) : (
              licences.map((lic, idx) => (
                <View key={lic.id}>
                  <TouchableOpacity
                    style={styles.licenceRow}
                    onPress={() => navigation.navigate('Licence', { licenceId: lic.id })}
                  >
                    <View style={styles.licenceRowLeft}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#8499cf" />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.licenceRowLabel}>{lic.label}</Text>
                        <Text style={styles.licenceRowSub}>
                          {lic.licenceNumber}  ·  Exp {lic.expiryShort}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {lic.status !== 'active' && (
                        <Text style={[
                          styles.statusTag,
                          lic.status === 'expired'   && styles.tagExpired,
                          lic.status === 'suspended' && styles.tagSuspended,
                        ]}>
                          {lic.status.toUpperCase()}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                    </View>
                  </TouchableOpacity>
                  {idx < licences.length - 1 && <View style={styles.rowSeparator} />}
                </View>
              ))
            )}
          </View>

          {/* ── Save button (only in edit mode) ──────────────────────────── */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </TouchableOpacity>
          )}

          {/* ── Sign out ─────────────────────────────────────────────────── */}
          {!editing && (
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52 },
  headerBtn: { width: 60, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  editToggle: { fontSize: 16, color: '#5DADE2', fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 28, paddingBottom: 24 },
  avatar: { width: 90, height: 115, borderRadius: 4, backgroundColor: '#1A3A2A', marginBottom: 14 },
  fullName: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  userId: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  // Sections
  section: { backgroundColor: '#1C1C1E', marginHorizontal: 16, borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 13, minHeight: 48 },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16 },
  rowLabel: { fontSize: 15, color: 'rgba(255,255,255,0.65)', flex: 1 },
  rowValue: { fontSize: 15, color: '#fff', flex: 1.5, textAlign: 'right' },
  input: { borderBottomWidth: 1, borderBottomColor: '#5DADE2', paddingVertical: 2, textAlign: 'right', color: '#fff' },

  // Licence rows
  licenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  licenceRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  licenceRowLabel: { fontSize: 15, color: '#fff', fontWeight: '600' },
  licenceRowSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  statusTag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  tagExpired: { backgroundColor: 'rgba(255,59,48,0.2)', color: '#FF3B30' },
  tagSuspended: { backgroundColor: 'rgba(255,149,0,0.2)', color: '#FF9500' },

  // Save
  saveBtn: { backgroundColor: '#f4a0aa', borderRadius: 12, height: 54, marginHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#111' },

  // Sign out
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, height: 54, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.5)', marginTop: 4 },
  signOutText: { fontSize: 17, fontWeight: '600', color: '#FF3B30' },
});
