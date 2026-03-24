import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPersonalRecipes, deletePersonalRecipe, getFavorites, addFavorite, removeFavorite } from '../../lib/storage';
import { Recipe } from '../../types';
import { RecipeCard } from '../../components/RecipeCard';
import { RecipeCardSkeleton } from '../../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MyRecipesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [importUrl, setImportUrl] = useState('');

  const fabScale = useRef(new Animated.Value(0)).current;
  const emptyFade = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    setIsLoading(true);
    const [personalData, favs] = await Promise.all([getPersonalRecipes(), getFavorites()]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecipes(personalData || []);
    setFavorites(favs);
    setIsLoading(false);

    Animated.spring(fabScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
      delay: 300,
    }).start();

    if (!personalData || personalData.length === 0) {
      Animated.timing(emptyFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 400,
      }).start();
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(
      'Delete Recipe',
      `Remove "${recipe.title}" from your collection?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deletePersonalRecipe(recipe.id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setRecipes(prev => prev.filter(r => r.id !== recipe.id));
          },
        },
      ]
    );
  };

  const handleEdit = (recipe: Recipe) => {
    router.push({ pathname: '/recipe/new', params: { editId: recipe.id } });
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

  const openRecipe = (recipe: Recipe) => {
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id, type: 'personal' } });
  };

  const handleUrlImport = () => {
    const trimmed = importUrl.trim();
    if (!trimmed) return;
    setImportUrl('');
    router.push({ pathname: '/recipe/new', params: { importUrl: trimmed } });
  };

  const filtered = search.trim()
    ? recipes.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
      )
    : recipes;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={(isLoading ? [1, 2, 3] : filtered) as any[]}
        keyExtractor={(item, index) => isLoading ? `skeleton-${index}` : (item as Recipe).id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150, paddingTop: 10 }}
        ListHeaderComponent={
          !isLoading ? (
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.library.title}</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>
                    {recipes.length} {recipes.length === 1 ? t.library.recipe : t.library.recipes}
                  </Text>
                </View>
              </View>

              {/* URL Extractor */}
              <BlurView intensity={30} tint="dark" style={styles.extractorCard}>
                <View style={styles.extractorInner}>
                  <View style={styles.extractorHeader}>
                    <LinearGradient
                      colors={[COLORS.primaryLight, COLORS.primary]}
                      style={styles.extractorIcon}
                    >
                      <Ionicons name="link" size={14} color="#fff" />
                    </LinearGradient>
                    <View>
                      <Text style={styles.extractorTitle}>{t.library.importTitle}</Text>
                      <Text style={styles.extractorSub}>{t.library.importSub}</Text>
                    </View>
                  </View>
                  <View style={styles.extractorRow}>
                    <TextInput
                      style={styles.extractorInput}
                      placeholder="https://www.example.com/recipe..."
                      placeholderTextColor={COLORS.textFaint}
                      value={importUrl}
                      onChangeText={setImportUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="go"
                      onSubmitEditing={handleUrlImport}
                    />
                    <TouchableOpacity onPress={handleUrlImport} activeOpacity={0.85}>
                      <LinearGradient
                        colors={importUrl.trim() ? [COLORS.primaryLight, COLORS.primary] : [COLORS.surface, COLORS.surface]}
                        style={styles.extractorBtn}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color={importUrl.trim() ? '#fff' : COLORS.textFaint}
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>

              {recipes.length > 0 && (
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={17} color={COLORS.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t.library.searchPlaceholder}
                    placeholderTextColor={COLORS.textFaint}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t.library.title}</Text>
            </View>
          )
        }
        renderItem={({ item, index }) =>
          isLoading ? (
            <RecipeCardSkeleton />
          ) : (
            <RecipeCard
              recipe={item as Recipe}
              onPress={openRecipe}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onToggleFavorite={toggleFavorite}
              isFavorited={favorites.includes((item as Recipe).id)}
              index={index}
            />
          )
        }
        ListEmptyComponent={
          !isLoading ? (
            search.trim() ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color={COLORS.surface} />
                <Text style={styles.noResultsTitle}>{t.library.noMatchTitle}</Text>
                <Text style={styles.noResultsText}>{t.library.noMatchText}</Text>
              </View>
            ) : (
              <Animated.View style={[styles.empty, { opacity: emptyFade }]}>
                <View style={styles.emptyIllustration}>
                  <LinearGradient
                    colors={[COLORS.surface, COLORS.surfaceDeep]}
                    style={styles.illustrationCircle}
                  >
                    <Ionicons name="journal-outline" size={80} color={COLORS.elevated} />
                    <View style={styles.emptyPlusIcon}>
                      <Ionicons name="add" size={24} color={COLORS.primary} />
                    </View>
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>{t.library.emptyTitle}</Text>
                <Text style={styles.emptySubtitle}>{t.library.emptySubtitle}</Text>
                <TouchableOpacity style={styles.addFirstBtn} onPress={() => router.push('/recipe/new')}>
                  <Text style={styles.addFirstBtnText}>{t.library.createFirst}</Text>
                </TouchableOpacity>
              </Animated.View>
            )
          ) : null
        }
      />

      <Animated.View
        style={[styles.fabContainer, { opacity: fabScale, transform: [{ scale: fabScale }] }]}
      >
        <TouchableOpacity onPress={() => router.push('/recipe/new')} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.fab}>
            <Ionicons name="add" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  statBadge: {
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  extractorCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  extractorInner: { padding: 16 },
  extractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  extractorIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extractorTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    marginBottom: 1,
  },
  extractorSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  extractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractorInput: {
    flex: 1,
    backgroundColor: COLORS.primaryTintDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  extractorBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },

  noResults: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  noResultsTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIllustration: { marginBottom: 30 },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  emptyPlusIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.bg,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 30,
  },
  addFirstBtn: {
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addFirstBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },

  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
