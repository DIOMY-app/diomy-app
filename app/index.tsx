import { View, Text, ActivityIndicator } from 'react-native';

export default function Index() {
  // On ne fait AUCUNE redirection ici. 
  // On laisse le _layout.tsx décider d'où envoyer l'utilisateur.
  // Ce fichier sert uniquement d'écran de démarrage technique.

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text style={{ marginTop: 10 }}>Initialisation de DIOMY...</Text>
    </View>
  );
}