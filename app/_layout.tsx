import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // TypeScript voit "auth" sans parenthèses dans segments
      const inAuthGroup = segments[0] === 'auth';
      
      if (!session && !inAuthGroup) {
        // @ts-ignore - Route valide mais types Expo Router incomplets
        router.replace('/(auth)/setup-profile');
      } else if (session && inAuthGroup) {
        // @ts-ignore - Route valide mais types Expo Router incomplets
        router.replace('/(tabs)/map');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === 'auth';
      
      if (!session && !inAuthGroup) {
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      } else if (session && inAuthGroup) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [segments]);

  return <Slot />;
}