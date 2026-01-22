import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { calculateDailyNutritionGoals, calculateBMI } from '../services/nutritionCalculator';

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Delete Account Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Profile State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [diseases, setDiseases] = useState<string[]>([]);
  const [bmi, setBmi] = useState(0);
  
  const diseaseOptions = ["Diabetes", "Hypertension", "Celiac", "None"];

  // 1. MOVE LOGOUT TO THE NATIVE HEADER
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 8 }}>
          <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>Log Out</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "user_profiles", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        console.log("✅ Profile data loaded:", data);
        
        setName(data.name);
        setAge(data.age.toString());
        setWeight(data.weight.toString());
        setHeight(data.height.toString());
        setDiseases(data.diseases || ["None"]);
        setBmi(data.bmi || 0);
      }
    } catch (e) {
      console.error("❌ Error fetching profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDisease = (d: string) => {
    if (!isEditing) return; 

    if (d === "None") {
      setDiseases(["None"]);
    } else {
      let newDiseases = diseases.filter(item => item !== "None");
      if (newDiseases.includes(d)) {
        newDiseases = newDiseases.filter(item => item !== d);
      } else {
        newDiseases.push(d);
      }
      setDiseases(newDiseases.length > 0 ? newDiseases : ["None"]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const weightKg = parseFloat(weight);
      const heightCm = parseFloat(height);
      const ageYears = parseInt(age);

      // Calculate BMI
      const bmi = calculateBMI(weightKg, heightCm);

      // Check if user has hypertension for sodium limit adjustment
      const hasHypertension = diseases.includes("Hypertension");

      // Recalculate daily nutrition goals based on updated stats
      const nutritionGoals = calculateDailyNutritionGoals(
        weightKg,
        heightCm,
        ageYears,
        "male", // Default to male; can add gender selection later
        hasHypertension
      );

      await updateDoc(doc(db, "user_profiles", user.uid), {
        age: ageYears,
        weight: weightKg,
        height: heightCm,
        diseases,
        bmi,
        // Update calculated daily goals and macro limits
        dailyNutritionGoals: {
          calories: nutritionGoals.calories,
          protein: nutritionGoals.protein,
          carbs: nutritionGoals.carbs,
          fat: nutritionGoals.fat,
          sugar: nutritionGoals.sugar,
          sodium: nutritionGoals.sodium,
        },
        customLimits: {
          calories: nutritionGoals.calories,
          protein: nutritionGoals.protein,
          carbs: nutritionGoals.carbs,
          fat: nutritionGoals.fat,
          sugar: nutritionGoals.sugar,
          sodium: nutritionGoals.sodium,
        }
      });
      
      setIsEditing(false);
      Alert.alert("Success", `Profile updated!\n\nDaily Goals:\n• Calories: ${nutritionGoals.calories}\n• Protein: ${nutritionGoals.protein}g\n• Carbs: ${nutritionGoals.carbs}g\n• Fat: ${nutritionGoals.fat}g`);
    } catch (e) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'Delete') {
      Alert.alert('Error', 'Please type "Delete" exactly to confirm.');
      return;
    }

    if (!passwordInput) {
      Alert.alert('Error', 'Please enter your password to confirm deletion.');
      return;
    }

    setDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordInput);
      await reauthenticateWithCredential(user, credential);

      const batch = writeBatch(db);
      const uid = user.uid;

      // Delete user profile
      const profileRef = doc(db, 'user_profiles', uid);
      batch.delete(profileRef);

      // Delete all food logs
      const foodLogsQuery = query(collection(db, 'users', uid, 'food_logs'));
      const foodLogsSnap = await getDocs(foodLogsQuery);
      foodLogsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all daily summaries
      const summariesQuery = query(collection(db, 'users', uid, 'daily_summaries'));
      const summariesSnap = await getDocs(summariesQuery);
      summariesSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Delete user authentication
      await user.delete();

      setDeleteModalVisible(false);
      setDeleteConfirmation('');
      setPasswordInput('');
      
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Please log out and log back in, then try deleting your account again.');
      } else {
        Alert.alert('Error', 'Could not delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary}/></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}> 
      {/* NOTE: We removed 'top' edge so content flows under the header nicely */}
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar / Name Placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "U"}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{auth.currentUser?.email}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.label}>Physical Stats</Text>
          <View style={styles.row}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Age</Text>
              <TextInput 
                value={age} 
                onChangeText={setAge} 
                editable={isEditing} 
                style={[styles.input, isEditing && styles.inputEditable]} 
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight (kg)</Text>
              <TextInput 
                value={weight} 
                onChangeText={setWeight} 
                editable={isEditing} 
                style={[styles.input, isEditing && styles.inputEditable]} 
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Height (cm)</Text>
              <TextInput 
                value={height} 
                onChangeText={setHeight} 
                editable={isEditing} 
                style={[styles.input, isEditing && styles.inputEditable]} 
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Daily Nutrition Goals - REMOVED, now in HomeScreen */}

        {/* Diseases Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Health Conditions</Text>
          <View style={styles.chipContainer}>
            {diseaseOptions.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[
                  styles.chip, 
                  diseases.includes(d) && styles.chipActive,
                  !isEditing && { opacity: 0.8 }
                ]}
                onPress={() => toggleDisease(d)}
                disabled={!isEditing}
              >
                <Text style={[
                  styles.chipText,
                  diseases.includes(d) && styles.chipTextActive
                ]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.actionBtn, isEditing ? {backgroundColor: COLORS.primary} : {backgroundColor: '#333'}]}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={saving}
        >
          <Text style={[styles.btnText, !isEditing && {color: COLORS.primary}]}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
          </Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={styles.deleteBtnText}>Delete My Account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={COLORS.danger} />
              <Text style={styles.modalTitle}>Delete Account?</Text>
            </View>
            
            <Text style={styles.modalWarning}>
              This action cannot be undone. All your data including:
            </Text>
            
            <View style={styles.warningList}>
              <Text style={styles.warningItem}>• Profile information</Text>
              <Text style={styles.warningItem}>• Food history</Text>
              <Text style={styles.warningItem}>• Daily summaries</Text>
              <Text style={styles.warningItem}>• Account access</Text>
            </View>
            
            <Text style={styles.modalInstruction}>
              Type "Delete" below to confirm:
            </Text>
            
            <TextInput 
              style={styles.confirmInput}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type Delete"
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />

            <Text style={styles.modalInstruction}>
              Enter your password to confirm:
            </Text>
            
            <TextInput 
              style={styles.confirmInput}
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity 
                style={styles.cancelModalBtn} 
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmation('');
                  setPasswordInput('');
                }}
                disabled={deleting}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmModalBtn, 
                  deleteConfirmation === 'Delete' && passwordInput ? styles.confirmModalBtnActive : styles.confirmModalBtnDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== 'Delete' || !passwordInput}
              >
                <Text style={styles.confirmModalBtnText}>
                  {deleting ? "Deleting..." : "Delete Account"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SPACING.l },
  
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.m },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.s, borderWidth: 1, borderColor: COLORS.primary },
  avatarText: { fontSize: 32, color: COLORS.primary, fontWeight: 'bold' },
  name: { fontSize: 20, color: COLORS.textPrimary, fontWeight: 'bold' },
  email: { color: COLORS.textSecondary },

  section: { marginBottom: SPACING.xl },
  label: { color: COLORS.textSecondary, marginBottom: SPACING.m, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  
  row: { flexDirection: 'row', gap: SPACING.m },
  statBox: { flex: 1 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.surface, color: COLORS.textPrimary, padding: SPACING.m, borderRadius: 12, fontSize: 16, textAlign: 'center' },
  inputEditable: { borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#1A1A1A' },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  chipText: { color: COLORS.textSecondary },
  chipTextActive: { color: '#000', fontWeight: 'bold' },

  actionBtn: { padding: SPACING.m, borderRadius: 12, alignItems: 'center', marginTop: SPACING.s },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Delete Account Button
  deleteBtn: { 
    padding: SPACING.m, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: SPACING.l,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  deleteBtnText: { 
    color: COLORS.danger, 
    fontWeight: 'bold', 
    fontSize: 16 
  },

  // Delete Modal Styles
  modalBg: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: SPACING.l
  },
  modalCard: { 
    width: '100%', 
    maxWidth: 400,
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.m
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.s
  },
  modalWarning: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.m
  },
  warningList: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: SPACING.m,
    borderRadius: 8,
    marginBottom: SPACING.m
  },
  warningItem: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  modalInstruction: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.s
  },
  confirmInput: {
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    padding: SPACING.m,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: SPACING.l
  },
  modalBtns: { 
    flexDirection: 'row', 
    gap: SPACING.m 
  },
  cancelModalBtn: {
    flex: 1,
    padding: SPACING.m,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center'
  },
  cancelModalBtnText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600'
  },
  confirmModalBtn: {
    flex: 1,
    padding: SPACING.m,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmModalBtnActive: {
    backgroundColor: COLORS.danger
  },
  confirmModalBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5
  },
  confirmModalBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold'
  }
});