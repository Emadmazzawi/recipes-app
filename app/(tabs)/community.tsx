import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPublicRecipes, getFavorites, addFavorite, removeFavorite, savePersonalRecipe } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { Recipe } from '../../types';
import { RecipeCard } from '../../components/RecipeCard';
import { RecipeCardSkeleton } from '../../components/Skeleton';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SettingsModal } from '../../components/SettingsModal';

export default function CommunityFeedScreen() {
  const router = useRouter();
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const { t, isRTL } = useLanguage();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const emptyFade = useRef(new Animated.Value(0)).current;

  const loadData = async (refresh = false) => {
    if (!refresh) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [publicData, favs] = await Promise.all([
        getPublicRecipes(),
        getFavorites()
      ]);
      setRecipes(publicData || []);
      setFavorites(favs);

      if (!publicData || publicData.length === 0) {
        Animated.timing(emptyFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          delay: 400,
        }).start();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => {
    loadData(true);
  };

  const openRecipe = (recipe: Recipe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Even though it's public, it's effectively a shared recipe.
    router.push({ pathname: '/recipe/shared/[id]', params: { id: recipe.id } });
  };

  const toggleFavorite = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (favorites.includes(id)) {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(fid => fid !== id));
    } else {
      await addFavorite(id);
      setFavorites(prev => [...prev, id]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.greetingText, isRTL && styles.textRTL]}>{t.tabs?.community || 'Community'}</Text>
          <Text style={[styles.titleText, isRTL && styles.textRTL]}>{t.community?.title || 'Public Feed'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.settingsBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item, index }) =>
          isLoading && !isRefreshing ? (
            <RecipeCardSkeleton />
          ) : (
            <RecipeCard
              recipe={item as Recipe}
              onPress={openRecipe}
              onToggleFavorite={toggleFavorite}
              isFavorited={favorites.includes((item as Recipe).id)}
              index={index}
            />
          )
        }
        ListEmptyComponent={
          !isLoading && !isRefreshing ? (
            <Animated.View style={[styles.empty, { opacity: emptyFade }]}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="earth" size={64} color={COLORS.textFaint} />
              </View>
              <Text style={styles.emptyTitle}>{t.community?.emptyTitle || 'Nothing here yet!'}</Text>
              <Text style={styles.emptyText}>{t.community?.emptyText || 'Be the first to share a recipe with the community.'}</Text>
            </Animated.View>
          ) : null
        }
      />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTextContainer: {
    flex: 1,
  },
  settingsBtn: {
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginLeft: 16,
  },
  greetingText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 32,
    fontFamily: 'Inter_900Black',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 30,
  },
});
