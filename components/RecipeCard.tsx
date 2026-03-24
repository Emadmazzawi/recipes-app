import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onToggleFavorite?: (id: string) => void;
  isFavorited?: boolean;
  categoryColor?: string;
  reason?: string;
  index?: number;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onDelete,
  onEdit,
  onToggleFavorite,
  isFavorited = false,
  categoryColor,
  reason,
  index = 0,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const favoriteScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleFavorite = () => {
    if (onToggleFavorite) {
      Animated.sequence([
        Animated.spring(favoriteScale, { toValue: 1.4, useNativeDriver: true, speed: 20 }),
        Animated.spring(favoriteScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
      onToggleFavorite(recipe.id);
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { opacity, transform: [{ scale }, { translateY }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(recipe)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient colors={[COLORS.card, COLORS.cardDeep]} style={styles.card}>
          <View style={styles.cardHeader}>
            {categoryColor ? (
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '25' }]}>
                <View style={[styles.dot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                  {recipe.category}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <View style={styles.headerRight}>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={13} color={COLORS.primary} />
                <Text style={styles.timeText}>{recipe.prepTime + recipe.cookTime} min</Text>
              </View>
              {onToggleFavorite && (
                <TouchableOpacity
                  onPress={handleFavorite}
                  style={styles.iconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
                    <Ionicons
                      name={isFavorited ? 'heart' : 'heart-outline'}
                      size={19}
                      color={isFavorited ? '#ef4444' : COLORS.textMuted}
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
              {onEdit && (
                <TouchableOpacity
                  onPress={() => onEdit(recipe)}
                  style={[styles.iconBtn, styles.editBtn]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="pencil" size={15} color={COLORS.purple} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(recipe)}
                  style={[styles.iconBtn, styles.deleteBtn]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash" size={15} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>{recipe.title}</Text>

          {reason ? (
            <View style={styles.reasonContainer}>
              <LinearGradient
                colors={[COLORS.primaryTint, COLORS.primaryTintDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reasonGradient}
              >
                <Ionicons name="sparkles" size={13} color={COLORS.primary} />
                <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
              </LinearGradient>
            </View>
          ) : (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {recipe.description || 'A delicious recipe waiting to be discovered.'}
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={12} color={COLORS.primary} />
              </View>
              <Text style={styles.footerText}>{recipe.servings} Servings</Text>
            </View>
            <View style={styles.footerItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="restaurant" size={12} color={COLORS.primary} />
              </View>
              <Text style={styles.footerText}>{recipe.ingredients.length} Items</Text>
            </View>
            {!onDelete && !onEdit && (
              <View style={styles.arrowIcon}>
                <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 14,
    borderRadius: 22,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryTintDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  iconBtn: {
    backgroundColor: COLORS.borderSubtle,
    padding: 6,
    borderRadius: 8,
  },
  editBtn: { backgroundColor: COLORS.purpleTint },
  deleteBtn: { backgroundColor: COLORS.errorTint },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 7,
    letterSpacing: -0.4,
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 14,
  },
  reasonContainer: { marginBottom: 14 },
  reasonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reasonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryTintDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  arrowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryTintDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
