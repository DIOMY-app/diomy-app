import React, { useEffect, useState, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { 
  View, 
  ActivityIndicator, 
  Text, 
  Platform, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Vibration,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [showRideModal, setShowRideModal] = useState(false);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    initLayout();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (showRideModal && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && showRideModal) {
      closeRideModal();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [showRideModal, timer]);

  async function initLayout() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile) {
          const userRole = profile.role?.toLowerCase().trim();
          setRole(userRole);
          if (['chauffeur', 'conducteur', 'conducteurs'].includes(userRole)) {
            setupDriverRealtime(user.id);
          }
        }
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }

  async function setupDriverRealtime(uid: string) {
    const channel = supabase.channel('new_rides_alerts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'rides_request', filter: `status=eq.pending` }, 
        (payload) => {
          if (payload.new.driver_id === uid) {
            Vibration.vibrate([0, 1000, 500, 1000]); 
            setCurrentRide(payload.new);
            setTimer(30);
            setShowRideModal(true);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  function closeRideModal() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowRideModal(false);
    setCurrentRide(null);
  }

  const handleAccept = async () => {
    if (!currentRide || !userId) return;
    try {
      const { data, error } = await supabase.rpc('accept_ride_v2', {
        p_ride_id: currentRide.id,
        p_driver_id: userId
      });

      if (error) {
        Alert.alert("Erreur", error.message);
        return;
      }

      if (data && data.success) {
        closeRideModal();
        router.push({
          pathname: "/map" as any, 
          params: { rideId: currentRide.id, status: 'accepted' }
        }); 
      } else {
        Alert.alert("DIOMY", data?.message || "Erreur");
        closeRideModal();
      }
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;

  const isDriver = ['chauffeur', 'conducteur', 'conducteurs'].includes(role || '');

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tabs screenOptions={{ 
        tabBarActiveTintColor: '#1e3a8a', 
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          ...Platform.select({
            web: {
              height: 60,
              paddingBottom: 10,
              position: 'relative',
            },
            android: {
              // ✅ Ajustement : On descend de 110 à 90 pour éviter de toucher la recherche passager
              height: 90,      
              paddingBottom: 35, 
              position: 'absolute',
              elevation: 30,
            }
          })
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
        tabBarHideOnKeyboard: true 
      }}>
        <Tabs.Screen name="index" options={{ href: null as any }} />
        <Tabs.Screen name="map" options={{ 
          title: 'Carte', 
          tabBarIcon: ({ color }) => <Ionicons name="map" size={26} color={color} /> 
        }} />
        <Tabs.Screen name="finance" options={{ 
          title: 'Revenus', 
          href: isDriver ? "/finance" as any : null as any, 
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={26} color={color} /> 
        }} />
        <Tabs.Screen name="profile" options={{ 
          title: 'Profil', 
          tabBarIcon: ({ color }) => <Ionicons name="person" size={26} color={color} /> 
        }} />
      </Tabs>

      {showRideModal && (
        <View style={styles.customOverlay}>
          <View style={[styles.rideCard, { paddingBottom: 80 }]}>
            <View style={styles.headerIndicator} />
            <Text style={styles.modalTitle}>NOUVELLE COURSE DISPONIBLE !</Text>
            <View style={styles.timerContainer}><Text style={styles.timerText}>{timer}s</Text></View>
            <Text style={styles.priceText}>{currentRide?.price?.toLocaleString()} FCFA</Text>
            <Text style={styles.destText}>Vers : {currentRide?.destination_name || 'Korhogo'}</Text>
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={closeRideModal}>
                <Text style={styles.btnTextBlack}>IGNORER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Text style={styles.btnTextWhite}>ACCEPTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  customOverlay: { 
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  rideCard: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 35, borderTopRightRadius: 35, 
    padding: 30, alignItems: 'center'
  },
  headerIndicator: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 25 },
  timerContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  timerText: { fontSize: 26, fontWeight: 'bold', color: '#1e3a8a' },
  priceText: { fontSize: 36, fontWeight: '900', color: '#1e293b', marginBottom: 10 },
  destText: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 35 },
  btnRow: { flexDirection: 'row', gap: 15, width: '100%' },
  acceptBtn: { flex: 2, backgroundColor: '#22c55e', padding: 20, borderRadius: 20, alignItems: 'center' },
  declineBtn: { flex: 1, backgroundColor: '#f1f5f9', padding: 20, borderRadius: 20, alignItems: 'center' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextBlack: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
});