import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// On maintient le Splash Screen affiché au démarrage pour éviter le flash blanc
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Chargement initial (Supabase, Polices, etc.)
        // On définit un délai de 2.5 secondes pour stabiliser l'affichage du logo DIOMY
        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (e) {
        console.warn("Erreur au chargement du Splash:", e);
      } finally {
        // L'application signale qu'elle est prête
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Une fois prêt, on cache le Splash Screen système
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Tant que l'app n'est pas prête, on ne rend rien (maintient l'image splash.png)
  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* "light" affiche l'heure et la batterie en blanc sur ton fond turquoise/bleu */}
      <StatusBar style="light" /> 
      
      <Stack screenOptions={{ headerShown: false }}>
        {/* Navigation vers les dossiers d'authentification ou les onglets principaux */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}