import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Clipboard,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function FinanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ridesHistory, setRidesHistory] = useState<any[]>([]);
  const [rechargesHistory, setRechargesHistory] = useState<any[]>([]);
  const [soldeRecharge, setSoldeRecharge] = useState(0); 
  const [activeTab, setActiveTab] = useState<'courses' | 'depots'>('courses');

  // États pour le Modal de Recharge
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 

  const [stats, setStats] = useState({
    totalEarnings: 0,
    commissionBase: 0,
    netEarnings: 0,
    rideCount: 0,
  });

  const COMMISSION_RATE = 0.20;

  const NUMEROS_COLLECTE = {
    orange: "07 00 00 00 00",
    mtn: "05 00 00 00 00",
    moov: "01 00 00 00 00"
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  async function fetchFinanceData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Solde
      const { data: wallet } = await supabase
        .from('portefeuilles')
        .select('solde')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setSoldeRecharge(wallet?.solde || 0);

      // 2. Courses terminées
      const { data: rides } = await supabase
        .from('rides_request')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'completed');

      if (rides) {
        const sortedRides = rides.sort((a, b) => {
          const dateA = new Date(a.sent_at || a.created_at).getTime();
          const dateB = new Date(b.sent_at || b.created_at).getTime();
          return dateB - dateA;
        });
        setRidesHistory(sortedRides);
        
        const total = sortedRides.reduce((sum, ride) => sum + (Number(ride.price) || 0), 0);
        const commission = total * COMMISSION_RATE;
        setStats({
          totalEarnings: total,
          commissionBase: commission,
          netEarnings: total - commission,
          rideCount: sortedRides.length,
        });
      }

      // 3. Historique des recharges
      const { data: recharges } = await supabase
        .from('recharges')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (recharges) setRechargesHistory(recharges);

    } catch (error: any) {
      console.error("Erreur Finance:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRecharge = async () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 500) {
      Alert.alert("DIOMY", "Le montant minimum est de 500 F.");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('recharges')
        .insert({ 
          driver_id: user.id, 
          montant: numAmount,
          statut: 'en_attente'
        });

      if (error) throw error;
      setIsSuccess(true);
      setAmount('');
      fetchFinanceData(); // Rafraîchir l'historique en arrière-plan

    } catch (err: any) {
      Alert.alert("DIOMY", "Vérifiez votre connexion internet.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeRecharge = () => {
    setShowRechargeModal(false);
    setIsSuccess(false);
  };

  const copyToClipboard = (num: string) => {
    Clipboard.setString(num);
    Alert.alert("DIOMY", "Numéro copié !");
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinanceData();
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Aujourd'hui";
    const date = new Date(dateValue);
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={styles.mainWrapper}>
      <ScrollView 
        style={styles.container} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portefeuille DIOMY</Text>
          <Text style={styles.headerSub}>Suivi des gains et recharges</Text>
        </View>

        {/* CARTE SOLDE */}
        <View style={styles.rechargeCard}>
            <View style={styles.rechargeHeader}>
                <Text style={styles.rechargeLabel}>SOLDE PRÉPAYÉ DISPONIBLE</Text>
                <MaterialCommunityIcons name="shield-check" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.rechargeValue, soldeRecharge < 500 && { color: '#f87171' }]}>
                {soldeRecharge.toLocaleString()} FCFA
            </Text>
            <TouchableOpacity style={styles.rechargeBtn} onPress={() => setShowRechargeModal(true)}>
                <Ionicons name="add-circle" size={20} color="#1e3a8a" />
                <Text style={styles.rechargeBtnText}>FAIRE UN DÉPÔT</Text>
            </TouchableOpacity>
        </View>

        {/* STATS RAPIDES */}
        <View style={styles.statsRowMini}>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>ENCAISSÉ</Text>
                <Text style={styles.miniStatValue}>{stats.totalEarnings.toLocaleString()} F</Text>
            </View>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>NET RÉEL</Text>
                <Text style={[styles.miniStatValue, {color: '#22c55e'}]}>{stats.netEarnings.toLocaleString()} F</Text>
            </View>
        </View>

        {/* ONGLETS HISTORIQUE */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'courses' && styles.activeTab]} 
                onPress={() => setActiveTab('courses')}
            >
                <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>Courses</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'depots' && styles.activeTab]} 
                onPress={() => setActiveTab('depots')}
            >
                <Text style={[styles.tabText, activeTab === 'depots' && styles.activeTabText]}>Mes Dépôts</Text>
            </TouchableOpacity>
        </View>

        {/* CONTENU DES ONGLETS */}
        <View style={styles.section}>
          {activeTab === 'courses' ? (
            ridesHistory.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucune course terminée.</Text></View>
            ) : (
                ridesHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}><FontAwesome5 name="motorcycle" size={16} color="#1e3a8a" /></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.historyDest} numberOfLines={1}>{item.destination_name || "Course"}</Text>
                    <Text style={styles.historyDate}>{formatDate(item.sent_at || item.created_at)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyPrice}>{item.price?.toLocaleString()} F</Text>
                    <Text style={styles.historyCom}>-{(item.price * 0.2).toLocaleString()} F</Text>
                    </View>
                </View>
                ))
            )
          ) : (
            rechargesHistory.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucun dépôt effectué.</Text></View>
            ) : (
                rechargesHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                    <View style={[styles.historyIcon, {backgroundColor: item.statut === 'valide' ? '#dcfce7' : '#fef9c3'}]}>
                        <Ionicons 
                            name={item.statut === 'valide' ? "checkmark" : "time"} 
                            size={18} 
                            color={item.statut === 'valide' ? "#16a34a" : "#ca8a04"} 
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.historyDest}>Dépôt de {item.montant} F</Text>
                        <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: item.statut === 'valide' ? '#22c55e' : '#eab308'}]}>
                        <Text style={styles.statusText}>{item.statut === 'valide' ? 'VALIDÉ' : 'EN ATTENTE'}</Text>
                    </View>
                </View>
                ))
            )
          )}
        </View>
      </ScrollView>

      {/* MODAL DE RECHARGE */}
      <Modal visible={showRechargeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!isSuccess ? (
              <>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nouveau Dépôt</Text>
                    <TouchableOpacity onPress={closeRecharge}><Ionicons name="close-circle" size={30} color="#64748b" /></TouchableOpacity>
                </View>
                <Text style={styles.modalStep}>1. Transférer le montant vers :</Text>
                <View style={styles.numContainer}>
                    <TouchableOpacity style={styles.numRow} onPress={() => copyToClipboard(NUMEROS_COLLECTE.orange)}>
                        <Text style={styles.numText}>Orange : <Text style={{fontWeight:'bold'}}>{NUMEROS_COLLECTE.orange}</Text></Text>
                        <Ionicons name="copy" size={16} color="#1e3a8a" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.numRow, {borderBottomWidth:0}]} onPress={() => copyToClipboard(NUMEROS_COLLECTE.mtn)}>
                        <Text style={styles.numText}>MTN : <Text style={{fontWeight:'bold'}}>{NUMEROS_COLLECTE.mtn}</Text></Text>
                        <Ionicons name="copy" size={16} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.modalStep}>2. Confirmer le montant envoyé :</Text>
                <TextInput style={styles.input} placeholder="Montant (ex: 2000)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                <TouchableOpacity style={styles.confirmBtn} onPress={handleManualRecharge}>
                    {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>VALIDER MA DEMANDE</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <View style={{alignItems: 'center', paddingVertical: 20}}>
                  <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
                  <Text style={{fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginTop: 10}}>Reçu par DIOMY !</Text>
                  <Text style={{textAlign: 'center', color: '#64748b', marginTop: 10, marginBottom: 25, lineHeight: 20}}>
                    Votre demande est en cours de traitement. DIOMY créditera votre solde dès réception de votre transfert.
                  </Text>
                  <TouchableOpacity style={[styles.confirmBtn, {width: '100%'}]} onPress={closeRecharge}>
                    <Text style={styles.confirmBtnText}>RETOURNER AU PORTEFEUILLE</Text>
                  </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 60, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  rechargeCard: { backgroundColor: '#1e3a8a', borderRadius: 24, padding: 25, elevation: 8, alignItems: 'center' },
  rechargeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rechargeLabel: { color: '#bfdbfe', fontSize: 11, fontWeight: 'bold' },
  rechargeValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  rechargeBtn: { backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, alignItems: 'center', gap: 10 },
  rechargeBtnText: { color: '#1e3a8a', fontWeight: 'bold' },
  statsRowMini: { flexDirection: 'row', gap: 12, marginTop: 15 },
  miniStatCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 18, elevation: 1 },
  miniStatLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  miniStatValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  tabContainer: { flexDirection: 'row', marginTop: 25, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  activeTabText: { color: '#1e3a8a' },
  section: { marginTop: 15 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 18, marginBottom: 10, elevation: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  historyDest: { fontSize: 14, fontWeight: '700', color: '#334155' },
  historyDate: { fontSize: 11, color: '#94a3b8' },
  historyPrice: { fontSize: 15, fontWeight: 'bold' },
  historyCom: { fontSize: 11, color: '#ef4444' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalStep: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 10 },
  numContainer: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 15, marginBottom: 20 },
  numRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  numText: { fontSize: 15 },
  input: { backgroundColor: '#f1f5f9', padding: 18, borderRadius: 15, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  confirmBtn: { backgroundColor: '#1e3a8a', padding: 18, borderRadius: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' }
});