// src/screens/OnboardingScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // [UPDATED] Added getDoc
import { auth, db } from '../services/firebaseConfig';
import { COLORS, SPACING, FONTS } from '../constants/theme';

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(1); // 1: Age, 2: Height, 3: Weight, 4: Diseases
  const [loading, setLoading] = useState(true); // Start true to check profile first

  // Data State
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [diseases, setDiseases] = useState<string[]>([]);

  const diseaseOptions = ["Diabetes", "Hypertension", "Celiac", "None"];

  // [NEW] Safety Check: If profile exists, skip Onboarding
  useEffect(() => {
    const checkExistingProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "user_profiles", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Profile exists! Redirect to Home immediately.
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
            return;
          }
        } catch (e) {
          console.log("Error checking profile:", e);
        }
      }
      // No profile found? Allow them to start onboarding.
      setLoading(false);
    };

    checkExistingProfile();
  }, []);

  const handleNext = async () => {
    // Validation
    if (step === 1 && !age) return Alert.alert("Required", "Please enter your age.");
    if (step === 2 && !height) return Alert.alert("Required", "Please enter your height.");
    if (step === 3 && !weight) return Alert.alert("Required", "Please enter your weight.");

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final Step: Save to Firestore
      finishOnboarding();
    }
  };

  const toggleDisease = (d: string) => {
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

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Calculate BMI
      const h_m = parseFloat(height) / 100;
      const bmi = parseFloat((parseFloat(weight) / (h_m * h_m)).toFixed(1));

      // Create the User Profile Document
      await setDoc(doc(db, "user_profiles", user.uid), {
        // USE THE AUTH DISPLAY NAME WE SAVED IN SIGNUP
        name: user.displayName || user.email?.split('@')[0] || "User", 
        email: user.email,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        diseases: diseases.length > 0 ? diseases : ["None"],
        bmi: bmi,
        createdAt: new Date()
      });

      // Navigate to the Main App
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  // If we are checking the database, show a loader instead of the form
  if (loading) {
    return (
      <View style={{flex:1, backgroundColor: COLORS.background, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // UI Components for each step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.question}>How old are you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Age (years)"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              autoFocus
            />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.question}>How tall are you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="number-pad"
              value={height}
              onChangeText={setHeight}
              autoFocus
            />
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.question}>What is your weight?</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="number-pad"
              value={weight}
              onChangeText={setWeight}
              autoFocus
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.question}>Any health conditions?</Text>
            <Text style={styles.subtext}>This helps us identify risky foods for you.</Text>
            <View style={styles.chipContainer}>
              {diseaseOptions.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.chip,
                    diseases.includes(d) && styles.chipActive
                  ]}
                  onPress={() => toggleDisease(d)}
                >
                  <Text style={[
                    styles.chipText,
                    diseases.includes(d) && styles.chipTextActive
                  ]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(step / 4) * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {renderStepContent()}
      </View>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
          disabled={loading}
        >
           <Text style={styles.nextText}>{step === 4 ? "Finish" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  progressContainer: { height: 4, backgroundColor: '#333', width: '100%' },
  progressBar: { height: '100%', backgroundColor: COLORS.primary },

  content: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  
  question: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.l },
  subtext: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  
  input: { 
    fontSize: 40, 
    color: COLORS.primary, 
    borderBottomWidth: 2, 
    borderBottomColor: COLORS.primary, 
    paddingBottom: SPACING.s,
    textAlign: 'center'
  },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: '#444', backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 16 },
  chipTextActive: { color: '#000', fontWeight: 'bold' },

  footer: { padding: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { padding: SPACING.m },
  backText: { color: COLORS.textSecondary, fontSize: 16 },
  
  nextButton: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 32, 
    paddingVertical: 16, 
    borderRadius: 30,
    marginLeft: 'auto' 
  },
  nextText: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});