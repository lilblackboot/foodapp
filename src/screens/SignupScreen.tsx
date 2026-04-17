import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet,  
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, FONTS, BORDER_RADIUS, ELEVATION } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
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
      // the Navigator should correctly send them to Onboarding automatically.
      Alert.alert("Success", "Account created successfully!");
    } catch (error) {
      Alert.alert("Error", "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    Alert.alert("Google Sign Up", "Google sign-up will be implemented");
  };

  const handleAppleSignUp = () => {
    Alert.alert("Apple Sign Up", "Apple sign-up will be implemented");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section with Asymmetry */}
          <View style={styles.heroSection}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>Nutriwise</Text>
              <Text style={styles.brandSubtitle}>Begin your wellness journey today</Text>
            </View>
            
            {/* Asymmetrical decorative elements */}
            <View style={[styles.accentCircle, styles.accentCircle1]} />
            <View style={[styles.accentCircle, styles.accentCircle2]} />
          </View>

          {/* Signup Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Create account</Text>
            <Text style={styles.welcomeSubtext}>Start nourishing with intention</Text>
            
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.on_surface_variant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.on_surface_variant}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.on_surface_variant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={COLORS.on_surface_variant}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.on_surface_variant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.on_surface_variant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.on_surface_variant} 
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.on_surface_variant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.on_surface_variant}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.on_surface_variant} 
                />
              </TouchableOpacity>
            </View>

            {/* Terms and Conditions */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Primary Signup Button */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleSignup}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary_container]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Signup Buttons */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignUp}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-google" size={20} color={COLORS.on_surface} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignUp}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-apple" size={20} color={COLORS.on_surface} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.spacing_6, // 24px outer padding
    paddingTop: SPACING.xxxl, // 64px top breathing room
  },
  
  // Hero Section with Editorial Asymmetry
  heroSection: {
    marginBottom: SPACING.spacing_16, // 64px major separation
    position: 'relative',
  },
  brandContainer: {
    paddingTop: SPACING.xxl, // 48px
    paddingBottom: SPACING.l, // 24px
  },
  brandTitle: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.display_md, // 44px - slightly smaller for signup
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
    lineHeight: 52,
    marginBottom: SPACING.s,
  },
  brandSubtitle: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_lg, // 16px
    color: COLORS.on_surface_variant,
    fontWeight: FONTS.weight_regular,
  },
  accentCircle: {
    position: 'absolute',
    borderRadius: 60,
    backgroundColor: COLORS.primary_container,
    opacity: 0.1,
  },
  accentCircle1: {
    width: 120,
    height: 120,
    top: -20,
    right: -30,
  },
  accentCircle2: {
    width: 80,
    height: 80,
    bottom: -10,
    left: 20,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
  },

  // Form Card - Tonal Layering
  formCard: {
    backgroundColor: COLORS.surface_container_lowest, // White card
    borderRadius: BORDER_RADIUS.xl, // 24px for major sections
    padding: SPACING.xxl, // 48px
    marginBottom: SPACING.xl,
    ...ELEVATION.card,
  },
  welcomeText: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.headline_lg, // 32px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_surface,
    marginBottom: SPACING.s,
  },
  welcomeSubtext: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface_variant,
    marginBottom: SPACING.xxl, // 48px
    lineHeight: 20,
  },

  // Floating Input Fields
  inputContainer: {
    backgroundColor: COLORS.surface_container_highest, // #E2E2E2
    borderRadius: BORDER_RADIUS.lg, // 16px
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    marginBottom: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface,
    marginLeft: SPACING.s,
  },
  inputIcon: {
    marginRight: SPACING.s,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },

  // Terms and Conditions
  termsContainer: {
    marginBottom: SPACING.xl, // 24px
  },
  termsText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm, // 12px
    color: COLORS.on_surface_variant,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: FONTS.weight_medium,
  },

  // Primary Button with Gradient
  primaryButton: {
    borderRadius: BORDER_RADIUS.xl, // 24px
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.display,
    fontSize: TYPOGRAPHY.body_lg, // 16px
    fontWeight: FONTS.weight_bold,
    color: COLORS.on_primary,
  },

  // Divider - No lines, using space and typography
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outline_variant,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.label_sm, // 11px
    color: COLORS.on_surface_variant,
    paddingHorizontal: SPACING.m,
  },

  // Social Buttons
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.m,
  },
  socialButton: {
    flex: 1,
    backgroundColor: COLORS.surface_variant,
    borderRadius: BORDER_RADIUS.lg, // 16px
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.ghost_border,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
  },
  socialButtonText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface,
    fontWeight: FONTS.weight_medium,
  },

  // Sign In Link
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  signInText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface_variant,
  },
  signInLink: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.primary,
    fontWeight: FONTS.weight_bold,
  },
});