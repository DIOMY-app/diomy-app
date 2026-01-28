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
  Platform,
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
  const [driverStatus, setDriverStatus] = useState<string>('pending'); 

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 

  const [stats, setStats] = useState({
    totalEarnings: 0,
    todayEarnings: 0,
    weekEarnings: 0,
    commissionBase: 0,
    netEarnings: 0,
    rideCount: 0,
    todayRideCount: 0, 
    weekRideCount: 0,  
  });

  const getCommissionRate = (ride: any) => {
    const isColis = ride.package_type !== undefined || ride.recipient_name !== undefined;
    return isColis ? 0.15 : 0.12;
  };
  
  // Correction ici aussi pour correspondre à la colonne 'status' du profil
  const isNotValidated = driverStatus !== 'validated' && driverStatus !== 'valide'; 

  const NUMEROS_COLLECTE = {
    orange: "07 00 00 00 00",
    mtn: "05 00 00 00 00",
    moov: "01 00 00 00 00"
  };

  useEffect(() => {
    fetchFinanceData();

    const channel = supabase
      .channel('recharges_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recharges' }, 
        () => { fetchFinanceData(); }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rides_request' }, 
        () => { fetchFinanceData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFinanceData() {
    try {
      if (!refreshing) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setDriverStatus(profileData.status);
      }

      const { data: soldeData } = await supabase
        .from('chauffeur_solde_net')
        .select('solde_disponible')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (soldeData) {
        setSoldeRecharge(Number(soldeData.solde_disponible));
      }

      const { data: rides } = await supabase
        .from('rides_request')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'completed');

      if (rides) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().split('T')[0];
        const totalBrut = rides.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
        
        const todayRides = rides.filter(r => {
          const dateValue = r.created_at || r.sent_at;
          return dateValue && dateValue.substring(0, 10) === localISOTime;
        });

        const todayBrut = todayRides.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
        const todayCommission = todayRides.reduce((sum, r) => sum + Math.ceil(Number(r.price) * getCommissionRate(r)), 0);
        const totalCommission = rides.reduce((sum, r) => sum + Math.ceil(Number(r.price) * getCommissionRate(r)), 0);

        setStats({
          totalEarnings: totalBrut,
          todayEarnings: todayBrut,
          weekEarnings: todayBrut - todayCommission,
          commissionBase: totalCommission,
          netEarnings: totalBrut - totalCommission,
          rideCount: rides.length,
          todayRideCount: todayRides.length, 
          weekRideCount: 0,   
        });
        
        const sortedRides = rides
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 20); 
        setRidesHistory(sortedRides);
      }

      const { data: allRecharges } = await supabase
        .from('recharges')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (allRecharges) {
        setRechargesHistory(allRecharges);
      }

    } catch (error: any) {
      console.error("Erreur Finance:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRecharge = async () => {
    if (isNotValidated) {
      Alert.alert("DIOMY", "Action impossible : compte non validé.");
      return;
    }

    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 500) {
      Alert.alert("DIOMY", "Le montant minimum est de 500 F.");
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non trouvé");

      // ✅ CORRECTION : Utilisation de 'status' pour correspondre à ta capture d'écran
      const { error } = await supabase
        .from('recharges')
        .insert({ 
          driver_id: user.id, 
          montant: numAmount,
          status: 'en_attente' 
        });

      if (error) throw error;

      setIsSuccess(true);
      setAmount('');
      fetchFinanceData(); 

    } catch (err: any) {
      Alert.alert("DIOMY", "Erreur technique : " + (err.message || "Vérifiez votre connexion")); 
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
    if (!dateValue) return "Date inconnue";
    try {
      const date = new Date(dateValue);
      const j = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${j}/${m} à ${h}:${min}`;
    } catch (e) {
      return "Format invalide";
    }
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
          <Text style={styles.headerSub}>Gains et dépôts validés</Text>
        </View>

        <View style={[styles.rechargeCard, isNotValidated && styles.rechargeCardDisabled]}>
            <View style={styles.rechargeHeader}>
                <Text style={styles.rechargeLabel}>SOLDE PRÉPAYÉ DISPONIBLE</Text>
                <MaterialCommunityIcons name={isNotValidated ? "shield-lock" : "shield-check"} size={20} color={isNotValidated ? "#f87171" : "#22c55e"} />
            </View>
            <Text style={[styles.rechargeValue, (soldeRecharge < 500 || isNotValidated) && { color: '#f87171' }]}>
                {soldeRecharge.toLocaleString()} FCFA
            </Text>
            
            <TouchableOpacity 
              style={[styles.rechargeBtn, isNotValidated && { opacity: 0.6 }]} 
              onPress={() => {
                if (isNotValidated) {
                  Alert.alert("DIOMY", "Dépôt impossible : Votre compte est en cours de validation.");
                } else {
                  setShowRechargeModal(true);
                }
              }}
            >
                <Ionicons name={isNotValidated ? "lock-closed" : "add-circle"} size={20} color="#1e3a8a" />
                <Text style={styles.rechargeBtnText}>
                  {isNotValidated ? "NON VALIDÉ" : "FAIRE UN DÉPÔT"}
                </Text>
            </TouchableOpacity>
        </View>

        <View style={styles.statsRowMini}>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>AUJOURD'HUI (BRUT)</Text>
                <Text style={[styles.miniStatValue, {color: '#1e3a8a'}]}>{stats.todayEarnings.toLocaleString()} F</Text>
            </View>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>AUJOURD'HUI (NET)</Text>
                <Text style={[styles.miniStatValue, {color: '#22c55e'}]}>{stats.weekEarnings.toLocaleString()} F</Text>
            </View>
        </View>

        <View style={styles.statsRowMini}>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>TOTAL ENCAISSÉ ({stats.rideCount})</Text>
                <Text style={styles.miniStatValue}>{stats.totalEarnings.toLocaleString()} F</Text>
            </View>
            <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>NET CHAUFFEUR</Text>
                <Text style={[styles.miniStatValue, {color: '#22c55e'}]}>{stats.netEarnings.toLocaleString()} F</Text>
            </View>
        </View>

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
                <Text style={[styles.tabText, activeTab === 'depots' && styles.activeTabText]}>Dépôts</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.historyLimitText}>Affichage des 20 derniers mouvements</Text>
          {activeTab === 'courses' ? (
            ridesHistory.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucune course terminée.</Text></View>
            ) : (
                ridesHistory.map((item: any) => (
                <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}><FontAwesome5 name="motorcycle" size={16} color="#1e3a8a" /></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.historyDest} numberOfLines={1}>{item.destination_name || "Course"}</Text>
                      <Text style={styles.historyDate}>{formatDate(item.created_at || item.sent_at)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyPrice}>{item.price?.toLocaleString()} F</Text>
                      <Text style={styles.historyCom}>
                        -{Math.ceil(item.price * getCommissionRate(item)).toLocaleString()} F 
                        ({getCommissionRate(item) === 0.15 ? '15%' : '12%'})
                      </Text>
                    </View>
                </View>
                ))
            )
          ) : (
            rechargesHistory.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucun dépôt effectué.</Text></View>
            ) : (
                rechargesHistory.map((item: any) => {
                  // ✅ CORRECTION : Utilisation de 'status' au lieu de 'statut'
                  const statusLower = item.status?.toLowerCase().trim();
                  const isValide = statusLower === 'valide';
                  
                  return (
                    <View key={item.id} style={styles.historyItem}>
                        <View style={[styles.historyIcon, {backgroundColor: isValide ? '#dcfce7' : '#fef9c3'}]}>
                            <Ionicons name={isValide ? "checkmark" : "time"} size={18} color={isValide ? "#16a34a" : "#ca8a04"} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.historyDest}>Dépôt de {item.montant} F</Text>
                            <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
                        </View>
                        <View style={[styles.statusBadgeStyle, {backgroundColor: isValide ? '#22c55e' : '#eab308'}]}>
                            <Text style={styles.statusText}>{item.status?.toUpperCase() || 'EN ATTENTE'}</Text>
                        </View>
                    </View>
                  );
                })
            )
          )}
        </View>
      </ScrollView>

      <Modal visible={showRechargeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!isSuccess ? (
              <>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nouveau Dépôt</Text>
                    <TouchableOpacity onPress={closeRecharge}><Ionicons name="close-circle" size={30} color="#64748b" /></TouchableOpacity>
                </View>
                <Text style={styles.modalStep}>1. Envoyer l'argent via :</Text>
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
                <Text style={styles.modalStep}>2. Inscrire le montant envoyé :</Text>
                <TextInput style={styles.input} placeholder="Montant" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                <TouchableOpacity style={styles.confirmBtn} onPress={handleManualRecharge}>
                    {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>VALIDER MA DEMANDE</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <View style={{alignItems: 'center', paddingVertical: 20}}>
                  <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
                  <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>Demande Reçue !</Text>
                  <Text style={{textAlign: 'center', color: '#64748b', marginTop: 10, marginBottom: 25}}>
                    DIOMY créditera votre solde dès réception du transfert.
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
  scrollContent: { paddingBottom: 110 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: Platform.OS === 'android' ? 50 : 60, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  rechargeCard: { backgroundColor: '#1e3a8a', borderRadius: 24, padding: 25, elevation: 8, alignItems: 'center' },
  rechargeCardDisabled: { backgroundColor: '#64748b' },
  rechargeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rechargeLabel: { color: '#bfdbfe', fontSize: 11, fontWeight: 'bold' },
  rechargeValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  rechargeBtn: { backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, alignItems: 'center', gap: 10 },
  rechargeBtnText: { color: '#1e3a8a', fontWeight: 'bold' },
  statsRowMini: { flexDirection: 'row', gap: 12, marginTop: 15 },
  miniStatCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 18, elevation: 1 },
  miniStatLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold' },
  miniStatValue: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  tabContainer: { flexDirection: 'row', marginTop: 25, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  activeTabText: { color: '#1e3a8a' },
  section: { marginTop: 15 },
  historyLimitText: { fontSize: 10, color: '#94a3b8', marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 18, marginBottom: 10, elevation: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  historyDest: { fontSize: 13, fontWeight: '700', color: '#334155' },
  historyDate: { fontSize: 10, color: '#94a3b8' },
  historyPrice: { fontSize: 14, fontWeight: 'bold' },
  historyCom: { fontSize: 10, color: '#ef4444' },
  statusBadgeStyle: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalStep: { fontSize: 13, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 10 },
  numContainer: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 15, marginBottom: 20 },
  numRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  numText: { fontSize: 14 },
  input: { backgroundColor: '#f1f5f9', padding: 18, borderRadius: 15, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  confirmBtn: { backgroundColor: '#1e3a8a', padding: 18, borderRadius: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' }
});