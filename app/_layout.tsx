import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ Correction du typage pour supprimer l'erreur 2367
      const segmentList = segments as string[];
      
      // Si les segments sont en cours de chargement (longueur 0), on attend
      if (segmentList.length === 0) return;

      const inAuthGroup = segmentList.some(segment => segment.includes('auth'));
      
      if (!session && !inAuthGroup) {
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      } else if (session && inAuthGroup) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const segmentList = segments as string[];
      if (segmentList.length === 0) return;

      const inAuthGroup = segmentList.some(segment => segment.includes('auth'));
      
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