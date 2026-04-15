import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => router.replace('/auth') }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "This action is permanent and cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            // Attempt to call an RPC if one is configured for secure deletion
            await supabase.rpc('delete_user');
            // Regardless, log the user out to process the localized deletion
            await supabase.auth.signOut();
            router.replace('/auth');
          } catch (error) {
            console.error('Logout error:', error);
            // Even on RPC error, force client sign out to respect user initiation
            await supabase.auth.signOut();
            router.replace('/auth');
          }
      } }
    ]);
  };

  const renderGroupTitle = (title: string) => (
    <Text style={styles.groupTitle}>{title}</Text>
  );

  const renderListItem = (icon: any, title: string, onPress?: () => void, rightElement?: React.ReactNode, isDestructive = false) => (
    <TouchableOpacity 
      style={styles.listItem} 
      onPress={onPress} 
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.listItemLeft}>
        <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#fee2e2' }]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#ef4444' : '#4b5563'} />
        </View>
        <Text style={[styles.listItemTitle, isDestructive && { color: '#ef4444' }]}>{title}</Text>
      </View>
      <View style={styles.listItemRight}>
        {rightElement ? rightElement : <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Account Section */}
        {renderGroupTitle("ACCOUNT")}
        <View style={styles.groupContainer}>
          {renderListItem("person-outline", "Edit Profile", () => router.push('/edit-profile'))}
          <View style={styles.divider} />
          {renderListItem("lock-closed-outline", "Change Password", () => router.push('/change-password'))}
        </View>

        {/* Preferences Section */}
        {renderGroupTitle("PREFERENCES")}
        <View style={styles.groupContainer}>
          {renderListItem("notifications-outline", "Push Notifications", undefined, 
            <Switch 
              value={pushEnabled} 
              onValueChange={setPushEnabled} 
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          )}
          <View style={styles.divider} />
          {renderListItem("moon-outline", "Dark Mode", undefined, 
            <Switch 
              value={darkModeEnabled} 
              onValueChange={setDarkModeEnabled} 
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          )}
        </View>

        {/* Support/Info Section */}
        {renderGroupTitle("SUPPORT & INFO")}
        <View style={styles.groupContainer}>
          {renderListItem("shield-checkmark-outline", "Privacy Policy", () => router.push('/privacy'))}
          <View style={styles.divider} />
          {renderListItem("document-text-outline", "Terms of Service", () => router.push('/terms'))}
          <View style={styles.divider} />
          {renderListItem("information-circle-outline", "App Version", undefined, <Text style={styles.versionText}>v1.0.0</Text>)}
        </View>

        {/* Danger Zone */}
        {renderGroupTitle("DANGER ZONE")}
        <View style={styles.groupContainer}>
          {renderListItem("log-out-outline", "Log Out", handleLogout, undefined, true)}
          <View style={styles.divider} />
          {renderListItem("trash-outline", "Delete Account", handleDeleteAccount, undefined, true)}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  groupTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginTop: 20, marginBottom: 8, marginLeft: 12, letterSpacing: 0.5 },
  groupContainer: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  listItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listItemTitle: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
  listItemRight: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginLeft: 60 },
  versionText: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
});