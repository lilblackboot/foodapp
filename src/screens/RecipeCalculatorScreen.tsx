import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { calculateRecipeNutrition, getAvailableIngredients } from '../services/recipeNutritionCalculator';

interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
}

export default function RecipeCalculatorScreen({ navigation }: any) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servings, setServings] = useState('1');
  const [calculating, setCalculating] = useState(false);
  const [nutrition, setNutrition] = useState<any>(null);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Get ingredient suggestions
  const handleIngredientChange = (text: string) => {
    setCurrentIngredient(text);
    if (text && text.length > 0) {
      try {
        const available = getAvailableIngredients();
        if (Array.isArray(available) && available.length > 0) {
          const filtered = available.filter(ing => 
            ing && typeof ing === 'string' && ing.toLowerCase().includes(text.toLowerCase())
          );
          setSuggestions(filtered.slice(0, 5));
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error("❌ Error getting suggestions:", error);
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const addIngredient = (ingredientName: string = currentIngredient, amount: string = currentAmount) => {
    if (!ingredientName || !ingredientName.trim() || !amount) {
      Alert.alert('Missing Info', 'Please enter ingredient name and amount');
      return;
    }

    const trimmedName = ingredientName.trim();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid weight in grams');
      return;
    }

    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      name: trimmedName,
      amount: amountNum
    };

    setIngredients([...ingredients, newIngredient]);
    setCurrentIngredient('');
    setCurrentAmount('');
    setShowSuggestions(false);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const handleCalculate = async () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Add at least one ingredient');
      return;
    }

    setCalculating(true);
    try {
      const servingsNum = parseInt(servings) || 1;
      const result = await calculateRecipeNutrition(
        ingredients.map(ing => ({ name: ing.name, amount: ing.amount })),
        servingsNum
      );
      setNutrition(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate nutrition');
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  const handleLogRecipe = () => {
    if (!nutrition) return;
    
    // Pass recipe data to ScanResult screen for logging
    navigation.navigate('ScanResult', {
      fromRecipe: true,
      recipeName: 'Homemade Recipe',
      recipeNutrition: nutrition.perServing,
      recipeBreakdown: nutrition.breakdown
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Recipe Calculator</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Ingredient Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Ingredients</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.ingredientInput}
              placeholder="Ingredient name"
              placeholderTextColor={COLORS.textSecondary}
              value={currentIngredient}
              onChangeText={handleIngredientChange}
            />
            <TextInput
              style={styles.amountInput}
              placeholder="grams"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={currentAmount}
              onChangeText={setCurrentAmount}
            />
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => addIngredient()}
            >
              <MaterialIcons name="add" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((sugg, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setCurrentIngredient(sugg);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{sugg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Ingredients List */}
        {ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients ({ingredients.length})</Text>
            {ingredients.map(ing => (
              <View key={ing.id} style={styles.ingredientCard}>
                <View>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientAmount}>{ing.amount}g</Text>
                </View>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                  <MaterialIcons name="delete" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Servings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servings</Text>
          <View style={styles.servingsInput}>
            <TouchableOpacity 
              onPress={() => setServings(Math.max(1, parseInt(servings) - 1).toString())}
              style={styles.servingsBtn}
            >
              <Text style={styles.servingsBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.servingsValue}
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              maxLength={2}
            />
            <TouchableOpacity 
              onPress={() => setServings((parseInt(servings) + 1).toString())}
              style={styles.servingsBtn}
            >
              <Text style={styles.servingsBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity 
          style={styles.calculateBtn}
          onPress={handleCalculate}
          disabled={calculating || ingredients.length === 0}
        >
          {calculating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.calculateBtnText}>Calculate Nutrition</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {nutrition && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Nutrition Summary</Text>
            
            {/* Per Serving */}
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Per Serving</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{Math.round(nutrition.perServing.calories)}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{nutrition.perServing.protein.toFixed(1)}</Text>
                  <Text style={styles.nutritionLabel}>Protein (g)</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{nutrition.perServing.carbs.toFixed(1)}</Text>
                  <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{nutrition.perServing.fat.toFixed(1)}</Text>
                  <Text style={styles.nutritionLabel}>Fat (g)</Text>
                </View>
              </View>
            </View>

            {/* Log Button */}
            <TouchableOpacity 
              style={styles.logBtn}
              onPress={handleLogRecipe}
            >
              <Text style={styles.logBtnText}>Log This Recipe</Text>
            </TouchableOpacity>

            {/* Failed Ingredients Warning */}
            {nutrition.failedIngredients.length > 0 && (
              <View style={styles.warningBox}>
                <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Could not find: {nutrition.failedIngredients.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.xl 
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: 'bold' },
  
  section: { marginBottom: SPACING.xl },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.m },
  
  inputRow: { 
    flexDirection: 'row', 
    gap: SPACING.m,
    alignItems: 'center'
  },
  ingredientInput: { 
    flex: 1,
    backgroundColor: COLORS.surface, 
    color: COLORS.textPrimary, 
    padding: SPACING.m, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  amountInput: { 
    width: 80,
    backgroundColor: COLORS.surface, 
    color: COLORS.textPrimary, 
    padding: SPACING.m, 
    borderRadius: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  addBtn: { 
    backgroundColor: COLORS.primary, 
    padding: SPACING.m, 
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  suggestions: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: SPACING.s,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden'
  },
  suggestionItem: {
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  suggestionText: { color: COLORS.primary },
  
  ingredientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.s,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  ingredientName: { color: COLORS.textPrimary, fontWeight: 'bold', marginBottom: 4 },
  ingredientAmount: { color: COLORS.textSecondary, fontSize: 12 },
  
  servingsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m
  },
  servingsBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  servingsBtnText: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  servingsValue: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    padding: SPACING.m,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  
  calculateBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.l,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.xl
  },
  calculateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  
  resultsSection: { marginTop: SPACING.xl },
  resultCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: '#333'
  },
  resultTitle: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold', marginBottom: SPACING.m },
  
  nutritionGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: SPACING.m
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    padding: SPACING.m,
    borderRadius: 8,
    alignItems: 'center'
  },
  nutritionValue: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  nutritionLabel: { color: COLORS.textSecondary, fontSize: 11 },
  
  logBtn: {
    backgroundColor: COLORS.secondary,
    padding: SPACING.l,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.m
  },
  logBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: SPACING.m,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning
  },
  warningText: { color: COLORS.textSecondary, flex: 1 }
});
