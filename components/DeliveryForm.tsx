import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DeliveryForm({ onConfirm, onCancel }: { onConfirm: (data: any) => void, onCancel: () => void }) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageType, setPackageType] = useState('Petit');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.formTitle}>Détails du Colis 📦</Text>
        <TouchableOpacity onPress={onCancel}><Ionicons name="close-circle" size={28} color="#94a3b8" /></TouchableOpacity>
      </View>
      <ScrollView>
        <Text style={styles.label}>Taille du colis</Text>
        <View style={styles.sizeRow}>
          {['Petit', 'Moyen', 'Grand'].map((s) => (
            <TouchableOpacity key={s} style={[styles.sizeBtn, packageType === s && styles.activeSize]} onPress={() => setPackageType(s)}>
              <Text style={[styles.sizeBtnText, packageType === s && styles.activeText]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Nom du destinataire</Text>
        <TextInput style={styles.input} placeholder="Nom" value={recipientName} onChangeText={setRecipientName} />
        <Text style={styles.label}>Téléphone du destinataire</Text>
        <TextInput style={styles.input} placeholder="07000000" keyboardType="phone-pad" value={recipientPhone} onChangeText={setRecipientPhone} />
        <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm({ recipientName, recipientPhone, packageType })}>
          <Text style={styles.confirmBtnText}>VALIDER L'ENVOI</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', borderRadius: 25, maxHeight: 450 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, fontSize: 15 },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sizeBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', width: '30%', alignItems: 'center' },
  activeSize: { backgroundColor: '#f97316', borderColor: '#f97316' },
  sizeBtnText: { fontWeight: 'bold', color: '#64748b' },
  activeText: { color: '#fff' },
  confirmBtn: { backgroundColor: '#f97316', padding: 16, borderRadius: 15, marginTop: 20, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' }
});