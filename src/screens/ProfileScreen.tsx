import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { COLORS, SPACING, TYPOGRAPHY, FONTS, BORDER_RADIUS, ELEVATION } from '../constants/theme';
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

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say' | ''>('');
  const [waist, setWaist] = useState('');
  const [activityLevel, setActivityLevel] = useState<'Sedentary' | 'Lightly active' | 'Moderately active' | 'Very active' | ''>('');

  const [onMedication, setOnMedication] = useState<'Yes' | 'No' | ''>('');
  const [medCategories, setMedCategories] = useState<string[]>([]);
  const [medTiming, setMedTiming] = useState<'Before food' | 'After food' | 'Anytime' | ''>('');

  const [dietPattern, setDietPattern] = useState<'Vegetarian' | 'Eggetarian' | 'Non-vegetarian' | 'Vegan' | ''>('');
  const [fastingHabit, setFastingHabit] = useState<'Yes' | 'No' | ''>('');
  const [fastingType, setFastingType] = useState<'Intermittent fasting' | 'Religious fasting' | ''>('');

  const [allergies, setAllergies] = useState<string[]>([]);
  const [smoking, setSmoking] = useState<'Never' | 'Former' | 'Current' | ''>('');
  const [alcohol, setAlcohol] = useState<'Never' | 'Occasionally' | 'Weekly' | 'Daily' | ''>('');
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState<'Low' | 'Medium' | 'High' | ''>('');
  const [packagedFoodFrequency, setPackagedFoodFrequency] = useState<'Rare' | '1–2× weekly' | '3–5× weekly' | 'Daily' | ''>('');
  const [healthGoals, setHealthGoals] = useState<string[]>([]);

  // Options
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const activityOptions = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'];
  const diseaseOptions = ['None', 'Diabetes', 'Hypertension', 'Heart disease', 'Kidney disease', 'Liver disease', 'Thyroid', 'Arthritis', 'Asthma', 'Other'];
  const allergyOptions = ['None', 'Nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Fish', 'Shellfish', 'Other'];
  const smokingOptions = ['Never', 'Former', 'Current'];
  const alcoholOptions = ['Never', 'Occasionally', 'Weekly', 'Daily'];
  const stressOptions = ['Low', 'Medium', 'High'];
  const packagedFoodOptions = ['Rare', '1–2× weekly', '3–5× weekly', 'Daily'];
  const healthGoalOptions = ['Maintain health', 'Fat loss', 'Muscle building', 'Stay fit', 'Reduce sugar intake', 'Reduce salt intake', 'Improve heart health', 'Improve digestion', 'Improve kidney health', 'Improve immunity'];

  // Fetch Profile
  const fetchProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, "user_profiles", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || '');
        setAge(data.age?.toString() || '');
        setWeight(data.weight?.toString() || '');
        setHeight(data.height?.toString() || '');
        setWaist(data.waist?.toString() || '');
        setDob(data.dob || '');
        setGender(data.gender || '');
        setActivityLevel(data.activityLevel || '');
        setOnMedication(data.medication?.onMedication || '');
        setMedCategories(data.medication?.categories || []);
        setMedTiming(data.medication?.timingSensitivity || '');
        setDietPattern(data.diet?.pattern || '');
        setFastingHabit(data.diet?.fastingHabits || '');
        setFastingType(data.diet?.fastingType || '');
        setAllergies(data.allergies || []);
        setSmoking(data.lifestyle?.smoking || '');
        setAlcohol(data.lifestyle?.alcohol || '');
        setSleepHours(data.lifestyle?.sleepHours?.toString() || '');
        setStressLevel(data.lifestyle?.stressLevel || '');
        setPackagedFoodFrequency(data.dailyFoodBehavior?.packagedFoodFrequency || '');
        setHealthGoals(data.healthGoals || []);
        setDiseases(data.diseases || []);

        // Calculate BMI
        if (data.height && data.weight) {
          const calculatedBMI = calculateBMI(data.weight, data.height);
          setBmi(calculatedBMI);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save Profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const profileData = {
        name,
        age: parseInt(age) || 0,
        weight: parseFloat(weight) || 0,
        height: parseFloat(height) || 0,
        waist: parseFloat(waist) || 0,
        dob,
        gender,
        activityLevel,
        medication: {
          onMedication,
          categories: medCategories,
          timingSensitivity: medTiming,
        },
        diet: {
          pattern: dietPattern,
          fastingHabits: fastingHabit,
          fastingType: fastingType,
        },
        allergies,
        lifestyle: {
          smoking,
          alcohol,
          sleepHours: parseFloat(sleepHours) || 0,
          stressLevel,
        },
        dailyFoodBehavior: {
          packagedFoodFrequency,
        },
        healthGoals,
        diseases,
        profileVersion: 2,
      };

      await updateDoc(doc(db, "user_profiles", currentUser.uid), profileData);
      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Multi-select
  const toggleMultiSelect = (item: string, currentList: string[], setter: (list: string[]) => void, noneOption: string) => {
    if (item === noneOption) {
      setter(item === currentList[0] ? [] : [item]);
    } else {
      const newList = currentList.includes(item)
        ? currentList.filter(i => i !== item)
        : [...currentList.filter(i => i !== noneOption), item];
      setter(newList);
    }
  };

  // Toggle Disease (single select)
  const toggleDisease = (disease: string) => {
    setDiseases(disease === diseases[0] ? [] : [disease]);
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Reauthenticate
      const credential = EmailAuthProvider.credential(currentUser.email!, passwordInput);
      await reauthenticateWithCredential(currentUser, credential);

      // Delete user data
      const batch = writeBatch(db);
      
      // Delete profile
      batch.delete(doc(db, "user_profiles", currentUser.uid));
      
      // Delete food logs
      const foodLogsQuery = query(collection(db, 'users', currentUser.uid, 'food_logs'));
      const foodLogsSnapshot = await getDocs(foodLogsQuery);
      foodLogsSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete daily summaries
      const summariesQuery = query(collection(db, 'users', currentUser.uid, 'daily_summaries'));
      const summariesSnapshot = await getDocs(summariesQuery);
      summariesSnapshot.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      // Delete user
      await currentUser.delete();
      
      Alert.alert("Success", "Account deleted successfully");
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert("Error", "Failed to delete account. Please check your password.");
    } finally {
      setDeleting(false);
    }
  };

  // Logout
  const handleLogout = () => {
    auth.signOut();
  };

  // Header setup
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={isEditing ? handleSave : () => setIsEditing(true)} 
          disabled={saving}
          style={{ marginRight: 8 }}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "pencil"} 
            size={20} 
            color={isEditing ? COLORS.primary : (saving ? COLORS.on_surface_variant : COLORS.primary)} 
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditing, saving]);

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "U"}</Text>
            </View>
            {isEditing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.nameInput, styles.inputEditable]}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.on_surface_variant}
              />
            ) : (
              <Text style={styles.profileName}>{name}</Text>
            )}
            <Text style={styles.profileEmail}>{auth.currentUser?.email}</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                editable={isEditing}
                style={[styles.infoValue, isEditing && styles.inputEditable]}
                placeholder="Age"
                placeholderTextColor={COLORS.on_surface_variant}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <View style={styles.chipContainer}>
                {genderOptions.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, gender === g && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setGender(g as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Height (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                editable={isEditing}
                style={[styles.infoValue, isEditing && styles.inputEditable]}
                placeholder="Height"
                placeholderTextColor={COLORS.on_surface_variant}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                editable={isEditing}
                style={[styles.infoValue, isEditing && styles.inputEditable]}
                placeholder="Weight"
                placeholderTextColor={COLORS.on_surface_variant}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>BMI</Text>
              <Text style={styles.infoValue}>{bmi.toFixed(1)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Activity Level</Text>
              <View style={styles.chipContainer}>
                {activityOptions.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, activityLevel === a && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setActivityLevel(a as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, activityLevel === a && styles.chipTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Health Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <View style={styles.chipContainer}>
            {diseaseOptions.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[
                  styles.chip, 
                  diseases.includes(d) && styles.chipActive,
                  !isEditing && { opacity: 0.8 }
                ]}
                onPress={() => isEditing && toggleDisease(d)}
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

        {/* Diet & Lifestyle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diet & Lifestyle</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Diet Pattern</Text>
              <View style={styles.chipContainer}>
                {['Vegetarian', 'Eggetarian', 'Non-vegetarian', 'Vegan'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, dietPattern === d && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setDietPattern(d as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, dietPattern === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Smoking</Text>
              <View style={styles.chipContainer}>
                {smokingOptions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, smoking === s && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setSmoking(s as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, smoking === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Alcohol</Text>
              <View style={styles.chipContainer}>
                {alcoholOptions.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, alcohol === a && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setAlcohol(a as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, alcohol === a && styles.chipTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Sleep Hours</Text>
              <TextInput
                value={sleepHours}
                onChangeText={setSleepHours}
                editable={isEditing}
                style={[styles.infoValue, isEditing && styles.inputEditable]}
                placeholder="Hours"
                placeholderTextColor={COLORS.on_surface_variant}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stress Level</Text>
              <View style={styles.chipContainer}>
                {stressOptions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, stressLevel === s && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                    onPress={() => isEditing && setStressLevel(s as any)}
                    disabled={!isEditing}
                  >
                    <Text style={[styles.chipText, stressLevel === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Health Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Goals</Text>
          <View style={styles.chipContainer}>
            {healthGoalOptions.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, healthGoals.includes(g) && styles.chipActive, !isEditing && { opacity: 0.8 }]}
                onPress={() => isEditing && toggleMultiSelect(g, healthGoals, setHealthGoals, '__none__')}
                disabled={!isEditing}
              >
                <Text style={[styles.chipText, healthGoals.includes(g) && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.on_surface} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={COLORS.error} />
              <Text style={styles.modalTitle}>Delete Account?</Text>
            </View>
            
            <Text style={styles.modalWarning}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            
            <TextInput 
              style={styles.confirmInput}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type 'DELETE' to confirm"
              placeholderTextColor={COLORS.on_surface_variant}
              autoFocus
            />

            <TextInput 
              style={styles.confirmInput}
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.on_surface_variant}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmation('');
                  setPasswordInput('');
                }}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmButton, 
                  deleteConfirmation === 'DELETE' && passwordInput ? styles.confirmButtonActive : styles.confirmButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== 'DELETE' || !passwordInput}
              >
                <Text style={styles.confirmButtonText}>
                  {deleting ? "Deleting..." : "Delete"}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.spacing_6,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary_container,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
  },
  nameInput: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_md,
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    textAlign: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  profileName: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_md,
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    color: COLORS.on_surface_variant,
  },

  // Sections
  section: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_sm,
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    marginBottom: SPACING.l,
  },

  // Info Grid
  infoGrid: {
    gap: SPACING.l,
  },
  infoItem: {
    gap: SPACING.s,
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm,
    color: COLORS.on_surface_variant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    color: COLORS.on_surface,
    paddingVertical: SPACING.s,
  },
  inputEditable: {
    backgroundColor: COLORS.surface_container_low,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.m,
  },

  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
  },
  chip: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.surface_container_low,
    borderWidth: 1,
    borderColor: COLORS.outline_variant,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm,
    color: COLORS.on_surface_variant,
  },
  chipTextActive: {
    color: COLORS.on_primary,
    fontWeight: FONTS.weight_medium,
  },

  // Actions
  actionsSection: {
    gap: SPACING.m,
    marginTop: SPACING.xxl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface_container_low,
  },
  logoutText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    fontWeight: FONTS.weight_medium,
    color: COLORS.on_surface,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.error_container,
  },
  deleteText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    fontWeight: FONTS.weight_medium,
    color: COLORS.error,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
  },
  modalCard: {
    backgroundColor: COLORS.surface_container_lowest,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_md,
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    marginTop: SPACING.m,
  },
  modalWarning: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    color: COLORS.on_surface_variant,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  confirmInput: {
    backgroundColor: COLORS.surface_container_low,
    color: COLORS.on_surface,
    padding: SPACING.m,
    borderRadius: BORDER_RADIUS.md,
    fontSize: TYPOGRAPHY.body_md,
    marginBottom: SPACING.m,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface_container_low,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    fontWeight: FONTS.weight_medium,
    color: COLORS.on_surface,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  confirmButtonActive: {
    backgroundColor: COLORS.error,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.surface_container_highest,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md,
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_primary,
  },
});
