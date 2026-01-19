import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  // ✅ AJOUT DU VERROU : Empêche l'app de relancer la logique si elle est déjà en cours
  const hasNavigated = useRef(false);

  useEffect(() => {
    async function checkInitialRoute() {
      // Si on a déjà lancé une navigation, on sort immédiatement
      if (hasNavigated.current) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // On marque que la décision est prise AVANT de l'exécuter
        hasNavigated.current = true;
        
        if (session) {
          // @ts-ignore
          router.replace('/(tabs)/map');
        } else {
          // @ts-ignore
          router.replace('/(auth)/setup-profile');
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la session:", error);
        // En cas d'erreur, on force le profil par sécurité, mais une seule fois
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          // @ts-ignore
          router.replace('/(auth)/setup-profile');
        }
      }
    }

    checkInitialRoute();
  }, []); // S'exécute uniquement au montage initial

  return null; 
}