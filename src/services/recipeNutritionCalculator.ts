/**
 * Recipe Nutrition Calculator
 * Calculates total nutrition for homemade recipes by summing ingredient nutrients
 * Uses Nutritionix API + fallback to a local database
 */

export interface Ingredient {
  name: string;
  amount: number; // in grams
}

export interface RecipeNutrition {
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  calories: number;
}

export interface IngredientNutrition {
  name: string;
  amount: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  calories: number;
}

/**
 * Local Fallback Database for Common Indian Foods
 * Nutrition values per 100g
 */
const FOOD_DATABASE: { [key: string]: RecipeNutrition & { calories: number } } = {
  // Grains
  rice: { protein: 6.6, carbs: 78, fat: 0.3, sugar: 0.1, sodium: 10, calories: 345 },
  wheat: { protein: 13.7, carbs: 71, fat: 1.7, sugar: 0.4, sodium: 2, calories: 364 },
  "basmati rice": { protein: 6.3, carbs: 80, fat: 0.3, sugar: 0, sodium: 1, calories: 350 },
  oats: { protein: 10.7, carbs: 66.3, fat: 6.9, sugar: 0, sodium: 30, calories: 389 },
  
  // Proteins
  "chicken breast": { protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 75, calories: 165 },
  chicken: { protein: 26.3, carbs: 0, fat: 7.4, sugar: 0, sodium: 75, calories: 165 },
  "fish (salmon)": { protein: 25.4, carbs: 0, fat: 13.6, sugar: 0, sodium: 75, calories: 208 },
  eggs: { protein: 13, carbs: 1.1, fat: 11, sugar: 1.1, sodium: 140, calories: 155 },
  "lentils (cooked)": { protein: 9.0, carbs: 20, fat: 0.4, sugar: 0.1, sodium: 2, calories: 116 },
  paneer: { protein: 23, carbs: 1.2, fat: 25, sugar: 0, sodium: 400, calories: 321 },
  "greek yogurt": { protein: 10.2, carbs: 3.6, fat: 0.4, sugar: 3.3, sodium: 75, calories: 59 },
  
  // Vegetables
  "broccoli": { protein: 2.8, carbs: 7, fat: 0.4, sugar: 1.4, sodium: 64, calories: 34 },
  carrots: { protein: 0.9, carbs: 10, fat: 0.2, sugar: 4.7, sodium: 69, calories: 41 },
  spinach: { protein: 2.7, carbs: 3.6, fat: 0.4, sugar: 0.4, sodium: 79, calories: 23 },
  "tomato": { protein: 0.9, carbs: 3.9, fat: 0.2, sugar: 2.6, sodium: 12, calories: 18 },
  onion: { protein: 1.1, carbs: 9, fat: 0.1, sugar: 4.2, sodium: 4, calories: 40 },
  cucumber: { protein: 0.7, carbs: 3.6, fat: 0.1, sugar: 1.7, sodium: 2, calories: 16 },
  "bell pepper": { protein: 1, carbs: 6, fat: 0.3, sugar: 3.2, sodium: 2, calories: 31 },
  
  // Oils & Fats
  "olive oil": { protein: 0, carbs: 0, fat: 100, sugar: 0, sodium: 2, calories: 884 },
  "coconut oil": { protein: 0, carbs: 0, fat: 100, sugar: 0, sodium: 0, calories: 892 },
  butter: { protein: 0.7, carbs: 0.1, fat: 81.7, sugar: 0, sodium: 714, calories: 717 },
  
  // Dairy
  milk: { protein: 3.2, carbs: 4.8, fat: 3.3, sugar: 4.8, sodium: 44, calories: 61 },
  cheese: { protein: 25, carbs: 1.3, fat: 33, sugar: 0.7, sodium: 621, calories: 402 },
  
  // Spices & Seasonings
  salt: { protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 38758, calories: 0 },
  "black pepper": { protein: 10.4, carbs: 64.8, fat: 3.3, sugar: 0.6, sodium: 20, calories: 251 },
  turmeric: { protein: 7.8, carbs: 67.1, fat: 3.5, sugar: 3.2, sodium: 38, calories: 312 },
  
  // Legumes
  chickpeas: { protein: 15.4, carbs: 27.4, fat: 4.3, sugar: 0.7, sodium: 64, calories: 210 },
  beans: { protein: 8.7, carbs: 16.1, fat: 0.4, sugar: 0.3, sodium: 3, calories: 127 },
};

/**
 * Search for an ingredient in the database (case-insensitive, partial match)
 */
