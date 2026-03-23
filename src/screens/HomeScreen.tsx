// src/screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
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
  const [todayAdditives, setTodayAdditives] = useState<any[]>([]);
  const [userName, setUserName] = useState('User');
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [selectedAdditive, setSelectedAdditive] = useState<any | null>(null);
  const [additiveFilter, setAdditiveFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [additiveExpanded, setAdditiveExpanded] = useState(false);
  const ADDITIVE_PREVIEW = 3;
  const [todayNutrients, setTodayNutrients] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });
  const [dailyGoals, setDailyGoals] = useState({ calories: 2000, protein: 150, carbs: 225, fat: 55, sugar: 30, sodium: 2300 });
  const [hasHypertension, setHasHypertension] = useState(false);
  // Nutrient customisation
  const ALL_NUTRIENT_DEFS = [
    { key: 'calories', label: 'Energy',       unit: 'kcal' as const },
    { key: 'protein',  label: 'Protein',      unit: 'g'    as const },
    { key: 'carbs',    label: 'Carbohydrate', unit: 'g'    as const },
    { key: 'sugar',    label: 'Sugar',        unit: 'g'    as const },
    { key: 'fat',      label: 'Fat',          unit: 'g'    as const },
    { key: 'sodium',   label: 'Sodium',       unit: 'mg'   as const },
  ];
  const [visibleNutrientKeys, setVisibleNutrientKeys] = useState<Set<string>>(new Set(['calories','protein','carbs','sugar','fat','sodium']));
  const [nutrientSort, setNutrientSort] = useState<'default'|'most'|'least'|'az'|'za'>('default');
  const [nutrientMenuVisible, setNutrientMenuVisible] = useState(false);
  const [nutrientSortOpen, setNutrientSortOpen] = useState(false);
  const [nutrientEditVisible, setNutrientEditVisible] = useState(false);
  const [editDraft, setEditDraft] = useState<Set<string>>(new Set(['calories','protein','carbs','sugar','fat','sodium']));

  // Helper to get consistent date string
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Helper to get dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good morning,';
    if (hour >= 12 && hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

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

  // ── NEW: Day-level Vitality Score ──────────────────────────────────────
  // Vitality Score = Nutrient Score (70%) + Additive Score (30%)
  // No AI tag dependency — uses the same data as the Tracking Nutrients bars.
  const calculateVitalityScore = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      const today = getTodayDate();
      const foodLogsRef = collection(db, 'users', currentUser.uid, 'food_logs');
      const todaySnapshot = await getDocs(query(foodLogsRef, where('date', '==', today)));

      if (todaySnapshot.empty) {
        // Clear stale data so the UI reflects "nothing logged today"
        setTodayLogsCount(0);
        setTodayAdditives([]);
        setTodayNutrients({ calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });
        return null;
      }

      // ── Accumulators ─────────────────────────────────────────────────────
      let logCount = 0;
      let totCal = 0, totPro = 0, totCarb = 0, totFat = 0, totSug = 0, totSod = 0;
      const allAdditives = new Map<string, any>();

      todaySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        logCount++;
        totCal  += d.calories || 0;
        totPro  += d.protein  || 0;
        totCarb += d.carbs    || 0;
        totFat  += d.fat      || 0;
        totSug  += d.sugar    || 0;
        totSod  += d.sodium   || 0;

        // Collect unique additives
        if (d.foodAnalysis && Array.isArray(d.foodAnalysis.additiveRiskAnalysis)) {
          d.foodAnalysis.additiveRiskAnalysis.forEach((add: any) => {
            if (add.additive) {
              const key = add.additive.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (!allAdditives.has(key)) {
                allAdditives.set(key, { ...add, sourceFoodName: d.name || 'Unknown Food' });
              }
            }
          });
        }
      });

      setTodayLogsCount(logCount);
      setTodayNutrients({ calories: Math.round(totCal), protein: Math.round(totPro), carbs: Math.round(totCarb), fat: Math.round(totFat), sugar: Math.round(totSug), sodium: Math.round(totSod) });

      // ── Fetch goals + profile ──────────────────────────────────────────────
      let goals = { calories: 2000, protein: 150, carbs: 225, fat: 55, sugar: 30, sodium: 2300 };
      try {
        const profileSnap = await getDoc(doc(db, 'user_profiles', currentUser.uid));
        if (profileSnap.exists()) {
          const pd = profileSnap.data();
          const g = pd.dailyNutritionGoals;
          if (g) goals = { calories: g.calories || 2000, protein: g.protein || 150, carbs: g.carbs || 225, fat: g.fat || 55, sugar: g.sugar || 30, sodium: g.sodium || 2300 };
          const diseases: string[] = pd.diseases || [];
          setHasHypertension(diseases.some((d: string) => d.toLowerCase().includes('hypertension')));
        }
      } catch (_) {}
      setDailyGoals(goals);

      // ── 1. NUTRIENT SCORE ─────────────────────────────────────────────────
      // Stricter: penalties kick in at 75% and scale harder
      const basePenalty = (fraction: number) => {
        if (fraction <= 0.75) return 0;   // safe zone (was 0.85)
        if (fraction <= 0.90) return 7;   // approaching limit
        if (fraction <= 1.10) return 14;  // at/just over limit
        return 22;                        // significantly over (was 15)
      };

      // Weighted nutrient penalties (all except protein)
      const nutrientPenalties = [
        { consumed: totSod,  limit: goals.sodium,   weight: 1.5 },
        { consumed: totSug,  limit: goals.sugar,    weight: 1.3 },
        { consumed: totCal,  limit: goals.calories, weight: 1.0 },
        { consumed: totFat,  limit: goals.fat,      weight: 0.9 },
        { consumed: totCarb, limit: goals.carbs,    weight: 0.6 },
      ];

      let nutrientScore = 100;
      nutrientPenalties.forEach(({ consumed, limit, weight }) => {
        const fraction = limit > 0 ? consumed / limit : 0;
        nutrientScore -= basePenalty(fraction) * weight;
      });

      // Protein bonus / penalty (stricter — low protein penalised harder)
      const proteinFraction = goals.protein > 0 ? totPro / goals.protein : 0;
      if      (proteinFraction >= 0.8) nutrientScore += 8;
      else if (proteinFraction >= 0.6) nutrientScore += 3;
      else if (proteinFraction >= 0.4) nutrientScore -= 5;
      else                             nutrientScore -= 10; // very low protein

      nutrientScore = Math.max(0, Math.min(100, nutrientScore));

      // ── 2. ADDITIVE SCORE ─────────────────────────────────────────────────
      let additivePenalty = 0;
      allAdditives.forEach((add) => {
        if      (add.risk === 'High')   additivePenalty += 10; // was 8
        else if (add.risk === 'Medium') additivePenalty += 5;  // was 4
        else                            additivePenalty += 2;  // was 1 (Low)
      });
      additivePenalty = Math.min(additivePenalty, 30); // tighter cap: 30 (was 40)
      const additiveScore = Math.max(0, Math.min(100, 100 - additivePenalty));

      // ── 3. FINAL BLEND ────────────────────────────────────────────────────
      const vitalityScore = Math.round(nutrientScore * 0.7 + additiveScore * 0.3);

      // Sort additives by risk for display
      const sortedAdditives = Array.from(allAdditives.values()).sort((a, b) => {
        const w: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        return (w[b.risk] || 0) - (w[a.risk] || 0);
      });
      setTodayAdditives(sortedAdditives);

      return vitalityScore;
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
        color: '#6B7280', // Neutral gray
        bg: '#6B7280',
        message: 'NO DATA',
        subMessage: 'Log food to get your vitality score today.',
        progress: 0
      };
    }

    if (score >= 70) {
      return {
        color: '#FFFFFF',
        bg: '#2A9A4A', // Green
        message: 'GOOD',
        subMessage: "You're making great food choices! Keep prioritizing nutrient-dense greens.",
        progress: score
      };
    } else if (score >= 40) {
      return {
        color: '#FFFFFF',
        bg: '#EAB308', // Yellow
        message: 'TRY EATING HEALTHIER',
        subMessage: "You're on track, but try swapping some processed items for fresh whole foods.",
        progress: score
      };
    } else if (score >= 20) {
      return {
        color: '#FFFFFF',
        bg: '#F97316', // Orange
        message: 'BAD',
        subMessage: "Focus on eating more colorful, raw, and nutrient-dense foods to boost your score.",
        progress: score
      };
    } else {
      return {
        color: '#FFFFFF',
        bg: '#DC2626', // Red
        message: 'SEVERELY BAD',
        subMessage: "Your food choices today need significant improvement. Try eating more whole foods and vegetables.",
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
          {/* NutriWise logo — matches Food Analysis screen */}
          <View style={styles.logoRow}>
            <View style={styles.logoIconWrap}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.logoText}>NutriWise</Text>
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
        <View style={[styles.vitalityCard, { backgroundColor: vitalityInfo.bg }]}>
          <View style={styles.vitalityHeader}>
            <View>
              <Text style={styles.dailyWellnessText}>DAILY WELLNESS</Text>
              <Text style={styles.vitalityTitle}>Vitality Score</Text>
            </View>
            <Ionicons name="flash" size={28} color="#FFFFFF" />
          </View>

          <View style={styles.vitalityContent}>
            {/* Circular Progress */}
            <View style={styles.progressContainer}>
              {loading ? (
                <ActivityIndicator size={100} color="#FFFFFF" />
              ) : (
                <View style={styles.circleContainer}>
                  <Svg width={100} height={100}>
                    {/* Background circle */}
                    <Circle
                      cx={50}
                      cy={50}
                      r={42}
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth={10}
                      fill="transparent"
                    />
                    {/* Progress circle */}
                    <Circle
                      cx={50}
                      cy={50}
                      r={42}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={10}
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - vitalityInfo.progress / 100)}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 50 50)`}
                    />
                  </Svg>
                  <View style={styles.scoreOverlay}>
                    <Text style={styles.scoreText}>
                      {vitalityScore !== null ? `${vitalityScore}%` : '--'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Vitality Message & Pills */}
            <View style={styles.vitalityTextContainer}>
              <Text style={styles.subMessageText}>
                {vitalityInfo.subMessage}
              </Text>
              <View style={styles.vitalityBadgesRow}>
                <View style={styles.vitalityPill}>
                  <Text style={styles.vitalityPillText}>{vitalityInfo.message.toUpperCase()}</Text>
                </View>
              </View>
            </View>
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
            const overallTag = food?.foodAnalysis?.overallTag?.toLowerCase() || 'unknown';
            
            let badgeBg = COLORS.on_surface_variant;
            let badgeText = "MODERATE";
            
            if (overallTag === 'safe' || overallTag === 'low risk') {
              badgeBg = COLORS.primary;
              badgeText = overallTag === 'safe' ? 'SAFE CHOICE' : 'LOW RISK';
            } else if (overallTag === 'moderate risk') {
              badgeBg = COLORS.risk_medium;
              badgeText = 'MODERATE RISK';
            } else if (overallTag === 'high risk') {
              badgeBg = COLORS.risk_high;
              badgeText = 'HIGH RISK';
            }
            
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
                    <View style={[styles.recentStatusDot, { backgroundColor: badgeBg }]} />
                    <Text style={[styles.recentStatusText, { color: badgeBg }]}>
                      {badgeText}
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

        {/* Today's Additives */}
        {todayAdditives.length > 0 && (() => {
          const FILTER_OPTIONS: Array<'All' | 'High' | 'Medium' | 'Low'> = ['All', 'High', 'Medium', 'Low'];
          const filtered = additiveFilter === 'All'
            ? todayAdditives
            : todayAdditives.filter(a => a.risk === additiveFilter);
          const displayed = additiveExpanded ? filtered : filtered.slice(0, ADDITIVE_PREVIEW);
          const hasMore = filtered.length > ADDITIVE_PREVIEW;

          return (
            <View style={{ marginBottom: SPACING.xl, marginTop: SPACING.m }}>
              {/* Title row */}
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Additives Consumed Today</Text>
                <Text style={styles.additiveTotalCount}>{filtered.length} found</Text>
              </View>

              {/* Filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
                style={{ marginBottom: SPACING.m }}
              >
                {FILTER_OPTIONS.map(opt => {
                  const active = additiveFilter === opt;
                  const chipColor = opt === 'High' ? COLORS.risk_high : opt === 'Medium' ? COLORS.risk_medium : opt === 'Low' ? COLORS.primary : COLORS.on_surface;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterChip, active && { backgroundColor: chipColor, borderColor: chipColor }]}
                      onPress={() => { setAdditiveFilter(opt); setAdditiveExpanded(false); }}
                      activeOpacity={0.75}
                    >
                      {opt !== 'All' && (
                        <View style={[styles.filterChipDot, { backgroundColor: active ? '#FFF' : chipColor }]} />
                      )}
                      <Text style={[styles.filterChipText, active && { color: '#FFF' }]}>
                        {opt === 'All' ? 'All' : `${opt} Risk`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* List */}
              {filtered.length === 0 ? (
                <Text style={styles.noRecentText}>No {additiveFilter.toLowerCase()} risk additives today.</Text>
              ) : (
                <View style={styles.additiveList}>
                  {displayed.map((item, idx) => {
                    const riskColor = item.risk === "Low" ? COLORS.primary : item.risk === "Medium" ? COLORS.risk_medium : COLORS.risk_high;
                    const riskBg = item.risk === "Low"
                      ? 'rgba(0, 110, 28, 0.07)'
                      : item.risk === "Medium"
                      ? 'rgba(255, 143, 0, 0.07)'
                      : 'rgba(186, 26, 26, 0.07)';
                    return (
                      <TouchableOpacity key={idx} style={[styles.additiveRow, { backgroundColor: riskBg }]} onPress={() => setSelectedAdditive(item)} activeOpacity={0.75}>
                        <View style={styles.additiveLeft}>
                          <View style={[styles.additiveRiskDot, { backgroundColor: riskColor }]} />
                        </View>
                        <View style={styles.additiveContent}>
                          <View style={styles.additiveTopRow}>
                            <Text style={styles.additiveName} numberOfLines={1}>{item.additive}</Text>
                            <View style={[styles.additiveBadge, { backgroundColor: riskColor }]}>
                              <Text style={styles.additiveBadgeText}>{item.risk?.toUpperCase()} RISK</Text>
                            </View>
                          </View>
                          <Text style={styles.additiveDesc} numberOfLines={2}>{item.consumingDescription}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* See more / See less */}
                  {hasMore && (
                    <TouchableOpacity style={styles.seeMoreBtn} onPress={() => setAdditiveExpanded(e => !e)} activeOpacity={0.7}>
                      <Text style={styles.seeMoreText}>
                        {additiveExpanded ? `See less ▲` : `See ${filtered.length - ADDITIVE_PREVIEW} more ▼`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* Additive Detail Modal */}
        {selectedAdditive && (
          <Modal
            visible={!!selectedAdditive}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedAdditive(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setSelectedAdditive(null)}
            >
              <TouchableOpacity activeOpacity={1} style={styles.additiveModalCard}>
                {/* Header strip */}
                {
                  (() => {
                    const riskColor = selectedAdditive.risk === "Low" ? COLORS.primary : selectedAdditive.risk === "Medium" ? COLORS.risk_medium : COLORS.risk_high;
                    const riskBg = selectedAdditive.risk === "Low"
                      ? 'rgba(0, 110, 28, 0.08)'
                      : selectedAdditive.risk === "Medium"
                      ? 'rgba(255, 143, 0, 0.08)'
                      : 'rgba(186, 26, 26, 0.08)';
                    return (
                      <>
                        <View style={[styles.additiveModalHeader, { backgroundColor: riskBg }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.additiveModalName}>{selectedAdditive.additive}</Text>
                          </View>
                          <View style={[styles.additiveModalBadge, { backgroundColor: riskColor }]}>
                            <Text style={styles.additiveModalBadgeText}>{selectedAdditive.risk?.toUpperCase()} RISK</Text>
                          </View>
                        </View>

                        <View style={styles.additiveModalBody}>
                          {/* Risk dot + label */}
                          <View style={styles.additiveModalRiskRow}>
                            <View style={[styles.additiveModalDot, { backgroundColor: riskColor }]} />
                            <Text style={[styles.additiveModalRiskLabel, { color: riskColor }]}>
                              {selectedAdditive.risk === "Low" ? "Low Risk Additive" : selectedAdditive.risk === "Medium" ? "Moderate Risk Additive" : "High Risk Additive"}
                            </Text>
                          </View>

                          {/* Description */}
                          <Text style={styles.additiveModalSectionHeading}>What you should know</Text>
                          <Text style={styles.additiveModalDesc}>{selectedAdditive.consumingDescription || 'No additional information available.'}</Text>

                          {/* Divider */}
                          <View style={styles.additiveModalDivider} />

                          {/* Source */}
                          <View style={styles.additiveModalSourceRow}>
                            <Ionicons name="fast-food-outline" size={16} color={COLORS.on_surface_variant} />
                            <Text style={styles.additiveModalSourceLabel}>Consumed from: </Text>
                            <Text style={styles.additiveModalSourceFood} numberOfLines={1}>{selectedAdditive.sourceFoodName || 'Unknown Food'}</Text>
                          </View>
                        </View>

                        {/* Close button */}
                        <TouchableOpacity style={[styles.additiveModalCloseBtn, { borderColor: riskColor }]} onPress={() => setSelectedAdditive(null)} activeOpacity={0.8}>
                          <Text style={[styles.additiveModalCloseTxt, { color: riskColor }]}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()
                }
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Tracking Nutrients */}
        {todayNutrients.calories > 0 && (() => {
          const vals: Record<string,number> = { calories: todayNutrients.calories, protein: todayNutrients.protein, carbs: todayNutrients.carbs, sugar: todayNutrients.sugar, fat: todayNutrients.fat, sodium: todayNutrients.sodium };
          const lims: Record<string,number> = { calories: dailyGoals.calories, protein: dailyGoals.protein, carbs: dailyGoals.carbs, sugar: dailyGoals.sugar, fat: dailyGoals.fat, sodium: dailyGoals.sodium };
          // Base order (hypertension reorder)
          const orderedKeys = hasHypertension
            ? ['sodium','sugar','calories','protein','carbs','fat']
            : ['calories','protein','carbs','sugar','fat','sodium'];
          // Build display list
          let displayList = orderedKeys
            .filter(k => visibleNutrientKeys.has(k))
            .map(k => { const def = ALL_NUTRIENT_DEFS.find(d => d.key===k)!; return { ...def, value: vals[k]||0, limit: lims[k]||1, warningLabel: hasHypertension && (k==='sodium'||k==='sugar') }; });
          // Apply sort
          if (nutrientSort === 'most')  displayList = [...displayList].sort((a,b) => (b.value/b.limit) - (a.value/a.limit));
          if (nutrientSort === 'least') displayList = [...displayList].sort((a,b) => (a.value/a.limit) - (b.value/b.limit));
          if (nutrientSort === 'az')    displayList = [...displayList].sort((a,b) => a.label.localeCompare(b.label));
          if (nutrientSort === 'za')    displayList = [...displayList].sort((a,b) => b.label.localeCompare(a.label));

          return (
            <View style={styles.nutrientSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Tracking Nutrients</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.additiveTotalCount}>Today</Text>
                  <TouchableOpacity
                    onPress={() => { setNutrientSortOpen(false); setNutrientMenuVisible(true); }}
                    style={styles.dotsBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.on_surface_variant} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.nutrientCard}>
                {displayList.map((n, idx) => {
                  const raw = Math.min(n.value / n.limit, 1.2);
                  const pct = Math.min(raw, 1);
                  const over = n.value > n.limit;
                  return (
                    <View key={n.key} style={[styles.nutrientRow, idx < displayList.length - 1 && styles.nutrientRowBorder]}>
                      <View style={styles.nutrientLabelRow}>
                        <Text style={styles.nutrientLabel}>
                          {n.label}{n.warningLabel ? ' ⚠️' : ''}
                        </Text>
                        <View style={styles.nutrientValueRow}>
                          <Text style={[styles.nutrientValue, over && { color: COLORS.risk_high }]}>
                            {n.value.toLocaleString()}
                          </Text>
                          <Text style={styles.nutrientLimit}>/ {n.limit.toLocaleString()} {n.unit}</Text>
                        </View>
                      </View>
                      <View style={styles.nutrientBarTrack}>
                        <View style={[styles.nutrientBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: `hsl(${Math.round(120*(1-pct))}, 75%, 42%)` }]} />
                        {over && (<View style={styles.nutrientOverIndicator}><Text style={styles.nutrientOverText}>OVER</Text></View>)}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

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

      {/* ── Nutrient 3-dot dropdown ── */}
      <Modal visible={nutrientMenuVisible} transparent animationType="fade" onRequestClose={() => { setNutrientMenuVisible(false); setNutrientSortOpen(false); }}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => { setNutrientMenuVisible(false); setNutrientSortOpen(false); }}>
          <TouchableOpacity activeOpacity={1} style={styles.dropdownCard}>

            {/* Edit */}
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setNutrientMenuVisible(false); setEditDraft(new Set(visibleNutrientKeys)); setNutrientEditVisible(true); }} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={16} color={COLORS.on_surface} />
              <Text style={styles.dropdownItemText}>Edit</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            {/* Sort */}
            <TouchableOpacity style={styles.dropdownItem} onPress={() => setNutrientSortOpen(o => !o)} activeOpacity={0.7}>
              <Ionicons name="swap-vertical-outline" size={16} color={COLORS.on_surface} />
              <Text style={styles.dropdownItemText}>Sort</Text>
              <Ionicons name={nutrientSortOpen ? 'chevron-up' : 'chevron-forward'} size={14} color={COLORS.on_surface_variant} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {nutrientSortOpen && (
              <View style={styles.sortSubmenu}>
                {([
                  { key: 'most',  label: 'Sort by Most Consumed'  },
                  { key: 'least', label: 'Sort by Least Consumed' },
                  { key: 'az',    label: 'Sort A → Z'             },
                  { key: 'za',    label: 'Sort Z → A'             },
                ] as const).map(opt => (
                  <TouchableOpacity key={opt.key} style={styles.sortOption} activeOpacity={0.7}
                    onPress={() => { setNutrientSort(opt.key); setNutrientMenuVisible(false); setNutrientSortOpen(false); }}>
                    <View style={[styles.sortRadio, nutrientSort === opt.key && styles.sortRadioActive]} />
                    <Text style={[styles.sortOptionText, nutrientSort === opt.key && { color: COLORS.primary, fontWeight: '700' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Nutrient Edit modal ── */}
      <Modal visible={nutrientEditVisible} transparent animationType="fade" onRequestClose={() => setNutrientEditVisible(false)}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Visible Nutrients</Text>
            <Text style={styles.editModalSub}>Select which nutrients to display</Text>
            <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false}>
              {ALL_NUTRIENT_DEFS.map(n => {
                const checked = editDraft.has(n.key);
                return (
                  <TouchableOpacity key={n.key} style={styles.editModalRow} activeOpacity={0.7}
                    onPress={() => setEditDraft(prev => {
                      const next = new Set(prev);
                      if (next.has(n.key)) { if (next.size > 1) next.delete(n.key); }
                      else next.add(n.key);
                      return next;
                    })}>
                    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? COLORS.primary : COLORS.on_surface_variant} />
                    <Text style={[styles.editModalLabel, checked && { color: COLORS.on_surface, fontWeight: '700' }]}>
                      {n.label} <Text style={{ color: COLORS.on_surface_variant, fontWeight: '400' }}>({n.unit})</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.editModalActions}>
              <TouchableOpacity style={[styles.editModalBtn, styles.editModalCancel]} onPress={() => setNutrientEditVisible(false)} activeOpacity={0.8}>
                <Text style={styles.editModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editModalBtn, styles.editModalSave]} onPress={() => { setVisibleNutrientKeys(new Set(editDraft)); setNutrientEditVisible(false); }} activeOpacity={0.8}>
                <Text style={styles.editModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingBottom: SPACING.m,
    marginBottom: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 110, 28, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
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

  // Vitality Card Redesign
  vitalityCard: {
    borderRadius: 24,
    padding: SPACING.l,
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  vitalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.l,
  },
  dailyWellnessText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  vitalityTitle: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vitalityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.l,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vitalityTextContainer: {
    flex: 1,
  },
  subMessageText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: SPACING.m,
  },
  vitalityBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalityPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  vitalityPillText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
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

  // Additive vertical list
  additiveList: {
    gap: 10,
  },
  additiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  additiveLeft: {
    paddingTop: 4,
  },
  additiveRiskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  additiveContent: {
    flex: 1,
    gap: 4,
  },
  additiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  additiveName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.on_surface,
  },
  additiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  additiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additiveDesc: {
    fontSize: 12,
    color: COLORS.on_surface_variant,
    lineHeight: 17,
  },

  // Filter chips
  filterChipRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    backgroundColor: '#F6F6F6',
  },
  filterChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.on_surface,
  },
  additiveTotalCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.on_surface_variant,
  },

  // See more / less
  seeMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginTop: 4,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Additive Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
  },
  additiveModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  additiveModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.l,
    gap: 12,
  },
  additiveModalName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.on_surface,
  },
  additiveModalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  additiveModalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additiveModalBody: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
    gap: 10,
  },
  additiveModalRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  additiveModalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  additiveModalRiskLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  additiveModalSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  additiveModalDesc: {
    fontSize: 14,
    color: COLORS.on_surface,
    lineHeight: 21,
  },
  additiveModalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  additiveModalSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  additiveModalSourceLabel: {
    fontSize: 13,
    color: COLORS.on_surface_variant,
    fontWeight: '600',
  },
  additiveModalSourceFood: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.on_surface,
    flex: 1,
  },
  additiveModalCloseBtn: {
    margin: SPACING.l,
    marginTop: SPACING.s,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  additiveModalCloseTxt: {
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Tracking Nutrients ──
  nutrientSection: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.m,
  },
  nutrientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  nutrientRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  nutrientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nutrientLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.on_surface,
  },
  nutrientValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.on_surface,
  },
  nutrientLimit: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.on_surface_variant,
  },
  nutrientBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    overflow: 'visible',
    position: 'relative',
  },
  nutrientBarFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 4,
  },
  nutrientOverIndicator: {
    position: 'absolute',
    right: 0,
    top: -4,
    backgroundColor: COLORS.risk_high,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nutrientOverText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // ── Nutrient 3-dot menu ──
  dotsBtn: {
    padding: 4,
    borderRadius: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 320,       // position below the section header
    paddingRight: SPACING.l,
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minWidth: 210,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.on_surface,
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 10,
  },
  sortSubmenu: {
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingVertical: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  sortRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  sortRadioActive: {
    backgroundColor: COLORS.primary,
  },
  sortOptionText: {
    fontSize: 13,
    color: COLORS.on_surface,
    fontWeight: '500',
  },

  // ── Nutrient Edit modal ──
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
  },
  editModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.on_surface,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.l,
    paddingBottom: 4,
  },
  editModalSub: {
    fontSize: 13,
    color: COLORS.on_surface_variant,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
  },
  editModalScroll: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  editModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: SPACING.l,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  editModalLabel: {
    fontSize: 15,
    color: COLORS.on_surface_variant,
    flex: 1,
  },
  editModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: SPACING.m,
    gap: 10,
  },
  editModalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  editModalCancel: {
    backgroundColor: '#F4F4F4',
  },
  editModalSave: {
    backgroundColor: COLORS.primary,
  },
  editModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.on_surface_variant,
  },
  editModalSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
