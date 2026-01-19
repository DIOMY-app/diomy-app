import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Platform, SafeAreaView, 
  ScrollView, KeyboardAvoidingView 
} from 'react-native';
import { supabase } from '../lib/supabase'; 
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 

export default function AuthScreen() {
  const { role: initialRole } = useLocalSearchParams();
  const [isRegistering, setIsRegistering] = useState(false); 
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // On sécurise le rôle (par défaut passagers si non spécifié)
  const selectedRole = initialRole === 'chauffeur' ? 'conducteurs' : 'passagers';
  const displayRole = selectedRole === 'conducteurs' ? 'Conducteur Moto' : 'Passager';

  async function handleAuth() {
    if (isRegistering && !fullName) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Erreur', 'Le numéro doit comporter exactement 10 chiffres.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const internalId = `${phone}@diomy.local`;

      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: internalId, 
          password: password,
          options: { 
            data: { full_name: fullName, role: selectedRole, phone_number: phone } 
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Création du profil public
          const { error: profileError } = await supabase.from('profiles').upsert({ 
            id: data.user.id, 
            full_name: fullName, 
            role: selectedRole, 
            phone_number: phone, 
            updated_at: new Date()
          });
          if (profileError) throw profileError;

          // Insertion dans la table spécifique au rôle
          const { error: dbError } = await supabase.from(selectedRole).upsert({ 
            id: data.user.id, 
            full_name: fullName, 
            phone: phone 
          });
          if (dbError) console.error(`Erreur table ${selectedRole}:`, dbError.message);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: internalId, 
          password 
        });
        if (signInError) throw signInError;
      }

      // La redirection est gérée par le listener dans app/_layout.tsx (SIGNED_IN)
    } catch (error: any) {
      Alert.alert('Erreur', "Vérifiez vos identifiants ou votre connexion.");
      console.error(error.message);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            {/* ✅ CORRECTION CRITIQUE : Utiliser le chemin avec parenthèses pour Android */}
            {/* On utilise 'as any' pour satisfaire le typage TypeScript tout en gardant la route stable */}
            <TouchableOpacity onPress={() => router.replace("/(auth)/setup-profile" as any)}>
              <Ionicons name="arrow-back" size={28} color="#1e3a8a" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{isRegistering ? 'Inscription' : 'Connexion'}</Text>
            <Text style={styles.subtitle}>En tant que <Text style={styles.roleBold}>{displayRole}</Text></Text>

            <View style={styles.form}>
              {isRegistering && (
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nom et Prénoms" 
                    value={fullName} 
                    onChangeText={setFullName} 
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Numéro de téléphone" 
                  value={phone} 
                  keyboardType="phone-pad" 
                  maxLength={10} 
                  onChangeText={setPhone} 
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Mot de passe" 
                  value={password} 
                  secureTextEntry 
                  onChangeText={setPassword} 
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: selectedRole === 'conducteurs' ? '#f59e0b' : '#1e3a8a' }]} 
              onPress={handleAuth} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isRegistering ? "Créer mon compte" : "Se connecter"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsRegistering(!isRegistering)} 
              style={styles.footerLink}
            >
              <Text style={styles.linkText}>
                {isRegistering ? "Déjà un compte ? " : "Pas encore de compte ? "}
                <Text style={styles.linkBold}>{isRegistering ? "Connectez-vous" : "Inscrivez-vous"}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: 20 },
  content: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 5 },
  subtitle: { fontSize: 18, color: '#64748b', marginBottom: 40 },
  roleBold: { fontWeight: 'bold', color: '#1e3a8a' },
  form: { marginTop: 10 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f1f5f9', 
    borderRadius: 15, 
    marginBottom: 15, 
    paddingHorizontal: 15, 
    height: 60 
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1e3a8a' },
  button: { 
    borderRadius: 15, 
    height: 60, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20, 
    elevation: 4 
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  footerLink: { marginTop: 30, paddingVertical: 10 },
  linkText: { textAlign: 'center', fontSize: 16, color: '#64748b' },
  linkBold: { color: '#2563eb', fontWeight: 'bold' },
});