import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    console.log('⚠️ Route non trouvée ou changement de structure - Redirection...');
    
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // @ts-ignore
          router.replace('/(tabs)/map');
        } else {
          // ✅ CORRECTION : On pointe vers la nouvelle route racine
          // @ts-ignore
          router.replace('/setup-profile'); 
        }
      }).catch(() => {
        // @ts-ignore
        router.replace('/setup-profile');
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#009199' }}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{ marginTop: 10, color: '#ffffff', fontSize: 16 }}>
        Chargement de DIOMY...
      </Text>
    </View>
  );
}