import { Stack, useRouter, useSegments, ErrorBoundary } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { LanguageProvider } from '../contexts/LanguageContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const guestStatus = await AsyncStorage.getItem('is_guest');
        setIsGuest(guestStatus === 'true');
        
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (e) {
        console.error(e);
      } finally {
        setInitialized(true);
      }
    };
    
    initAuth();

    // Listen for deep links so that Supabase can extract the session from the URL hash 
    // when coming back from a password reset email
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      try {
        if (url.includes('#access_token=') || url.includes('?access_token=')) {
          // Manually parse tokens from URL 
          const hashMatch = url.match(/access_token=([^&]+)/);
          const refreshMatch = url.match(/refresh_token=([^&]+)/);
          
          if (hashMatch && hashMatch[1] && refreshMatch && refreshMatch[1]) {
            supabase.auth.setSession({
              access_token: hashMatch[1],
              refresh_token: refreshMatch[1],
            });
          }
        }
      } catch (err) {
        console.error('Deep link handling error:', err);
      }
    };
    
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also check the initial URL in case the app was fully closed
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
        await AsyncStorage.removeItem('is_guest');
      }
      
      // If user clicked a password reset link, send them to the reset password screen
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/update-password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'auth';
    
    const timeout = setTimeout(async () => {
      try {
        const guestStatus = await AsyncStorage.getItem('is_guest');
        const currentIsGuest = guestStatus === 'true';

        if (!session && !currentIsGuest && !inAuthGroup) {
          // Redirect to auth if not logged in and not a guest
          router.replace('/auth');
        } else if (session && inAuthGroup) {
          // Redirect away from auth if logged in
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error('Navigation error:', e);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [session, segments, initialized]);

  if (!initialized || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#e8722a" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/index" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/shared/[id]" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="recipe/new" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/cook" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/pantry" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
