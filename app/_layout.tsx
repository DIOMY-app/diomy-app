import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth détecté:', event);
        
        const currentPath = segments.join('/');
        
        // 1. Redirection après Connexion
        if (event === 'SIGNED_IN' && session) {
          // On ajoute la vérification du segment vide "" qui arrive parfois à l'initialisation
          const isAtStartPages = currentPath.includes('login') || currentPath.includes('setup-profile') || currentPath === "";
          
          if (isAtStartPages) {
            // @ts-ignore
            router.replace('/(tabs)/map');
          }
        }
        
        // 2. Redirection après Déconnexion (CORRECTION ICI)
        if (event === 'SIGNED_OUT') {
          console.log("👋 Déconnexion : Nettoyage et redirection");
          
          // On utilise un petit délai de 0ms (setTimeout) pour laisser Supabase 
          // finir de vider le cache local avant de changer de page
          setTimeout(() => {
            // @ts-ignore
            router.replace('/setup-profile');
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); 
  
  return <Slot />;
}