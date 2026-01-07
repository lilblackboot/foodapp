import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { COLORS, SPACING, FONTS } from '../constants/theme';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Attach Name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // 3. The AppNavigator will detect the new user.
      // Since "user_profiles" doc does NOT exist yet, 
      // the Navigator should correctly send them to Onboarding.
      
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Nutriwise to eat healthier</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={COLORS.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: SPACING.l },
  card: { backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  input: { backgroundColor: COLORS.background, color: COLORS.textPrimary, padding: SPACING.m, borderRadius: 12, marginBottom: SPACING.m, borderWidth: 1, borderColor: '#333' },
  button: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 12, alignItems: 'center', marginTop: SPACING.s },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.l, textDecorationLine: 'underline' },
});