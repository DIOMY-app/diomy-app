import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator } from 'react-native';
// ✅ CORRECTION DE L'IMPORT : Vérifie bien que le nom du fichier est identique (Majuscule/Minuscule)
import MapDisplay from '../../components/MapDisplay.native'; 
import { supabase } from '../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MapScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchUserAndStatus();
  }, []);

  async function fetchUserAndStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/(auth)/login" as any);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const roleClean = (profile.role || "").toLowerCase().trim();
        const statusClean = (profile.status || "").toLowerCase().trim();
        const isDriver = ['chauffeur', 'conducteur', 'conducteurs'].includes(roleClean);

        if (isDriver) {
          if (statusClean === 'valide') {
            setRole('chauffeur');
          } else {
            router.replace("/become-driver" as any);
            return; 
          }
        } else {
          setRole('passager');
        }
      }
    } catch (error) {
      console.error("Erreur MapScreen:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={{ flex: 1 }}>
        {/* ✅ MapDisplay gère désormais toute la logique temps réel en interne 
            On lui passe les paramètres de destination s'ils existent (favoris) */}
        <MapDisplay 
            userRole={role} 
            initialDestination={params.address ? {
              address: params.address as string,
              lat: params.lat ? parseFloat(params.lat as string) : undefined,
              lon: params.lon ? parseFloat(params.lon as string) : undefined
            } : undefined} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});