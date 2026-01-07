// src/logic/RuleEngine.ts

// 1. Define Standard Limits (Fallbacks)
const DEFAULT_LIMITS = {
  sugar: 30, // grams/day
  sodium: 2300, // mg/day
  fat: 70, // grams/day
  calories: 2000,
};

// 2. The Decision Types
export type Decision = "SAFE" | "WARNING" | "AVOID";

export interface EvaluationResult {
  decision: Decision;
  reason: string;
  limitingFactor?: string; // e.g., "Sugar"
}

// 3. The Core Logic Function
export function evaluateFood(
  food: any,
  userProfile: any,
  dailyIntake: any
): EvaluationResult {
  
  // A. Disease Checks (Critical Health Rules) [cite: 26]
  const diseases = userProfile?.diseases || [];
  
  // Diabetes Rule
  if (diseases.includes("Diabetes") && food.sugar > 10) {
    return {
      decision: "AVOID",
      reason: "Sugar content (10g+) is unsafe for Diabetes.",
      limitingFactor: "Sugar"
    };
  }

  // Hypertension Rule
  if (diseases.includes("Hypertension") && food.sodium > 400) {
    return {
      decision: "WARNING",
      reason: "High sodium content for Hypertension.",
      limitingFactor: "Sodium"
    };
  }

  // B. Daily Limit Calculations [cite: 96-104]
  // Calculate remaining allowances
  const sugarLimit = userProfile?.customLimits?.sugar || DEFAULT_LIMITS.sugar;
  const sugarLeft = sugarLimit - (dailyIntake?.sugar || 0);

  // Rule: If this food blows your budget -> AVOID
  if (food.sugar > sugarLeft) {
    return {
      decision: "AVOID",
      reason: `Exceeds your remaining sugar for the day (${sugarLeft}g left).`,
      limitingFactor: "Sugar"
    };
  }

  // Rule: If this food uses up > 80% of your daily limit -> WARNING
  if ((dailyIntake?.sugar || 0) + food.sugar > (sugarLimit * 0.8)) {
    return {
      decision: "WARNING",
      reason: "This will push you close to your daily sugar limit.",
      limitingFactor: "Sugar"
    };
  }

  // C. Default Safe
  return {
    decision: "SAFE",
    reason: "Fits within your daily goals.",
  };
}