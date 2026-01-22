import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert, ListRenderItem, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; 
import { getFoodsByDate, deleteFoodItem, updateFoodServing } from '../services/firebaseHelper';
import { getSavedRecipes } from '../services/recipeService';
import { FoodItem } from '../types';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { getAuth } from 'firebase/auth';

interface FoodListProps {
  currentDate: string;
  refreshTrigger: number | boolean;
  onUpdate?: () => void;
  navigation?: any;
}

const FoodList: React.FC<FoodListProps> = ({ currentDate, refreshTrigger, onUpdate, navigation }) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [newServing, setNewServing] = useState('');
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipeForServing, setSelectedRecipeForServing] = useState<any>(null);
  const [servingInput, setServingInput] = useState('');

  useEffect(() => {
    loadFoods();
  }, [currentDate, refreshTrigger]);

  const loadFoods = async () => {
    try {
      const data = await getFoodsByDate(currentDate);
      setFoods(data);
    } catch (e) {
      console.error("Failed to load foods", e);
    }
  };

  const handleDelete = (item: FoodItem) => {
    if (!item.id) return;
    Alert.alert("Delete Item", `Remove ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await deleteFoodItem(item.id!, currentDate, item);
          loadFoods();
          if (onUpdate) onUpdate();
        } 
      }
    ]);
  };

  const openEdit = (item: FoodItem) => {
    setSelectedFood(item);
    setNewServing(item.serving_size ? item.serving_size.toString() : '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (selectedFood && selectedFood.id && newServing) {
      await updateFoodServing(selectedFood.id, currentDate, selectedFood, newServing);
      setEditModalVisible(false);
      loadFoods();
      if (onUpdate) onUpdate();
    }
  };

  const loadSavedRecipes = async () => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    
    setLoadingRecipes(true);
    try {
      const recipes = await getSavedRecipes(auth.currentUser.uid);
      setSavedRecipes(recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load saved recipes');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleLogRecipe = (recipe: any) => {
    setSelectedRecipeForServing(recipe);
    setServingInput(recipe.servings.toString());
  };

  const confirmLogRecipe = () => {
    if (!navigation || !selectedRecipeForServing) return;
    
    const customServing = parseFloat(servingInput) || selectedRecipeForServing.servings;
    const servingMultiplier = customServing / selectedRecipeForServing.servings;
    
    // Adjust nutrition based on serving size
    const adjustedNutrition = {
      ...selectedRecipeForServing.nutrition.perServing,
      calories: selectedRecipeForServing.nutrition.perServing.calories * servingMultiplier,
      protein: selectedRecipeForServing.nutrition.perServing.protein * servingMultiplier,
      carbs: selectedRecipeForServing.nutrition.perServing.carbs * servingMultiplier,
      fat: selectedRecipeForServing.nutrition.perServing.fat * servingMultiplier,
      sugar: selectedRecipeForServing.nutrition.perServing.sugar * servingMultiplier,
      sodium: selectedRecipeForServing.nutrition.perServing.sodium * servingMultiplier
    };
    
    // Navigate to ScanResult with adjusted recipe data
    navigation.navigate('Scan', { 
      screen: 'ScanResult', 
      params: {
        fromRecipe: true,
        recipeName: `${selectedRecipeForServing.name} (${customServing} servings)`,
        recipeNutrition: adjustedNutrition,
        recipeBreakdown: selectedRecipeForServing.nutrition.breakdown
      }
    });
    setSelectedRecipeForServing(null);
    setServingInput('');
    setRecipeModalVisible(false);
  };

  const renderItem: ListRenderItem<FoodItem> = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.iconBox}>
        <Ionicons name="fast-food-outline" size={20} color={COLORS.primary} />
      </View>
      
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemSub}>{Math.round(item.calories)} kcal • {item.serving_size}g</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Ionicons name="pencil" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, { marginLeft: 8 }]}>
          <Ionicons name="trash-outline" size={18} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Eaten Today</Text>
        <TouchableOpacity 
          style={styles.recipeBtn}
          onPress={() => {
            loadSavedRecipes();
            setRecipeModalVisible(true);
          }}
        >
          <MaterialIcons name="restaurant-menu" size={20} color="#000" />
          <Text style={styles.recipeBtnText}>Add logs</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList 
        data={foods} 
        renderItem={renderItem} 
        keyExtractor={(item) => item.id || Math.random().toString()} 
        scrollEnabled={false} 
        ListEmptyComponent={
          <Text style={styles.emptyText}>No food logged today.</Text>
        }
      />

      {/* Dark Theme Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Portion</Text>
            <Text style={styles.modalSub}>{selectedFood?.name}</Text>
            
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={newServing} 
                onChangeText={setNewServing} 
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.unitText}>grams</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveTxt}>Update Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recipe Modal */}
      <Modal visible={recipeModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.recipeModalCard}>
            <View style={styles.recipeModalHeader}>
              <Text style={styles.recipeModalTitle}>Saved Recipes</Text>
              <TouchableOpacity onPress={() => setRecipeModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.recipeModalBody}>
              {loadingRecipes ? (
                <ActivityIndicator color={COLORS.primary} size="large" />
              ) : savedRecipes.length === 0 ? (
                <View style={styles.emptyRecipeContainer}>
                  <Text style={styles.emptyRecipeText}>No saved recipes yet</Text>
                  <TouchableOpacity 
                    style={styles.createRecipeBtn}
                    onPress={() => {
                      setRecipeModalVisible(false);
                      navigation.navigate('Scan', { screen: 'RecipeCalculator' });
                    }}
                  >
                    <MaterialIcons name="add" size={20} color="#000" />
                    <Text style={styles.createRecipeBtnText}>Create Recipe</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.createNewRecipeBtn}
                    onPress={() => {
                      setRecipeModalVisible(false);
                      navigation.navigate('Scan', { screen: 'RecipeCalculator' });
                    }}
                  >
                    <MaterialIcons name="add" size={20} color="#000" />
                    <Text style={styles.createNewRecipeBtnText}>Create New Recipe</Text>
                  </TouchableOpacity>
                  
                  <FlatList 
                    data={savedRecipes}
                    keyExtractor={(item) => item.id || ''}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.recipeItem}
                        onPress={() => handleLogRecipe(item)}
                      >
                        <View style={styles.recipeInfo}>
                          <Text style={styles.recipeName}>{item.name}</Text>
                          <Text style={styles.recipeStats}>
                            {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''} • {item.servings} servings
                          </Text>
                          <Text style={styles.recipeCalories}>
                            {Math.round(item.nutrition.perServing.calories)} cal/serving
                          </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Serving Size Modal */}
      <Modal visible={!!selectedRecipeForServing} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Serving Size</Text>
            <Text style={styles.modalSub}>{selectedRecipeForServing?.name}</Text>
            
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={servingInput}
                onChangeText={setServingInput}
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.unitText}>servings</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setSelectedRecipeForServing(null);
                setServingInput('');
              }}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={confirmLogRecipe}>
                <Text style={styles.saveTxt}>Log Recipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary 
  },
  recipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    gap: SPACING.s
  },
  recipeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10
  },
  itemContainer: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.surface, // Dark background
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 10, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333' // Subtle border matching other cards
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary 
  },
  itemSub: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    marginTop: 4 
  },
  actions: { flexDirection: 'row' },
  actionBtn: { 
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  modalBg: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalCard: { 
    width: '85%', 
    backgroundColor: '#1E1E1E', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  modalSub: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 20
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary
  },
  input: { 
    fontSize: 32, 
    color: COLORS.textPrimary, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    minWidth: 80,
    paddingBottom: 4
  },
  unitText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8
  },
  modalBtns: { 
    flexDirection: 'row', 
    width: '100%', 
    gap: 12 
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center'
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  cancelTxt: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '600' },
  saveTxt: { fontSize: 16, color: '#000', fontWeight: 'bold' },

  // Recipe Modal Styles
  recipeModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: SPACING.l
  },
  recipeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  recipeModalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold'
  },
  recipeModalBody: {
    padding: SPACING.l,
    gap: SPACING.m
  },
  emptyRecipeContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl
  },
  emptyRecipeText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: SPACING.l
  },
  createRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s
  },
  createRecipeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14
  },
  createNewRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    gap: SPACING.s,
    marginBottom: SPACING.m
  },
  createNewRecipeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14
  },
  recipeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
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
  logRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    gap: SPACING.s
  },
  logRecipeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12
  }
});

export default FoodList;