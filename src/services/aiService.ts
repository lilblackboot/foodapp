// src/services/aiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "");

export type OverallTag = "safe" | "low risk" | "moderate risk" | "high risk";
export type AdditiveRisk = "Low" | "Medium" | "High";

export interface AdditiveRiskAnalysisItem {
  additive: string;
  risk: AdditiveRisk;
  // Short description about what it means for the user to consume it.
  consumingDescription: string;
}

export type NutritionalRisk = "Low" | "Adequate" | "High";

export interface NutritionalRiskAnalysisItem {
  nutrient: string;
  amount: string;
  risk: NutritionalRisk;
  consumingDescription: string;
}

export interface FoodAnalysisResponse {
  overallTag: OverallTag;
  overallSummary: string;
  additiveRiskAnalysis: AdditiveRiskAnalysisItem[];
  nutritionalRiskAnalysis?: NutritionalRiskAnalysisItem[];
  // Only present when overallTag is not "high risk".
  safePortion: { servingText: string; note?: string } | null;
}

function safeToArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
  }
  const asString = String(input);
  return asString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractJsonObject(text: string): any | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// Robust fallback engine to cycle through models in case of 503 / 429 errors
async function generateContentWithFallback(prompt: string, modelsToTry: string[], tools?: any[]) {
  let lastError: any;

  for (const modelName of modelsToTry) {
    try {
      const config: any = { model: modelName };
      if (tools) {
        config.tools = tools;
      }

      const model = genAI.getGenerativeModel(config);
      console.log(`[AI Fallback] Attempting model: ${modelName}`);

      const result = await model.generateContent(prompt);
      return result; // If successful, return instantly to escape the loop

    } catch (error: any) {
      lastError = error;
      console.warn(`[AI Fallback] Model ${modelName} failed:`, error?.message || error);
      // Wait roughly 1 sec before hammering the API on the next model
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // If it completely exhausted the list without returning
  throw new Error(`All fallback models failed. Last Error: ${lastError?.message || String(lastError)}`);
}

export async function getFoodAnalysis(params: {
  ingredients: string[] | string;
  additives: string[] | string;
  nutrients: {
    sugar?: number;
    sodium?: number;
    fat?: number;
    calories?: number;
    [key: string]: any;
  };
  userContext: any;
  foodName?: string;
}): Promise<FoodAnalysisResponse> {
  const { ingredients, additives, nutrients, userContext, foodName } = params;

  try {
    // We prioritize 3.1 pro (paid tier), fallback to variants that share the same free tier caps
    const FALLBACK_MODELS = [
      "gemini-3.1-pro-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash"
    ];

    const ingredientsArr = safeToArray(ingredients);
    const additivesArr = safeToArray(additives);

    const conditions = safeToArray(userContext?.diseases).join(", ") || "None";
    const allergies = safeToArray(userContext?.allergies).join(", ") || "None";
    const goals = safeToArray(userContext?.healthGoals).join(", ") || "None";

    const userProfileBlock = {
      age: userContext?.age ?? "Unknown",
      gender: userContext?.gender ?? "Unknown",
      bmi: userContext?.bmi ?? "Unknown",
      activityLevel: userContext?.activityLevel ?? "Unknown",
      dietPattern: userContext?.diet?.pattern ?? "Unknown",
      conditions,
      allergies,
      medicationOn: userContext?.medication?.onMedication ?? "Unknown",
      medicationCategories: safeToArray(userContext?.medication?.categories).join(", ") || "None",
      goals,
    };

    const prompt = `
You are NutriWise, a safety-focused nutrition coach.
Return ONLY valid JSON (no markdown, no code block, no surrounding text).

INPUT
FoodName: ${foodName ?? "Unknown food"}
Nutrients (per chosen serving): ${JSON.stringify(nutrients)}
Ingredients (if available): ${JSON.stringify(ingredientsArr.slice(0, 30))}
Known Additives (if any): ${JSON.stringify(additivesArr.slice(0, 15))}
UserContext: ${JSON.stringify(userProfileBlock)}

TASK
1) Identify any food additives, preservatives, or artificial colors from the "Ingredients" list or "Known Additives".
   For each identified additive, provide:
   - "additive": Name of the additive (e.g., "Citric Acid", "INS 635", "Red 40").
   - "risk": one of "Low" | "Medium" | "High"
   - "consumingDescription": short (<= 20 words) user-specific note about what it could mean to consume.

2) For the primary "Nutrients" provided (Sugar, Sodium, Fat, Calories, Protein, etc.), provide a nutritional risk assessment considering the UserContext.
   For each nutrient, provide:
   - "nutrient": Name of the nutrient (e.g., "Sugar", "Sodium").
   - "amount": The quantitative amount from the input data.
   - "risk": one of "Low" | "Adequate" | "High".
   - "consumingDescription": short (<= 20 words) rationale (e.g., "High sodium is dangerous for your hypertension.").

3) Provide "overallSummary": short (<= 35 words) on how the product could affect the user.

4) Provide "overallTag": one of "safe" | "low risk" | "moderate risk" | "high risk"

   Use:
   - "high risk" if any additive or nutrient is High risk OR the product likely conflicts strongly with conditions/allergies.
   - "moderate risk" if there are Medium additives or mildly elevated nutrients for the user.
   - "low risk" if additives are mostly Low and nutrients look generally Okay/Adequate.
   - "safe" only if everything looks Low-safe for the user.

5) "safePortion":
   - If overallTag is NOT "high risk", set safePortion to an object with:
     - "servingText": safe portion to eat, e.g., "1 cup / serving", "1 bowl / serving", or "100 g / serving"
     - "note" (optional): <= 20 words.
   - If overallTag is "high risk", set safePortion to null.

RESPONSE SHAPE
{
  "overallTag": "safe" | "low risk" | "moderate risk" | "high risk",
  "overallSummary": string,
  "additiveRiskAnalysis": [
     { "additive": string, "risk": "Low"|"Medium"|"High", "consumingDescription": string }
  ],
  "nutritionalRiskAnalysis": [
     { "nutrient": string, "amount": string, "risk": "Low"|"Adequate"|"High", "consumingDescription": string }
  ],
  "safePortion": { "servingText": string, "note"?: string } | null
}
`;

    const result = await generateContentWithFallback(prompt, FALLBACK_MODELS);
    const response = await result.response;
    const text = response.text();

    const parsed = extractJsonObject(text);
    if (!parsed) {
      // Minimal fallback so UI never crashes.
      return {
        overallTag: "low risk",
        overallSummary: "Analysis is temporarily unavailable. Please review ingredients and portion sizes.",
        additiveRiskAnalysis: [
          {
            additive: "Unknown additives (estimated)",
            risk: "Medium",
            consumingDescription: "Processed food likely contains preservatives or flavor enhancers."
          }
        ],
        nutritionalRiskAnalysis: [],
        safePortion: {
          servingText: "1 serving",
          note: "Start with a smaller portion if you are sensitive.",
        },
      };
    }

    // Soft validation / coercion
    const overallTag: OverallTag =
      parsed.overallTag === "safe" ||
        parsed.overallTag === "low risk" ||
        parsed.overallTag === "moderate risk" ||
        parsed.overallTag === "high risk"
        ? parsed.overallTag
        : "low risk";

    const additiveRiskAnalysis: AdditiveRiskAnalysisItem[] = Array.isArray(parsed.additiveRiskAnalysis)
      ? parsed.additiveRiskAnalysis
        .slice(0, 20)
        .map((x: any) => ({
          additive: String(x?.additive ?? ""),
          risk: x?.risk === "High" ? "High" : x?.risk === "Medium" ? "Medium" : "Low",
          consumingDescription: String(x?.consumingDescription ?? "").trim() || "Minor concern for most people.",
        }))
        .filter((x: any) => x.additive.length > 0)
      : [];

    const nutritionalRiskAnalysis: NutritionalRiskAnalysisItem[] = Array.isArray(parsed.nutritionalRiskAnalysis)
      ? parsed.nutritionalRiskAnalysis
        .slice(0, 10)
        .map((x: any) => ({
          nutrient: String(x?.nutrient ?? ""),
          amount: String(x?.amount ?? ""),
          risk: x?.risk === "High" ? "High" : x?.risk === "Adequate" ? "Adequate" : "Low",
          consumingDescription: String(x?.consumingDescription ?? "").trim() || "Generally safe.",
        }))
        .filter((x: any) => x.nutrient.length > 0)
      : [];

    const safePortion =
      overallTag === "high risk"
        ? null
        : parsed.safePortion && typeof parsed.safePortion === "object"
          ? {
            servingText: String(parsed.safePortion.servingText ?? "1 serving"),
            note: parsed.safePortion.note ? String(parsed.safePortion.note) : undefined,
          }
          : {
            servingText: "1 serving",
          };

    return {
      overallTag,
      overallSummary: String(parsed.overallSummary ?? "").trim() || "General guidance based on your profile.",
      additiveRiskAnalysis,
      nutritionalRiskAnalysis,
      safePortion,
    };
  } catch (error) {
    console.error("AI Error:", error);
    return {
      overallTag: "low risk",
      overallSummary: "Could not generate analysis. Please check your internet connection and try again.",
      additiveRiskAnalysis: safeToArray(additives).map((a) => ({
        additive: a,
        risk: "Low",
        consumingDescription: "Analysis unavailable; consider limiting processed foods and additives.",
      })),
      nutritionalRiskAnalysis: [],
      safePortion: {
        servingText: "1 serving",
        note: "If you are sensitive, try a smaller portion first.",
      },
    };
  }
}

export interface FallbackProductResponse {
  name: string;
  brand: string;
  image: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  sodium: number;
  serving_size: string;
  ingredients: string;
  additives?: string[];
}

export async function findProductByBarcodeFallback(barcode: string): Promise<FallbackProductResponse | null> {
  try {
    // Models listed that uniquely support Google Search Grounding natively:
    const BARCODE_FALLBACK_MODELS = [
      "gemini-3.1-pro-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash"
    ];

    const searchTools = [
      {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3,
          },
        },
      } as any,
    ];
    const prompt = `
You are a highly capable nutrition and product research assistant.
Your task is to find the extremely accurate nutritional details of a grocery product based mostly on its barcode.
Follow this 2-step process mentally:
1. Search the web using the barcode "${barcode}" to find out the exact Product Name and Brand. If you can't find it, guess the closest likely product if it corresponds to an EAN/UPC but prioritize real Indian grocery sites like Blinkit, BigBasket, Swiggy Instamart, Zepto.
2. Once you have the exact product name, perform a detailed search to find its precise nutritional info per 100g (or the standard serving size listed) and its primary ingredients. Also, locate a direct image URL (jpg/png) for this product from an e-commerce site.

Return ONLY a valid JSON object (no markdown, no surrounding text) with the following exact keys:
{
  "name": "Exact Name of the Product",
  "brand": "Brand Name",
  "image": "https://direct-url-to-image.jpg or null",
  "calories": number (in kcal per 100g or per serving size),
  "protein": number (in grams),
  "carbs": number (in grams),
  "fat": number (in grams),
  "sugar": number (in grams),
  "sodium": number (in mg),
  "serving_size": "100g or the retrieved serving size string",
  "ingredients": "Comma separated string of ingredients. E.g. 'Wheat, Sugar, Salt...'",
  "additives": ["Array of strings", "List ANY possible additives, preservatives, INS codes, artificial colors, flavors EVEN IF YOU HAVE TO INFER BASED ON PRODUCT TYPE"]
}

Ensure numeric fields like calories, protein, carbs, fat, sugar, and sodium only contain the number (e.g., 250). Provide 0 if a nutrient is definitively zero.
`;

    const result = await generateContentWithFallback(prompt, BARCODE_FALLBACK_MODELS, searchTools);
    const text = result.response.text();

    // Minimal JSON extraction
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    const candidate = text.slice(firstBrace, lastBrace + 1);

    const parsed = JSON.parse(candidate) as Partial<FallbackProductResponse>;
    if (!parsed || !parsed.name) return null;

    return {
      name: parsed.name || "Unknown Product",
      brand: parsed.brand || "Generic",
      image: parsed.image || null,
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
      sugar: Number(parsed.sugar) || 0,
      sodium: Number(parsed.sodium) || 0,
      serving_size: parsed.serving_size ? String(parsed.serving_size) : "100g",
      ingredients: parsed.ingredients ? String(parsed.ingredients) : "Ingredients not listed",
      additives: Array.isArray(parsed.additives) ? parsed.additives : [],
    };
  } catch (error) {
    console.error("Error in findProductByBarcodeFallback:", error);
    return null;
  }
}
