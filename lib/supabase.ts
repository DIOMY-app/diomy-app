import { createClient } from '@supabase/supabase-js';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';



const supabaseUrl = 'https://gmvlwhadpkojsevnljwe.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtdmx3aGFkcGtvanNldm5sandlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MzUzMjksImV4cCI6MjA4MzExMTMyOX0.1_veLGIuvizUY0enFpXI1uF-l4JaAdjjn6k6XII-agg';



export const supabase = createClient(supabaseUrl, supabaseAnonKey, {

  auth: {

    storage: Platform.OS === 'web' 

      ? (typeof window !== 'undefined' ? window.localStorage : undefined) 

      : AsyncStorage,

    autoRefreshToken: true,

    persistSession: true,

    detectSessionInUrl: true,

  },

}); 