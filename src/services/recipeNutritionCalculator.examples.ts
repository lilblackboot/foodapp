/**
 * Example: How to use the Recipe Nutrition Calculator
 * This file demonstrates the API and can be used as a reference
 */

import { calculateRecipeNutrition, getAvailableIngredients, addCustomIngredient } from '../services/recipeNutritionCalculator';

// Example 1: Simple Chicken Rice Bowl
export async function exampleChickenRiceBowl() {
  const ingredients = [
    { name: 'chicken breast', amount: 150 },
    { name: 'basmati rice', amount: 200 },
    { name: 'broccoli', amount: 100 },
    { name: 'olive oil', amount: 15 },
  ];

  try {
    const result = await calculateRecipeNutrition(ingredients, 2); // 2 servings
    
    console.log('🍚 Chicken Rice Bowl Nutrition:');
    console.log('Total:', result.total);
    console.log('Per Serving:', result.perServing);
    console.log('Breakdown:', result.breakdown);
    console.log('Failed Ingredients:', result.failedIngredients);
    
    return result;
  } catch (error) {
    console.error('❌ Error calculating recipe:', error);
  }
}

// Example 2: Indian Dal Curry
export async function exampleDalCurry() {
  const ingredients = [
    { name: 'lentils (cooked)', amount: 200 },
    { name: 'onion', amount: 100 },
    { name: 'tomato', amount: 150 },
    { name: 'turmeric', amount: 5 },
    { name: 'coconut oil', amount: 20 },
  ];

  try {
    const result = await calculateRecipeNutrition(ingredients, 4); // 4 servings
    console.log('🍛 Dal Curry Nutrition:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 3: Get available ingredients
export function exampleGetIngredients() {
  const available = getAvailableIngredients();
  console.log('📋 Available ingredients:', available);
  return available;
}

// Example 4: Add custom ingredient (e.g., a specialty Indian food)
export function exampleAddCustom() {
  addCustomIngredient('butter chicken sauce', {
    protein: 8,
    carbs: 5,
    fat: 12,
    sugar: 2,
    sodium: 450,
    calories: 156,
  });
}

/**
 * Usage in React Component:
 * 
 * import { calculateRecipeNutrition } from '../services/recipeNutritionCalculator';
 * 
 * const [recipeNutrition, setRecipeNutrition] = useState(null);
 * 
 * const handleCalculate = async () => {
 *   const ingredients = [
 *     { name: 'rice', amount: 100 },
 *     { name: 'chicken', amount: 150 }
 *   ];
 *   
 *   const result = await calculateRecipeNutrition(ingredients, 2);
 *   setRecipeNutrition(result);
 * };
 */
