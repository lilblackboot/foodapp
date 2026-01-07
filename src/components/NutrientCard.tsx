// src/components/NutrientCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONTS } from '../constants/theme';

interface Props {
  label: string;
  current: number;
  limit: number;
  unit: string;
  color?: string;
}

export default function NutrientCard({ label, current, limit, unit, color = COLORS.primary }: Props) {
  // Calculate percentage (capped at 100%)
  const progress = Math.min((current / limit) * 100, 100);
  
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current} <Text style={styles.limit}>/ {limit} {unit}</Text>
        </Text>
      </View>
      
      {/* Progress Bar Background */}
      <View style={styles.track}>
        {/* Actual Progress Fill */}
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 16,
    marginBottom: SPACING.s,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  label: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium as any,
    fontSize: 16,
  },
  value: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.bold as any,
  },
  limit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'normal',
  },
  track: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});