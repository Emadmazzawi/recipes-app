import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getShoppingList,
  toggleShoppingItem,
  removeShoppingItem,
  clearCheckedItems,
  clearShoppingList,
} from '../../lib/storage';
import { ShoppingItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { SettingsModal } from '../../components/SettingsModal';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { getCategoryForIngredient } from '../../lib/categories';

export default function ShoppingScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const { t, isRTL } = useLanguage();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    setIsLoading(true);
    const list = await getShoppingList();
    setItems(list);
    setIsLoading(false);
  };

  const handleToggle = async (id: string) => {
    await toggleShoppingItem(id);
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleRemove = async (id: string) => {
    await removeShoppingItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearChecked = async () => {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) return;
    await clearCheckedItems();
    setItems(prev => prev.filter(i => !i.checked));
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    
    if (Platform.OS === 'web') {
      if (window.confirm(t.shopping.clearAllConfirm)) {
        clearShoppingList().then(() => setItems([]));
      }
    } else {
      Alert.alert(t.shopping.clearAllTitle, t.shopping.clearAllConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.shopping.clearAll,
          style: 'destructive',
          onPress: async () => {
            await clearShoppingList();
            setItems([]);
          },
        },
      ]);
    }
  };

  const sorted = [...items].sort((a, b) => Number(a.checked) - Number(b.checked));
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  // Group items by category
  const groupedItems = sorted.reduce((acc, item) => {
    const rawCategory = getCategoryForIngredient(item.name);
    // Use t.shoppingCategories if available, else raw
    const category = t.shoppingCategories?.[rawCategory as keyof typeof t.shoppingCategories] || rawCategory;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  // Convert to array format for SectionList
  const sections = Object.entries(groupedItems)
    .sort(([keyA], [keyB]) => {
      // Put "Other" (or its translation) at the bottom
      const otherLabel = t.shoppingCategories?.Other || 'Other';
      if (keyA === otherLabel) return 1;
      if (keyB === otherLabel) return -1;
      return keyA.localeCompare(keyB);
    })
    .map(([title, data]) => ({
      title,
      data,
    }));

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.itemRow, item.checked && styles.itemRowChecked, isRTL && { flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: 12 }]}>
      <TouchableOpacity
        style={[styles.itemToggleArea, isRTL && { flexDirection: 'row-reverse' }]}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>

        <View style={styles.itemContent}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked, isRTL && styles.textRTL]}>
            {item.name}
          </Text>
          <Text style={[styles.itemMeta, isRTL && styles.textRTL]}>
            {item.amount} {item.unit}
            {item.recipeTitle ? (
              <Text style={styles.itemRecipe}>  ·  {item.recipeTitle}</Text>
            ) : null}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleRemove(item.id)}
        style={styles.removeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={17} color={COLORS.textFaint} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <View>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t.shopping.title}</Text>
          {totalCount > 0 && (
            <Text style={[styles.headerSub, isRTL && styles.textRTL]}>
              {checkedCount}/{totalCount} {t.shopping.done}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {checkedCount > 0 && (
            <TouchableOpacity onPress={handleClearChecked} style={styles.headerBtn}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClearAll} style={[styles.headerBtn, styles.headerBtnDanger]}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {totalCount > 0 && (
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` as any },
              ]}
            />
          </View>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 140,
          flexGrow: 1,
        }}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceDeep]}
                style={styles.emptyCircle}
              >
                <Ionicons name="cart-outline" size={64} color={COLORS.elevated} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t.shopping.emptyTitle}</Text>
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t.shopping.emptyText}</Text>
            </View>
          ) : null
        }
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  headerBtnDanger: {
    backgroundColor: COLORS.errorTint,
    borderColor: 'rgba(239,68,68,0.2)',
  },

  progressBarWrap: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },

  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: COLORS.textPrimary,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 4,
    paddingRight: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  itemRowChecked: {
    opacity: 0.5,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  itemToggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  itemContent: { flex: 1 },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  itemNameChecked: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  itemRecipe: {
    color: COLORS.textFaint,
    fontFamily: 'Inter_400Regular',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryTintDark,
  },

  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 80 },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 40,
  },
});
