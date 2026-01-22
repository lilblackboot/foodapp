// src/screens/HistoryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, LayoutAnimation, Platform, UIManager, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { getHistory, getFoodsByDate } from '../services/firebaseHelper';
import { DailySummary, FoodItem } from '../types';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 1. Sub-Component: A Single History Card
const HistoryItem = ({ data }: { data: DailySummary }) => {
  const [expanded, setExpanded] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Format Date (e.g., "Mon, Oct 27")
  const dateObj = new Date(data.date);
  const niceDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const toggleExpand = async () => {
    // Animate the layout change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Fetch data only if we are opening and haven't fetched yet
    if (!expanded && foods.length === 0) {
      setLoading(true);
      try {
        const foodData = await getFoodsByDate(data.date);
        setFoods(foodData);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <View style={styles.card}>
      {/* Header (Always Visible) */}
      <TouchableOpacity onPress={toggleExpand} style={styles.cardHeader}>
        <View>
          <Text style={styles.dateText}>{niceDate}</Text>
          <Text style={styles.summaryText}>
            {Math.round(data.totalCalories)} kcal | P: {Math.round(data.totalProtein)} | C: {Math.round(data.totalCarbs)} | F: {Math.round(data.totalFat)}
          </Text>
          <Text style={styles.micronutrientText}>
            Sugar: {Math.round(data.totalSugar || 0)}g | Sodium: {Math.round(data.totalSodium || 0)}mg
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Expanded Details (Food List) */}
      {expanded && (
        <View style={styles.detailsContainer}>
          {loading ? (
             <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              {foods.map((food, i) => (
                <View key={i} style={styles.foodRow}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodCal}>{Math.round(food.calories)}</Text>
                </View>
              ))}
              {foods.length === 0 && <Text style={styles.noDataText}>No detailed logs found.</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
};

// 2. Main Screen Component
export default function HistoryScreen() {
  const [history, setHistory] = useState<DailySummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    setRefreshing(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-refresh when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>History</Text>
      
      <FlatList
        data={history}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => <HistoryItem data={item} />}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={loadHistory}
        ListEmptyComponent={
          <View style={styles.center}>
             <Text style={styles.noDataText}>No history logged yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { marginTop: 50, alignItems: 'center' },
  screenTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary, 
    paddingHorizontal: SPACING.l, 
    paddingTop: SPACING.m,
    marginBottom: SPACING.m
  },
  listContent: { paddingHorizontal: SPACING.l, paddingBottom: SPACING.xl },

  // Card Styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: SPACING.m,
    overflow: 'hidden', // Ensures the expanded view stays inside rounded corners
    borderWidth: 1,
    borderColor: '#333'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
  },
  dateText: { 
    color: COLORS.textPrimary, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  summaryText: { 
    color: COLORS.textSecondary, 
    fontSize: 12, 
    marginTop: 4 
  },
  micronutrientText: {
    color: COLORS.primary,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic'
  },

  // Expanded Area Styles
  detailsContainer: {
    backgroundColor: '#2A2A2A', // Slightly darker than surface to distinguish
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: '#333'
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  foodName: { color: COLORS.textSecondary, fontSize: 14 },
  foodCal: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
  noDataText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center' }
});