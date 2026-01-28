import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // ✅ On réduit le délai au strict minimum pour éviter de voir l'écran trop longtemps
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('🔄 NotFound : Session trouvée, retour Map');
        router.replace('/(tabs)/map' as any);
      } else {
        console.log('🔄 NotFound : Pas de session, retour Setup');
        router.replace('/setup-profile' as any);
      }
    }, 10); // 10ms suffisent pour éviter les conflits de rendu

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      {/* ✅ Changement du fond en BLANC (#fff) pour que la transition soit invisible 
          si le _layout affiche aussi un écran blanc */}
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text style={{ marginTop: 10, color: '#1e3a8a', fontSize: 14 }}>
        Synchronisation...
      </Text>
    </View>
  );
}