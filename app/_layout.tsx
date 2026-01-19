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
    // 1. Vérification initiale de la session au démarrage
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
          
          // On coupe le rendu pour éviter de charger les onglets sans session
          setIsReady(false); 

          // Redirection immédiate vers le choix du rôle
          setTimeout(() => {
            router.replace('/setup-profile' as any);
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); 
  
  // ✅ Écran de transition blanc pour remplacer le bug turquoise (+not-found)
  // On ne montre rien (ou un spinner) tant que la session n'est pas vérifiée ou si on déconnecte
  if (!isReady || !sessionInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return <Slot />;
}