import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { evaluateFood, EvaluationResult } from '../logic/RuleEngine';
import { getFoodAnalysis } from '../services/aiService';

// [NEW] Import the new helper and types
import { logFoodItem } from '../services/firebaseHelper';
import { FoodItem } from '../types';

export default function ScanResultScreen({ route, navigation }: any) {
  const { barcode } = route.params;
  
  // Steps: 'loading' -> 'input' (ask grams) -> 'result' (show analysis)
  const [step, setStep] = useState<'loading' | 'input' | 'result'>('loading');
  
  // Data State
  const [baseFood, setBaseFood] = useState<any>(null); // The raw 100g data
  const [food, setFood] = useState<any>(null);         // The calculated portion data
  const [portionSize, setPortionSize] = useState('100'); // User input string
  
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("Generating health insights...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  // 1. FETCH RAW DATA
  const fetchBaseData = async () => {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const apiData = await response.json();
      let foundData = null;

      if (apiData.status === 1) {
        const product = apiData.product;
        foundData = {
          name: product.product_name || "Unknown Food",
          brand: product.brands || "Generic",
          calories: product.nutriments?.['energy-kcal_100g'] || 0,
          sugar: product.nutriments?.sugars_100g || 0,
          sodium: (product.nutriments?.salt_100g || 0) * 400, 
          fat: product.nutriments?.fat_100g || 0,
          carbs: product.nutriments?.carbohydrates_100g || 0,
          protein: product.nutriments?.proteins_100g || 0,
          ingredients: product.ingredients_text || "Ingredients not listed",
          image: product.image_url,
          servingSize: product.serving_size || "100g" 
        };
        if (product.serving_quantity) {
            setPortionSize(product.serving_quantity.toString());
        }
      } else {
        const customDoc = await getDoc(doc(db, "custom_products", barcode));
        if (customDoc.exists()) {
          foundData = customDoc.data();
          if (!foundData.image) foundData.image = null; 
        }
      }

      if (!foundData) {
        Alert.alert("Product Not Found", "We don't have this item yet.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        return;
      }

      setBaseFood(foundData);
      setStep('input');
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error.");
      navigation.goBack();
    }
  };

  // 2. CALCULATE & ANALYZE
  const handleAnalyze = async () => {
    const grams = parseFloat(portionSize);
    if (!grams || grams <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid weight in grams.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const ratio = grams / 100;
      const calculatedFood = {
        ...baseFood,
        calories: baseFood.calories * ratio,
        sugar: baseFood.sugar * ratio,
        sodium: baseFood.sodium * ratio,
        fat: baseFood.fat * ratio,
        carbs: baseFood.carbs * ratio,
        protein: baseFood.protein * ratio,
        portionLogged: grams 
      };

      setFood(calculatedFood);

      const profileSnap = await getDoc(doc(db, "user_profiles", user.uid));
      const profileData = profileSnap.data();
      const today = new Date().toISOString().split('T')[0];
      const intakeSnap = await getDoc(doc(db, "daily_intake", `${user.uid}_${today}`));
      const intakeData = intakeSnap.exists() ? intakeSnap.data() : {};

      const decisionResult = evaluateFood(calculatedFood, profileData, intakeData); 
      setResult(decisionResult);
      setStep('result');

      const aiResponse = await getFoodAnalysis(
        calculatedFood.name,
        {
           sugar: calculatedFood.sugar, 
           sodium: calculatedFood.sodium, 
           fat: calculatedFood.fat,
           calories: calculatedFood.calories
        }, 
        calculatedFood.ingredients, 
        profileData, 
        decisionResult.decision 
      );
      setAiExplanation(aiResponse);

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. LOG FOOD (UPDATED TO USE HELPER)
  const logFood = async () => {
    try {
      if (!food) return;

      // Prepare the item strictly typed
      const itemToLog: FoodItem = {
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving_size: portionSize, // Storing what user typed (e.g. "150")
      };
      
      const todayDate = new Date().toISOString().split('T')[0];

      // Call the new helper function
      await logFoodItem(itemToLog, todayDate);

      Alert.alert("Logged!", `${Math.round(food.calories)} kcal added.`);
      
      // Navigate back to Home and it will auto-refresh
      navigation.navigate('Home'); 

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not log food.");
    }
  };

  if (step === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  // INPUT SCREEN
  if (step === 'input') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inputContainer}>
          <Text style={styles.title}>How much?</Text>
          <Text style={styles.subtitle}>{baseFood.name}</Text>
          <Text style={styles.brand}>{baseFood.brand}</Text>

          <View style={styles.inputBox}>
            <TextInput 
              style={styles.gramInput}
              value={portionSize}
              onChangeText={setPortionSize}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.unit}>grams</Text>
          </View>
          
          <Text style={styles.hint}>Standard serving: {baseFood.servingSize || "100g"}</Text>

          <TouchableOpacity style={styles.mainBtn} onPress={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <ActivityIndicator color="#000"/> : <Text style={styles.btnText}>Analyze Health Impact</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // RESULT SCREEN
  const statusColor = result?.decision === "SAFE" ? COLORS.success : 
                      result?.decision === "WARNING" ? COLORS.warning : COLORS.danger;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER CARD WITH MACROS GRID */}
        <View style={styles.card}>
          <Text style={styles.brand}>{food.brand}</Text>
          <Text style={styles.foodName}>{food.name}</Text>
          <Text style={{color:COLORS.textSecondary, marginBottom:16}}>
             Portion: {portionSize}g
          </Text>

          {/* MACRO GRID */}
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(food.calories)}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(food.sodium)}mg</Text>
              <Text style={styles.macroLabel}>Sodium</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(food.protein)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(food.carbs)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(food.fat)}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* DECISION BOX */}
        <View style={[styles.resultBox, { borderColor: statusColor }]}>
          <Text style={[styles.decisionText, { color: statusColor }]}>
            {result?.decision}
          </Text>
          
          <View style={styles.aiBox}>
            <Text style={styles.aiLabel}>✨ Smart Analysis</Text>
            <Text style={styles.aiText}>
              {aiExplanation !== "Generating health insights..." 
                ? aiExplanation 
                : (result?.reason || "Analyzing...") + "\n\n" + aiExplanation}
            </Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, { backgroundColor: statusColor }]} onPress={logFood}>
          <Text style={styles.btnText}>Eat & Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={{color: COLORS.textSecondary}}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SPACING.l, paddingBottom: 20 },

  // Input Styles
  inputContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  title: { fontSize: 32, color: COLORS.textPrimary, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 20, color: COLORS.primary, marginBottom: 4, textAlign: 'center' },
  inputBox: { flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginBottom: SPACING.l, marginTop: SPACING.xl },
  gramInput: { fontSize: 48, color: COLORS.textPrimary, fontWeight: 'bold', minWidth: 80, textAlign: 'center' },
  unit: { fontSize: 24, color: COLORS.textSecondary, marginLeft: 8 },
  hint: { color: COLORS.textSecondary, marginBottom: SPACING.xl },
  mainBtn: { backgroundColor: COLORS.primary, width: '100%', padding: SPACING.l, borderRadius: 16, alignItems: 'center' },

  // Result Styles
  card: { backgroundColor: COLORS.surface, padding: SPACING.l, borderRadius: 16, marginBottom: SPACING.l },
  brand: { color: COLORS.textSecondary, fontSize: 14, textTransform: 'uppercase' },
  foodName: { color: COLORS.textPrimary, fontSize: 28, fontWeight: FONTS.bold as any, marginBottom: SPACING.m },
  
  // New Grid Styles
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  macroItem: { 
    backgroundColor: '#1A1A1A', 
    width: '30%', // Fits 3 items per row roughly
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center',
    flexGrow: 1 
  },
  macroValue: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
  macroLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  resultBox: { borderWidth: 2, borderRadius: 16, padding: SPACING.l, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  decisionText: { fontSize: 32, fontWeight: 'bold', marginBottom: SPACING.m },
  aiBox: { marginTop: SPACING.s, backgroundColor: '#2A2A2A', padding: SPACING.m, borderRadius: 12, width: '100%' },
  aiLabel: { color: COLORS.secondary, fontWeight: 'bold', marginBottom: SPACING.s, fontSize: 14 },
  aiText: { color: '#E0E0E0', fontSize: 14, lineHeight: 22 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: SPACING.l, borderTopWidth: 1, borderTopColor: '#333' },
  button: { padding: SPACING.l, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  cancelBtn: { alignItems: 'center', padding: SPACING.m },
});