import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // ✅ Écouteur des changements de session (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth détecté:', event);
        
        // On transforme les segments en texte pour faciliter la recherche
        const currentPath = segments.join('/');
        
        // 1. Redirection après Connexion réussie
        if (event === 'SIGNED_IN' && session) {
          // On vérifie si le chemin actuel contient 'login' ou 'setup-profile'
          const isAtStartPages = currentPath.includes('login') || currentPath.includes('setup-profile');
          
          if (isAtStartPages) {
            // @ts-ignore
            router.replace('/(tabs)/map');
          }
        }
        
        // 2. Redirection après Déconnexion
        if (event === 'SIGNED_OUT') {
          // @ts-ignore
          // On renvoie vers la racine simplifiée
          router.replace('/setup-profile');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); // Surveille les segments pour savoir quand agir
  
  return <Slot />;
}