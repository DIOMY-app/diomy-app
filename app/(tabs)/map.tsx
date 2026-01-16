import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Text } from 'react-native';
// MODIFICATION ICI : On enlève le ".native" pour laisser Expo choisir le bon fichier selon la plateforme
import MapDisplay from '../../components/MapDisplay'; 
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function MapScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
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
              console.log("DIOMY LOG - Conducteur validé");
              setRole('chauffeur');
            } else {
              console.log("DIOMY LOG - Conducteur NON validé : Redirection forcée");
              router.replace("/become-driver" as any);
              return; 
            }
          } else {
            console.log("DIOMY LOG - Mode Passager");
            setRole('passager');
          }
        }
      } catch (error) {
        console.error("Erreur MapScreen:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndStatus();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={{ marginTop: 10, color: '#1e3a8a', fontWeight: 'bold' }}>Vérification DIOMY...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <MapDisplay userRole={role} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }
});