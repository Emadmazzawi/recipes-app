import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';
import { formatAmount } from '../lib/scaler';

interface ScaleRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe;
  onApplyScale: (factor: number, selectedIndex: number | null) => void;
}

export const ScaleRecipeModal: React.FC<ScaleRecipeModalProps> = ({
  visible,
  onClose,
  recipe,
  onApplyScale,
}) => {
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [availableAmount, setAvailableAmount] = useState('');
  const [scalerMode, setScalerMode] = useState<'ingredient' | 'servings'>('ingredient');
  const [targetServings, setTargetServings] = useState(recipe.servings.toString());

  const applyIngredientScale = () => {
    if (selectedIngredientIndex === null) return;
    const amount = parseFloat(availableAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number.');
      return;
    }
    const originalIngredient = recipe.ingredients[selectedIngredientIndex];
    const factor = amount / originalIngredient.amount;
    onApplyScale(factor, selectedIngredientIndex);
    onClose();
  };

  const applyServingsScale = () => {
    const servings = parseFloat(targetServings);
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Invalid servings', 'Please enter a valid number of servings.');
      return;
    }
    const factor = servings / recipe.servings;
    onApplyScale(factor, null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scale Recipe</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Mode tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, scalerMode === 'ingredient' && styles.modeTabActive]}
              onPress={() => setScalerMode('ingredient')}
            >
              <Text style={[styles.modeTabText, scalerMode === 'ingredient' && styles.modeTabTextActive]}>
                By Ingredient
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, scalerMode === 'servings' && styles.modeTabActive]}
              onPress={() => setScalerMode('servings')}
            >
              <Text style={[styles.modeTabText, scalerMode === 'servings' && styles.modeTabTextActive]}>
                By Servings
              </Text>
            </TouchableOpacity>
          </View>

          {scalerMode === 'ingredient' ? (
            <>
              <Text style={styles.modalSubtitle}>
                Pick an ingredient you know the amount of, and we'll scale everything else.
              </Text>

              <Text style={styles.modalLabel}>1. Select the limiting ingredient:</Text>
              <FlatList
                data={recipe.ingredients}
                keyExtractor={item => item.id}
                style={styles.ingredientPicker}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      selectedIngredientIndex === index && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedIngredientIndex(index);
                      setAvailableAmount('');
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      {selectedIngredientIndex === index ? (
                        <Ionicons name="checkmark-circle" size={18} color="#f5a623" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color="#555" />
                      )}
                      <Text style={styles.pickerItemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.pickerItemAmount}>
                      {formatAmount(item.amount)} {item.unit}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              {selectedIngredientIndex !== null && (
                <View style={styles.amountInputSection}>
                  <Text style={styles.modalLabel}>
                    2. How much {recipe.ingredients[selectedIngredientIndex].name} do you have? (
                    {recipe.ingredients[selectedIngredientIndex].unit})
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={`e.g. ${formatAmount(recipe.ingredients[selectedIngredientIndex].amount / 2)}`}
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={availableAmount}
                    onChangeText={setAvailableAmount}
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={applyIngredientScale}>
                    <Text style={styles.applyBtnText}>Calculate & Scale</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.modalSubtitle}>
                How many servings do you want to make? Original recipe makes {recipe.servings}.
              </Text>
              <Text style={styles.modalLabel}>Target servings:</Text>
              <TextInput
                style={styles.amountInput}
                placeholder={recipe.servings.toString()}
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={targetServings}
                onChangeText={setTargetServings}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={applyServingsScale}>
                <Text style={styles.applyBtnText}>Scale to {targetServings || '?'} Servings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  modalLabel: { color: '#aaa', fontSize: 13, marginBottom: 8, fontWeight: '600' },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0f0f1a',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: { backgroundColor: '#f5a623' },
  modeTabText: { color: '#888', fontWeight: '600', fontSize: 13 },
  modeTabTextActive: { color: '#000' },

  ingredientPicker: { maxHeight: 200, marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4e',
  },
  pickerItemSelected: { backgroundColor: '#2d2d1a' },
  pickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pickerItemName: { color: '#ddd', fontSize: 14, flex: 1 },
  pickerItemAmount: { color: '#666', fontSize: 13 },

  amountInputSection: { marginTop: 8 },
  amountInput: {
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#2d2d4e',
    borderRadius: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  applyBtn: {
    backgroundColor: '#f5a623',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
