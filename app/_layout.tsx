import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // ✅ CORRECTION : On vérifie si 'auth' est présent dans le segment, peu importe sa forme
      const currentSegment = segments[0] ? (segments[0] as string) : "";
      const inAuthGroup = currentSegment.includes('auth');
      
      if (!session && !inAuthGroup) {
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      } else if (session && inAuthGroup) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentSegment = segments[0] ? (segments[0] as string) : "";
      const inAuthGroup = currentSegment.includes('auth');
      
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
  }, [segments]); // Les segments sont la clé ici

  return <Slot />;
}