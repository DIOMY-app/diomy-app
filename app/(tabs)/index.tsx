import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
// Correction du chemin : on remonte de deux niveaux pour trouver /lib
import { supabase } from '../../lib/supabase'; 
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [targetPath, setTargetPath] = useState<string | null>(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  async function checkUserStatus() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log("DIOMY DEBUG - Aucun utilisateur, direction Connexion");
        setTargetPath("/(auth)/login"); 
        return;
      }

      console.log("DIOMY DEBUG - Utilisateur ID:", user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.log("DIOMY DEBUG - Profil non trouvé, direction Setup");
        setTargetPath("/(auth)/setup-profile");
      } else {
        const roleClean = (profile.role || "").toLowerCase().trim();
        const statusClean = (profile.status || "").toLowerCase().trim();
        
        console.log("DIOMY DEBUG - Rôle en base:", roleClean);
        console.log("DIOMY DEBUG - Statut en base:", statusClean);

        const isDriver = [
          'chauffeur', 
          'conducteur', 
          'conducteurs', 
          'driver'
        ].includes(roleClean);

        if (isDriver) {
          // ✅ MODIFICATION ICI : On autorise l'accès à la carte si validé OU en attente
          if (statusClean === 'valide' || statusClean === 'en_attente_validation') {
            console.log("DIOMY DEBUG - Conducteur (Validé ou En Attente) -> Accès Carte");
            setTargetPath("/(tabs)/map");
          } else {
            console.log("DIOMY DEBUG - Conducteur non validé -> Formulaire Documents");
            setTargetPath("/become-driver");
          }
        } else {
          console.log("DIOMY DEBUG - Rôle Passager -> Accès Carte");
          setTargetPath("/(tabs)/map");
        }
      }
    } catch (error) {
      console.error("DIOMY DEBUG - Erreur critique:", error);
      setTargetPath("/(auth)/setup-profile");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !targetPath) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#009199" />
        <Text style={styles.text}>Vérification DIOMY...</Text>
      </View>
    );
  }

  return <Redirect href={targetPath as any} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'white'
  },
  text: {
    marginTop: 15, 
    color: '#64748b', 
    fontSize: 14,
    fontWeight: '500'
  }
});