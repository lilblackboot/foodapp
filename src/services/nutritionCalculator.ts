/**
 * Nutrition Calculator Service
 * Calculates daily calorie goals and macro targets based on user profile (age, weight, height, gender)
 * Assumes: Maintenance calories (sedentary lifestyle) for current weight maintenance
 */

export interface DailyNutritionGoals {
  calories: number;
  protein: number;      // grams
  carbs: number;        // grams
  fat: number;          // grams
  sugar: number;        // grams (recommended limit)
  sodium: number;       // mg (recommended limit)
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * More accurate than older methods
 * 
 * @param weight Weight in kg
 * @param height Height in cm
 * @param age Age in years
 * @param gender "male" or "female"
 * @returns BMR in calories/day
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string = "male"
): number {
  if (gender.toLowerCase() === "female") {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * For maintenance: assumes sedentary to lightly active lifestyle (1.2 - 1.375 activity factor)
 * 
 * @param bmr Basal Metabolic Rate
 * @param activityFactor Default 1.3 (light activity) - can adjust for more/less active
 * @returns TDEE in calories/day
 */
export function calculateTDEE(
  bmr: number,
  activityFactor: number = 1.3
): number {
  return Math.round(bmr * activityFactor);
}

/**
 * Calculate daily macro targets based on maintenance calories
 * Uses standard distribution:
 * - Protein: 30% of calories (0.8-1g per lb of body weight)
 * - Carbs: 45% of calories
 * - Fat: 25% of calories
 * 
 * @param maintenanceCalories Daily calorie goal
 * @param weight Weight in kg
 * @returns Object with daily macro targets
 */
export function calculateMacroTargets(
  maintenanceCalories: number,
  weight: number
): { protein: number; carbs: number; fat: number } {
  // Recommended daily sugar: 25-36g (WHO/American Heart Association)
  // Recommended daily sodium: 1500-2300mg (varies by health condition)

  const proteinCalories = maintenanceCalories * 0.30;
  const carbCalories = maintenanceCalories * 0.45;
  const fatCalories = maintenanceCalories * 0.25;

  return {
    protein: Math.round(proteinCalories / 4), // 4 cal/g
    carbs: Math.round(carbCalories / 4),      // 4 cal/g
    fat: Math.round(fatCalories / 9),         // 9 cal/g
  };
}

/**
 * Get complete daily nutrition goals for a user
 * This is the main function to call
 * 
 * @param weight Weight in kg
 * @param height Height in cm
 * @param age Age in years
 * @param gender "male" or "female" (default: "male")
 * @param hasHypertension If true, sodium limit is 1500mg; else 2300mg
 * @returns DailyNutritionGoals object
 */
export function calculateDailyNutritionGoals(
  weight: number,
  height: number,
  age: number,
  gender: string = "male",
  hasHypertension: boolean = false
): DailyNutritionGoals {
  
  // Step 1: Calculate BMR
  const bmr = calculateBMR(weight, height, age, gender);
  
  // Step 2: Calculate TDEE (maintenance calories)
  // Using 1.3 activity factor (sedentary to lightly active = maintenance)
  const maintenanceCalories = calculateTDEE(bmr, 1.3);
  
  // Step 3: Calculate macro targets
  const macros = calculateMacroTargets(maintenanceCalories, weight);
  
  // Step 4: Return complete goals
  return {
    calories: maintenanceCalories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    sugar: 30,  // WHO recommended: 25-36g (using conservative 30g)
    sodium: hasHypertension ? 1500 : 2300, // Lower for hypertension
  };
}

/**
 * Calculate BMI (Body Mass Index)
 * @param weight Weight in kg
 * @param height Height in cm
 * @returns BMI value rounded to 1 decimal
 */
export function calculateBMI(weight: number, height: number): number {
  const heightMeters = height / 100;
  return parseFloat((weight / (heightMeters * heightMeters)).toFixed(1));
}

/**
 * Get BMI category
 * @param bmi BMI value
 * @returns Category string
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
