import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase'; 

// On maintient le Splash Screen affiché au démarrage
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Vérifier la session Supabase
        const { data } = await supabase.auth.getSession();
        setSession(data.session);

        // 2. Pause pour le logo DIOMY
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn("Erreur au chargement:", e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // ✅ LOGIQUE DE NAVIGATION SANS ERREUR TS
  useEffect(() => {
    if (!appIsReady) return;

    // TypeScript nous dit que segments[0] peut être "auth" ou "(tabs)" etc.
    // On force la vérification sur "auth" sans les parenthèses
    const currentSegment = segments[0] as string;
    const inAuthGroup = currentSegment === 'auth';

    if (session) {
      // Si connecté et encore dans les pages de connexion -> Go vers la carte
      if (inAuthGroup) {
        router.replace('/(tabs)/map' as any);
      }
    } else {
      // Si non connecté et pas dans auth -> Go vers le choix du profil
      if (!inAuthGroup) {
        router.replace('/auth/setup-profile' as any); 
      }
    }

    SplashScreen.hideAsync();
  }, [appIsReady, session, segments]);

  if (!appIsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" /> 
      
      <Stack screenOptions={{ headerShown: false }}>
        {/* ✅ Ici on garde les noms exacts des Stack.Screen */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="become-driver" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}