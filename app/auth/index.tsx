import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SettingsModal } from '../../components/SettingsModal';
import * as Linking from 'expo-linking';

export default function AuthScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  async function handleGuest() {
    await AsyncStorage.setItem('is_guest', 'true');
    router.replace('/(tabs)');
  }

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert(t.auth.errorTitle, t.auth.errorBothFields);
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(t.auth.successTitle, t.auth.successSignUp);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      if (error.message.includes('Invalid login credentials')) {
        Alert.alert(t.auth.errorTitle, t.auth.invalidCredentials);
      } else {
        Alert.alert(t.auth.errorTitle, error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOpenForgotPassword() {
    setForgotEmail(email); // Pre-fill with whatever they typed
    setShowForgotModal(true);
  }

  async function submitForgotPassword() {
    if (!forgotEmail) {
      Alert.alert(t.auth.errorTitle, t.auth.emailRequiredForReset);
      return;
    }
    setIsResetting(true);
    try {
      // Create a deep link specifically telling Supabase to return to the password update screen
      const redirectUrl = Linking.createURL('auth/update-password');
      
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      Alert.alert(t.auth.successTitle, t.auth.resetEmailSent);
      setShowForgotModal(false);
    } catch (error: any) {
      Alert.alert(t.auth.errorTitle, error.message);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Warm glow orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + title */}
          <View style={styles.hero}>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.settingsBtn}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.logoWrap}>
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="restaurant" size={36} color="#fff" />
              </LinearGradient>
              <View style={styles.logoGlow} />
            </View>
            <Text style={[styles.appName, isRTL && styles.textRTL]}>{t.auth.appName}</Text>
            <Text style={[styles.tagline, isRTL && styles.textRTL]}>
              {isSignUp ? t.auth.taglineSignUp : t.auth.taglineSignIn}
            </Text>
          </View>

          {/* Frosted glass form */}
          <BlurView intensity={50} tint="light" style={styles.glassForm}>
            <View style={styles.formInner}>
              <Text style={[styles.formTitle, isRTL && styles.textRTL]}>
                {isSignUp ? t.auth.formTitleSignUp : t.auth.formTitleSignIn}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.auth.emailLabel}</Text>
                <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={isRTL ? styles.inputIconRTL : styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.textRTL]}
                    placeholder={t.auth.emailPlaceholder}
                    placeholderTextColor={COLORS.textFaint}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.auth.passwordLabel}</Text>
                <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={isRTL ? styles.inputIconRTL : styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.textRTL]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textFaint}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {!isSignUp && (
                  <TouchableOpacity onPress={handleOpenForgotPassword} style={[styles.forgotPasswordWrap, isRTL && { alignItems: 'flex-start' }]}>
                    <Text style={[styles.forgotPasswordText, isRTL && styles.textRTL]}>{t.auth.forgotPassword}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={[COLORS.primaryLight, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>
                      {isSignUp ? t.auth.signUp : t.auth.signIn}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                activeOpacity={0.7}
                style={styles.switchRow}
              >
                <Text style={[styles.switchText, isRTL && styles.textRTL]}>
                  {isSignUp ? t.auth.switchToSignIn + '  ' : t.auth.switchToSignUp + '  '}
                  <Text style={styles.switchHighlight}>
                    {isSignUp ? t.auth.signIn : t.auth.signUp}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <TouchableOpacity
            style={[styles.guestRow, isRTL && styles.guestRowRTL]}
            onPress={handleGuest}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={14} color={COLORS.textMuted} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
            <Text style={[styles.guestText, isRTL && styles.textRTL]}>{t.auth.continueAsGuest}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.auth.forgotPasswordTitle}</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, isRTL && styles.textRTL]}>{t.auth.forgotPasswordSub}</Text>

            <View style={[styles.inputRow, isRTL && styles.inputRowRTL, { marginBottom: 24 }]}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={isRTL ? styles.inputIconRTL : styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.textRTL]}
                placeholder={t.auth.emailPlaceholder}
                placeholderTextColor={COLORS.textFaint}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <TouchableOpacity
              onPress={submitForgotPassword}
              disabled={isResetting}
              activeOpacity={0.85}
              style={styles.modalCtaWrap}
            >
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {isResetting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>{t.auth.sendLink}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  orb1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.15,
    top: -100,
    left: -80,
    transform: [{ scaleX: 1.3 }],
  },
  orb2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
    top: 60,
    right: -60,
  },
  orb3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ff8c42',
    opacity: 0.12,
    bottom: 120,
    left: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 60,
  },
  settingsBtn: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  hero: { alignItems: 'center', marginBottom: 36, position: 'relative' },
  logoWrap: { position: 'relative', marginBottom: 20 },
  logoGradient: {
    width: 76,
    height: 76,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    top: 8,
    left: 0,
    zIndex: -1,
    transform: [{ scaleX: 1.1 }, { scaleY: 1.4 }],
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontFamily: 'Inter_900Black',
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  glassForm: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  formInner: { padding: 24 },
  formTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryTintDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowRTL: { flexDirection: 'row-reverse' },
  inputIcon: { marginRight: 10 },
  inputIconRTL: { marginLeft: 10 },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: { padding: 6 },
  forgotPasswordWrap: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  ctaWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.3,
  },
  switchRow: { alignItems: 'center', paddingVertical: 4 },
  switchText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  switchHighlight: {
    color: COLORS.primary,
    fontFamily: 'Inter_700Bold',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  guestRowRTL: { flexDirection: 'row-reverse' },
  guestText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalCtaWrap: { 
    borderRadius: 16, 
    overflow: 'hidden', 
  },
});
