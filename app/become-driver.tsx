import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Image, Alert, ActivityIndicator 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export default function BecomeDriverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [vehicle, setVehicle] = useState({ brand: '', model: '', plate: '' });
  const [images, setImages] = useState({
    cni: null as string | null,
    moto: null as string | null,
    assurance: null as string | null,
    face: null as string | null,
  });

  // ✅ FONCTION AMÉLIORÉE : Choix Galerie ou Appareil Photo
  const handleImageChoice = (type: keyof typeof images) => {
    Alert.alert(
      "Source de l'image",
      "Choisissez comment ajouter la photo",
      [
        { text: "Appareil Photo", onPress: () => captureImage(type) },
        { text: "Galerie Photos", onPress: () => pickFromLibrary(type) },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const captureImage = async (type: keyof typeof images) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission", "Accès à l'appareil photo requis.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3,
    });
    if (!result.canceled) {
      setImages({ ...images, [type]: result.assets[0].uri });
    }
  };

  const pickFromLibrary = async (type: keyof typeof images) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission", "Accès aux photos requis.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3, 
    });
    if (!result.canceled) {
      setImages({ ...images, [type]: result.assets[0].uri });
    }
  };

  async function uploadImage(uri: string, path: string) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: "base64" as any 
      });
      
      const { error } = await supabase.storage
        .from('driver-documents')
        .upload(path, decode(base64), { 
          contentType: 'image/jpeg', 
          upsert: true 
        });
      
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(path);
        
      return urlData.publicUrl;
    } catch (err) {
      console.error("Détail Erreur Upload:", err);
      return null; // ✅ On retourne null au lieu de bloquer si une image échoue
    }
  }

  async function handleSubmit() {
    // ✅ RESTRICTION RETIRÉE : On demande juste une marque ou plaque minimum pour identifier le dossier
    if (!vehicle.brand && !vehicle.plate) {
      Alert.alert("Attention", "Veuillez au moins renseigner la marque ou la plaque.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non trouvé");

      // Upload des images (si elles existent)
      const cniUrl = images.cni ? await uploadImage(images.cni, `${user.id}/cni.jpg`) : null;
      const motoUrl = images.moto ? await uploadImage(images.moto, `${user.id}/moto.jpg`) : null;
      const assuranceUrl = images.assurance ? await uploadImage(images.assurance, `${user.id}/assurance.jpg`) : null;
      const faceUrl = images.face ? await uploadImage(images.face, `${user.id}/face.jpg`) : null;

      // Mise à jour du profil (les champs peuvent être null)
      const { error } = await supabase
        .from('profiles')
        .update({
          vehicle_details: { 
            brand: vehicle.brand || "Non précisé",
            plate: vehicle.plate || "Non précisé",
            cni_url: cniUrl, 
            moto_url: motoUrl, 
            assurance_url: assuranceUrl, 
            face_url: faceUrl 
          },
          status: 'en_attente_validation', // ✅ Status qui sera vérifié par la page profil
          is_driver_pending: true,
          document_submitted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        "Dossier Transmis", 
        "DIOMY a bien reçu votre dossier. Nos équipes vont vérifier vos documents.",
        [{ text: "OK", onPress: () => router.replace('/(tabs)/profile' as any) }]
      );
    } catch (error: any) {
      Alert.alert("Erreur", "Problème lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  const ImageBox = ({ label, type, icon }: { label: string, type: keyof typeof images, icon: any }) => (
    <View style={styles.imageBoxContainer}>
      <Text style={styles.imageLabel}>{label}</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={() => handleImageChoice(type)}>
        {images[type] ? (
          <Image source={{ uri: images[type]! }} style={styles.preview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name={icon} size={30} color="#94a3b8" />
            <Text style={styles.imageText}>Ajouter</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.main, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dossier Conducteur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Votre Véhicule</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Marque et Modèle (Optionnel)" 
          value={vehicle.brand} 
          onChangeText={(t) => setVehicle({...vehicle, brand: t})} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Plaque d'immatriculation (Optionnel)" 
          value={vehicle.plate} 
          autoCapitalize="characters" 
          onChangeText={(t) => setVehicle({...vehicle, plate: t})} 
        />

        <Text style={styles.sectionTitle}>Photos des documents (Même partiel)</Text>
        <View style={styles.grid}>
          <ImageBox label="Photo CNI" type="cni" icon="card-outline" />
          <ImageBox label="Photo de la Moto" type="moto" icon="bicycle-outline" />
          <ImageBox label="Photo Assurance" type="assurance" icon="document-text-outline" />
          <ImageBox label="Votre Photo" type="face" icon="person-outline" />
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitText}>Envoyer le dossier</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.infoNote}>
          DIOMY pourra vous recontacter s'il manque des pièces à votre dossier.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#009199', marginBottom: 15, marginTop: 10 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  imageBoxContainer: { width: '48%', marginBottom: 15 },
  imageLabel: { fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: '500' },
  imagePicker: { height: 120, backgroundColor: 'white', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', overflow: 'hidden' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageText: { color: '#94a3b8', fontSize: 10, marginTop: 5 },
  preview: { width: '100%', height: '100%' },
  submitBtn: { backgroundColor: '#009199', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  infoNote: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 20, marginBottom: 40 }
});