import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyOtpScreen() {
  const { role } = useLocalSearchParams(); 
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    // ✅ NAVIGATION STABILISÉE
    // On pointe directement vers la map dans le groupe tabs. 
    // Cela garantit que l'utilisateur arrive sur la carte immédiatement après validation.
    router.replace({
      pathname: "/(tabs)/map",
      params: { role: role }
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>
            Code pour votre compte {role === 'chauffeur' ? 'Chauffeur' : 'Passager'}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.otpInput}
            placeholder="0000"
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
            autoFocus={true}
          />

          <TouchableOpacity 
            style={[styles.mainButton, { opacity: otp.length === 4 ? 1 : 0.6 }]} 
            onPress={handleVerify}
            disabled={otp.length !== 4}
          >
            <Text style={styles.buttonText}>Confirmer</Text>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, padding: 25 },
  backButton: { marginTop: 10, marginBottom: 20 },
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 10 },
  inputSection: { flex: 1, alignItems: 'center' },
  otpInput: { width: '100%', height: 80, backgroundColor: '#f8fafc', borderRadius: 20, textAlign: 'center', fontSize: 40, fontWeight: 'bold', color: '#1e3a8a', letterSpacing: 20, marginBottom: 40, borderWidth: 1, borderColor: '#e2e8f0' },
  mainButton: { backgroundColor: '#1e3a8a', width: '100%', height: 65, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 10 }
});