import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BUILT_IN_RECIPES } from '../../constants/recipes';
import { getPersonalRecipes, getFavorites, addFavorite, removeFavorite } from '../../lib/storage';
import { scaleIngredients, formatAmount, calculateScaleFactor } from '../../lib/scaler';
import { Recipe, Ingredient } from '../../types';
import { IngredientRow } from '../../components/IngredientRow';
import { fetchNutritionForIngredient, NutritionData } from '../../lib/nutrition';
import { NutritionSkeleton } from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const NUTRITION_GOALS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 70,
};

export default function RecipeDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  
  const [baseNutrition, setBaseNutrition] = useState<NutritionData | null>(null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState(false);

  // Animated values
  const scaleBannerAnim = useRef(new Animated.Value(0)).current;
  const nutritionAnims = useRef<Animated.Value[]>([]);
  const instructionAnims = useRef<Animated.Value[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRecipe();
    checkFavorite();
  }, [id, type]);

  const loadRecipe = async () => {
    let found: Recipe | undefined;
    if (type === 'builtin') {
      found = BUILT_IN_RECIPES.find(r => r.id === id);
    } else {
      const personal = await getPersonalRecipes();
      found = personal.find(r => r.id === id);
    }
    if (found) {
      setRecipe(found);
      setScaledIngredients(found.ingredients);
      fetchTotalNutrition(found);
      
      // Initialize instruction animations
      if (found.steps) {
        instructionAnims.current = found.steps.map(() => new Animated.Value(0));
        Animated.stagger(100, instructionAnims.current.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        )).start();
      }
    }
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

  const fetchTotalNutrition = async (r: Recipe) => {
    setIsLoadingNutrition(true);
    setNutritionError(false);
    try {
      const promises = r.ingredients.map(ing => fetchNutritionForIngredient(ing.name, ing.amount, ing.unit));
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
        
        // Initialize nutrition animations
        nutritionAnims.current = [0, 1, 2, 3].map(() => new Animated.Value(0));
        Animated.stagger(100, nutritionAnims.current.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        )).start();
      }
    } catch (error) {
      console.error('Failed to fetch nutrition:', error);
      setNutritionError(true);
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    if (!recipe) return;
    const originalAmount = recipe.ingredients[index].amount;
    const factor = calculateScaleFactor(originalAmount, newAmount);
    
    if (Math.abs(factor - scaleFactor) > 0.01) {
      Vibration.vibrate(5);
      triggerPulse();
    }
    
    setScaleFactor(factor);
    setScaledIngredients(scaleIngredients(recipe.ingredients, factor));
  };

  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const resetScale = () => {
    if (!recipe) return;
    setScaleFactor(1);
    setScaledIngredients(recipe.ingredients);
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

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f5a623" />
        </View>
      </SafeAreaView>
    );
  }

  const renderNutrition = () => {
    if (isLoadingNutrition) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Information</Text>
          <NutritionSkeleton />
        </View>
      );
    }

    if (nutritionError) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Information</Text>
          <View style={styles.nutritionError}>
            <Ionicons name="alert-circle-outline" size={24} color="#64748b" />
            <Text style={styles.nutritionErrorText}>Nutrition data unavailable for these ingredients.</Text>
          </View>
        </View>
      );
    }

    if (!baseNutrition) return null;

    const items = [
      { label: 'Calories', key: 'calories', val: Math.round(baseNutrition.calories * scaleFactor), unit: 'kcal', icon: 'flame', color: '#f5a623' },
      { label: 'Protein', key: 'protein', val: Math.round(baseNutrition.protein * scaleFactor), unit: 'g', icon: 'barbell', color: '#4ade80' },
      { label: 'Carbs', key: 'carbs', val: Math.round(baseNutrition.carbs * scaleFactor), unit: 'g', icon: 'pizza', color: '#60a5fa' },
      { label: 'Fat', key: 'fat', val: Math.round(baseNutrition.fat * scaleFactor), unit: 'g', icon: 'water', color: '#fb7185' },
    ];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <Text style={styles.nutritionSub}>Per serving</Text>
        </View>
        <View style={styles.nutritionGrid}>
          {items.map((item, idx) => {
            const goal = (NUTRITION_GOALS as any)[item.key];
            const progress = Math.min(item.val / (goal / 4), 1); // Simplified goal for one meal
            
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
                <Text style={styles.nutritionVal}>{item.val}<Text style={styles.nutritionUnit}>{item.unit}</Text></Text>
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

  return (
    <TouchableWithoutFeedback onPress={() => {
      setEditingIndex(null);
      Keyboard.dismiss();
    }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {/* Animated Sticky Header */}
        <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']}>
            <View style={styles.stickyHeaderContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtnSmall}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.stickyHeaderTitle} numberOfLines={1}>{recipe.title}</Text>
              <TouchableOpacity onPress={toggleFavorite} style={styles.favBtnSmall}>
                <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={22} color={isFavorited ? "#ef4444" : "#fff"} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Initial Header Overlay (transparent background) */}
        <Animated.View style={[styles.headerOverlay, { opacity: scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRightActions}>
            {isScaled && (
              <TouchableOpacity onPress={resetScale} style={styles.resetBtnCircle}>
                <Ionicons name="refresh" size={20} color="#f5a623" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={toggleFavorite} style={styles.favBtnCircle}>
              <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={22} color={isFavorited ? "#ef4444" : "#fff"} />
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
            <LinearGradient
              colors={['#1e293b', '#0a0a0f']}
              style={styles.heroBackground}
            >
              <Ionicons name="restaurant" size={120} color="rgba(245, 166, 35, 0.03)" style={styles.heroBgIcon} />
              <View style={styles.heroContent}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{recipe.category}</Text>
                </View>
                <Text style={styles.heroTitle}>{recipe.title}</Text>
                
                <View style={styles.heroStats}>
                  <View style={styles.heroStatItem}>
                    <Ionicons name="time" size={16} color="#f5a623" />
                    <Text style={styles.heroStatText}>{recipe.prepTime + recipe.cookTime} min</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Ionicons name="people" size={16} color="#f5a623" />
                    <Animated.Text style={[styles.heroStatText, { transform: [{ scale: pulseAnim }] }]}>
                      {isScaled ? formatAmount(recipe.servings * scaleFactor) : recipe.servings} Servings
                    </Animated.Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.contentCard}>
            {recipe.description ? (
              <View style={styles.descSection}>
                <Text style={styles.description}>{recipe.description}</Text>
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
                <Text style={styles.scaleBannerText}>
                  Scaled {formatAmount(scaleFactor)}x
                </Text>
                <TouchableOpacity onPress={resetScale} style={styles.resetScaleInner}>
                  <Text style={styles.resetScaleInnerText}>Reset</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Ingredients section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.titleWithIcon}>
                  <View style={styles.titleIconCircle}>
                    <Ionicons name="list" size={18} color="#f5a623" />
                  </View>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                </View>
                {!isScaled && (
                  <Text style={styles.hintText}>Tap amount to scale</Text>
                )}
              </View>

              <View style={styles.ingredientsList}>
                {scaledIngredients.map((ing, index) => (
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
            {recipe.steps && recipe.steps.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.titleWithIcon}>
                    <View style={styles.titleIconCircle}>
                      <Ionicons name="restaurant" size={18} color="#f5a623" />
                    </View>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                  </View>
                </View>
                <View style={styles.stepsList}>
                  {recipe.steps.map((step, index) => (
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
                        <LinearGradient
                          colors={['#f5a623', '#d97706']}
                          style={styles.stepNumber}
                        >
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </LinearGradient>
                        {index < recipe.steps!.length - 1 && <View style={styles.stepLine} />}
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepText}>{step}</Text>
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
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
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

  scroll: { flex: 1 },

  hero: {
    height: height * 0.45,
    width: '100%',
  },
  heroBackground: {
    flex: 1,
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
  heroContent: {
    zIndex: 2,
  },
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
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '700',
  },
  heroStatDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245, 166, 35, 0.3)',
  },

  contentCard: {
    marginTop: -30,
    backgroundColor: '#0a0a0f',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingTop: 35,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },

  descSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  description: {
    color: '#94a3b8',
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  scaleBanner: {
    marginHorizontal: 24,
    marginBottom: 30,
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
  scaleBannerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  resetScaleInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetScaleInnerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  section: {
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  hintText: { 
    color: '#64748b', 
    fontSize: 13, 
    fontWeight: '600',
  },

  ingredientsList: {
    backgroundColor: '#16213e',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  stepsList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  stepNumberContainer: {
    alignItems: 'center',
    width: 36,
    marginRight: 20,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 4,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stepNumberText: { 
    color: '#fff', 
    fontWeight: '900', 
    fontSize: 16 
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    marginTop: 8,
    marginBottom: -32,
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 6,
  },
  stepText: { 
    color: '#cbd5e1', 
    fontSize: 17, 
    lineHeight: 28,
    fontWeight: '500',
  },

  nutritionSub: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: '#16213e',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  nutritionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutritionLab: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionVal: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },
  nutritionUnit: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 2,
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  nutritionError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 20,
    borderRadius: 20,
    gap: 12,
  },
  nutritionErrorText: {
    color: '#64748b',
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
});
