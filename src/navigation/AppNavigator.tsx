import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'; // <--- Import DefaultTheme
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { COLORS } from '../constants/theme';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScanScreen from '../screens/ScanScreen';
import ScanResultScreen from '../screens/ScanResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RecipeCalculatorScreen from '../screens/RecipeCalculatorScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// 0. CREATE THE VITAL CURATOR THEME
// This follows the new design system with tonal depth and editorial feel
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.surface, // Global background (#F9F9F9)
    card: COLORS.surface,       // Sets stack card to surface color
    text: COLORS.on_surface,    // Primary text color
    border: COLORS.outline_variant, // Ghost borders
    primary: COLORS.primary,     // Vital green
    notification: COLORS.primary_container, // Fresh leaf green
  },
};

// 1. Scan Stack
function ScanStackNavigator() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="ScanCamera" component={ScanScreen} />
      <ScanStack.Screen name="ScanResult" component={ScanResultScreen} />
      <ScanStack.Screen name="RecipeCalculator" component={RecipeCalculatorScreen} />
    </ScanStack.Navigator>
  );
}

// 2. Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.outline_variant,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.on_surface_variant,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          paddingBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />;
          } else if (route.name === 'History') {
            return <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />;
          } else if (route.name === 'Scan') {
            return (
              <View style={{
                top: -15,
                justifyContent: 'center',
                alignItems: 'center',
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: COLORS.primary,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 5,
              }}>
                <Ionicons name="barcode-outline" size={30} color="#FFFFFF" />
              </View>
            );
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Scan" component={ScanStackNavigator} options={{ tabBarLabel: () => null }} /> 
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Logs' }} />
    </Tab.Navigator>
  );
}

// 3. Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// 4. Root Stack
function RootNavigator({ initialRouteName }: { initialRouteName: string }) {
  return (
    <RootStack.Navigator 
      initialRouteName={initialRouteName} 
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      
      <RootStack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          headerShown: true, 
          title: "Profile",
          animation: 'slide_from_right', 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerStyle: { backgroundColor: COLORS.surface }, 
          headerTintColor: COLORS.on_surface,
          headerShadowVisible: false,
        }}
      />
    </RootStack.Navigator>
  );
}

// 5. Main App Entry
export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const docRef = doc(db, "user_profiles", u.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            setHasProfile(false);
          } else {
            const data: any = docSnap.data();
            setHasProfile(Boolean(data?.profileVersion && data.profileVersion >= 2));
          }
        } catch (e) {
          setHasProfile(false);
        }
      } else {
        setHasProfile(false);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading || (user && hasProfile === null)) {
    return (
      <View style={{flex:1, backgroundColor: COLORS.surface, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    // APPLY THE THEME HERE
    <NavigationContainer theme={AppTheme}>
      {user ? (
        <RootNavigator initialRouteName={hasProfile ? "MainTabs" : "Onboarding"} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}