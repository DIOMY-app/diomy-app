import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checkInitialRoute() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // @ts-ignore
        router.replace('/(tabs)/map');
      } else {
        // @ts-ignore
        router.replace('/(auth)/setup-profile');
      }
    }
    checkInitialRoute();
  }, []);

  return null; // On ne rend rien pour ne pas interférer visuellement
}