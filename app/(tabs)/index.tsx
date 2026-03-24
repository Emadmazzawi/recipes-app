import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BUILT_IN_RECIPES, CATEGORIES } from '../../constants/recipes';
import { Recipe } from '../../types';
import { RecipeCard } from '../../components/RecipeCard';
import { RecipeCardSkeleton } from '../../components/Skeleton';
import { smartSearchRecipes } from '../../lib/gemini';
import { LinearGradient } from 'expo-linear-gradient';
import { getFavorites, addFavorite, removeFavorite } from '../../lib/storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const EXTENDED_CATEGORIES = ['All', 'Favorites', ...CATEGORIES.filter(c => c !== 'All')];

const CATEGORY_ICONS: Record<string, any> = {
  All: 'apps',
  Favorites: 'heart',
  Breakfast: 'cafe',
  Main: 'restaurant',
  Appetizer: 'fast-food',
  Dessert: 'ice-cream',
  Baking: 'pizza',
  Soup: 'flame',
  Salad: 'leaf',
  Drinks: 'wine',
  Other: 'ellipsis-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  All: '#e8722a',
  Favorites: '#ef4444',
  Breakfast: '#f59e0b',
  Main: '#4ade80',
  Appetizer: '#60a5fa',
  Dessert: '#f472b6',
  Baking: '#c084fc',
  Soup: '#fb923c',
  Salad: '#86efac',
  Drinks: '#a78bfa',
  Other: '#94a3b8',
};

