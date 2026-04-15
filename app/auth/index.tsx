import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SettingsModal } from '../../components/SettingsModal';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Success!', 'Your account has been created. You can now log in.');
        setIsSignUp(false); // Switch to login view
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Proceed to main app
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    await AsyncStorage.setItem('is_guest', 'true');
    router.replace('/(tabs)');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address in the field above to reset your password.');
      return;
    }
    try {
      const redirectUrl = Linking.createURL('auth/update-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      Alert.alert('Reset Email Sent', 'Check your inbox for a password reset link.');
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const redirectUrl = Platform.OS === 'web' 
        ? 'https://recipes-app-eight-lime.vercel.app'
        : Linking.createURL('/');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          // Open the native browser to complete the flow.
          // Once completed, the deep link listener in _layout.tsx catches the returned URL.
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          
          if (result.type === 'success' && result.url) {
            // Check if the URL has fragments for Supabase to parse
            const { url } = result;
            const hashMatch = url.match(/access_token=([^&]+)/);
            const refreshMatch = url.match(/refresh_token=([^&]+)/);
            if (hashMatch && hashMatch[1] && refreshMatch && refreshMatch[1]) {
              await supabase.auth.setSession({
                access_token: hashMatch[1],
                refresh_token: refreshMatch[1],
              });
            }
          }
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      {/* Decorative Background Orbs */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />
      <View style={styles.bgOrb3} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Settings Button */}
            <TouchableOpacity 
              onPress={() => setShowSettings(true)} 
              style={styles.settingsBtn}
            >
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Ionicons name="restaurant" size={42} color="#fff" />
              </View>
              <Text style={styles.appName}>Smart Recipes</Text>
              <Text style={styles.tagline}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
            </View>

            {/* Error Message Area */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Glassmorphism Form Container */}
            <BlurView intensity={80} tint="light" style={styles.formContainer}>
              
              {/* Input Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                {!isSignUp && (
                  <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Primary Login/Signup Button */}
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
                )}
              </TouchableOpacity>

              {/* Toggle Sign Up / Log In Link */}
              <View style={styles.signUpRow}>
                <Text style={styles.newUserText}>{isSignUp ? 'Already have an account? ' : 'New user? '}</Text>
                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                  <Text style={styles.signUpText}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
                </TouchableOpacity>
              </View>

            </BlurView>

            {/* Social Auth & Guest */}
            <View style={styles.bottomSection}>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleAuth} disabled={loading}>
                {loading ? <ActivityIndicator color="#374151" /> : <Ionicons name="logo-google" size={20} color="#DB4437" />}
                {!loading && <Text style={styles.socialBtnText}>Continue with Google</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f9fafb' },
  safeArea: { flex: 1 },
  
  /* Decorative Background Orbs */
  bgOrb1: { position: 'absolute', width: 350, height: 350, borderRadius: 175, backgroundColor: '#3b82f6', opacity: 0.12, top: -100, left: -100 },
  bgOrb2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#8b5cf6', opacity: 0.08, bottom: 50, right: -80 },
  bgOrb3: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#60a5fa', opacity: 0.1, top: 250, right: 20 },

  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  
  settingsBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 8, backgroundColor: '#ffffff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

  /* Logo */
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoPlaceholder: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  appName: { fontSize: 28, fontWeight: '900', color: '#1f2937', letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: '#6b7280', marginTop: 4 },

  errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: '500' },

  /* Form Container */
  formContainer: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#4b5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, height: 54 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1f2937' },
  eyeBtn: { padding: 4 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 10 },
  forgotPasswordText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  
  primaryBtn: { backgroundColor: '#3b82f6', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 20, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  
  signUpRow: { flexDirection: 'row', justifyContent: 'center' },
  newUserText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  signUpText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },

  /* Bottom Section */
  bottomSection: { marginTop: 30 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12, fontWeight: 'bold' },
  
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', height: 54, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  socialBtnText: { marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#374151' },
  
  guestBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
  guestBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
});