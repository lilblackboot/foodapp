import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, StyleSheet, Alert, ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { getFoodsByDate, deleteFoodItem, updateFoodServing } from '../services/firebaseHelper';
import { FoodItem } from '../types';
import { COLORS, SPACING, FONTS } from '../constants/theme';

interface FoodListProps {
  currentDate: string;
  refreshTrigger: number | boolean;
  onUpdate?: () => void;
}

const FoodList: React.FC<FoodListProps> = ({ currentDate, refreshTrigger, onUpdate }) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [newServing, setNewServing] = useState('');

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
      <Text style={styles.headerTitle}>Eaten Today</Text>
      
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    color: COLORS.textPrimary 
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10
  },
  
  // List Item Styles
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

  // Modal Styles
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
  saveTxt: { fontSize: 16, color: '#000', fontWeight: 'bold' }
});

export default FoodList;