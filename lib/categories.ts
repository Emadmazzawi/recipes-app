// A simple heuristic categorizer for ingredients
export const CATEGORIES = {
  Produce: ['apple', 'banana', 'carrot', 'onion', 'garlic', 'tomato', 'potato', 'spinach', 'lettuce', 'lemon', 'lime', 'pepper', 'cucumber', 'broccoli', 'mushroom', 'avocado', 'cilantro', 'parsley', 'basil', 'ginger', 'orange', 'strawberry', 'blueberry'],
  Dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'parmesan', 'mozzarella', 'cheddar', 'ghee', 'paneer'],
  Meat: ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'shrimp', 'bacon', 'sausage', 'turkey', 'tuna', 'steak'],
  Spices: ['salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'thyme', 'coriander', 'turmeric', 'chili', 'garlic powder', 'onion powder', 'vanilla', 'nutmeg', 'clove', 'cardamom'],
  Bakery: ['bread', 'flour', 'sugar', 'yeast', 'baking powder', 'baking soda', 'tortilla', 'pita', 'bagel', 'bun', 'croissant'],
  Pantry: ['oil', 'vinegar', 'soy sauce', 'rice', 'pasta', 'noodle', 'bean', 'lentil', 'chickpea', 'tomato sauce', 'broth', 'stock', 'honey', 'maple syrup', 'peanut butter', 'jam', 'mustard', 'ketchup', 'mayo', 'nut', 'almond', 'walnut', 'oat'],
  Beverages: ['water', 'juice', 'coffee', 'tea', 'soda', 'wine', 'beer'],
};

export const getCategoryForIngredient = (ingredientName: string): string => {
  const name = ingredientName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
};
