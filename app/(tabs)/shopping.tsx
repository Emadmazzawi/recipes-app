import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
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

export default function ShoppingScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    Alert.alert('Clear Everything', 'Remove all items from your shopping list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearShoppingList();
          setItems([]);
        },
      },
    ]);
  };

  const sorted = [...items].sort((a, b) => Number(a.checked) - Number(b.checked));
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.itemRow, item.checked && styles.itemRowChecked]}
      onPress={() => handleToggle(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>

      <View style={styles.itemContent}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>
          {item.amount} {item.unit}
          {item.recipeTitle ? (
            <Text style={styles.itemRecipe}>  ·  {item.recipeTitle}</Text>
          ) : null}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleRemove(item.id)}
        style={styles.removeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color="#475569" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shopping List</Text>
          {totalCount > 0 && (
            <Text style={styles.headerSub}>
              {checkedCount} of {totalCount} checked
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {checkedCount > 0 && (
            <TouchableOpacity onPress={handleClearChecked} style={styles.headerBtn}>
              <Ionicons name="checkmark-done" size={18} color="#22c55e" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleClearAll} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {totalCount > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(checkedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.emptyCircle}>
                  <Ionicons name="cart-outline" size={64} color="#334155" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>List is Empty</Text>
              <Text style={styles.emptyText}>
                Open any recipe and tap "Shopping" to add its ingredients here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    backgroundColor: '#16213e',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  progressBar: {
    height: 3,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 14,
  },
  itemRowChecked: {
    opacity: 0.55,
    borderColor: 'rgba(34,197,94,0.2)',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },

  itemContent: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#64748b' },
  itemMeta: { color: '#64748b', fontSize: 13, marginTop: 2 },
  itemRecipe: { color: '#475569', fontStyle: 'italic' },

  removeBtn: { padding: 4 },

  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 28 },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10 },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
