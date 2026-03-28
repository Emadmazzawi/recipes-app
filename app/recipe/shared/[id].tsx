import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../lib/supabase';
import { savePersonalRecipe } from '../../../lib/storage';
import { Recipe } from '../../../types';
import { useTheme, useStyles } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getCategoryLabel } from '../../../lib/i18n';

export default function SharedRecipeScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSharedRecipe();
  }, [id]);

  const fetchSharedRecipe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error('Recipe not found.');
      }

      // If it belongs to the current user, just redirect them to their own recipe
      if (session && session.user.id === data.user_id) {
        router.replace({ pathname: '/recipe/[id]', params: { id, type: 'personal' } });
        return;
      }

      let parsedIngredients = [];
      let parsedSteps = [];
      try {
        parsedIngredients = typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : data.ingredients;
      } catch (e) {}
      try {
        parsedSteps = typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps;
      } catch (e) {}

      const mappedRecipe: Recipe = {
        id: data.id,
        title: data.title,
        description: data.description,
        servings: data.servings,
        prepTime: data.prep_time,
        cookTime: data.cook_time,
        category: data.category,
        imageUri: data.image_uri,
        unsplashImageUrl: data.unsplash_image_url,
        ingredients: parsedIngredients,
        steps: parsedSteps,
        isBuiltIn: false,
        createdAt: data.created_at,
      };

      setRecipe(mappedRecipe);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load shared recipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToKitchen = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      // Generate a new ID so it doesn't conflict if they share it back
      const newId = 'r_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      const newRecipe: Recipe = {
        ...recipe,
        id: newId,
        isBuiltIn: false,
        createdAt: new Date().toISOString()
      };

      await savePersonalRecipe(newRecipe);

      Alert.alert('Success', 'Recipe saved to your kitchen!', [
        {
          text: 'View Recipe',
          onPress: () => router.replace({ pathname: '/recipe/[id]', params: { id: newId, type: 'personal' } }),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save recipe.');
    } finally {
      setSaving(false);
    }
  };

  const getLocalizedTitle = (): string => {
    if (!recipe) return '';
    if (language === 'he' && recipe.title_he) return recipe.title_he;
    if (language === 'ar' && recipe.title_ar) return recipe.title_ar;
    return recipe.title;
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (errorMsg || !recipe) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{errorMsg || 'Recipe not found.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Section */}
        <View style={styles.hero}>
          {(recipe.imageUri || recipe.unsplashImageUrl) ? (
            <ImageBackground
              source={{ uri: recipe.imageUri || recipe.unsplashImageUrl }}
              style={styles.heroBackground}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
                style={styles.heroImageOverlay}
              >
                <View style={styles.heroContent}>
                  <Text style={styles.sharedBadge}>Shared Recipe</Text>
                  <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>{getLocalizedTitle()}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <LinearGradient colors={['#3a1306', '#1a0800']} style={styles.heroBackground}>
              <View style={styles.heroContent}>
                <Text style={styles.sharedBadge}>Shared Recipe</Text>
                <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>{getLocalizedTitle()}</Text>
              </View>
            </LinearGradient>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>{recipe.prepTime + recipe.cookTime} mins</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>{recipe.servings} Servings</Text>
            </View>
          </View>

          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveToKitchen}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color="#fff" />
                <Text style={styles.saveBtnText}>Save to My Kitchen</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Back Button */}
      <TouchableOpacity onPress={goBack} style={styles.floatingBack}>
        <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.textPrimary, fontSize: 18, textAlign: 'center', marginTop: 16, marginBottom: 24 },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hero: { height: 350, width: '100%' },
  heroBackground: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 40 },
  heroImageOverlay: { position: 'absolute', inset: 0, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 40 },
  heroContent: { zIndex: 2 },
  sharedBadge: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },

  content: {
    marginTop: -20,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, backgroundColor: COLORS.surface, padding: 16, borderRadius: 16 },
  infoItem: { alignItems: 'center', gap: 4 },
  infoText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },

  description: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 32, textAlign: 'center' },

  saveBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  floatingBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
