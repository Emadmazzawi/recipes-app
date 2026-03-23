import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

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
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
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
        <LinearGradient colors={['#16213e', '#0f172a']} style={styles.card}>
          <View style={styles.cardHeader}>
            {categoryColor ? (
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '30' }]}>
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
                <Ionicons name="time" size={14} color="#f5a623" />
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
                      size={20}
                      color={isFavorited ? '#ef4444' : '#94a3b8'}
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
                  <Ionicons name="pencil" size={16} color="#a78bfa" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(recipe)}
                  style={[styles.iconBtn, styles.deleteBtn]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>{recipe.title}</Text>

          {reason ? (
            <View style={styles.reasonContainer}>
              <LinearGradient
                colors={['rgba(245, 166, 35, 0.15)', 'rgba(245, 166, 35, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reasonGradient}
              >
                <Ionicons name="sparkles" size={14} color="#f5a623" />
                <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
              </LinearGradient>
            </View>
          ) : (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {recipe.description || 'No description provided for this delicious recipe.'}
            </Text>
          )}

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={12} color="#f5a623" />
              </View>
              <Text style={styles.footerText}>{recipe.servings} Servings</Text>
            </View>
            <View style={styles.footerItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="restaurant" size={12} color="#f5a623" />
              </View>
              <Text style={styles.footerText}>{recipe.ingredients.length} Items</Text>
            </View>
            {!onDelete && !onEdit && (
              <View style={styles.arrowIcon}>
                <Ionicons name="arrow-forward" size={16} color="#f5a623" />
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
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  iconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
    borderRadius: 8,
  },
  editBtn: { backgroundColor: 'rgba(167, 139, 250, 0.1)' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardDesc: { color: '#94a3b8', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  reasonContainer: { marginBottom: 16 },
  reasonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  reasonText: { color: '#f5a623', fontSize: 13, fontWeight: '600', flex: 1 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500' },
  arrowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
