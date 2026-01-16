import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, TextInput, Platform, 
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Vibration, ScrollView 
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants'; // AJOUTÉ pour détecter Expo Go
import { supabase } from '../lib/supabase';

// On n'active le handler que si on n'est pas sur un simulateur ou si les notifications sont supportées
if (Device.isDevice) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldSetBadge: false,
      }),
    });
}

interface MapDisplayProps {
  userRole?: string | null;
}

export default function MapDisplay({ userRole: initialRole }: MapDisplayProps) {
  const mapRef = useRef<MapView>(null);
  const [role, setRole] = useState<string | null>(initialRole || null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number>(100); 
  const [isOnline, setIsOnline] = useState(false);
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [pickupLocation, setPickupLocation] = useState<{lat: number, lon: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number} | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [finalRideData, setFinalRideData] = useState<any>(null);
  const [tempRating, setTempRating] = useState(0);
  const [instructions, setInstructions] = useState<any[]>([]);
  const lastSpokenIndex = useRef<number>(-1);

  const STADIA_API_KEY = "21bfb3bb-affc-4360-8e0f-c2a636e1db34"; 
  const COMMISSION_RATE = 0.20; 

  const [region] = useState({
    latitude: 9.4580,
    longitude: -5.6290,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // --- LOGIQUE NOTIFICATIONS PUSH SÉCURISÉE ---
  async function registerForPushNotificationsAsync() {
    // SÉCURITÉ : Si on est dans Expo Go sur Android, on ignore pour éviter le crash
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      console.warn("Les notifications Push ne sont pas supportées dans Expo Go sur Android (SDK 53+).");
      return null;
    }

    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }
      
      try {
          token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId, 
          })).data;
      } catch (e) {
          console.error("Erreur token:", e);
          return null;
      }
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    return token;
  }

  const speakInstruction = (text: string) => {
    Speech.speak(text, { language: 'fr', pitch: 1, rate: 0.9 });
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const f1 = lat1 * Math.PI/180;
    const f2 = lat2 * Math.PI/180;
    const df = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(df/2) * Math.sin(df/2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const calculateDiomyPrice = (distKm: number) => {
    let price = 250; 
    if (distKm > 1.5) price = 250 + (distKm - 1.5) * 100;
    return Math.ceil(price / 50) * 50;
  };

  const getRoute = async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.[0]) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
        setRouteCoords(coords);
        const allSteps = route.legs[0].steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          location: { lat: step.maneuver.location[1], lon: step.maneuver.location[0] },
          distance: step.distance
        }));
        setInstructions(allSteps);
        lastSpokenIndex.current = -1;
        return route;
      }
    } catch (e) { console.error("Route error:", e); }
    return null;
  };

  const updateDriverNavigation = async (status: string, ride: any) => {
    if (!ride) return;
    const myLoc = await Location.getCurrentPositionAsync({});
    if (status === 'accepted') {
      speakInstruction("Course acceptée. Rejoignez le client.");
      await getRoute(myLoc.coords.latitude, myLoc.coords.longitude, ride.pickup_lat, ride.pickup_lon);
    } else if (status === 'in_progress') {
      speakInstruction("Client récupéré. En route vers la destination.");
      await getRoute(ride.pickup_lat, ride.pickup_lon, ride.dest_lat, ride.dest_lon);
    }
  };

  const handleFinalizeRide = async () => {
    try {
      const { data: ride } = await supabase.from('rides_request').select('*').eq('id', currentRideId).single();
      if (ride) {
        const commissionAmount = ride.price * COMMISSION_RATE;
        await supabase.from('rides_request').update({ status: 'completed' }).eq('id', currentRideId);
        await supabase.from('historique_courses').insert([{
          ride_id: ride.id, chauffeur_id: ride.driver_id, passager_id: ride.passenger_id,
          montant: ride.price, destination: ride.destination_name
        }]);
        const { data: wallet } = await supabase.from('portefeuilles').select('solde').eq('user_id', ride.driver_id).maybeSingle();
        const currentSolde = wallet?.solde || 0;
        const newSolde = currentSolde - commissionAmount;
        await supabase.from('portefeuilles').upsert({ 
          user_id: ride.driver_id, solde: newSolde, updated_at: new Date().toISOString()
        });
        if (newSolde <= 0) {
          Alert.alert("DIOMY", "Solde épuisé. Veuillez recharger pour continuer.");
          setIsOnline(false);
          await supabase.from('conducteurs').update({ is_online: false }).eq('id', ride.driver_id);
        }
      }
    } catch (err) { console.error("Erreur finalisation:", err); }
  };

  useEffect(() => {
    let locationSubscription: any;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 10 },
        async (location) => {
          const { latitude, longitude } = location.coords;
          if (isOnline && (role === 'chauffeur')) {
            await supabase.from('profiles').update({ 
              latitude, longitude, last_active: new Date().toISOString() 
            }).eq('id', userId);
            await supabase.from('conducteurs').update({ 
              location: `POINT(${longitude} ${latitude})` 
            }).eq('id', userId);
          }
          if (rideStatus === 'accepted' || rideStatus === 'in_progress') {
            mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000);
            if (instructions && instructions.length > 0) {
              instructions.forEach((step, index) => {
                const distToTurn = getDistance(latitude, longitude, step.location.lat, step.location.lon);
                if (distToTurn < 100 && lastSpokenIndex.current !== index) {
                   let text = step.instruction;
                   if (text.includes("Turn right")) text = "Tournez à droite";
                   if (text.includes("Turn left")) text = "Tournez à gauche";
                   if (text.includes("Continue")) text = "Continuez tout droit";
                   if (text.includes("You have arrived")) text = "Vous êtes arrivés à destination";
                   speakInstruction(text);
                   lastSpokenIndex.current = index;
                }
              });
            }
          }
        }
      );
    };
    if (role === 'chauffeur') startTracking();
    return () => locationSubscription?.remove();
  }, [rideStatus, role, instructions, isOnline, userId]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('role, score').eq('id', user.id).maybeSingle();
        const { data: isDriverTable } = await supabase.from('conducteurs').select('id, is_online').eq('id', user.id).maybeSingle();
        let finalRole = (isDriverTable || profile?.role === 'chauffeur') ? "chauffeur" : "passager";
        setRole(finalRole);
        setUserScore(profile?.score ?? 100);
        if (isDriverTable) setIsOnline(isDriverTable.is_online);
        const { data: activeRide } = await supabase.from('rides_request').select('*').or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`).in('status', ['pending', 'accepted', 'in_progress']).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (activeRide) {
          setCurrentRideId(activeRide.id);
          setRideStatus(activeRide.status);
          if (finalRole === 'chauffeur') updateDriverNavigation(activeRide.status, activeRide);
        }
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('rides-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides_request' }, (payload) => {
        const updated = payload.new as any;
        if (updated.passenger_id === userId || updated.driver_id === userId) {
          setRideStatus(updated.status);
          setCurrentRideId(updated.id);
          if (updated.status === 'completed') {
            setFinalRideData(updated);
            setShowSummary(true);
            setRideStatus(null); setRouteCoords([]); setInstructions([]);
            if (role === 'chauffeur') speakInstruction("Course terminée. Merci d'avoir utilisé Diomy.");
          } else if (role === 'chauffeur') updateDriverNavigation(updated.status, updated);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides_request' }, (payload) => {
        const newRide = payload.new as any;
        if (newRide.driver_id === userId && isOnline && !rideStatus) {
          Vibration.vibrate([0, 1000, 500, 1000]);
          setIncomingRide(newRide); 
          setShowModal(true);
          speakInstruction(`Nouvelle demande vers ${newRide.destination_name}. Prix ${newRide.price} francs.`);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, role, isOnline, rideStatus]);

  const submitRating = async (stars: number) => {
    setTempRating(stars);
    const targetId = role === 'chauffeur' ? finalRideData.passenger_id : finalRideData.driver_id;
    try {
      const { data: p } = await supabase.from('profiles').select('score').eq('id', targetId).single();
      const newScore = Math.min(100, (p?.score || 0) + (stars * 4));
      await supabase.from('profiles').update({ score: newScore }).eq('id', targetId);
      if (role === 'passager') {
        setDestination('');
        setSelectedLocation(null);
        setPickupLocation(null);
        setRouteCoords([]);
        setEstimatedPrice(null);
        setEstimatedDistance(null);
      }
      Alert.alert("DIOMY", "Merci pour votre note !");
      setShowSummary(false);
      setTempRating(0);
    } catch (e) { setShowSummary(false); }
  };

  const toggleOnlineStatus = async () => {
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') return;
    const { data: wallet } = await supabase.from('portefeuilles').select('solde').eq('user_id', userId).maybeSingle();
    if ((wallet?.solde || 0) <= 0) {
      Alert.alert("DIOMY", "Solde insuffisant. Veuillez recharger.");
      return;
    }
    const nextStatus = !isOnline;

    if (nextStatus) {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
      }
    }

    const loc = await Location.getCurrentPositionAsync({});
    await supabase.from('conducteurs').upsert({ id: userId, is_online: nextStatus, location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})` });
    setIsOnline(nextStatus);
    speakInstruction(nextStatus ? "Vous êtes en ligne" : "Vous êtes hors ligne");
  };

  const renderDriverUI = () => (
    <View style={styles.driverPane}>
      <View style={styles.scoreBadge}>
          <MaterialCommunityIcons name="star-circle" size={22} color="#eab308" />
          <Text style={styles.scoreText}>Score Fiabilité : {userScore}/100</Text>
      </View>
      {rideStatus === 'accepted' ? (
        <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#f97316'}]} onPress={async () => { 
            await supabase.from('rides_request').update({ status: 'in_progress' }).eq('id', currentRideId); 
        }}>
          <Text style={styles.btnText}>CLIENT RÉCUPÉRÉ (DÉMARRER)</Text>
        </TouchableOpacity>
      ) : rideStatus === 'in_progress' ? (
        <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#22c55e'}]} onPress={handleFinalizeRide}>
          <Text style={styles.btnText}>TERMINER LA COURSE</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.mainBtn, isOnline ? styles.bgOnline : styles.bgOffline]} onPress={toggleOnlineStatus}>
          <Text style={styles.btnText}>{isOnline ? "EN LIGNE (MOTO ACTIVE)" : "ACTIVER MA MOTO"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPassengerUI = () => (
    <View style={styles.passengerPane}>
      {rideStatus ? (
        <View style={styles.statusCard}>
          <FontAwesome5 name="motorcycle" size={24} color="#1e3a8a" />
          <Text style={styles.statusText}>{rideStatus === 'accepted' ? "Le chauffeur arrive..." : "Course en cours..."}</Text>
        </View>
      ) : (
        <>
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {suggestions.map((item, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={async () => {
                    const [lon, lat] = item.geometry.coordinates;
                    setSelectedLocation({ lat, lon }); setDestination(item.properties.name); setSuggestions([]);
                    const loc = await Location.getCurrentPositionAsync({});
                    setPickupLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
                    const routeData = await getRoute(loc.coords.latitude, loc.coords.longitude, lat, lon);
                    if (routeData) { 
                      setEstimatedDistance((routeData.distance / 1000).toFixed(1)); 
                      setEstimatedPrice(calculateDiomyPrice(routeData.distance / 1000)); 
                    }
                  }}>
                    <Ionicons name="location-outline" size={20} color="#64748b" />
                    <Text style={styles.suggestionText} numberOfLines={1}>{item.properties.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {selectedLocation && (
            <TouchableOpacity style={styles.confirmBtn} onPress={async () => {
                const { data: driver } = await supabase.rpc('find_nearest_driver', { px_lat: pickupLocation?.lat, px_lon: pickupLocation?.lon });
                if (driver?.[0]) {
                  await supabase.from('rides_request').insert([{
                    passenger_id: userId, driver_id: driver[0].id, status: 'pending', destination_name: destination,
                    dest_lat: selectedLocation.lat, dest_lon: selectedLocation.lon, pickup_lat: pickupLocation?.lat, pickup_lon: pickupLocation?.lon, price: estimatedPrice
                  }]);
                } else { Alert.alert("DIOMY", "Aucun chauffeur à proximité."); }
            }}>
                <View style={styles.priceContainer}>
                  <View style={styles.priceLeft}><Text style={styles.distLabel}>{estimatedDistance} km</Text><Text style={styles.priceLabel}>{estimatedPrice} FCFA</Text></View>
                  <Text style={styles.orderLabel}>COMMANDER</Text>
                </View>
            </TouchableOpacity>
          )}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color="#1e3a8a" style={{marginRight: 10}} />
            <TextInput style={styles.input} placeholder="Où allez-vous ?" value={destination} onChangeText={async (text) => {
              setDestination(text);
              if (text.length > 2) {
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&bbox=-5.70,9.35,-5.55,9.55&limit=10`);
                const d = await res.json(); setSuggestions(d.features || []);
              } else setSuggestions([]);
            }} />
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation>
        <UrlTile urlTemplate={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${STADIA_API_KEY}`} />
        {pickupLocation && <Marker coordinate={{ latitude: pickupLocation.lat, longitude: pickupLocation.lon }} pinColor="green" />}
        {selectedLocation && <Marker coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lon }} />}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor={rideStatus === 'accepted' ? "#f97316" : "#1e3a8a"} />}
      </MapView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer} pointerEvents="box-none">
        <View style={styles.overlay}>
          { (role === 'chauffeur') ? renderDriverUI() : renderPassengerUI() }
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle course !</Text>
            <Text style={styles.destinationText}>{incomingRide?.destination_name}</Text>
            <Text style={styles.priceText}>{incomingRide?.price} FCFA</Text>
            <div style={styles.modalButtons}>
                <TouchableOpacity style={styles.declineBtn} onPress={async () => { await supabase.from('rides_request').update({ status: 'declined' }).eq('id', incomingRide.id); setShowModal(false); }}><Text style={styles.declineText}>REFUSER</Text></TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={async () => { await supabase.from('rides_request').update({ status: 'accepted' }).eq('id', incomingRide.id); setShowModal(false); }}><Text style={styles.acceptText}>ACCEPTER</Text></TouchableOpacity>
            </div>
          </View>
        </View>
      </Modal>

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 30 }]}>
            <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
            <Text style={styles.modalTitle}>Course Terminée</Text>
            <Text style={styles.priceSummary}>{finalRideData?.price} FCFA</Text>
            <Text style={styles.subtitleSummary}>{role === 'chauffeur' ? "Argent encaissé (Client)" : "Montant payé (Chauffeur)"}</Text>
            
            <View style={styles.ratingBox}>
              <Text style={styles.ratingTitle}>Notez votre {role === 'chauffeur' ? "passager" : "chauffeur"}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => submitRating(s)}>
                    <Ionicons name={tempRating >= s ? "star" : "star-outline"} size={35} color={tempRating >= s ? "#eab308" : "#cbd5e1"} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.closeSummaryBtn} onPress={() => setShowSummary(false)}><Text style={styles.closeSummaryText}>FERMER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  keyboardContainer: { flex: 1, justifyContent: 'flex-end' },
  overlay: { padding: 20, paddingBottom: 60 },
  driverPane: { width: '100%' },
  scoreBadge: { backgroundColor: '#fff', padding: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 4 },
  scoreText: { marginLeft: 10, fontWeight: 'bold', color: '#1e3a8a' },
  mainBtn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  bgOnline: { backgroundColor: '#22c55e' },
  bgOffline: { backgroundColor: '#1e3a8a' },
  passengerPane: { width: '100%' },
  searchBar: { backgroundColor: '#fff', height: 65, borderRadius: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', elevation: 10 },
  input: { flex: 1, fontSize: 16 },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 10, elevation: 5, maxHeight: 200, overflow: 'hidden' },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionText: { fontSize: 14, flex: 1 },
  confirmBtn: { backgroundColor: '#1e3a8a', borderRadius: 20, elevation: 8, marginBottom: 15, padding: 15 },
  statusCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  statusText: { marginLeft: 15, fontWeight: 'bold' },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLeft: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)', paddingRight: 20 },
  distLabel: { color: '#cbd5e1', fontSize: 14 },
  priceLabel: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  orderLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', padding: 25, borderRadius: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  destinationText: { fontSize: 16, color: '#334155', textAlign: 'center' },
  priceText: { fontSize: 32, fontWeight: 'bold', color: '#22c55e', marginVertical: 20 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  acceptBtn: { backgroundColor: '#1e3a8a', padding: 15, borderRadius: 15, width: '48%', alignItems: 'center' },
  declineBtn: { borderWidth: 1, borderColor: 'red', padding: 15, borderRadius: 15, width: '48%', alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: 'bold' },
  declineText: { color: 'red', fontWeight: 'bold' },
  priceSummary: { fontSize: 40, fontWeight: '900', color: '#1e3a8a' },
  subtitleSummary: { color: '#64748b', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  ratingBox: { width: '100%', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
  ratingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  closeSummaryBtn: { marginTop: 10, padding: 10 },
  closeSummaryText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 }
});