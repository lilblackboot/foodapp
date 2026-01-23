import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  DocumentData
} from 'firebase/firestore';
import { app } from './firebaseConfig';

const db = getFirestore(app);

interface SavedRecipe {
  id?: string;
  name: string;
  ingredients: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  servings: number;
  nutrition: any;
  createdAt: string;
}

/**
 * Save a recipe to Firestore
 */
export const saveRecipe = async (userId: string, recipe: SavedRecipe): Promise<string> => {
  try {
    const recipesRef = collection(db, 'users', userId, 'recipes');
    const docRef = doc(recipesRef);
    
    await setDoc(docRef, {
      ...recipe,
      updatedAt: new Date().toISOString()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

/**
 * Get all saved recipes for a user
 */
export const getSavedRecipes = async (userId: string): Promise<SavedRecipe[]> => {
  try {
    const recipesRef = collection(db, 'users', userId, 'recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedRecipe));
  } catch (error) {
    console.error('Error getting recipes:', error);
    throw error;
  }
};

/**
 * Delete a recipe from Firestore
 */
export const deleteRecipe = async (userId: string, recipeId: string): Promise<void> => {
  try {
    const recipeRef = doc(db, 'users', userId, 'recipes', recipeId);
    await deleteDoc(recipeRef);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

/**
 * Get a single recipe by ID
 */
export const getRecipeById = async (userId: string, recipeId: string): Promise<SavedRecipe | null> => {
  try {
    const recipeRef = doc(db, 'users', userId, 'recipes', recipeId);
    const snapshot = await getDoc(recipeRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return {
      id: recipeId,
      ...snapshot.data()
    } as SavedRecipe;
  } catch (error) {
    console.error('Error getting recipe:', error);
    throw error;
  }
};
