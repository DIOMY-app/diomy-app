import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function ServiceSelector({ onSelect }: { onSelect: (mode: 'transport' | 'delivery') => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Que souhaitez-vous faire ?</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => onSelect('transport')}>
          <View style={[styles.iconCircle, { backgroundColor: '#1e3a8a' }]}>
            <FontAwesome5 name="motorcycle" size={30} color="#fff" />
          </View>
          <Text style={styles.cardText}>ME DÉPLACER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => onSelect('delivery')}>
          <View style={[styles.iconCircle, { backgroundColor: '#f97316' }]}>
            <MaterialCommunityIcons name="package-variant-closed" size={35} color="#fff" />
          </View>
          <Text style={styles.cardText}>ENVOYER UN COLIS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 25, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  card: { alignItems: 'center', width: '45%' },
  iconCircle: { width: 75, height: 75, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 5 },
  cardText: { fontSize: 13, fontWeight: 'bold', color: '#1e3a8a' }
});