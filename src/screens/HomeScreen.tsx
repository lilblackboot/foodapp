// src/screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../services/firebaseConfig';
import { COLORS, SPACING, TYPOGRAPHY, FONTS, BORDER_RADIUS, ELEVATION } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }: any) {
  const [vitalityScore, setVitalityScore] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayLogsCount, setTodayLogsCount] = useState(0);
  const [userName, setUserName] = useState('User');
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  // Helper to get consistent date string
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Load user name
  const loadUserName = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "user_profiles", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.name || 'User');
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  // Calculate Vitality Score based on recent food choices
  const calculateVitalityScore = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return 0;

    try {
      const today = getTodayDate();
      
      // Get today's food logs
      const foodLogsRef = collection(db, 'users', currentUser.uid, 'food_logs');
      const todayQuery = query(
        foodLogsRef,
        where('date', '==', today),
        orderBy('timestamp', 'desc')
      );
      const todaySnapshot = await getDocs(todayQuery);
      
      if (todaySnapshot.empty) {
        return null; // No logs today
      }

      let totalScore = 0;
      let logCount = 0;

      todaySnapshot.forEach((doc) => {
        const foodData = doc.data();
        logCount++;

        // Calculate score based on nutrition profile
        const calories = foodData.calories || 0;
        const protein = foodData.protein || 0;
        const carbs = foodData.carbs || 0;
        const fat = foodData.fat || 0;
        const sugar = foodData.sugar || 0;
        const sodium = foodData.sodium || 0;

        let foodScore = 50; // Base score

        // Protein bonus (good for vitality)
        if (protein > 20 && protein <= 40) foodScore += 15;
        else if (protein > 40) foodScore += 10;
        else if (protein > 10) foodScore += 5;

        // Sugar penalty (bad for vitality)
        if (sugar > 30) foodScore -= 20;
        else if (sugar > 20) foodScore -= 10;
        else if (sugar > 10) foodScore -= 5;

        // Sodium penalty
        if (sodium > 2000) foodScore -= 15;
        else if (sodium > 1500) foodScore -= 8;
        else if (sodium > 1000) foodScore -= 3;

        // Fat balance
        if (fat > 0 && fat <= 30) foodScore += 5;
        else if (fat > 50) foodScore -= 10;

        // Calorie balance
        if (calories > 0 && calories <= 600) foodScore += 5;
        else if (calories > 800) foodScore -= 10;

        // Carbs quality (complex vs simple)
        if (carbs > 0 && carbs <= 80) foodScore += 5;
        else if (carbs > 120) foodScore -= 8;

        foodScore = Math.max(0, Math.min(100, foodScore)); // Clamp between 0-100
        totalScore += foodScore;
      });

      setTodayLogsCount(logCount);
      return Math.round(totalScore / logCount); // Average score
    } catch (error) {
      console.error('Error calculating vitality score:', error);
      return 0;
    }
  };

  const fetchRecentFoods = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const foodLogsRef = collection(db, 'users', currentUser.uid, 'food_logs');
      const recentQuery = query(foodLogsRef, orderBy('timestamp', 'desc'), limit(5));
      const snapshot = await getDocs(recentQuery);
      const foods = snapshot.docs.map(doc => doc.data());
      setRecentFoods(foods);
    } catch (e) {
      console.error("Error fetching recent foods:", e);
    }
  };

  // Load Vitality Score
  const loadVitalityScore = async () => {
    setLoading(true);
    try {
      await loadUserName();
      const score = await calculateVitalityScore();
      setVitalityScore(score);
      await fetchRecentFoods();
    } catch (error) {
      console.error('Error loading vitality score:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVitalityScore();
    setRefreshing(false);
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadVitalityScore();
    }, [])
  );

  // Get vitality score color and message
  const getVitalityInfo = (score: number | null) => {
    if (score === null) {
      return {
        color: COLORS.on_surface_variant,
        message: 'Log food to get vitality score',
        subMessage: 'Start tracking your meals today',
        progress: 0
      };
    }

    if (score >= 80) {
      return {
        color: COLORS.primary,
        message: 'Excellent vitality!',
        subMessage: 'You\'re making great food choices',
        progress: score
      };
    } else if (score >= 60) {
      return {
        color: COLORS.risk_medium,
        message: 'Good vitality',
        subMessage: 'Room for improvement',
        progress: score
      };
    } else {
      return {
        color: COLORS.error,
        message: 'Low vitality',
        subMessage: 'Focus on healthier choices',
        progress: score
      };
    }
  };

  const vitalityInfo = getVitalityInfo(vitalityScore);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Vitality Score Card */}
        <View style={styles.vitalityCard}>
          <View style={styles.vitalityHeader}>
            <Text style={styles.vitalityTitle}>Today's Vitality</Text>
            <View style={styles.vitalityBadge}>
              <Text style={styles.vitalityBadgeText}>
                {vitalityScore !== null ? `${vitalityScore}/100` : 'No data'}
              </Text>
            </View>
          </View>

          {/* Circular Progress */}
          <View style={styles.progressContainer}>
            {loading ? (
              <ActivityIndicator size={120} color={COLORS.primary} />
            ) : (
              <View style={styles.circleContainer}>
                <Svg width={200} height={200}>
                  {/* Background circle */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={90}
                    stroke={COLORS.surface_container_highest}
                    strokeWidth={15}
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={90}
                    stroke={COLORS.primary}
                    strokeWidth={15}
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - vitalityInfo.progress / 100)}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 100 100)`}
                  />
                </Svg>
                <View style={styles.scoreOverlay}>
                  <Text style={styles.scoreText}>
                    {vitalityScore !== null ? vitalityScore : '--'}
                  </Text>
                  <Text style={styles.scoreLabel}>Score</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.vitalityMessage}>
            <Text style={styles.messageText}>
              {vitalityInfo.message}
            </Text>
            <Text style={styles.subMessageText}>
              {vitalityInfo.subMessage}
            </Text>
          </View>
        </View>

        {/* Recent Scans */}
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Scans</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.recentViewAll}>View History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.recentScrollContent}
          style={styles.recentScroll}
        >
          {recentFoods.map((food, idx) => {
            const isSafe = (food.sodium < 1500 && food.sugar < 20); // Dummy logic for now
            return (
              <TouchableOpacity 
                key={idx} 
                style={styles.recentCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Scan', { screen: 'ScanResult', params: { foodLog: food } })}
              >
                <Image 
                  source={{uri: food.image || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=300'}} 
                  style={styles.recentImage} 
                />
                <View style={styles.recentTextWrap}>
                  <Text style={styles.recentFoodName} numberOfLines={1}>{food.name || "Unknown Food"}</Text>
                  <View style={styles.recentStatusRow}>
                    <View style={[styles.recentStatusDot, { backgroundColor: isSafe ? COLORS.primary : COLORS.on_surface_variant }]} />
                    <Text style={[styles.recentStatusText, { color: isSafe ? COLORS.primary : COLORS.on_surface_variant }]}>
                      {isSafe ? "SAFE CHOICE" : "MODERATE"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {recentFoods.length === 0 && !loading && (
            <Text style={styles.noRecentText}>No recent scans. Try scanning a food!</Text>
          )}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="camera-outline" size={28} color={COLORS.on_surface} />
            </View>
            <Text style={styles.actionText}>Scan Food</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('History')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={28} color={COLORS.on_surface} />
            </View>
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('RecipeCalculator')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="restaurant-outline" size={28} color={COLORS.on_surface} />
            </View>
            <Text style={styles.actionText}>Recipes</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.spacing_6, // 24px
    paddingTop: SPACING.l,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_lg, // 32px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
  },
  userName: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_lg, // 32px
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
  },
  avatarButton: {
    marginLeft: SPACING.m,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary_container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_md, // 28px
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
  },

  // Vitality Card
  vitalityCard: {
    backgroundColor: COLORS.surface_container_lowest,
    borderRadius: BORDER_RADIUS.xl, // 24px
    padding: SPACING.xxl,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.outline_variant,
    opacity: 0.3,
    alignItems: 'center',
  },
  vitalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  vitalityTitle: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_md, // 28px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
  },
  vitalityBadge: {
    backgroundColor: COLORS.surface_container_highest,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  vitalityBadgeText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.label_sm, // 11px
    fontWeight: FONTS.weight_medium,
    color: COLORS.on_surface_variant,
  },

  // Progress Circle
  progressContainer: {
    marginVertical: SPACING.xl,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.display_lg, // 56px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    lineHeight: 60,
  },
  scoreLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm, // 12px
    color: COLORS.on_surface_variant,
    marginTop: SPACING.xs,
  },

  // Vitality Message
  vitalityMessage: {
    alignItems: 'center',
    marginTop: SPACING.l,
  },
  messageText: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_sm, // 24px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  subMessageText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface_variant,
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.m,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.s,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface_container_low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm, // 12px
    color: COLORS.on_surface_variant,
    fontWeight: FONTS.weight_medium,
    textAlign: 'center',
  },

  // Recent Scans
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.m,
  },
  recentTitle: {
    fontFamily: FONTS.display,
    fontSize: 20, 
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
  },
  recentViewAll: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
  },
  recentScroll: {
    marginHorizontal: -24, 
  },
  recentScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: SPACING.xl,
    gap: 16,
  },
  recentCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  recentImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  recentTextWrap: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  recentFoodName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  recentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  noRecentText: {
    color: COLORS.on_surface_variant,
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
