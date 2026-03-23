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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MyRecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleDelete = (recipe: Recipe) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to remove "${recipe.title}" from your collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
    router.push({
      pathname: '/recipe/new',
      params: { editId: recipe.id },
    });
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
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id, type: 'personal' },
    });
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
      <StatusBar barStyle="light-content" />

      <FlatList
        data={(isLoading ? [1, 2, 3] : filtered) as any[]}
        keyExtractor={(item, index) =>
          isLoading ? `skeleton-${index}` : (item as Recipe).id
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        ListHeaderComponent={
          !isLoading ? (
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>My Collection</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statText}>
                      {recipes.length} {recipes.length === 1 ? 'Recipe' : 'Recipes'}
                    </Text>
                  </View>
                </View>
              </View>

              {recipes.length > 0 && (
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search your recipes..."
                    placeholderTextColor="#475569"
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>My Collection</Text>
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
                <Ionicons name="search-outline" size={48} color="#334155" />
                <Text style={styles.noResultsTitle}>No Matches</Text>
                <Text style={styles.noResultsText}>
                  No recipes found for "{search}". Try a different term.
                </Text>
              </View>
            ) : (
              <Animated.View style={[styles.empty, { opacity: emptyFade }]}>
                <View style={styles.emptyIllustration}>
                  <LinearGradient
                    colors={['#1e293b', '#0f172a']}
                    style={styles.illustrationCircle}
                  >
                    <Ionicons name="journal-outline" size={80} color="#334155" />
                    <View style={styles.emptyPlusIcon}>
                      <Ionicons name="add" size={24} color="#f5a623" />
                    </View>
                  </LinearGradient>
                </View>
                <Text style={styles.emptyTitle}>Your Kitchen is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  Start building your personal cookbook by adding recipes manually or scanning them with AI.
                </Text>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => router.push('/recipe/new')}
                >
                  <Text style={styles.addFirstBtnText}>Create My First Recipe</Text>
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
          <LinearGradient colors={['#f5a623', '#ea580c']} style={styles.fab}>
            <Ionicons name="add" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsContainer: { flexDirection: 'row' },
  statBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.2)',
  },
  statText: {
    color: '#f5a623',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },

  noResults: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  noResultsTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  noResultsText: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIllustration: { marginBottom: 30 },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyPlusIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#16213e',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a0a0f',
  },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  addFirstBtn: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f5a623',
  },
  addFirstBtnText: { color: '#f5a623', fontSize: 16, fontWeight: '700' },

  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    elevation: 8,
    shadowColor: '#f5a623',
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
