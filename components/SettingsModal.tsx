import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../constants/theme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const LANG_OPTIONS: { code: 'en' | 'he' | 'ar'; flag: string }[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'ar', flag: '🇸🇦' },
];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });
    }
  }, [visible]);

  const handleAuthAction = async () => {
    onClose(); // Close modal first
    if (session) {
      // Log out
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            await AsyncStorage.setItem('is_guest', 'true');
            router.replace('/auth');
          },
        },
      ]);
    } else {
      // Log in
      await AsyncStorage.removeItem('is_guest');
      router.replace('/auth');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.settingsSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t.settings?.title || 'Settings'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <Text style={styles.sectionLabel}>Account</Text>
          <TouchableOpacity style={styles.authBtn} onPress={handleAuthAction}>
            <Ionicons name={session ? 'log-out-outline' : 'log-in-outline'} size={20} color={session ? COLORS.error : COLORS.primary} />
            <Text style={[styles.authBtnText, { color: session ? COLORS.error : COLORS.primary }]}>
              {session ? 'Log Out' : 'Log In / Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* Language Section */}
          <Text style={styles.sectionLabel}>{t.settings?.language || 'Language'}</Text>
          {LANG_OPTIONS.map(({ code, flag }) => (
            <TouchableOpacity
              key={code}
              style={[styles.langOption, language === code && styles.langOptionActive]}
              onPress={() => setLanguage(code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{flag}</Text>
              <Text style={[styles.langName, language === code && styles.langNameActive]}>
                {t.languages?.[code] || code}
              </Text>
              {language === code && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primary, '#c45a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>{t.settings?.done || 'Done'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.borderSubtle,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    color: COLORS.textPrimary,
  },
  sheetCloseBtn: {
    padding: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 12,
  },
  authBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langOptionActive: {
    backgroundColor: COLORS.primaryTintDark,
    borderColor: COLORS.primaryTint,
  },
  langFlag: {
    fontSize: 24,
    marginRight: 14,
  },
  langName: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: COLORS.textPrimary,
  },
  langNameActive: {
    fontFamily: 'Inter_700Bold',
    color: COLORS.primary,
  },
  doneBtn: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
