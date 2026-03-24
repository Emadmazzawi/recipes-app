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
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t, isRTL, language } = useLanguage();
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [availableAmount, setAvailableAmount] = useState('');
  const [scalerMode, setScalerMode] = useState<'ingredient' | 'servings'>('ingredient');
  const [targetServings, setTargetServings] = useState(recipe.servings.toString());

  const localizedIngredients =
    language === 'he' && recipe.ingredients_he && recipe.ingredients_he.length > 0 ? recipe.ingredients_he :
    language === 'ar' && recipe.ingredients_ar && recipe.ingredients_ar.length > 0 ? recipe.ingredients_ar :
    recipe.ingredients;

  const applyIngredientScale = () => {
    if (selectedIngredientIndex === null) return;
    const amount = parseFloat(availableAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t.scale.invalidAmount, t.scale.enterValidAmount);
      return;
    }
    const originalIngredient = localizedIngredients[selectedIngredientIndex];
    const factor = amount / originalIngredient.amount;
    onApplyScale(factor, selectedIngredientIndex);
    onClose();
  };

  const applyServingsScale = () => {
    const servings = parseFloat(targetServings);
    if (isNaN(servings) || servings <= 0) {
      Alert.alert(t.scale.invalidServings, t.scale.enterValidServings);
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
          <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.scale.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.modeTabs, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={[styles.modeTab, scalerMode === 'ingredient' && styles.modeTabActive]}
              onPress={() => setScalerMode('ingredient')}
            >
              <Text style={[styles.modeTabText, scalerMode === 'ingredient' && styles.modeTabTextActive]}>
                {t.scale.byIngredient}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, scalerMode === 'servings' && styles.modeTabActive]}
              onPress={() => setScalerMode('servings')}
            >
              <Text style={[styles.modeTabText, scalerMode === 'servings' && styles.modeTabTextActive]}>
                {t.scale.byServings}
              </Text>
            </TouchableOpacity>
          </View>

          {scalerMode === 'ingredient' ? (
            <>
              <Text style={[styles.modalSubtitle, isRTL && styles.textRTL]}>
                {t.scale.ingredientSubtitle}
              </Text>

              <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>{t.scale.selectIngredient}</Text>
              <FlatList
                data={localizedIngredients}
                keyExtractor={item => item.id}
                style={styles.ingredientPicker}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      selectedIngredientIndex === index && styles.pickerItemSelected,
                      isRTL && styles.rowRTL,
                    ]}
                    onPress={() => {
                      setSelectedIngredientIndex(index);
                      setAvailableAmount('');
                    }}
                  >
                    <View style={[styles.pickerItemLeft, isRTL && styles.rowRTL]}>
                      {selectedIngredientIndex === index ? (
                        <Ionicons name="checkmark-circle" size={18} color="#f5a623" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color="#555" />
                      )}
                      <Text style={[styles.pickerItemName, isRTL && styles.textRTL]}>{item.name}</Text>
                    </View>
                    <Text style={[styles.pickerItemAmount, isRTL && styles.textRTL]}>
                      {formatAmount(item.amount)} {item.unit}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              {selectedIngredientIndex !== null && (
                <View style={styles.amountInputSection}>
                  <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>
                    {t.scale.howMuch.replace('{name}', localizedIngredients[selectedIngredientIndex].name)} ({localizedIngredients[selectedIngredientIndex].unit})
                  </Text>
                  <TextInput
                    style={[styles.amountInput, isRTL && styles.textRTL]}
                    placeholder={t.scale.inputPlaceholder.replace('{amount}', formatAmount(localizedIngredients[selectedIngredientIndex].amount / 2))}
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={availableAmount}
                    onChangeText={setAvailableAmount}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={applyIngredientScale}>
                    <Text style={styles.applyBtnText}>{t.scale.calculateAndScale}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.modalSubtitle, isRTL && styles.textRTL]}>
                {t.scale.scaleTo} {recipe.servings} {t.scale.servings}.
              </Text>
              <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>{t.scale.targetServings}</Text>
              <TextInput
                style={[styles.amountInput, isRTL && styles.textRTL]}
                placeholder={recipe.servings.toString()}
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={targetServings}
                onChangeText={setTargetServings}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={applyServingsScale}>
                <Text style={styles.applyBtnText}>
                  {t.scale.scaleTo} {targetServings || '?'} {t.scale.servings}
                </Text>
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
  rowRTL: { flexDirection: 'row-reverse' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
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
