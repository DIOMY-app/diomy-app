import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  // On laisse l'index décider au démarrage. 
  // On ne met pas de router.replace ici pour éviter les boucles infinies dans l'APK.
  
  return <Slot />;
}