import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  // Le verrou pour empêcher les doubles redirections sur Android
  const hasNavigated = useRef(false);

  useEffect(() => {
    async function checkInitialRoute() {
      if (hasNavigated.current) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      hasNavigated.current = true;
      
      if (session) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      } else {
        // @ts-ignore
        // ✅ NOUVEAU CHEMIN : On pointe directement vers la racine
        router.replace('/setup-profile');
      }
    }
    
    checkInitialRoute();
  }, []);

  return null;
}