import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    // 1. Vérification initiale de la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionInitialized(true);
      setIsReady(true);
    });

    // 2. Écouteur des changements de session (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth détecté:', event);
        
        const currentPath = segments.join('/');
        
        // Redirection après Connexion
        if (event === 'SIGNED_IN' && session) {
          const isAtStartPages = currentPath.includes('login') || currentPath.includes('setup-profile') || currentPath === "";
          if (isAtStartPages) {
            router.replace('/(tabs)/map' as any);
          }
        }
        
        // Redirection après Déconnexion (Correction boucle turquoise)
        if (event === 'SIGNED_OUT') {
          console.log("👋 Déconnexion : Nettoyage et redirection forcée");
          
          // ON COUPE LE RENDU IMMÉDIATEMENT
          setIsReady(false); 

          // Redirection immédiate
          router.replace('/setup-profile' as any);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); 
  
  // ✅ On ne montre PAS le Slot si on est en déconnexion ou non initialisé
  if (!isReady || !sessionInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return <Slot />;
}