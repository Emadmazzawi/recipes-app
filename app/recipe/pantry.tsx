import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { generateRecipeFromIngredients, fetchUnsplashImage } from '../../lib/gemini';
import { savePersonalRecipe } from '../../lib/storage';
import { Recipe } from '../../types';

function generateId() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export default function PantryScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const addIngredient = () => {
    const trimmed = currentInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
    }
    setCurrentInput('');
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      Alert.alert(t.common?.error || 'Error', 'Please add at least one ingredient.');
      return;
    }

    setIsGenerating(true);
    try {
      const data = await generateRecipeFromIngredients(ingredients);
      
      // Fetch an image for the generated recipe title
      const imageUrl = await fetchUnsplashImage(data.title || 'delicious food');

      const newRecipe: Recipe = {
        id: generateId(),
        title: data.title || 'Pantry Creation',
        description: data.description || 'A delicious meal generated from your pantry.',
        servings: data.servings || 2,
        prepTime: data.prepTime || 10,
        cookTime: data.cookTime || 20,
        category: data.category || 'Main',
        unsplashImageUrl: imageUrl || undefined,
        ingredients: (data.ingredients || []).map((ing: any) => ({
          id: generateId(),
          name: ing.name || 'Unknown',
          amount: ing.amount || 1,
          unit: ing.unit || 'piece',
        })),
        steps: data.steps || ['Enjoy your meal!'],
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
      };

      await savePersonalRecipe(newRecipe);
      router.replace({ pathname: '/recipe/[id]', params: { id: newRecipe.id, type: 'personal' } });
    } catch (err: any) {
      console.error(err);
      Alert.alert(t.common?.error || 'Error', err.message || 'Failed to generate recipe.');
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            <View style={styles.iconWrapper}>
              <Ionicons name="nutrition" size={60} color={COLORS.primary} />
            </View>
            <Text style={[styles.title, isRTL && styles.textRTL]}>What's in your fridge?</Text>
            <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
              List a few ingredients you have, and we'll use AI to create a custom recipe for you!
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isRTL && styles.textRTL]}
                placeholder="e.g. Chicken, Rice, Tomatoes"
                placeholderTextColor={COLORS.textFaint}
                value={currentInput}
                onChangeText={setCurrentInput}
                onSubmitEditing={addIngredient}
                returnKeyType="done"
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addIngredient}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.chipContainer}>
              {ingredients.map((ing, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{ing}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(idx)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.generateBtn, ingredients.length === 0 && styles.generateBtnDisabled]} 
            onPress={handleGenerate}
            disabled={ingredients.length === 0 || isGenerating}
          >
            <LinearGradient 
              colors={ingredients.length === 0 ? [COLORS.surfaceDeep, COLORS.surfaceDeep] : [COLORS.primary, COLORS.primaryLight]} 
              style={styles.generateBtnGradient}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={ingredients.length === 0 ? COLORS.textMuted : "#fff"} />
                  <Text style={[styles.generateBtnText, ingredients.length === 0 && { color: COLORS.textMuted }]}>
                    Generate Recipe
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  mainContent: { alignItems: 'center' },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  input: {
    flex: 1,
    height: 54,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  chipText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.textPrimary,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderColor: COLORS.surfaceDeep,
  },
  generateBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateBtnDisabled: {
    shadowOpacity: 0,
  },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 10,
  },
  generateBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
