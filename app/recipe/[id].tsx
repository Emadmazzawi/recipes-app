import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Vibration,
  ImageBackground,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { BUILT_IN_RECIPES } from '../../constants/recipes';
import {
  getPersonalRecipes,
  getFavorites,
  addFavorite,
  removeFavorite,
  addIngredientsToShoppingList,
} from '../../lib/storage';
import { scaleIngredients, formatAmount, calculateScaleFactor } from '../../lib/scaler';
import { Recipe, Ingredient } from '../../types';
import { IngredientRow } from '../../components/IngredientRow';
import { fetchNutritionForIngredient, NutritionData } from '../../lib/nutrition';
import { NutritionSkeleton } from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategoryLabel } from '../../lib/i18n';

const { width, height } = Dimensions.get('window');

const NUTRITION_GOALS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 70,
};

const SCALE_PRESETS = [
  { label: '½×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
];

export default function RecipeDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [loading, setLoading] = useState(true);

  const [baseNutrition, setBaseNutrition] = useState<NutritionData | null>(null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState(false);

  const scaleBannerAnim = useRef(new Animated.Value(0)).current;
  const nutritionAnims = useRef<Animated.Value[]>([]);
  const instructionAnims = useRef<Animated.Value[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRecipe();
    checkFavorite();
  }, [id, type]);

  useEffect(() => {
    if (recipe) {
      const localized = getLocalizedIngredients();
      if (scaleFactor === 1) {
        setScaledIngredients(localized);
      } else {
        setScaledIngredients(scaleIngredients(localized, scaleFactor));
      }
    }
  }, [language, recipe]);

  const loadRecipe = async () => {
    setLoading(true);
    let found: Recipe | undefined;
    if (type === 'builtin') {
      found = BUILT_IN_RECIPES.find(r => r.id === id);
    } else {
      const personal = await getPersonalRecipes();
      found = personal.find(r => r.id === id);
    }
    if (found) {
      setRecipe(found);
      const localizedIngredients =
        language === 'he' && found.ingredients_he && found.ingredients_he.length > 0 ? found.ingredients_he :
        language === 'ar' && found.ingredients_ar && found.ingredients_ar.length > 0 ? found.ingredients_ar :
        found.ingredients;
      setScaledIngredients(localizedIngredients);
      fetchTotalNutrition(found);

      if (found.steps) {
        instructionAnims.current = found.steps.map(() => new Animated.Value(0));
        Animated.stagger(100, instructionAnims.current.map(anim =>
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
        )).start();
      }
    }
    setLoading(false);
  };

  const checkFavorite = async () => {
    const favs = await getFavorites();
    setIsFavorited(favs.includes(id as string));
  };

  const toggleFavorite = async () => {
    if (isFavorited) {
      await removeFavorite(id as string);
      setIsFavorited(false);
    } else {
      await addFavorite(id as string);
      setIsFavorited(true);
      Vibration.vibrate(10);
    }
  };

  const handleShare = async () => {
    if (type === 'builtin') {
      // Don't need to share a builtin recipe through DB, but we could link to app
      Alert.alert(t.common.error || 'Cannot share', 'Built-in recipes cannot be shared yet.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Guest check
      if (!session) {
        Alert.alert('Sign In Required', 'You must create an account to share recipes with others.');
        return;
      }

      // Make sure the recipe is upserted to Supabase to prevent silent failures
      if (!recipe) return;
      
      const dbRecipe = {
        id: recipe.id,
        user_id: session.user.id,
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        category: recipe.category,
        image_uri: recipe.imageUri,
        unsplash_image_url: recipe.unsplashImageUrl,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        created_at: recipe.createdAt
      };

      const { error } = await supabase
        .from('recipes')
        .upsert(dbRecipe, { onConflict: 'id' });
        
      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }

      // Generate deep link
      const redirectUrl = Linking.createURL(`recipe/shared/${id}`);
      const shareMessage = `${t.explore?.greeting || 'Check out this recipe'} ${recipe?.title}: ${redirectUrl}\n\nOr paste this code in the Import box: ${recipe?.id}`;

      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(shareMessage);
        Alert.alert('Link Copied!', 'The recipe share link has been copied to your clipboard.');
      } else {
        await Share.share({
          message: shareMessage,
          url: redirectUrl,
        });
      }
    } catch (error: any) {
      console.error('Error sharing recipe:', error);
      Alert.alert('Error', error.message || 'Failed to share recipe. Please try again.');
    }
  };

  const fetchTotalNutrition = async (r: Recipe) => {
    setIsLoadingNutrition(true);
    setNutritionError(false);
    try {
      const promises = r.ingredients.map(ing =>
        fetchNutritionForIngredient(ing.name, ing.amount, ing.unit)
      );
      const results = await Promise.all(promises);

      const total = results.reduce<NutritionData>((acc, curr) => {
        const c = curr || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        return {
          calories: acc.calories + c.calories,
          protein: acc.protein + c.protein,
          carbs: acc.carbs + c.carbs,
          fat: acc.fat + c.fat,
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      if (total.calories === 0) {
        setNutritionError(true);
      } else {
        setBaseNutrition({
          calories: total.calories / r.servings,
          protein: total.protein / r.servings,
          carbs: total.carbs / r.servings,
          fat: total.fat / r.servings,
        });

        nutritionAnims.current = [0, 1, 2, 3].map(() => new Animated.Value(0));
        Animated.stagger(100, nutritionAnims.current.map(anim =>
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
        )).start();
      }
    } catch (error) {
      setNutritionError(true);
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    if (!recipe) return;
    const localizedBase = getLocalizedIngredients();
    const originalAmount = localizedBase[index]?.amount ?? recipe.ingredients[index].amount;
    const factor = calculateScaleFactor(originalAmount, newAmount);

    if (Math.abs(factor - scaleFactor) > 0.01) {
      Vibration.vibrate(5);
      triggerPulse();
    }
    setScaleFactor(factor);
    setScaledIngredients(scaleIngredients(localizedBase, factor));
  };

  const applyScalePreset = (factor: number) => {
    if (!recipe) return;
    const localizedBase = getLocalizedIngredients();
    setScaleFactor(factor);
    setScaledIngredients(scaleIngredients(localizedBase, factor));
    setEditingIndex(null);
    Keyboard.dismiss();
    Vibration.vibrate(5);
    triggerPulse();
  };

  const getLocalizedTitle = (): string => {
    if (!recipe) return '';
    if (language === 'he' && recipe.title_he) return recipe.title_he;
    if (language === 'ar' && recipe.title_ar) return recipe.title_ar;
    return recipe.title;
  };

  const getLocalizedDescription = (): string => {
    if (!recipe) return '';
    if (language === 'he' && recipe.description_he) return recipe.description_he;
    if (language === 'ar' && recipe.description_ar) return recipe.description_ar;
    return recipe.description;
  };

  const getLocalizedIngredients = (): Ingredient[] => {
    if (!recipe) return [];
    if (language === 'he' && recipe.ingredients_he && recipe.ingredients_he.length > 0) return recipe.ingredients_he;
    if (language === 'ar' && recipe.ingredients_ar && recipe.ingredients_ar.length > 0) return recipe.ingredients_ar;
    return recipe.ingredients;
  };

  const getLocalizedSteps = (): string[] => {
    if (!recipe) return [];
    if (language === 'he' && recipe.instructions_he && recipe.instructions_he.length > 0) return recipe.instructions_he;
    if (language === 'ar' && recipe.instructions_ar && recipe.instructions_ar.length > 0) return recipe.instructions_ar;
    return recipe.steps;
  };

  const handleAddToShoppingList = async () => {
    if (!recipe) return;
    setAddingToCart(true);
    try {
      await addIngredientsToShoppingList(scaledIngredients, getLocalizedTitle());
      Alert.alert(
        t.recipe.addedToShopping,
        `${scaledIngredients.length} ${t.recipe.ingredientsAdded}${scaleFactor !== 1 ? ` (${t.recipe.scaled} ${formatAmount(scaleFactor)}×)` : ''}.`
      );
    } catch {
      Alert.alert(t.common.error, t.recipe.couldNotAdd);
    } finally {
      setAddingToCart(false);
    }
  };

  const triggerPulse = () => {
    pulseAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const resetScale = () => {
    if (!recipe) return;
    setScaleFactor(1);
    setScaledIngredients(getLocalizedIngredients());
    setEditingIndex(null);
    Keyboard.dismiss();
    Vibration.vibrate(10);
  };

  const isScaled = Math.abs(scaleFactor - 1) > 0.001;

  useEffect(() => {
    Animated.timing(scaleBannerAnim, {
      toValue: isScaled ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isScaled]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5a623" />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={{ color: '#fff', fontSize: 18, marginTop: 16 }}>Recipe not found</Text>
          <TouchableOpacity onPress={goBack} style={{ marginTop: 24, padding: 12, backgroundColor: '#f5a623', borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderNutrition = () => {
    if (isLoadingNutrition) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recipe.nutritionInfo}</Text>
          <NutritionSkeleton />
        </View>
      );
    }
    if (nutritionError) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recipe.nutritionInfo}</Text>
          <View style={styles.nutritionError}>
            <Ionicons name="alert-circle-outline" size={24} color="#64748b" />
            <Text style={styles.nutritionErrorText}>{t.recipe.nutritionUnavailable}</Text>
          </View>
        </View>
      );
    }
    if (!baseNutrition) return null;

    const items = [
      { label: t.recipe.calories, key: 'calories', val: Math.round(baseNutrition.calories * scaleFactor), unit: 'kcal', icon: 'flame', color: '#f5a623' },
      { label: t.recipe.protein, key: 'protein', val: Math.round(baseNutrition.protein * scaleFactor), unit: 'g', icon: 'barbell', color: '#4ade80' },
      { label: t.recipe.carbs, key: 'carbs', val: Math.round(baseNutrition.carbs * scaleFactor), unit: 'g', icon: 'pizza', color: '#60a5fa' },
      { label: t.recipe.fat, key: 'fat', val: Math.round(baseNutrition.fat * scaleFactor), unit: 'g', icon: 'water', color: '#fb7185' },
    ];

    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recipe.nutritionFacts}</Text>
          <Text style={styles.nutritionSub}>{t.recipe.perServing}</Text>
        </View>
        <View style={styles.nutritionGrid}>
          {items.map((item, idx) => {
            const goal = (NUTRITION_GOALS as any)[item.key];
            const progress = Math.min(item.val / (goal / 4), 1);

            return (
              <Animated.View
                key={item.label}
                style={[
                  styles.nutritionCard,
                  {
                    opacity: nutritionAnims.current[idx] || 1,
                    transform: [{
                      translateY: (nutritionAnims.current[idx] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.nutritionCardHeader}>
                  <View style={[styles.nutritionIconCircle, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon as any} size={14} color={item.color} />
                  </View>
                  <Text style={styles.nutritionLab}>{item.label}</Text>
                </View>
                <Text style={styles.nutritionVal}>
                  {item.val}<Text style={styles.nutritionUnit}>{item.unit}</Text>
                </Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: item.color }]} />
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const heroContent = (
    <View style={styles.heroContent}>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{getCategoryLabel(t, recipe.category)}</Text>
      </View>
      <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>{getLocalizedTitle()}</Text>

      <View style={[styles.heroStats, isRTL && styles.rowRTL]}>
        <View style={styles.heroStatItem}>
          <Ionicons name="time-outline" size={15} color="#94a3b8" />
          <Text style={styles.heroStatLabel}>{t.recipe.prep}</Text>
          <Text style={styles.heroStatText}>{recipe.prepTime} {t.common.min}</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatItem}>
          <Ionicons name="flame-outline" size={15} color="#94a3b8" />
          <Text style={styles.heroStatLabel}>{t.recipe.cook}</Text>
          <Text style={styles.heroStatText}>{recipe.cookTime} {t.common.min}</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatItem}>
          <Ionicons name="people" size={15} color="#f5a623" />
          <Animated.Text style={[styles.heroStatText, { transform: [{ scale: pulseAnim }] }]}>
            {isScaled ? formatAmount(recipe.servings * scaleFactor) : recipe.servings} {t.common.servings}
          </Animated.Text>
        </View>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={() => { setEditingIndex(null); Keyboard.dismiss(); }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Animated Sticky Header */}
        <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top'] as any}>
            <View style={styles.stickyHeaderContent}>
              <TouchableOpacity onPress={goBack} style={styles.backBtnSmall}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.stickyHeaderTitle} numberOfLines={1}>{recipe.title}</Text>
              <TouchableOpacity onPress={toggleFavorite} style={styles.favBtnSmall}>
                <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? '#ef4444' : '#fff'} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Initial floating header buttons */}
        <Animated.View style={[styles.headerOverlay, { opacity: scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRightActions}>
            {isScaled && (
              <TouchableOpacity onPress={resetScale} style={styles.resetBtnCircle}>
                <Ionicons name="refresh" size={20} color="#f5a623" />
              </TouchableOpacity>
            )}
            {type === 'personal' && (
              <>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.shareBtnCircle}
                >
                  <Ionicons name="share-outline" size={20} color="#38bdf8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/recipe/new', params: { editId: id } })}
                  style={styles.editBtnCircle}
                >
                  <Ionicons name="pencil" size={18} color="#a78bfa" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={toggleFavorite} style={styles.favBtnCircle}>
              <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? '#ef4444' : '#fff'} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            {recipe.imageUri ? (
              <ImageBackground
                source={{ uri: recipe.imageUri }}
                style={styles.heroBackground}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['transparent', 'rgba(10,10,15,0.5)', 'rgba(10,10,15,0.95)']}
                  style={styles.heroImageOverlay}
                >
                  {heroContent}
                </LinearGradient>
              </ImageBackground>
            ) : (
              <LinearGradient colors={['#1e293b', '#0a0a0f']} style={styles.heroBackground}>
                <Ionicons name="restaurant" size={120} color="rgba(245, 166, 35, 0.03)" style={styles.heroBgIcon} />
                {heroContent}
              </LinearGradient>
            )}
          </View>

          <View style={styles.contentCard}>
            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={handleAddToShoppingList}
                disabled={addingToCart}
              >
                {addingToCart ? (
                  <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                  <Ionicons name="cart-outline" size={16} color="#60a5fa" />
                )}
                <Text style={[styles.actionChipText, { color: '#60a5fa' }]}>{t.recipe.shopping}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionChip, styles.cookChip]}
                onPress={() => router.push({ pathname: '/recipe/cook', params: { id, type } })}
              >
                <Ionicons name="flame-outline" size={16} color="#fff" />
                <Text style={[styles.actionChipText, { color: '#fff' }]}>{t.recipe.cookNow}</Text>
              </TouchableOpacity>
            </View>

            {(getLocalizedDescription()) ? (
              <View style={styles.descSection}>
                <Text style={[styles.description, isRTL && styles.textRTL]}>{getLocalizedDescription()}</Text>
              </View>
            ) : null}

            {/* Scale Banner */}
            <Animated.View
              style={[
                styles.scaleBanner,
                {
                  opacity: scaleBannerAnim,
                  transform: [{
                    translateY: scaleBannerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    })
                  }]
                }
              ]}
            >
              <LinearGradient
                colors={['#f5a623', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scaleBannerGradient}
              >
                <Ionicons name="resize" size={18} color="#fff" />
                <Text style={styles.scaleBannerText}>{t.recipe.scaled} {formatAmount(scaleFactor)}×</Text>
                <TouchableOpacity onPress={resetScale} style={styles.resetScaleInner}>
                  <Text style={styles.resetScaleInnerText}>{t.recipe.reset}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Ingredients section */}
            <View style={styles.section}>
              <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                <View style={[styles.titleWithIcon, isRTL && styles.rowRTL]}>
                  <View style={styles.titleIconCircle}>
                    <Ionicons name="list" size={18} color="#f5a623" />
                  </View>
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recipe.ingredients}</Text>
                </View>
                {!isScaled && (
                  <Text style={styles.hintText}>{t.recipe.tapToEdit}</Text>
                )}
              </View>

              {/* Quick Scale Presets */}
              <View style={styles.scalePresetRow}>
                {SCALE_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetBtn,
                      Math.abs(scaleFactor - preset.value) < 0.01 && styles.presetBtnActive,
                    ]}
                    onPress={() => applyScalePreset(preset.value)}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        Math.abs(scaleFactor - preset.value) < 0.01 && styles.presetBtnTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.ingredientsList}>
                {(scaledIngredients.length > 0 ? scaledIngredients : getLocalizedIngredients()).map((ing, index) => (
                  <IngredientRow
                    key={ing.id}
                    ingredient={ing}
                    isHighlighted={editingIndex === index}
                    isEditing={editingIndex === index}
                    onStartEditing={() => setEditingIndex(index)}
                    onAmountChange={(val) => handleAmountChange(index, val)}
                  />
                ))}
              </View>
            </View>

            {/* Nutrition Information */}
            {renderNutrition()}

            {/* Steps section */}
            {getLocalizedSteps().length > 0 && (
              <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.titleWithIcon, isRTL && styles.rowRTL]}>
                    <View style={styles.titleIconCircle}>
                      <Ionicons name="restaurant" size={18} color="#f5a623" />
                    </View>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.recipe.instructions}</Text>
                  </View>
                </View>
                <View style={styles.stepsList}>
                  {getLocalizedSteps().map((step, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.stepRow,
                        {
                          opacity: instructionAnims.current[index] || 1,
                          transform: [{
                            translateY: (instructionAnims.current[index] || new Animated.Value(1)).interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            })
                          }]
                        }
                      ]}
                    >
                      <View style={styles.stepNumberContainer}>
                        <LinearGradient colors={['#f5a623', '#d97706']} style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </LinearGradient>
                        {index < getLocalizedSteps().length - 1 && <View style={styles.stepLine} />}
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={[styles.stepText, isRTL && styles.textRTL]}>{step}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
  },
  stickyHeaderContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  stickyHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginHorizontal: 15,
    textAlign: 'center',
  },
  backBtnSmall: { padding: 8 },
  favBtnSmall: { padding: 8 },

  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerRightActions: { flexDirection: 'row', gap: 10 },
  backBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  editBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(167,139,250,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  shareBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },

  scroll: { flex: 1 },

  hero: { height: height * 0.45, width: '100%' },
  heroBackground: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 40 },
  heroImageOverlay: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroBgIcon: {
    position: 'absolute',
    top: 80,
    right: -20,
    transform: [{ rotate: '-15deg' }],
  },
  heroContent: { zIndex: 2 },
  categoryBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#f5a623',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  heroStatText: { color: '#cbd5e1', fontSize: 14, fontWeight: '700' },
  heroStatDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(245, 166, 35, 0.3)' },

  contentCard: {
    marginTop: -30,
    backgroundColor: '#0a0a0f',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingTop: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16213e',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
  },
  cookChip: {
    backgroundColor: '#f5a623',
    borderColor: '#f5a623',
    flex: 1.2,
  },
  actionChipText: { fontSize: 14, fontWeight: '700' },

  descSection: { paddingHorizontal: 24, marginBottom: 24 },
  description: { color: '#94a3b8', fontSize: 16, lineHeight: 26, fontWeight: '500', fontStyle: 'italic' },

  scaleBanner: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  scaleBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  scaleBannerText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' },
  resetScaleInner: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetScaleInnerText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section: { paddingHorizontal: 24, marginBottom: 32 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  hintText: { color: '#475569', fontSize: 12, fontWeight: '500' },

  scalePresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#16213e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  presetBtnActive: {
    backgroundColor: '#f5a623',
    borderColor: '#f5a623',
  },
  presetBtnText: { color: '#64748b', fontSize: 14, fontWeight: '800' },
  presetBtnTextActive: { color: '#fff' },

  ingredientsList: {},

  nutritionSub: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nutritionCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  nutritionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  nutritionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutritionLab: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  nutritionVal: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  nutritionUnit: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  progressContainer: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 2 },
  nutritionError: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#111827', borderRadius: 14 },
  nutritionErrorText: { color: '#64748b', fontSize: 14, flex: 1 },

  stepsList: {},
  stepRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  stepNumberContainer: { alignItems: 'center' },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    marginTop: 8,
    minHeight: 24,
  },
  stepTextContainer: { flex: 1, paddingTop: 8 },
  stepText: { color: '#cbd5e1', fontSize: 15, lineHeight: 24, fontWeight: '500' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  rowRTL: { flexDirection: 'row-reverse' },
});
