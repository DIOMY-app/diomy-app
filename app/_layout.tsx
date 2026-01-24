import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';

// 🔔 AJOUT DES IMPORTS NOTIFICATIONS
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configuration du comportement des notifications quand l'app est OUVERTE
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // On ajoute ces deux lignes pour satisfaire TypeScript :
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // 🔔 FONCTION POUR RÉCUPÉRER LE TOKEN
  async function registerForPushNotificationsAsync(userId: string) {
    if (!Device.isDevice) {
      console.log("ℹ️ Notification : Ignoré car simulation");
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log("⚠️ Permission refusée");
        return;
      }

      // Récupération du Token
      const projectId = "89551eb6-93ef-43b2-9854-d4b92b09b1f4"; 
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // Sauvegarde dans Supabase
      if (token) {
        console.log("📡 Tentative d'enregistrement du token...");
        const { error } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);

        if (error) {
          console.error("❌ Erreur Supabase Token:", error.message);
        } else {
          console.log("✅ Token enregistré avec succès dans Supabase !");
        }
      }
    } catch (e) {
      console.error("❌ Erreur critique notification:", e);
    }
  }
  
  useEffect(() => {
    // 1. Vérification initiale de la session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionInitialized(true);
      setIsReady(true);
      
      // 🔔 Si une session existe, on tente d'enregistrer le token
      if (session?.user) {
        registerForPushNotificationsAsync(session.user.id);
      }
    });

    // 2. Écouteur des changements de session (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement Auth détecté:', event);
        
        const currentPath = segments.join('/');
        
        if (event === 'SIGNED_IN' && session) {
          // 🔔 Enregistrement du token à la connexion
          registerForPushNotificationsAsync(session.user.id);

          const isAtStartPages = currentPath.includes('login') || currentPath.includes('setup-profile') || currentPath === "";
          if (isAtStartPages) {
            router.replace('/(tabs)/map' as any);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log("👋 Déconnexion");
          setIsReady(false); 
          router.replace('/setup-profile' as any);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [segments]); 
  
  if (!isReady || !sessionInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return <Slot />;
}