import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    console.log('NotFound screen - Redirecting...');
    
    // Attendre un peu pour laisser l'app se stabiliser
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // @ts-ignore
          router.replace('/(tabs)/map');
        } else {
          // @ts-ignore
          router.replace('/(auth)/setup-profile');
        }
      }).catch(() => {
        // En cas d'erreur, aller vers setup-profile par défaut
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      });
    }, 100);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#009199' }}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{ marginTop: 10, color: '#ffffff', fontSize: 16 }}>
        Chargement de DIOMY...
      </Text>
    </View>
  );
}