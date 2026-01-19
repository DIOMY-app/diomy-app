import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ AMÉLIORATION : On vérifie si "auth" est présent n'importe où dans le chemin
      const inAuthGroup = segments.some(segment => segment.includes('auth'));
      
      if (!session && !inAuthGroup) {
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      } else if (session && inAuthGroup) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments.some(segment => segment.includes('auth'));
      
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
  }, [segments]); // On réagit à chaque micro-changement de segment

  return <Slot />;
}