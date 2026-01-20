import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Alert } from 'react-native';
import MapDisplay from '../../components/MapDisplay.native'; 
import { supabase } from '../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MapScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<string | null>(null);
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
        setUserStatus(statusClean);

        const isDriver = ['chauffeur', 'conducteur', 'conducteurs'].includes(roleClean);

        if (isDriver) {
          // ✅ MODIFICATION : On autorise l'accès à la carte même en attente
          if (statusClean === 'valide' || statusClean === 'en_attente_validation') {
            setRole('chauffeur');
            
            // Petit message informatif discret la première fois
            if (statusClean === 'en_attente_validation') {
              console.log("DIOMY - Chauffeur en attente sur la carte (Mode Consultation)");
            }
          } else {
            // Si c'est un nouveau chauffeur sans dossier, direction formulaire
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
        {/* ✅ On passe le status à MapDisplay pour qu'il puisse griser le bouton "En Ligne" */}
        <MapDisplay 
            userRole={role} 
            userStatus={userStatus} // On ajoute cette prop
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