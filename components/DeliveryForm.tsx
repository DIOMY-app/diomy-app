import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

export default function DeliveryForm({ onConfirm, onCancel }: { onConfirm: (data: any) => void, onCancel: () => void }) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageType, setPackageType] = useState('Petit');

  // ✅ FONCTION : Importation depuis le répertoire (Optimisée)
  const handlePickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        const name = contact.name || "";
        const phone = contact.phoneNumbers?.[0]?.number?.replace(/\s/g, '') || "";
        
        setRecipientName(name);
        setRecipientPhone(phone);
      }
    } else {
      Alert.alert("DIOMY", "Accès aux contacts refusé.");
    }
  };

  // ✅ FONCTION : Validation locale avant envoi
  const handleValidation = () => {
    if (!recipientName.trim() || !recipientPhone.trim()) {
      Alert.alert("DIOMY", "Veuillez renseigner le nom et le numéro du destinataire.");
      return;
    }
    // Appel de la fonction parente dans MapDisplay
    onConfirm({ recipientName, recipientPhone, packageType });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.formTitle}>Détails du Colis 📦</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={28} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Taille du colis</Text>
        <View style={styles.sizeRow}>
          {['Petit', 'Moyen', 'Grand'].map((s) => (
            <TouchableOpacity 
              key={s} 
              style={[styles.sizeBtn, packageType === s && styles.activeSize]} 
              onPress={() => setPackageType(s)}
            >
              <Text style={[styles.sizeBtnText, packageType === s && styles.activeText]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nom du destinataire</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: M. Koné" 
          placeholderTextColor="#94a3b8"
          value={recipientName} 
          onChangeText={setRecipientName} 
        />

        <Text style={styles.label}>Téléphone du destinataire</Text>
        <View style={styles.phoneInputContainer}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="07000000" 
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad" 
            value={recipientPhone} 
            onChangeText={setRecipientPhone} 
          />
          <TouchableOpacity 
            style={styles.contactBtn} 
            onPress={handlePickContact}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ✅ BOUTON CORRIGÉ : zIndex et Retour Visuel */}
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={handleValidation}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>VALIDER L'ENVOI</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    maxHeight: 500, 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 5000 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, fontSize: 15, color: '#1e293b' },
  phoneInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    marginBottom: 5 
  },
  contactBtn: { 
    backgroundColor: '#1e3a8a', 
    padding: 12, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2
  },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sizeBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', width: '31%', alignItems: 'center' },
  activeSize: { backgroundColor: '#f97316', borderColor: '#f97316' },
  sizeBtnText: { fontWeight: 'bold', color: '#64748b' },
  activeText: { color: '#fff' },
  confirmBtn: { 
    backgroundColor: '#f97316', 
    padding: 16, 
    borderRadius: 15, 
    marginTop: 25, 
    alignItems: 'center', 
    elevation: 5,
    zIndex: 9999 // S'assure d'être au dessus pour le clic
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});