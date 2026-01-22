import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { COLORS, SPACING } from '../constants/theme';
import { calculateRecipeNutrition, getAvailableIngredients } from '../services/recipeNutritionCalculator';
import { saveRecipe, getSavedRecipes, deleteRecipe } from '../services/recipeService';

interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: 'grams' | 'quantity' | 'liters'; // grams for weight, quantity for items like eggs, liters for liquids
}

export default function RecipeCalculatorScreen({ navigation }: any) {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servings, setServings] = useState('1');
  const [calculating, setCalculating] = useState(false);
  const [nutrition, setNutrition] = useState<any>(null);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currentUnit, setCurrentUnit] = useState<'grams' | 'quantity' | 'liters'>('grams');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  
  // Recipe saving/loading states
  const [recipeName, setRecipeName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [saveModalRecipeName, setSaveModalRecipeName] = useState('');

  // Load saved recipes on mount
  useEffect(() => {
    if (userId) {
      loadSavedRecipes();
    }
  }, [userId]);

  const loadSavedRecipes = async () => {
    if (!userId) return;
    try {
      const recipes = await getSavedRecipes(userId);
      setSavedRecipes(recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load saved recipes');
    }
  };

  const handleSaveRecipe = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!saveModalRecipeName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a recipe name');
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Add at least one ingredient before saving');
      return;
    }

    if (!nutrition) {
      Alert.alert('No Nutrition Data', 'Calculate nutrition first before saving');
      return;
    }

    try {
      const recipeData = {
        name: saveModalRecipeName.trim(),
        ingredients,
        servings: parseInt(servings),
        nutrition,
        createdAt: new Date().toISOString()
      };

      await saveRecipe(userId, recipeData);
      Alert.alert('Success', 'Recipe saved successfully!');
      setShowSaveModal(false);
      setSaveModalRecipeName('');
      loadSavedRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const handleLoadRecipe = async (recipe: any) => {
    try {
      setIngredients(recipe.ingredients);
      setServings(recipe.servings.toString());
      setNutrition(recipe.nutrition);
      setRecipeName(recipe.name);
      setShowLoadModal(false);
      Alert.alert('Success', `Recipe "${recipe.name}" loaded!`);
    } catch (error) {
      console.error('Error loading recipe:', error);
      Alert.alert('Error', 'Failed to load recipe');
    }
  };

  const handleDeleteRecipe = async (recipeId: string, recipeName: string) => {
    if (!userId) return;

    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipeName}"?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteRecipe(userId, recipeId);
              Alert.alert('Success', 'Recipe deleted!');
              loadSavedRecipes();
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

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

  const addIngredient = (ingredientName: string = currentIngredient, amount: string = currentAmount, unit: 'grams' | 'quantity' | 'liters' = currentUnit) => {
    if (!ingredientName || !ingredientName.trim() || !amount) {
      Alert.alert('Missing Info', 'Please enter ingredient name and amount');
      return;
    }

    const trimmedName = ingredientName.trim();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      name: trimmedName,
      amount: amountNum,
      unit: unit
    };

    setIngredients([...ingredients, newIngredient]);
    setCurrentIngredient('');
    setCurrentAmount('');
    setCurrentUnit('grams');
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
        ingredients.map(ing => ({ name: ing.name, amount: ing.amount, unit: ing.unit })),
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
    
    // Use the recipe name or default to "Homemade Recipe"
    const nameToUse = recipeName.trim() || 'Homemade Recipe';
    
    // Pass recipe data to ScanResult screen for logging
    navigation.navigate('ScanResult', {
      fromRecipe: true,
      recipeName: nameToUse,
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

        {/* Recipe Name Input & Save/Load Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipe Name</Text>
          <View style={styles.recipeNameRow}>
            <TextInput
              style={styles.recipeNameInput}
              placeholder="Enter recipe name"
              placeholderTextColor={COLORS.textSecondary}
              value={recipeName}
              onChangeText={setRecipeName}
            />
            <TouchableOpacity
              style={styles.loadRecipeBtn}
              onPress={() => setShowLoadModal(true)}
            >
              <MaterialIcons name="folder-open" size={20} color="#000" />
              <Text style={styles.btnLabel}>Load</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveRecipeBtn}
              onPress={() => {
                setSaveModalRecipeName(recipeName);
                setShowSaveModal(true);
              }}
              disabled={!nutrition || ingredients.length === 0}
            >
              <MaterialIcons name="save" size={20} color="#000" />
              <Text style={styles.btnLabel}>Save</Text>
            </TouchableOpacity>
          </View>
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
              placeholder="Amount"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              value={currentAmount}
              onChangeText={setCurrentAmount}
            />
            
            {/* Unit Dropdown */}
            <View style={styles.unitDropdownContainer}>
              <TouchableOpacity
                style={styles.unitDropdownBtn}
                onPress={() => setShowUnitDropdown(!showUnitDropdown)}
              >
                <Text style={styles.unitDropdownText}>
                  {currentUnit === 'grams' ? 'g' : currentUnit === 'quantity' ? 'qty' : 'L'}
                </Text>
                <MaterialIcons 
                  name={showUnitDropdown ? "arrow-drop-up" : "arrow-drop-down"} 
                  size={24} 
                  color={COLORS.primary} 
                />
              </TouchableOpacity>
              
              {showUnitDropdown && (
                <View style={styles.unitDropdownMenu}>
                  <TouchableOpacity
                    style={styles.unitDropdownItem}
                    onPress={() => {
                      setCurrentUnit('grams');
                      setShowUnitDropdown(false);
                    }}
                  >
                    <Text style={styles.unitDropdownItemText}>Grams (g)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unitDropdownItem}
                    onPress={() => {
                      setCurrentUnit('quantity');
                      setShowUnitDropdown(false);
                    }}
                  >
                    <Text style={styles.unitDropdownItemText}>Quantity (qty)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unitDropdownItem}
                    onPress={() => {
                      setCurrentUnit('liters');
                      setShowUnitDropdown(false);
                    }}
                  >
                    <Text style={styles.unitDropdownItemText}>Liters (L)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
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
                    setShowUnitDropdown(false);
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
                  <Text style={styles.ingredientAmount}>
                    {ing.amount} {ing.unit === 'grams' ? 'g' : ing.unit === 'quantity' ? 'qty' : 'L'}
                  </Text>
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

      {/* Save Recipe Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Recipe</Text>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Recipe Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter recipe name"
                placeholderTextColor={COLORS.textSecondary}
                value={saveModalRecipeName}
                onChangeText={setSaveModalRecipeName}
              />

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveRecipe}
              >
                <Text style={styles.modalConfirmText}>Save Recipe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Load Recipe Modal */}
      <Modal
        visible={showLoadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLoadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Load Recipe</Text>
              <TouchableOpacity onPress={() => setShowLoadModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {loadingRecipes ? (
                <ActivityIndicator color={COLORS.primary} size="large" />
              ) : savedRecipes.length === 0 ? (
                <Text style={styles.emptyText}>No saved recipes yet</Text>
              ) : (
                <FlatList
                  data={savedRecipes}
                  keyExtractor={item => item.id || ''}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.recipeItem}>
                      <View style={styles.recipeInfo}>
                        <Text style={styles.recipeName}>{item.name}</Text>
                        <Text style={styles.recipeStats}>
                          {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''} • {item.servings} servings
                        </Text>
                        <Text style={styles.recipeCalories}>
                          {Math.round(item.nutrition.perServing.calories)} cal/serving
                        </Text>
                      </View>
                      <View style={styles.recipeActions}>
                        <TouchableOpacity
                          style={styles.loadBtn}
                          onPress={() => handleLoadRecipe(item)}
                        >
                          <MaterialIcons name="check" size={20} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteRecipe(item.id, item.name)}
                        >
                          <MaterialIcons name="delete" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  
  recipeNameRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    alignItems: 'center'
  },
  recipeNameInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  loadRecipeBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.s
  },
  saveRecipeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.s,
    opacity: 0.8
  },
  btnLabel: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12
  },
  
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

  // Unit Dropdown Styles
  unitDropdownContainer: {
    position: 'relative',
    width: 70
  },
  unitDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    height: 50
  },
  unitDropdownText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4
  },
  unitDropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1000
  },
  unitDropdownItem: {
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  unitDropdownItemText: {
    color: COLORS.textPrimary,
    fontSize: 13
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
  warningText: { color: COLORS.textSecondary, flex: 1 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: SPACING.l
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold'
  },
  modalBody: {
    padding: SPACING.l,
    gap: SPACING.m
  },
  modalLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.s
  },
  modalInput: {
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: SPACING.m
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.l,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.m
  },
  modalConfirmText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    padding: SPACING.l,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 16
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xl,
    fontSize: 16
  },
  recipeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.m,
    borderRadius: 12,
    marginBottom: SPACING.m,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  recipeInfo: {
    flex: 1
  },
  recipeName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.s
  },
  recipeStats: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: SPACING.s
  },
  recipeCalories: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600'
  },
  recipeActions: {
    flexDirection: 'row',
    gap: SPACING.m
  },
  loadBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    padding: SPACING.m,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
