import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet,  
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, FONTS, BORDER_RADIUS, ELEVATION } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation is handled automatically by onAuthStateChanged in AppNavigator
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert("Google Sign In", "Google sign-in will be implemented");
  };

  const handleAppleSignIn = () => {
    Alert.alert("Apple Sign In", "Apple sign-in will be implemented");
  };

  const handleForgotPassword = () => {
    const resetEmail = email.trim();

    if (!resetEmail) {
      Alert.alert(
        "Reset Password",
        "Please enter your email address in the field above, then tap Forgot Password again."
      );
      return;
    }

    Alert.alert(
      "Reset Password",
      `Send a password reset link to\n${resetEmail}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Link",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, resetEmail);
              Alert.alert("Email Sent ✓", "Check your inbox for a password reset link.");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
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
              <Text style={styles.brandSubtitle}>Nourish with intention</Text>
            </View>
            
            {/* Asymmetrical decorative element */}
            <View style={styles.accentCircle} />
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.welcomeSubtext}>Sign in to continue your wellness journey</Text>
            
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

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Primary Login Button */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary_container]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-google" size={20} color={COLORS.on_surface} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-apple" size={20} color={COLORS.on_surface} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signUpLink}>Sign up</Text>
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
    fontSize: TYPOGRAPHY.display_lg, // 56px - editorial impact
    fontWeight: FONTS.weight_bold,
    color: COLORS.primary,
    lineHeight: 64,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary_container,
    opacity: 0.1,
    top: -20,
    right: -30,
    // Asymmetrical element breaking boundaries
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

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xl, // 24px
  },
  forgotPasswordText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_sm, // 12px
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

  // Sign Up Link
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  signUpText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.on_surface_variant,
  },
  signUpLink: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.body_md, // 14px
    color: COLORS.primary,
    fontWeight: FONTS.weight_bold,
  },
});