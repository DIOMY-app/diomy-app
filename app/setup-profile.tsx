import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetupProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const selectRoleAndProceed = async (role: 'passager' | 'chauffeur') => {
    if (loading) return; 
    
    setLoading(true);
    
    try {
      // 1. Sauvegarder le rôle choisi
      await AsyncStorage.setItem('user_role', role);
      
      // 2. Petit délai pour l'UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 3. ✅ NAVIGATION DIRECTE (Aplatissement)
      // On utilise 'as any' pour ignorer l'erreur TypeScript 2322 
      // jusqu'au prochain redémarrage du serveur Expo qui regenerera les types.
      router.replace({
        pathname: '/login' as any, 
        params: { role: role }
      });
      
    } catch (error) {
      console.error('🔴 Error during role selection:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Préparation de votre compte...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BIENVENUE SUR DIOMY</Text>
        <Text style={styles.subtitle}>Sélectionnez comment vous souhaitez utiliser l'application à Korhogo</Text>

        <View style={styles.cardsContainer}>
          {/* CARTE PASSAGER */}
          <TouchableOpacity 
            style={[styles.card, { borderLeftColor: '#1e3a8a', borderLeftWidth: 8 }]} 
            onPress={() => selectRoleAndProceed('passager')}
            activeOpacity={0.7}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
              <FontAwesome5 name="user" size={35} color="#1e3a8a" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Je suis un Passager</Text>
              <Text style={styles.cardDesc}>Je souhaite commander une moto</Text>
            </View>
          </TouchableOpacity>

          {/* CARTE CHAUFFEUR */}
          <TouchableOpacity 
            style={[styles.card, { borderLeftColor: '#f59e0b', borderLeftWidth: 8 }]} 
            onPress={() => selectRoleAndProceed('chauffeur')}
            activeOpacity={0.7}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="motorbike" size={55} color="#f59e0b" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Je suis un Conducteur</Text>
              <Text style={styles.cardDesc}>Je propose mes services de transport</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#1e3a8a' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#1e3a8a', textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 40, textAlign: 'center', marginTop: 10 },
  cardsContainer: { gap: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTextContainer: { marginLeft: 20, flex: 1 },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});