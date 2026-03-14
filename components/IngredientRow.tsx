import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ingredient } from '../types';
import { formatAmount } from '../lib/scaler';

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
  const [inputValue, setInputValue] = useState(formatAmount(ingredient.amount));

  // Sync internal input value with ingredient amount when not editing
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
    <View style={[styles.ingredientRow, isHighlighted && styles.ingredientHighlighted]}>
      <View style={styles.ingredientDot} />
      <Text style={styles.ingredientName}>{ingredient.name}</Text>
      
      {isEditing ? (
        <View style={styles.amountContainer}>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            value={inputValue}
            onChangeText={handleChangeText}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
          />
          <Text style={styles.unitText}>{ingredient.unit}</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onStartEditing} style={styles.amountContainer}>
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
    borderBottomColor: '#1e1e35',
  },
  ingredientHighlighted: { backgroundColor: '#2d2d1a' },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f5a623',
    marginRight: 10,
  },
  ingredientName: { flex: 1, color: '#ddd', fontSize: 15 },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  ingredientAmount: { 
    color: '#f5a623', 
    fontSize: 15, 
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 166, 35, 0.3)',
    borderStyle: 'dashed',
  },
  amountInput: {
    color: '#f5a623',
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: '#2d2d4e',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 50,
    textAlign: 'right',
  },
  unitText: { 
    color: '#666', 
    fontSize: 14,
    minWidth: 30,
  },
});
