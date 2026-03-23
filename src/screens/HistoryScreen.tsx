// src/screens/HistoryScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { getHistory, getFoodsByDate, deleteFoodItem } from '../services/firebaseHelper';
import { DailySummary, FoodItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Subtract horizontal padding (SPACING.l * 2) and account for 7 x 1px cell borders
const CALENDAR_WIDTH = SCREEN_WIDTH - SPACING.l * 2;
const DAY_CELL_WIDTH = Math.floor(CALENDAR_WIDTH / 7);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Section {
  title: string;
  dayNumber: string;
  dayName: string;
  monthName: string;
  summary: DailySummary;
  data: FoodItem[];
}

interface DayEntry {
  date: string;           // 'YYYY-MM-DD'
  entryCount: number;
}

// ─────────────────────────────────────────────
// Month View Calendar
// ─────────────────────────────────────────────
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_LINES = 5; // max green lines to show per cell

function MonthView({ entryMap }: { entryMap: Map<string, number> }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <ScrollView contentContainerStyle={styles.monthScrollContent} showsVerticalScrollIndicator={false}>
      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goBack} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={goForward} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map(d => (
          <Text key={d} style={styles.weekDayLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = entryMap.get(dateStr) ?? 0;
          const isToday = dateStr === todayStr;
          const lineCount = Math.min(count, MAX_LINES);

          return (
            <View key={dateStr} style={[styles.dayCell, isToday && styles.todayCell]}>
              <Text style={[styles.dayCellNumber, isToday && styles.todayCellNumber]}>{day}</Text>
              {count === 0 ? (
                <Text style={styles.dashText}>—</Text>
              ) : (
                <View style={styles.linesContainer}>
                  {Array.from({ length: lineCount }).map((_, li) => (
                    <View
                      key={li}
                      style={[
                        styles.entryLine,
                        { opacity: 0.6 + (li / lineCount) * 0.4 },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function HistoryScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [entryMap, setEntryMap] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'day' | 'month'>('day');

  const loadAllHistory = async () => {
    setRefreshing(true);
    try {
      const summaries = await getHistory();

      const promises = summaries.map(async (summary) => {
        const foods = await getFoodsByDate(summary.date);

        const dateObj = new Date(summary.date);
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());

        const dayNumber = dateObj.getDate().toString();
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return {
          title: summary.date,
          dayNumber,
          dayName,
          monthName,
          summary,
          data: foods,
        };
      });

      const resolved = await Promise.all(promises);

      // Build entryMap (date -> food count) from ALL summaries
      const map = new Map<string, number>();
      resolved.forEach(s => { if (s.data.length > 0) map.set(s.title, s.data.length); });
      setEntryMap(map);

      // Day view: only show dates with food
      const filtered = resolved
        .filter(s => s.data.length > 0)
        .sort((a, b) => new Date(b.summary.date).getTime() - new Date(a.summary.date).getTime());

      setSections(filtered);
    } catch (e) {
      console.error('Failed to load history data:', e);
      Alert.alert('Error', 'Failed to load history data.');
    }
    setRefreshing(false);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadAllHistory(); }, []));

  const handleRemove = (food: FoodItem, date: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${food.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!food.id) return;
            try {
              await deleteFoodItem(food.id, date, food);
              loadAllHistory();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete the item. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ── Day View renderers ──
  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeaderContainer}>
      <View style={styles.dateHeaderRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateNumber}>{section.dayNumber}</Text>
        </View>
        <View style={styles.dateTextContainer}>
          <Text style={styles.dayNameText}>{section.dayName}</Text>
          <Text style={styles.monthNameText}>{section.monthName}</Text>
        </View>
        <View style={styles.headerMacros}>
          <Text style={styles.totalCalText}>
            {Math.round(section.summary.totalCalories)}{' '}
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>kcal</Text>
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );

  const renderItem = ({ item, section }: { item: FoodItem; section: Section }) => (
    <View style={styles.foodRow}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodDetails}>
          {Math.round(item.calories)} kcal • {item.serving_size}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemove(item, section.summary.date)}
        activeOpacity={0.7}
      >
        <View style={styles.removeIconContainer}>
          <Ionicons name="trash-outline" size={18} color="#FF453A" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Log History</Text>

      {/* ── Tab Toggle ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'day' && styles.tabBtnActive]}
          onPress={() => setActiveTab('day')}
          activeOpacity={0.8}
        >
          <Ionicons name="list-outline" size={16} color={activeTab === 'day' ? '#FFF' : COLORS.primary} style={{ marginRight: 5 }} />
          <Text style={[styles.tabBtnText, activeTab === 'day' && styles.tabBtnTextActive]}>Day View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'month' && styles.tabBtnActive]}
          onPress={() => setActiveTab('month')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={activeTab === 'month' ? '#FFF' : COLORS.primary} style={{ marginRight: 5 }} />
          <Text style={[styles.tabBtnText, activeTab === 'month' && styles.tabBtnTextActive]}>Month View</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : activeTab === 'month' ? (
        <MonthView entryMap={entryMap} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={loadAllHistory}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="fast-food-outline" size={60} color="#AAA" style={{ marginBottom: 15 }} />
              <Text style={styles.noDataText}>No history logged yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },

  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    marginBottom: SPACING.s,
  },

  // ── Tab Toggle ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.m,
    backgroundColor: 'rgba(0, 110, 28, 0.07)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tabBtnTextActive: {
    color: '#FFF',
  },

  // ── Day View ──
  listContent: { paddingHorizontal: SPACING.l, paddingBottom: SPACING.xl * 2 },
  sectionHeaderContainer: { marginTop: SPACING.l, marginBottom: SPACING.s },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateBox: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0, 110, 28, 0.1)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 110, 28, 0.2)',
  },
  dateNumber: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  dateTextContainer: { flex: 1, justifyContent: 'center' },
  dayNameText: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  monthNameText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  headerMacros: { alignItems: 'flex-end', justifyContent: 'center' },
  totalCalText: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: '#E2E2E2', marginBottom: 8 },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  foodInfo: { flex: 1, paddingRight: 15 },
  foodName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  foodDetails: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  removeButton: { justifyContent: 'center', alignItems: 'center' },
  removeIconContainer: { backgroundColor: 'rgba(255, 69, 58, 0.1)', padding: 8, borderRadius: 20 },
  noDataText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', fontSize: 16 },

  // ── Month View ──
  monthScrollContent: { paddingHorizontal: SPACING.l, paddingBottom: SPACING.xl * 2 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.m,
    marginTop: SPACING.s,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 110, 28, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    width: DAY_CELL_WIDTH,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  dayCell: {
    width: DAY_CELL_WIDTH,
    minHeight: 80,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 0.5,
    borderColor: '#EBEBEB',
    backgroundColor: '#FAFAFA',
  },
  todayCell: {
    backgroundColor: 'rgba(0, 110, 28, 0.06)',
  },
  dayCellNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  todayCellNumber: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  dashText: {
    fontSize: 14,
    color: '#CACACA',
    fontWeight: '500',
  },
  linesContainer: {
    width: '72%',
    gap: 4,
    alignItems: 'stretch',
  },
  entryLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});