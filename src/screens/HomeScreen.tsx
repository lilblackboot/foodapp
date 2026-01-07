// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../services/firebaseConfig';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import FoodList from '../components/FoodList'; 

// Standard Daily Goals
const GOALS = {
  calories: 2200,
  protein: 60,
  carbs: 275,
  fat: 70
};

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [intake, setIntake] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [refreshing, setRefreshing] = useState(false);
  
  // New state to trigger re-renders when food is modified
  const [refreshKey, setRefreshKey] = useState(0); 

  // Helper to get consistent date string
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Load User & Data
  const fetchData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 1. Get User Name
    const userDoc = await getDoc(doc(db, "user_profiles", currentUser.uid));
    if (userDoc.exists()) {
      setUser(userDoc.data());
    }

    // 2. Get Today's Intake 
    const today = getTodayDate();
    const intakeRef = doc(db, 'users', currentUser.uid, 'daily_summaries', today);
    const intakeSnap = await getDoc(intakeRef);

    if (intakeSnap.exists()) {
      const data = intakeSnap.data();
      setIntake({
        calories: data.totalCalories || 0,
        protein: data.totalProtein || 0,
        carbs: data.totalCarbs || 0,
        fat: data.totalFat || 0
      });
    } else {
      setIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
    setRefreshing(false);
  };

  // Callback passed to FoodList: runs when you delete/edit food
  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1); // Trigger refresh
    fetchData(); // Reload macros
  };

  // [UPDATED] This runs every time the screen comes into focus (e.g., coming back from Scan)
  useFocusEffect(
    useCallback(() => {
      fetchData(); // Reload the Macro Charts
      setRefreshKey(prev => prev + 1); // Force the FoodList component to reload
    }, [])
  );

  // Helper Component for Progress Bars
  const MacroBar = ({ label, value, max, color }: any) => {
    const progress = Math.min(value / max, 1);
    return (
      <View style={styles.macroContainer}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>{Math.round(value)} / {max}g</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData()}} tintColor={COLORS.primary}/>}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.username}>{user?.name || "Friend"}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Calorie Card */}
        <View style={styles.calorieCard}>
          <Text style={styles.calLabel}>Calories Consumed</Text>
          <Text style={styles.calValue}>{Math.round(intake.calories)}</Text>
          <Text style={styles.calGoal}>of {GOALS.calories} kcal goal</Text>
          
          <View style={styles.mainProgressBg}>
             <View style={[styles.mainProgressFill, { width: `${Math.min(intake.calories / GOALS.calories, 1) * 100}%` }]} />
          </View>
        </View>

        {/* Macros Section */}
        <Text style={styles.sectionTitle}>Daily Macros</Text>
        
        <View style={styles.statsGrid}>
          <MacroBar label="Protein" value={intake.protein || 0} max={GOALS.protein} color="#4ECDC4" />
          <MacroBar label="Carbs" value={intake.carbs || 0} max={GOALS.carbs} color="#FFD166" />
          <MacroBar label="Fats" value={intake.fat || 0} max={GOALS.fat} color="#EF476F" />
        </View>

        {/* Food List Component */}
        <FoodList 
            currentDate={getTodayDate()} 
            refreshTrigger={refreshKey} 
            onUpdate={handleDataUpdate} 
        />

        {/* Spacer */}
        <View style={{ height: 20 }} />

        {/* Daily Tip */}
        <View style={styles.tipBox}>
           <Text style={styles.tipTitle}>💡 Daily Tip</Text>
           <Text style={styles.tipText}>Prioritize protein in the morning to keep energy stable throughout the day.</Text>
        </View>
        
        {/* Bottom Spacer for scrolling */}
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
    marginBottom: SPACING.l 
  },
  greeting: { color: COLORS.textSecondary, fontSize: 16 },
  username: { color: COLORS.textPrimary, fontSize: 32, fontWeight: 'bold' },
  
  avatarBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold'
  },

  calorieCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: SPACING.l, alignItems: 'center', marginBottom: SPACING.xl, borderWidth: 1, borderColor: '#333' },
  calLabel: { color: COLORS.textSecondary, fontSize: 14, textTransform: 'uppercase' },
  calValue: { color: COLORS.primary, fontSize: 48, fontWeight: 'bold', marginVertical: 4 },
  calGoal: { color: COLORS.textSecondary, marginBottom: SPACING.m },
  mainProgressBg: { width: '100%', height: 10, backgroundColor: '#222', borderRadius: 5 },
  mainProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  
  sectionTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.m },
  statsGrid: { gap: SPACING.m, marginBottom: SPACING.xl },
  
  macroContainer: { marginBottom: SPACING.s },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: { color: COLORS.textSecondary, fontWeight: 'bold' },
  macroValue: { color: COLORS.textPrimary },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  
  tipBox: { backgroundColor: '#1A1A1A', padding: SPACING.m, borderRadius: 12 },
  tipTitle: { color: COLORS.primary, fontWeight: 'bold', marginBottom: 4 },
  tipText: { color: COLORS.textSecondary, lineHeight: 20 }
});