export default function BuiltInRecipesScreen() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [smartResults, setSmartResults] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const emptyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      delay: 100,
    }).start();
    loadFavorites();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  const toggleFavorite = async (id: string) => {
    if (favorites.includes(id)) {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(fid => fid !== id));
    } else {
      await addFavorite(id);
      setFavorites(prev => [...prev, id]);
    }
  };

  useEffect(() => {
    if (isSmartSearch && search.trim().length > 2) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        handleSmartSearch();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setSmartResults({});
      setIsLoading(false);
    }
  }, [search, isSmartSearch]);

  const handleSmartSearch = async () => {
    try {
      const results = await smartSearchRecipes(search, BUILT_IN_RECIPES);
      setSmartResults(results);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return BUILT_IN_RECIPES.filter(r => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Favorites' ? favorites.includes(r.id) : r.category === selectedCategory);

      if (isSmartSearch && search.trim().length > 2) {
        return !!smartResults[r.id] && matchesCategory;
      }

      const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, isSmartSearch, smartResults, favorites]);

  useEffect(() => {
    if (filtered.length === 0 && !isLoading) {
      Animated.timing(emptyFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 300,
      }).start();
    } else {
      emptyFade.setValue(0);
    }
  }, [filtered.length, isLoading]);

  const openRecipe = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, type: 'builtin' },
    });
  };

  const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] || '#94a3b8';

  const handleCategoryPress = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
  };

  const LANG_OPTIONS: { code: 'en' | 'he' | 'ar'; flag: string }[] = [
    { code: 'en', flag: '🇺🇸' },
    { code: 'he', flag: '🇮🇱' },
    { code: 'ar', flag: '🇸🇦' },
  ];

  return (
    <SafeAreaView style={[styles.container, isRTL && { direction: 'rtl' } as any]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
          <Text style={[styles.greeting, isRTL && styles.textRTL]}>{t.explore.greeting}</Text>
          <Text style={[styles.titleText, isRTL && styles.textRTL]}>{t.explore.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.gearBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <Animated.View
        style={[
          styles.searchBarWrapper,
          {
            opacity: searchBarAnim,
            transform: [{
              translateY: searchBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.textRTL]}
            placeholder={isSmartSearch ? t.explore.aiPlaceholder : t.explore.searchPlaceholder}
            placeholderTextColor={COLORS.textFaint}
            value={search}
            onChangeText={setSearch}
          />
          {isLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />}
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.smartToggle}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsSmartSearch(!isSmartSearch);
          }}
        >
          <LinearGradient
            colors={isSmartSearch ? [COLORS.primary, '#c45a1a'] : [COLORS.surface, COLORS.surfaceDeep]}
            style={styles.smartToggleGradient}
          >
            <Ionicons
              name={isSmartSearch ? "sparkles" : "sparkles-outline"}
              size={20}
              color={isSmartSearch ? "#fff" : COLORS.primary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Category filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={EXTENDED_CATEGORIES}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.categoryChip,
                selectedCategory === item && { borderColor: getCategoryColor(item) },
                selectedCategory === item && (item === 'Favorites' ? styles.categoryChipActiveFavorite : styles.categoryChipActive),
              ]}
              onPress={() => handleCategoryPress(item)}
            >
              <Ionicons
                name={CATEGORY_ICONS[item] || 'restaurant'}
                size={15}
                color={selectedCategory === item ? '#fff' : (item === 'Favorites' ? '#ef4444' : COLORS.textMuted)}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                  selectedCategory !== item && item === 'Favorites' && { color: '#ef4444' }
                ]}
              >
                {item === 'All' ? t.explore.all : item === 'Favorites' ? t.explore.favorites : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recipe list */}
      <FlatList
        data={(isLoading ? [1, 2, 3] : filtered) as any[]}
        keyExtractor={(item, index) => (isLoading ? `skeleton-${index}` : (item as Recipe).id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, paddingTop: 5 }}
        renderItem={({ item, index }) => (
          isLoading ? (
            <RecipeCardSkeleton />
          ) : (
            <RecipeCard
              recipe={item as Recipe}
              onPress={openRecipe}
              onToggleFavorite={toggleFavorite}
              isFavorited={favorites.includes((item as Recipe).id)}
              categoryColor={getCategoryColor((item as Recipe).category)}
              reason={isSmartSearch ? smartResults[(item as Recipe).id] : undefined}
              index={index}
            />
          )
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View style={[styles.empty, { opacity: emptyFade }]}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name={selectedCategory === 'Favorites' ? "heart-outline" : "restaurant-outline"}
                  size={60}
                  color={COLORS.surface}
                />
                <View style={styles.emptyIconOverlay}>
                  <Ionicons
                    name={selectedCategory === 'Favorites' ? "heart" : "search"}
                    size={24}
                    color={selectedCategory === 'Favorites' ? "#ef4444" : COLORS.primary}
                  />
                </View>
              </View>
              <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>
                {selectedCategory === 'Favorites' ? t.explore.noFavoritesTitle : t.explore.noResultsTitle}
              </Text>
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {selectedCategory === 'Favorites' ? t.explore.noFavoritesText : t.explore.noResultsText}
              </Text>
            </Animated.View>
          ) : null
        }
      />

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.settingsSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.settings.title}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Language Section */}
            <Text style={styles.sectionLabel}>{t.settings.language}</Text>
            {LANG_OPTIONS.map(({ code, flag }) => (
              <TouchableOpacity
                key={code}
                style={[styles.langOption, language === code && styles.langOptionActive]}
                onPress={() => setLanguage(code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{flag}</Text>
                <Text style={[styles.langName, language === code && styles.langNameActive]}>
                  {t.languages[code]}
                </Text>
                {language === code && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowSettings(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, '#c45a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>{t.settings.done}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  greeting: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  titleText: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontFamily: 'Inter_900Black',
    letterSpacing: -1,
    lineHeight: 40,
  },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' } as any,
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 15,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 54,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  clearBtn: { padding: 4 },
  smartToggle: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  smartToggleGradient: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: { height: 75 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipActiveFavorite: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  categoryChipTextActive: { color: '#fff' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  emptyIconOverlay: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.surface,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textFaint,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 12,
  },
  langOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTint,
  },
  langFlag: { fontSize: 22 },
  langName: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  langNameActive: {
    color: COLORS.textPrimary,
    fontFamily: 'Inter_700Bold',
  },
  doneBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  doneBtnGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
});
