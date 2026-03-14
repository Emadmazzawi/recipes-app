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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BUILT_IN_RECIPES } from '../../constants/recipes';
import { getPersonalRecipes } from '../../lib/storage';
import { scaleIngredients, formatAmount, calculateScaleFactor } from '../../lib/scaler';
import { Recipe, Ingredient } from '../../types';
import { IngredientRow } from '../../components/IngredientRow';
import { fetchNutritionForIngredient, NutritionData } from '../../lib/nutrition';
import { NutritionSkeleton } from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [baseNutrition, setBaseNutrition] = useState<NutritionData | null>(null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState(false);

  // Animated values
  const scaleBannerAnim = useRef(new Animated.Value(0)).current;
  const nutritionAnims = useRef<Animated.Value[]>([]);
  const instructionAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    loadRecipe();
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
    setScaleFactor(factor);
    setScaledIngredients(scaleIngredients(recipe.ingredients, factor));
  };

  const resetScale = () => {
    if (!recipe) return;
    setScaleFactor(1);
    setScaledIngredients(recipe.ingredients);
    setEditingIndex(null);
    Keyboard.dismiss();
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
      { label: 'Calories', val: Math.round(baseNutrition.calories * scaleFactor), unit: 'kcal', icon: 'flame', color: '#f5a623' },
      { label: 'Protein', val: Math.round(baseNutrition.protein * scaleFactor), unit: 'g', icon: 'barbell', color: '#4ade80' },
      { label: 'Carbs', val: Math.round(baseNutrition.carbs * scaleFactor), unit: 'g', icon: 'pizza', color: '#60a5fa' },
      { label: 'Fat', val: Math.round(baseNutrition.fat * scaleFactor), unit: 'g', icon: 'water', color: '#fb7185' },
    ];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <Text style={styles.nutritionSub}>Per serving</Text>
        </View>
        <View style={styles.nutritionGrid}>
          {items.map((item, idx) => (
            <Animated.View 
              key={item.label} 
              style={[
                styles.nutritionBox,
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
              <View style={[styles.nutritionIconCircle, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={styles.nutritionVal}>{item.val}{item.unit}</Text>
              <Text style={styles.nutritionLab}>{item.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      setEditingIndex(null);
      Keyboard.dismiss();
    }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {/* Sticky Header Overlay */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          {isScaled && (
            <TouchableOpacity onPress={resetScale} style={styles.resetBtnCircle}>
              <Ionicons name="refresh" size={20} color="#f5a623" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          style={styles.scroll} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#1e293b', '#0a0a0f']}
              style={styles.heroBackground}
            >
              <Ionicons name="restaurant" size={80} color="rgba(245, 166, 35, 0.05)" style={styles.heroBgIcon} />
              <View style={styles.heroContent}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{recipe.category}</Text>
                </View>
                <Text style={styles.heroTitle}>{recipe.title}</Text>
                
                <View style={styles.heroStats}>
                  <View style={styles.heroStatItem}>
                    <Ionicons name="time-outline" size={16} color="#f5a623" />
                    <Text style={styles.heroStatText}>{recipe.prepTime + recipe.cookTime} min</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Ionicons name="people-outline" size={16} color="#f5a623" />
                    <Text style={styles.heroStatText}>
                      {isScaled ? formatAmount(recipe.servings * scaleFactor) : recipe.servings} Servings
                    </Text>
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
                  <Ionicons name="list" size={22} color="#f5a623" style={{ marginRight: 8 }} />
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
                    <Ionicons name="restaurant" size={22} color="#f5a623" style={{ marginRight: 8 }} />
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
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
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
  backBtnCircle: {
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
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },

  scroll: { flex: 1 },

  hero: {
    height: height * 0.4,
    width: '100%',
  },
  heroBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroBgIcon: {
    position: 'absolute',
    top: 60,
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
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -1,
    lineHeight: 40,
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
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },

  contentCard: {
    marginTop: -20,
    backgroundColor: '#0a0a0f',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingBottom: 40,
  },

  descSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  description: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
  },

  scaleBanner: {
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scaleBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  scaleBannerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  resetScaleInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resetScaleInnerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  hintText: { 
    color: '#64748b', 
    fontSize: 12, 
    fontWeight: '600',
  },

  ingredientsList: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  stepsList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepNumberContainer: {
    alignItems: 'center',
    width: 32,
    marginRight: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepNumberText: { 
    color: '#fff', 
    fontWeight: '900', 
    fontSize: 14 
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    marginTop: 4,
    marginBottom: -28,
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepText: { 
    color: '#cbd5e1', 
    fontSize: 16, 
    lineHeight: 26,
    fontWeight: '500',
  },

  nutritionSub: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionBox: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 18,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  nutritionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionVal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  nutritionLab: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  nutritionError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  nutritionErrorText: {
    color: '#64748b',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});