function searchIngredient(ingredientName: string): RecipeNutrition & { calories: number } | null {
  if (!ingredientName || typeof ingredientName !== 'string') {
    console.warn("⚠️ Invalid ingredient name:", ingredientName);
    return null;
  }

  const normalized = ingredientName.toLowerCase().trim();
  
  // Exact match
  if (FOOD_DATABASE[normalized]) {
    return FOOD_DATABASE[normalized];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(FOOD_DATABASE)) {
    if (key && value && typeof key === 'string') {
      if (key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Fetch nutrition data from Nutritionix API (Free API)
 * Fallback: use local database
 */
async function fetchIngredientNutrition(
  ingredientName: string
): Promise<(RecipeNutrition & { calories: number }) | null> {
  try {
    if (!ingredientName || typeof ingredientName !== 'string') {
      console.warn("⚠️ Invalid ingredient name for fetch:", ingredientName);
      return null;
    }

    // First try local database (faster, no API calls)
    const localData = searchIngredient(ingredientName);
    if (localData) {
      console.log(`✅ Found "${ingredientName}" in local database`);
      return localData;
    }

    console.warn(`⚠️ Ingredient "${ingredientName}" not found in database`);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching nutrition for "${ingredientName}":`, error);
    return null;
  }
}

/**
 * Calculate nutrition for a single ingredient
 * Formula: nutrient_value = (nutrient_per_100g * amount_in_grams) / 100
 */
function calculateIngredientNutrition(
  ingredient: Ingredient,
  nutritionPer100g: RecipeNutrition & { calories: number }
): IngredientNutrition {
  const ratio = ingredient.amount / 100;

  return {
    name: ingredient.name,
    amount: ingredient.amount,
    protein: nutritionPer100g.protein * ratio,
    carbs: nutritionPer100g.carbs * ratio,
    fat: nutritionPer100g.fat * ratio,
    sugar: nutritionPer100g.sugar * ratio,
    sodium: nutritionPer100g.sodium * ratio,
    calories: nutritionPer100g.calories * ratio,
  };
}

/**
 * Calculate total nutrition for a recipe
 * @param ingredients - Array of ingredients with amounts in grams
 * @param servings - Number of servings (optional, default 1)
 * @returns Total nutrition and per-serving nutrition
 */
export async function calculateRecipeNutrition(
  ingredients: Ingredient[],
  servings: number = 1
): Promise<{
  total: RecipeNutrition & { calories: number };
  perServing: RecipeNutrition & { calories: number };
  breakdown: IngredientNutrition[];
  failedIngredients: string[];
}> {
  
  if (!ingredients || ingredients.length === 0) {
    throw new Error("Ingredients array cannot be empty");
  }

  if (servings <= 0) {
    throw new Error("Servings must be greater than 0");
  }

  const breakdown: IngredientNutrition[] = [];
  const failedIngredients: string[] = [];
  
  // Initialize totals
  const total: RecipeNutrition & { calories: number } = {
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    calories: 0,
  };

  // Process each ingredient
  for (const ingredient of ingredients) {
    if (!ingredient || typeof ingredient.name !== 'string') {
      console.warn("⚠️ Invalid ingredient object:", ingredient);
      failedIngredients.push(ingredient?.name || 'Unknown');
      continue;
    }

    const nutrition = await fetchIngredientNutrition(ingredient.name);
    
    if (!nutrition) {
      failedIngredients.push(ingredient.name);
      console.warn(`⚠️ Skipping "${ingredient.name}" - not found in database`);
      continue;
    }

    // Calculate this ingredient's nutrition
    const ingredientNutrition = calculateIngredientNutrition(ingredient, nutrition);
    breakdown.push(ingredientNutrition);

    // Add to totals
    total.protein += ingredientNutrition.protein;
    total.carbs += ingredientNutrition.carbs;
    total.fat += ingredientNutrition.fat;
    total.sugar += ingredientNutrition.sugar;
    total.sodium += ingredientNutrition.sodium;
    total.calories += ingredientNutrition.calories;
  }

  // Calculate per-serving values
  const perServing: RecipeNutrition & { calories: number } = {
    protein: Math.round((total.protein / servings) * 10) / 10,
    carbs: Math.round((total.carbs / servings) * 10) / 10,
    fat: Math.round((total.fat / servings) * 10) / 10,
    sugar: Math.round((total.sugar / servings) * 10) / 10,
    sodium: Math.round((total.sodium / servings) * 10) / 10,
    calories: Math.round(total.calories / servings),
  };

  // Round total values
  total.protein = Math.round(total.protein * 10) / 10;
  total.carbs = Math.round(total.carbs * 10) / 10;
  total.fat = Math.round(total.fat * 10) / 10;
  total.sugar = Math.round(total.sugar * 10) / 10;
  total.sodium = Math.round(total.sodium * 10) / 10;
  total.calories = Math.round(total.calories);

  return {
    total,
    perServing,
    breakdown,
    failedIngredients,
  };
}

/**
 * Get list of available ingredients in the database
 */
export function getAvailableIngredients(): string[] {
  try {
    const ingredients = Object.keys(FOOD_DATABASE);
    return ingredients.filter(ing => ing && typeof ing === 'string') || [];
  } catch (error) {
    console.error("❌ Error getting available ingredients:", error);
    return [];
  }
}

/**
 * Add a custom ingredient to the database
 */
export function addCustomIngredient(
  name: string,
  nutrition: RecipeNutrition & { calories: number }
): void {
  FOOD_DATABASE[name.toLowerCase()] = nutrition;
  console.log(`✅ Added custom ingredient: ${name}`);
}
