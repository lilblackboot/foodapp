// src/screens/ScanScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING } from '../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Reset scanner when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
    }, [])
  );

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: any) => {
    if (scanned) return;
    setScanned(true);
    
    // Navigate to Result Screen (We will build this next)
    // For now, we pass the barcode to the next screen
    navigation.navigate('ScanResult', { barcode: data });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"], // Standard food barcodes
        }}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlay}>
        <View style={styles.topContent}>
          <Text style={styles.hintText}>Scan a food barcode</Text>
        </View>
        
        {/* The Viewfinder Square */}
        <View style={styles.scannerFrame} />
        
        <View style={styles.bottomContent}>
           {/* Option 1: Test without barcode */}
          <TouchableOpacity 
             onPress={() => navigation.navigate('ScanResult', { barcode: 'TEST_COKE' })}
             style={styles.optionButton}
          >
            <MaterialIcons name="qr-code" size={20} color={COLORS.primary} />
            <Text style={styles.optionText}>No Barcode? Test Here</Text>
          </TouchableOpacity>

          {/* Option 2: Calculate Recipe Nutrition */}
          <TouchableOpacity 
             onPress={() => navigation.navigate('RecipeCalculator')}
             style={styles.optionButton}
          >
            <MaterialIcons name="restaurant-menu" size={20} color={COLORS.secondary} />
            <Text style={styles.optionText}>Calculate Recipe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  message: { textAlign: 'center', paddingBottom: 10, color: 'white' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', alignItems: 'center' },
  topContent: { paddingTop: 60, alignItems: 'center' },
  hintText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // Create a transparent hole in the middle
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  
  bottomContent: { paddingBottom: 50, gap: 15 },
  optionButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  optionText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  manualButton: { padding: 10 },
  manualText: { color: COLORS.primary, fontSize: 16, textDecorationLine: 'underline' }
});