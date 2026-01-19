import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // ✅ On écoute les événements d'authentification (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth:', event);
        
        // 1. Si l'utilisateur vient de se connecter
        if (event === 'SIGNED_IN' && session) {
          // On ne redirige vers la Map que si l'utilisateur est encore dans les pages d'authentification
          const inAuthGroup = segments.some(s => s.includes('auth'));
          if (inAuthGroup) {
            // @ts-ignore
            router.replace('/(tabs)/map');
          }
        }
        
        // 2. Si l'utilisateur se déconnecte
        if (event === 'SIGNED_OUT') {
          // @ts-ignore
          router.replace('/(auth)/setup-profile');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); // On surveille les segments pour savoir où on se trouve lors d'un événement
  
  return <Slot />;
}