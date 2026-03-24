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
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useLanguage();

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
      Alert.alert(t.auth.errorTitle, error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

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
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={14} color={COLORS.textMuted} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
            <Text style={[styles.guestText, isRTL && styles.textRTL]}>{t.auth.continueAsGuest}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  hero: { alignItems: 'center', marginBottom: 36 },
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
});
