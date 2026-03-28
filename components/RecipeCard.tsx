import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Recipe } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useStyles } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getCategoryLabel } from '../lib/i18n';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onShare?: (recipe: Recipe) => void;
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
  onShare,
  onToggleFavorite,
  isFavorited = false,
  categoryColor,
  reason,
  index = 0,
}) => {
  const { colors: COLORS } = useTheme();
  const styles = useStyles(getStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const favoriteScale = useRef(new Animated.Value(1)).current;

  const { t, language, isRTL } = useLanguage();

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

  const getLocalizedTitle = (): string => {
    if (language === 'he' && recipe.title_he) return recipe.title_he;
    if (language === 'ar' && recipe.title_ar) return recipe.title_ar;
    return recipe.title;
  };

  const getLocalizedDescription = (): string => {
    if (language === 'he' && recipe.description_he) return recipe.description_he;
    if (language === 'ar' && recipe.description_ar) return recipe.description_ar;
    return recipe.description;
  };

  const localizedTitle = getLocalizedTitle();
  const localizedDescription = getLocalizedDescription();
  const imageUrl = recipe.unsplashImageUrl || recipe.imageUri;

  const renderCardContent = () => (
    <>
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        {categoryColor ? (
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '25' }]}>
            <View style={[styles.dot, { backgroundColor: categoryColor }]} />
            <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
              {getCategoryLabel(t, recipe.category)}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={[styles.headerRight, isRTL && styles.headerRightRTL]}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={13} color={COLORS.primary} />
            <Text style={styles.timeText}>{recipe.prepTime + recipe.cookTime} {t.common.min}</Text>
          </View>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); handleFavorite(); }}
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
          {onShare && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onShare(recipe); }}
              style={[styles.iconBtn, styles.shareBtn]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={15} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onEdit(recipe); }}
              style={[styles.iconBtn, styles.editBtn]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil" size={15} color={COLORS.purple} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onDelete(recipe); }}
              style={[styles.iconBtn, styles.deleteBtn]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash" size={15} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.cardTitle, isRTL && styles.textRTL, imageUrl && styles.textWhite]} numberOfLines={1}>{localizedTitle}</Text>

      {reason ? (
        <View style={styles.reasonContainer}>
          <LinearGradient
            colors={[COLORS.primaryTint, COLORS.primaryTintDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reasonGradient}
          >
            <Ionicons name="sparkles" size={13} color={COLORS.primary} />
            <Text style={[styles.reasonText, isRTL && styles.textRTL]} numberOfLines={1}>{reason}</Text>
          </LinearGradient>
        </View>
      ) : (
        <Text style={[styles.cardDesc, isRTL && styles.textRTL, imageUrl && styles.textWhiteLight]} numberOfLines={2}>
          {localizedDescription || t.common.noDescription}
        </Text>
      )}

      <View style={[styles.divider, imageUrl && styles.dividerLight]} />

      <View style={[styles.cardFooter, isRTL && styles.cardFooterRTL]}>
        <View style={styles.footerItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={12} color={COLORS.primary} />
          </View>
          <Text style={[styles.footerText, imageUrl && styles.textWhite]}>{recipe.servings} {t.common.servings}</Text>
        </View>
        <View style={styles.footerItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="restaurant" size={12} color={COLORS.primary} />
          </View>
          <Text style={[styles.footerText, imageUrl && styles.textWhite]}>{recipe.ingredients.length} {t.common.items}</Text>
        </View>
        {!onDelete && !onEdit && (
          <View style={styles.arrowIcon}>
            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color={COLORS.primary} />
          </View>
        )}
      </View>
    </>
  );

  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <TouchableOpacity
        style={styles.swipeDeleteContainer}
        onPress={() => onDelete(recipe)}
      >
        <View style={styles.swipeDeleteAction}>
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.swipeDeleteText}>{t.common.delete}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const cardContentInner = (
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
        {imageUrl ? (
          <ImageBackground
            source={{ uri: imageUrl }}
            style={styles.card}
            imageStyle={styles.backgroundImage}
          >
            <LinearGradient
              colors={['rgba(10, 10, 15, 0.4)', 'rgba(10, 10, 15, 0.9)']}
              style={StyleSheet.absoluteFillObject}
            />
            {renderCardContent()}
          </ImageBackground>
        ) : (
          <LinearGradient colors={[COLORS.card, COLORS.cardDeep]} style={styles.card}>
            {renderCardContent()}
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  if (onDelete) {
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        containerStyle={{ overflow: 'visible' }}
      >
        {cardContentInner}
      </Swipeable>
    );
  }

  return cardContentInner;
};

const getStyles = (COLORS: any) => StyleSheet.create({
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
  backgroundImage: {
    borderRadius: 22,
  },
  textWhite: {
    color: '#ffffff',
  },
  textWhiteLight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dividerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRTL: { flexDirection: 'row-reverse' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerRightRTL: { flexDirection: 'row-reverse' },
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
  shareBtn: { backgroundColor: COLORS.primaryTintDark },
  editBtn: { backgroundColor: COLORS.purpleTint },
  deleteBtn: { backgroundColor: COLORS.errorTint },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 7,
    letterSpacing: -0.4,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
  cardFooterRTL: { flexDirection: 'row-reverse' },
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primaryTintDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteContainer: {
    width: 90,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteAction: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
});
