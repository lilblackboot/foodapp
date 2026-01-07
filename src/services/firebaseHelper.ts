import { 
  getFirestore, collection, doc, writeBatch, increment, 
  getDocs, query, where, orderBy, DocumentData 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './firebaseConfig'; 
import { FoodItem, DailySummary } from '../types'; // Import your types

const db = getFirestore(app);
const auth = getAuth();

// Helper to get current User ID
const getUserId = (): string => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  return user.uid;
};

// 1. ADD FOOD (Updates Log AND Daily Summary)
export const logFoodItem = async (food: FoodItem, date: string): Promise<void> => {
  const uid = getUserId();
  const batch = writeBatch(db);

  // A. Create reference for new Food Log
  const logRef = doc(collection(db, 'users', uid, 'food_logs'));
  
  // B. Set data for the specific food item
  // We use spread syntax to ensure we save all properties
  batch.set(logRef, {
    ...food,
    date: date,
    createdAt: new Date().toISOString()
  });

  // C. Update the Daily Summary (Increment totals)
  const summaryRef = doc(db, 'users', uid, 'daily_summaries', date);
  batch.set(summaryRef, {
    date: date,
    totalCalories: increment(food.calories),
    totalProtein: increment(food.protein || 0),
    totalCarbs: increment(food.carbs || 0),
    totalFat: increment(food.fat || 0)
  }, { merge: true });

  await batch.commit();
};

// 2. GET TODAY'S FOOD LIST
export const getFoodsByDate = async (date: string): Promise<FoodItem[]> => {
  const uid = getUserId();
  const q = query(
    collection(db, 'users', uid, 'food_logs'),
    where('date', '==', date)
  );
  
  const snapshot = await getDocs(q);
  
  // FIX: Explicitly cast the data to 'FoodItem'
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FoodItem));
};

// 3. DELETE FOOD (Removes Log AND Subtracts from Summary)
export const deleteFoodItem = async (foodId: string, date: string, foodDetails: FoodItem): Promise<void> => {
  const uid = getUserId();
  const batch = writeBatch(db);

  // A. Delete the log
  const logRef = doc(db, 'users', uid, 'food_logs', foodId);
  batch.delete(logRef);

  // B. Subtract from Summary
  const summaryRef = doc(db, 'users', uid, 'daily_summaries', date);
  batch.update(summaryRef, {
    totalCalories: increment(-foodDetails.calories),
    totalProtein: increment(-(foodDetails.protein || 0)),
    totalCarbs: increment(-(foodDetails.carbs || 0)),
    totalFat: increment(-(foodDetails.fat || 0))
  });

  await batch.commit();
};

// 4. EDIT FOOD SERVING
export const updateFoodServing = async (
  foodId: string, 
  date: string, 
  oldFood: FoodItem, 
  newServingSize: string
): Promise<void> => {
  const uid = getUserId();
  
  // Parse numbers safely
  const oldServing = parseFloat(oldFood.serving_size.toString());
  const newServing = parseFloat(newServingSize);

  // Avoid division by zero or NaN errors
  if (isNaN(oldServing) || isNaN(newServing) || oldServing === 0) return;

  // Calculate the ratio
  const ratio = newServing / oldServing;
  
  // New values
  const newCalories = oldFood.calories * ratio;
  const newProtein = (oldFood.protein || 0) * ratio;
  const newCarbs = (oldFood.carbs || 0) * ratio;
  const newFat = (oldFood.fat || 0) * ratio;

  // Difference (to add/subtract from total)
  const calDiff = newCalories - oldFood.calories;
  const proDiff = newProtein - (oldFood.protein || 0);
  const carbDiff = newCarbs - (oldFood.carbs || 0);
  const fatDiff = newFat - (oldFood.fat || 0);

  const batch = writeBatch(db);

  // A. Update the Log
  const logRef = doc(db, 'users', uid, 'food_logs', foodId);
  batch.update(logRef, {
    serving_size: newServingSize,
    calories: newCalories,
    protein: newProtein,
    carbs: newCarbs,
    fat: newFat
  });

  // B. Update the Summary
  const summaryRef = doc(db, 'users', uid, 'daily_summaries', date);
  batch.update(summaryRef, {
    totalCalories: increment(calDiff),
    totalProtein: increment(proDiff),
    totalCarbs: increment(carbDiff),
    totalFat: increment(fatDiff)
  });

  await batch.commit();
};

// 5. GET HISTORY (Summaries only)
export const getHistory = async (): Promise<DailySummary[]> => {
  const uid = getUserId();
  const q = query(
    collection(db, 'users', uid, 'daily_summaries'), 
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  // FIX: Explicitly cast data to 'DailySummary'
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as DailySummary));
};