import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface MapDisplayProps {
  userRole?: string | null;
}

export default function MapDisplay({ userRole: initialRole }: MapDisplayProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [userScore, setUserScore] = useState<number>(100);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);

  // --- ÉTATS FIN DE COURSE & FINANCE ---
  const [showSummary, setShowSummary] = useState(false);
  const [finalRideData, setFinalRideData] = useState<any>(null);
  const [tempRating, setTempRating] = useState(0);
  const COMMISSION_RATE = 0.20; // 20% prélevés sur le compte du chauffeur

  if (Platform.OS !== 'web') return null;

  useEffect(() => {
    const initializeWeb = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('score').eq('id', user.id).single();
        const { data: driver } = await supabase.from('conducteurs').select('is_online').eq('id', user.id).maybeSingle();
        if (profile) setUserScore(profile.score || 100);
        if (driver) setIsOnline(driver.is_online);

        const { data: activeRide } = await supabase.from('rides_request')
          .select('*')
          .eq('driver_id', user.id)
          .in('status', ['pending', 'accepted', 'in_progress'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle();

        if (activeRide) {
          setCurrentRide(activeRide);
          setRideStatus(activeRide.status);
        }
      }
    };
    initializeWeb();

    const channel = supabase.channel('rides-web-logic')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides_request' }, (payload) => {
        const ride = payload.new as any;
        if (ride.driver_id === userId) {
          if (payload.eventType === 'INSERT' && ride.status === 'pending') {
            setCurrentRide(ride);
            setRideStatus('pending');
          } else {
            setRideStatus(ride.status);
            if (ride.status === 'completed') {
              setFinalRideData(ride);
              setShowSummary(true);
              setCurrentRide(null);
            }
            if (ride.status === 'declined') {
              setCurrentRide(null);
              setRideStatus(null);
            }
          }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // --- LOGIQUE FINANCIÈRE : DÉBIT DE LA COMMISSION (PHASE 4) ---
  const handleFinancialTransaction = async (ride: any) => {
    try {
      // Calcul de la commission (le chauffeur encaisse tout en cash, on lui retire les 20%)
      const commissionToDeduct = ride.price * COMMISSION_RATE;

      // 1. Enregistrer dans l'historique
      await supabase.from('historique_courses').insert([{
        ride_id: ride.id,
        chauffeur_id: ride.driver_id,
        passager_id: ride.passenger_id,
        montant: ride.price,
        destination: ride.destination_name
      }]);

      // 2. Prélever la commission sur le portefeuille
      const { data: wallet } = await supabase
        .from('portefeuilles')
        .select('solde')
        .eq('user_id', ride.driver_id)
        .maybeSingle();

      const currentSolde = wallet?.solde || 0;
      const newSolde = currentSolde - commissionToDeduct;

      await supabase.from('portefeuilles').upsert({ 
        user_id: ride.driver_id, 
        solde: newSolde,
        updated_at: new Date().toISOString()
      });

      // 3. Sécurité : Si solde négatif ou nul, on déconnecte le chauffeur
      if (newSolde <= 0) {
        setIsOnline(false);
        await supabase.from('conducteurs').update({ is_online: false }).eq('id', ride.driver_id);
        alert("Votre solde est épuisé. Veuillez recharger pour recevoir de nouvelles courses.");
      }

      console.log("Commission Web prélevée : ", commissionToDeduct, " FCFA.");
    } catch (err) {
      console.error("Erreur transaction Web:", err);
    }
  };

  const submitRating = async (stars: number) => {
    setTempRating(stars);
    const targetId = finalRideData.passenger_id;
    const pointsToAdd = stars * 4; 
    try {
      const { data: p } = await supabase.from('profiles').select('score').eq('id', targetId).single();
      const newScore = Math.min(100, (p?.score || 0) + pointsToAdd);
      await supabase.from('profiles').update({ score: newScore }).eq('id', targetId);
      
      alert("DIOMY : Merci d'avoir noté votre passager !");
      setShowSummary(false);
      setRideStatus(null);
      setTempRating(0);
    } catch (e) { console.error(e); setShowSummary(false); }
  };

  const updateRideStatus = async (newStatus: string) => {
    if (!currentRide) return;
    
    let pointsChange = newStatus === 'accepted' ? 2 : (newStatus === 'declined' ? -5 : 0);

    const { error } = await supabase.from('rides_request').update({ status: newStatus }).eq('id', currentRide.id);

    if (!error) {
      if (newStatus === 'completed') {
        await handleFinancialTransaction(currentRide);
      }

      if (pointsChange !== 0) {
        const newScore = Math.max(0, Math.min(100, userScore + pointsChange));
        await supabase.from('profiles').update({ score: newScore }).eq('id', userId);
        setUserScore(newScore);
      }
    }
  };

  const toggleOnline = async () => {
    // Vérification du solde avant de passer en ligne
    const { data: wallet } = await supabase.from('portefeuilles').select('solde').eq('user_id', userId).maybeSingle();
    
    if (!isOnline && (!wallet || wallet.solde <= 0)) {
      alert("Action impossible : Votre portefeuille est vide. Veuillez recharger votre compte DIOMY.");
      return;
    }

    const nextStatus = !isOnline;
    await supabase.from('conducteurs').upsert({ id: userId, is_online: nextStatus, location: `POINT(-5.6290 9.4580)` });
    setIsOnline(nextStatus);
  };

  return (
    <View style={styles.webContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.webTitle}>DIOMY CONDUCTEUR (WEB)</Text>
          <View style={styles.scoreBadge}>
            <MaterialCommunityIcons name="star-circle" size={20} color="#eab308" />
            <Text style={styles.scoreText}>{userScore}/100</Text>
          </View>
        </View>

        {!rideStatus || rideStatus === 'completed' ? (
          <TouchableOpacity style={[styles.mainBtn, isOnline ? styles.bgOnline : styles.bgOffline]} onPress={toggleOnline}>
            <Text style={styles.btnText}>{isOnline ? "MOTO EN LIGNE" : "ACTIVER MA MOTO"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeRideBox}>
            <Text style={styles.statusLabel}>COURSE : {rideStatus.toUpperCase()}</Text>
            <Text style={styles.destText}>{currentRide?.destination_name}</Text>
            <Text style={styles.priceText}>{currentRide?.price} FCFA</Text>

            {rideStatus === 'pending' && (
              <View style={styles.row}>
                <TouchableOpacity style={styles.declineBtn} onPress={() => updateRideStatus('declined')}><Text style={styles.declineText}>REFUSER (-5)</Text></TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => updateRideStatus('accepted')}><Text style={styles.acceptText}>ACCEPTER (+2)</Text></TouchableOpacity>
              </View>
            )}
            {rideStatus === 'accepted' && (
              <TouchableOpacity style={styles.progressBtn} onPress={() => updateRideStatus('in_progress')}><Text style={styles.btnText}>CLIENT RÉCUPÉRÉ</Text></TouchableOpacity>
            )}
            {rideStatus === 'in_progress' && (
              <TouchableOpacity style={styles.completeBtn} onPress={() => updateRideStatus('completed')}><Text style={styles.btnText}>TERMINER LA COURSE</Text></TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
            <Text style={styles.modalTitle}>Course Terminée !</Text>
            <Text style={styles.finalPrice}>{finalRideData?.price} FCFA</Text>
            <Text style={styles.commissionLabel}>Commission DIOMY (20%) déduite de votre solde</Text>
            
            <View style={styles.ratingBox}>
              <Text style={styles.ratingTitle}>Notez votre passager</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => submitRating(s)}>
                    <Ionicons name={tempRating >= s ? "star" : "star-outline"} size={40} color={tempRating >= s ? "#eab308" : "#cbd5e1"} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', height: '100vh' as any },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 25, shadowOpacity: 0.1, width: 450, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  webTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e3a8a' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3', padding: 8, borderRadius: 12 },
  scoreText: { marginLeft: 5, fontWeight: 'bold', color: '#854d0e' },
  mainBtn: { height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  bgOnline: { backgroundColor: '#22c55e' },
  bgOffline: { backgroundColor: '#1e3a8a' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  activeRideBox: { padding: 20, backgroundColor: '#f1f5f9', borderRadius: 20, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold', marginBottom: 10 },
  destText: { fontSize: 18, color: '#1e293b', textAlign: 'center', marginBottom: 10 },
  priceText: { fontSize: 32, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  acceptBtn: { backgroundColor: '#1e3a8a', padding: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
  declineBtn: { borderWidth: 1, borderColor: '#ef4444', padding: 15, borderRadius: 12, width: '48%', alignItems: 'center' },
  progressBtn: { backgroundColor: '#f97316', width: '100%', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  completeBtn: { backgroundColor: '#22c55e', width: '100%', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: 'bold' },
  declineText: { color: '#ef4444', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 40, borderRadius: 30, alignItems: 'center', width: 400 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  finalPrice: { fontSize: 45, fontWeight: '900', color: '#1e3a8a', marginTop: 10 },
  commissionLabel: { color: '#ef4444', fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  ratingBox: { width: '100%', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
  ratingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10 }
});