import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ✅ Écouteur des changements de session (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth détecté:', event);
        
        const currentPath = segments.join('/');
        
        // 1. Redirection après Connexion réussie
        if (event === 'SIGNED_IN' && session) {
          const isAtStartPages = currentPath.includes('login') || currentPath.includes('setup-profile') || currentPath === "";
          
          if (isAtStartPages) {
            // ✅ Fix TS avec 'as any' pour la nouvelle structure
            router.replace('/(tabs)/map' as any);
          }
        }
        
        // 2. Redirection après Déconnexion (Fix de la boucle turquoise)
        if (event === 'SIGNED_OUT') {
          console.log("👋 Déconnexion : Nettoyage et redirection forcée");
          
          // On bloque le rendu pour éviter de charger les onglets sans session
          setIsReady(false); 

          // Redirection immédiate vers le choix du rôle
          setTimeout(() => {
            router.replace('/setup-profile' as any);
          }, 0);
        }
      }
    );

    // On marque l'application comme prête au démarrage
    setIsReady(true);

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); 
  
  // ✅ Écran de transition blanc pour remplacer le bug turquoise (+not-found)
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return <Slot />;
}