import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme, useStyles } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileSettingsScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(t.common?.error || 'Not logged in', t.profile?.notLoggedIn || 'You must be logged in to view profile settings.');
        router.back();
        return;
      }

      setEmail(session.user.email || '');
      setFullName(session.user.user_metadata?.full_name || '');
      setAvatarUrl(session.user.user_metadata?.avatar_url || '');
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      });

      if (error) throw error;
      Alert.alert(t.auth?.successTitle || 'Success', t.profile?.success || 'Profile updated successfully.');
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(t.common?.error || 'Error', error.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t.profile?.logout || 'Log Out', t.profile?.logoutConfirm || 'Are you sure you want to log out?', [
      { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      {
        text: t.profile?.logout || 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.setItem('is_guest', 'true');
          router.replace('/auth');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile?.title || 'Account Settings'}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtnText}>{t.profile?.save || 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {fullName ? fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t.profile?.emailLabel || 'Email Address'}</Text>
          <TextInput
            style={[styles.input, { color: COLORS.textMuted }, isRTL && styles.textRTL]}
            value={email}
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={[styles.helperText, isRTL && styles.textRTL]}>{t.profile?.emailHelper || 'Email cannot be changed here.'}</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t.profile?.nameLabel || 'Full Name'}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.textRTL]}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t.profile?.namePlaceholder || 'Enter your name'}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t.profile?.avatarLabel || 'Avatar URL'}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.textRTL]}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder={t.profile?.avatarPlaceholder || 'https://example.com/avatar.png'}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <TouchableOpacity style={[styles.logoutBtn, isRTL && { flexDirection: 'row-reverse' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutBtnText}>{t.profile?.logout || 'Log Out'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryTintDark,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    color: COLORS.primary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textFaint,
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginTop: 20,
    gap: 8,
  },
  logoutBtnText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
