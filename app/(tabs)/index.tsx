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
  Other: 'ellipsis-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  All: '#f5a623',
  Favorites: '#ef4444',
  Breakfast: '#ff9800',
  Main: '#4ade80',
  Appetizer: '#2196f3',
  Dessert: '#e91e63',
  Baking: '#9c27b0',
  Other: '#607d8b',
};

export default function BuiltInRecipesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [smartResults, setSmartResults] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

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

  const getCategoryColor = (cat: string) => {
    return CATEGORY_COLORS[cat] || '#607d8b';
  };

  const handleCategoryPress = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>What are we</Text>
        <Text style={styles.titleText}>Cooking today?</Text>
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
          <Ionicons name="search" size={20} color="#f5a623" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={isSmartSearch ? "Ask Gemini (e.g. 'something spicy')..." : "Search recipes..."}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {isLoading && <ActivityIndicator size="small" color="#f5a623" style={{ marginRight: 8 }} />}
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.smartToggle, isSmartSearch && styles.smartToggleActive]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsSmartSearch(!isSmartSearch);
          }}
        >
          <LinearGradient
            colors={isSmartSearch ? ['#f5a623', '#d97706'] : ['#1e293b', '#0f172a']}
            style={styles.smartToggleGradient}
          >
            <Ionicons 
              name={isSmartSearch ? "sparkles" : "sparkles-outline"} 
              size={20} 
              color={isSmartSearch ? "#fff" : "#f5a623"} 
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
                size={16} 
                color={selectedCategory === item ? '#fff' : (item === 'Favorites' ? '#ef4444' : '#64748b')} 
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                  selectedCategory !== item && item === 'Favorites' && { color: '#ef4444' }
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recipe list */}
      <FlatList
        data={(isLoading ? [1, 2, 3] : filtered) as any[]}
        keyExtractor={(item, index) => (isLoading ? `skeleton-${index}` : (item as Recipe).id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 5 }}
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
                  color="#1e293b" 
                />
                <View style={styles.emptyIconOverlay}>
                  <Ionicons 
                    name={selectedCategory === 'Favorites' ? "heart" : "search"} 
                    size={24} 
                    color={selectedCategory === 'Favorites' ? "#ef4444" : "#f5a623"} 
                  />
                </View>
              </View>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'Favorites' ? 'No Favorites Yet' : 'No Recipes Found'}
              </Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'Favorites' 
                  ? "Tap the heart icon on any recipe to save it to your favorites." 
                  : "We couldn't find any recipes matching your search. Try different keywords or browse all categories."}
              </Text>
            </Animated.View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 10,
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  titleText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
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
    backgroundColor: '#16213e',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.1)',
    height: 54,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  smartToggle: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  smartToggleGradient: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartToggleActive: {
    shadowOpacity: 0.4,
  },
  categoryContainer: {
    height: 75,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#16213e',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryChipActive: {
    backgroundColor: '#f5a623',
    borderColor: '#f5a623',
  },
  categoryChipActiveFavorite: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  categoryChipText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
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
    backgroundColor: '#16213e',
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyText: { 
    color: '#64748b', 
    fontSize: 15, 
    textAlign: 'center',
    lineHeight: 22,
  },
});
