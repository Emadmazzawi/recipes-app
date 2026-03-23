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
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Success', 'Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background glow orbs */}
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
                colors={['#ff9a3c', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="restaurant" size={36} color="#fff" />
              </LinearGradient>
              <View style={styles.logoGlow} />
            </View>
            <Text style={styles.appName}>Recipe Scaler</Text>
            <Text style={styles.tagline}>
              {isSignUp ? 'Create an account to sync your recipes' : 'Your personal AI kitchen, elevated.'}
            </Text>
          </View>

          {/* Frosted glass form */}
          <BlurView intensity={60} tint="dark" style={styles.glassForm}>
            <View style={styles.formInner}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Create Account' : 'Welcome back'}
              </Text>

              {/* Email field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#3d4f68"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#3d4f68"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CTA button */}
              <TouchableOpacity
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={['#ff9a3c', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Switch mode */}
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                activeOpacity={0.7}
                style={styles.switchRow}
              >
                <Text style={styles.switchText}>
                  {isSignUp ? 'Already have an account?  ' : "Don't have an account?  "}
                  <Text style={styles.switchHighlight}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Guest mode */}
          <TouchableOpacity
            style={styles.guestRow}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={14} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060810',
  },

  orb1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#ea580c',
    opacity: 0.18,
    top: -80,
    left: -80,
    transform: [{ scaleX: 1.3 }],
  },
  orb2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#f5a623',
    opacity: 0.12,
    top: 60,
    right: -60,
  },
  orb3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#dc2626',
    opacity: 0.08,
    bottom: 120,
    left: 40,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 60,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 20,
  },
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
    backgroundColor: '#ea580c',
    opacity: 0.35,
    top: 6,
    left: 0,
    zIndex: -1,
    transform: [{ scaleX: 1.1 }, { scaleY: 1.3 }],
  },
  appName: {
    color: '#fff',
    fontSize: 34,
    fontFamily: 'Inter_900Black',
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  tagline: {
    color: '#64748b',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  glassForm: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },
  formInner: {
    padding: 24,
  },
  formTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: { padding: 4 },

  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.2,
  },

  switchRow: {
    alignItems: 'center',
    marginTop: 22,
  },
  switchText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  switchHighlight: {
    color: '#f5a623',
    fontFamily: 'Inter_700Bold',
  },

  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  guestText: {
    color: '#475569',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },
});
