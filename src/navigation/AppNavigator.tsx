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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ScanStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// 0. CREATE THE DARK THEME
// This fixes the white flash during transitions
// 0. CREATE THE DARK THEME
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background, // Global background
    card: COLORS.background,       // <--- THIS FIXES THE FLASH (Sets stack card to dark)
    text: COLORS.textPrimary,
    border: '#333',
  },
};
// 1. Scan Stack
function ScanStackNavigator() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="ScanCamera" component={ScanScreen} />
      <ScanStack.Screen name="ScanResult" component={ScanResultScreen} />
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
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'scan-circle' : 'scan-circle-outline';
            size = 35;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanStackNavigator} /> 
      <Tab.Screen name="History" component={HistoryScreen} />
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
          headerStyle: { backgroundColor: COLORS.background }, 
          headerTintColor: COLORS.textPrimary,
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
          setHasProfile(docSnap.exists());
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
      <View style={{flex:1, backgroundColor: COLORS.background, justifyContent:'center', alignItems:'center'}}>
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