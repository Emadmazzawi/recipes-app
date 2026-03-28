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
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function UpdatePasswordScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  async function handleUpdatePassword() {
    if (!password) {
      Alert.alert(t.auth.errorTitle, t.auth.errorBothFields);
      return;
    }
    
    if (password.length < 6) {
      Alert.alert(t.auth.errorTitle, 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      Alert.alert(t.auth.successTitle, t.auth.updatePasswordSuccess);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t.auth.errorTitle, error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Decorative Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          <TouchableOpacity 
            style={[styles.backBtn, isRTL && { alignSelf: 'flex-end', transform: [{ scaleX: -1 }] }]} 
            onPress={() => router.replace('/auth')}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, isRTL && styles.textRTL]}>{t.auth.updatePasswordTitle}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t.auth.updatePasswordSub}</Text>

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
            onPress={handleUpdatePassword}
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
                <Text style={styles.ctaText}>{t.auth.updatePasswordBtn}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  orb2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
    bottom: -60,
    right: -60,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontFamily: 'Inter_900Black',
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 40,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fieldGroup: { marginBottom: 30 },
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
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 56,
  },
  inputRowRTL: { flexDirection: 'row-reverse' },
  inputIcon: { marginRight: 10 },
  inputIconRTL: { marginLeft: 10 },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: { padding: 8 },
  ctaWrap: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.3,
  },
});
