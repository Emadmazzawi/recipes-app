import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ingredient } from '../types';
import { formatAmount } from '../lib/scaler';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../constants/theme';

interface IngredientRowProps {
  ingredient: Ingredient;
  isHighlighted?: boolean;
  onAmountChange?: (newAmount: number) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export const IngredientRow: React.FC<IngredientRowProps> = ({ 
  ingredient, 
  isHighlighted, 
  onAmountChange,
  isEditing,
  onStartEditing
}) => {
  const { isRTL } = useLanguage();
  const [inputValue, setInputValue] = useState(formatAmount(ingredient.amount));

  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatAmount(ingredient.amount));
    }
  }, [ingredient.amount, isEditing]);

  const handleChangeText = (text: string) => {
    setInputValue(text);
    const numericValue = parseFloat(text);
    if (!isNaN(numericValue) && onAmountChange) {
      onAmountChange(numericValue);
    }
  };

  return (
    <View style={[styles.ingredientRow, isHighlighted && styles.ingredientHighlighted, isRTL && styles.rowRTL]}>
      <View style={[styles.dotWrapper, isRTL && styles.dotWrapperRTL]}>
        <View style={styles.ingredientDot} />
      </View>
      <Text style={[styles.ingredientName, isRTL && styles.textRTL]}>{ingredient.name}</Text>
      
      {isEditing ? (
        <View style={[styles.amountContainer, isRTL && styles.amountContainerRTL]}>
          <TextInput
            style={[styles.amountInput, isRTL && { textAlign: 'right' }]}
            keyboardType="numeric"
            value={inputValue}
            onChangeText={handleChangeText}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            textAlign={isRTL ? 'right' : 'left'}
          />
          <Text style={styles.unitText}>{ingredient.unit}</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onStartEditing} style={[styles.amountContainer, isRTL && styles.amountContainerRTL]}>
          <Text style={styles.ingredientAmount}>
            {formatAmount(ingredient.amount)}
          </Text>
          <Text style={styles.unitText}>{ingredient.unit}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowRTL: { flexDirection: 'row-reverse' },
  ingredientHighlighted: { backgroundColor: COLORS.primaryTint },
  dotWrapper: { marginRight: 10 },
  dotWrapperRTL: { marginRight: 0, marginLeft: 10 },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  ingredientName: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  amountContainerRTL: {
    justifyContent: 'flex-start',
  },
  ingredientAmount: { 
    color: COLORS.primary, 
    fontSize: 15, 
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryTintDark,
    borderStyle: 'dashed',
  },
  amountInput: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 50,
    textAlign: 'right',
  },
  unitText: { 
    color: COLORS.textMuted, 
    fontSize: 14,
    minWidth: 30,
  },
});
