import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { View, ActivityIndicator, Text } from 'react-native';

export default function TabLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log("DIOMY LOG - ID Utilisateur connecté :", user.id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(); 

          if (error) {
            console.error("DIOMY LOG - Erreur base de données:", error.message);
          }

          if (data) {
            console.log("DIOMY LOG - Rôle brut récupéré :", data.role);
            // On nettoie le rôle pour la comparaison (minuscules et sans espaces)
            setRole(data.role?.toLowerCase().trim());
          }
        }
      } catch (error) {
        console.error("DIOMY LOG - Erreur critique Layout:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getUserRole();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={{ marginTop: 10, color: '#1e3a8a', fontWeight: 'bold' }}>Chargement DIOMY...</Text>
      </View>
    );
  }

  // CORRECTION : On ajoute 'conducteurs' avec un S pour correspondre à ta base de données
  const isDriver = role === 'chauffeur' || role === 'conducteur' || role === 'conducteurs';

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1e3a8a', 
      headerShown: false,
      tabBarStyle: { height: 65, paddingBottom: 10, paddingTop: 5 }
    }}>
      {/* 1. Cache l'index par défaut */}
      <Tabs.Screen
        name="index"
        options={{ href: null as any }} 
      />
      
      {/* 2. Onglet Carte (Commun) */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />

      {/* 3. Onglet Finance (Visible si chauffeur, conducteur ou conducteurs) */}
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Revenus',
          href: isDriver ? "/finance" as any : null as any,
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
        }}
      />

      {/* 4. Onglet Profil (Commun) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />

      {/* 5. Sécurité : Désactivation de l'ancien nom d'onglet "portefeuille" */}
      <Tabs.Screen 
        name="portefeuille" 
        options={{ href: null as any }} 
      />
    </Tabs>
  );
}