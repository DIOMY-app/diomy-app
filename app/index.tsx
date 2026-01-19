import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (isNavigating) return;
    
    setIsNavigating(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // @ts-ignore - Route valide mais types Expo Router incomplets
        router.replace('/(tabs)/map');
      } else {
        // @ts-ignore - Route valide mais types Expo Router incomplets
        router.replace('/(auth)/setup-profile');
      }
    }).catch((error) => {
      console.error('Error checking session:', error);
      // @ts-ignore
      router.replace('/(auth)/setup-profile');
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text style={{ marginTop: 10 }}>Initialisation de DIOMY...</Text>
    </View>
  );
}