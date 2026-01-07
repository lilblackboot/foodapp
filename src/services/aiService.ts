// src/services/aiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "");

export async function getFoodAnalysis(
  foodName: string,
  nutrients: any,
  ingredients: string,
  userProfile: any,
  ruleDecision: string
) {
  try {
    // Use the pinned stable model version
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 1. Context (Keep data precise, but ask for simple output)
    const conditions = userProfile.diseases && userProfile.diseases.length > 0 
      ? userProfile.diseases.join(", ") 
      : "None";
    
    const userContext = `User: Age ${userProfile.age}, BMI ${userProfile.bmi}, Conditions: ${conditions}`;
    
    const foodContext = `
    Food: ${foodName}
    Stats: Sugar ${nutrients.sugar}g, Sodium ${nutrients.sodium}mg, Fat ${nutrients.fat}g, Calories ${nutrients.calories}
    Ingredients: ${ingredients}
    `;

    // 2. The Simplified Prompt
    const prompt = `
    You are a helpful nutrition coach. Analyze this food for the user.
    
    INPUT:
    ${userContext}
    ${foodContext}
    System Flag: ${ruleDecision}

    INSTRUCTIONS:
    Explain the health effects in SIMPLE, EVERYDAY LANGUAGE (8th-grade reading level). 
    Avoid complex medical jargon. Keep it short and easy to scan.

    OUTPUT FORMAT (Use these 3 headings):

    ### 1. How it affects you
    - Explain simply how the Sugar, Salt, or Fat affects THIS specific user (e.g., "High sugar is risky for your Diabetes").
    - Mention if the calories are too high for their BMI.

    ### 2. What's inside?
    - Point out any bad additives or chemicals in simple terms.
    - Mention if ingredients are generally considered unsafe or unhealthy in India.

    ### 3. Verification & Advice
    - Give a clear verdict: Is it safe to eat daily, weekly, or rarely?
    - Suggest a quick tip (e.g., "Drink water with this" or "Eat only half").

    Keep the entire response under 150 words.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error("AI Error:", error);
    return "Could not generate analysis. Please check your internet.";
  }
}