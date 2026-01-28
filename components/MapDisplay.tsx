import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, TextInput, Platform, 
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Vibration, ScrollView, Linking, Image 
} from 'react-native';
import { WebView } from 'react-native-webview'; 
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

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

// ✅ 1. Interface mise à jour pour TypeScript
interface MapDisplayProps {
  userRole?: string | null;
  rideStatus?: string | null; 
  currentRide?: any;          
}

export default function MapDisplay({ userRole: initialRole, rideStatus: propRideStatus, currentRide: propCurrentRide }: MapDisplayProps) {
  const webviewRef = useRef<WebView>(null); 
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
  const [showModal, setShowModal] = useState(false); 
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [finalRideData, setFinalRideData] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false); 
  const [partnerInfo, setPartnerInfo] = useState<any>(null);

  const STADIA_API_KEY = "21bfb3bb-affc-4360-8e0f-c2a636e1db34"; 

  // ✅ 2. Synchronisation Corrigée (Libère la barre de recherche si idle)
  useEffect(() => {
    if (propRideStatus === 'idle') {
      setRideStatus(null); // Force l'affichage de la barre de recherche
    } else if (propRideStatus) {
      setRideStatus(propRideStatus);
      // Navigation auto si accepté
      if ((propRideStatus === 'accepted' || propRideStatus === 'in_progress') && propCurrentRide && role === 'chauffeur') {
        updateDriverNavigation(propRideStatus, propCurrentRide);
      }
    }
    if (propCurrentRide) setCurrentRideId(propCurrentRide.id);
  }, [propRideStatus, propCurrentRide]);

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("GPS", "Permission refusée.");
      return;
    }
    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = location.coords;
    setPickupLocation({ lat: latitude, lon: longitude });
    
    webviewRef.current?.postMessage(JSON.stringify({
      type: 'points',
      p: { lat: latitude, lon: longitude },
      d: selectedLocation || { lat: latitude, lon: longitude }
    }));
  };

  const getLogicalStreetName = async (lat: number, lon: number) => {
    try {
      const { data } = await supabase.rpc('get_logical_address', { lat, lon });
      return data || "Ma destination à Korhogo";
    } catch (e) { return "Destination sélectionnée"; }
  };

  const handleLocationSelect = async (lat: number, lon: number, name: string) => {
    setSelectedLocation({ lat, lon });
    setDestination(name);
    setSuggestions([]);
    const loc = await Location.getCurrentPositionAsync({});
    setPickupLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    const r = await getRoute(loc.coords.latitude, loc.coords.longitude, lat, lon);
    if (r) {
      setEstimatedDistance((r.distance/1000).toFixed(1));
      setEstimatedPrice(calculateDiomyPrice(r.distance/1000));
    }
  };

  const calculateDiomyPrice = (distKm: number) => {
    let price = 250; 
    if (distKm > 1.5) price = 250 + (distKm - 1.5) * 100;
    return Math.ceil(price / 50) * 50;
  };

  const resetSearch = () => {
    setDestination(''); setSuggestions([]); setSelectedLocation(null);
    setEstimatedPrice(null); setEstimatedDistance(null);
    setCurrentRideId(null); setRideStatus(null); setPartnerInfo(null);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'reset_map' }));
  };

  // ✅ 3. HTML mis à jour pour le tracé de route (Polyline)
  const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body,html{margin:0;padding:0;height:100%;width:100%;overflow:hidden;}#map{height:100vh;width:100vw;background:#e0f2f1;}.blue-dot{width:15px;height:15px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(37,99,235,0.5);}.leaflet-control-attribution{display:none !important;}</style></head><body><div id="map"></div><script>var map=L.map('map',{zoomControl:false}).setView([9.4580,-5.6290],15);L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}.png?api_key=${STADIA_API_KEY}',{maxZoom:20}).addTo(map);var markers={};var routeLayer=null;window.addEventListener("message",function(e){var data=JSON.parse(e.data);
    if(data.type==='draw_route' && data.coordinates){
        if(routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(data.coordinates.map(c => [c[1], c[0]]), {color: '#2563eb', weight: 6, opacity: 0.8}).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.2));
    }
    if(data.type==='points'){if(markers.p)map.removeLayer(markers.p);if(markers.d)map.removeLayer(markers.d);markers.p=L.marker([data.p.lat,data.p.lon],{icon:L.divIcon({className:'blue-dot',iconSize:[15,15]})}).addTo(map);if(data.d&&(data.d.lat!==data.p.lat))markers.d=L.marker([data.d.lat,data.d.lon]).addTo(map);if(!routeLayer){var group=new L.featureGroup(Object.values(markers));map.fitBounds(group.getBounds().pad(0.5));}}if(data.type==='reset_map'){if(markers.p)map.removeLayer(markers.p);if(markers.d)map.removeLayer(markers.d);if(routeLayer)map.removeLayer(routeLayer);markers={};routeLayer=null;}});map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_click',lat:e.latlng.lat,lon:e.latlng.lng}));});</script></body></html>`;

  const onMapMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'map_click' && role === 'passager' && !rideStatus) {
        const logicalName = await getLogicalStreetName(data.lat, data.lon);
        handleLocationSelect(data.lat, data.lon, logicalName);
    }
  };

  const speakInstruction = (text: string) => {
    Speech.speak(text, { language: 'fr', pitch: 1, rate: 0.9 });
  };

  const getRoute = async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.[0]) {
        // ✅ Envoi du tracé à la WebView
        webviewRef.current?.postMessage(JSON.stringify({ type: 'draw_route', coordinates: data.routes[0].geometry.coordinates }));
        webviewRef.current?.postMessage(JSON.stringify({ type: 'points', p: {lat: startLat, lon: startLon}, d: {lat: endLat, lon: endLon} }));
        return data.routes[0];
      }
    } catch (e) { console.error('Erreur OSRM:', e); }
    return null;
  };

  const updateDriverNavigation = async (status: string, ride: any) => {
    if (!ride) return;
    try {
      const myLoc = await Location.getCurrentPositionAsync({});
      if (status === 'accepted') {
        speakInstruction("Course acceptée. Rejoignez le client.");
        await getRoute(myLoc.coords.latitude, myLoc.coords.longitude, ride.pickup_lat, ride.pickup_lon);
      } else if (status === 'in_progress') {
        speakInstruction("Client récupéré. En route vers la destination.");
        await getRoute(ride.pickup_lat, ride.pickup_lon, ride.dest_lat, ride.dest_lon);
      }
    } catch (error) { console.error('Erreur navigation:', error); }
  };

  const handleFinalizeRide = async () => {
    try {
      await supabase.from('rides_request').update({ status: 'completed' }).eq('id', currentRideId);
      const { data: soldeData } = await supabase.from('chauffeur_solde_net').select('solde_disponible').eq('driver_id', userId).maybeSingle();
      if ((soldeData?.solde_disponible || 0) < 500) {
        Alert.alert("DIOMY", "Solde épuisé après commission.");
        setIsOnline(false);
        await supabase.from('conducteurs').update({ is_online: false }).eq('id', userId);
      }
      resetSearch();
      speakInstruction("Course terminée.");
    } catch (err) { console.error('Erreur finalisation:', err); }
  };

  const makeCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("Erreur", "Numéro non disponible.");
  };

  const fetchPartnerInfo = async (id: string) => {
    try {
      const { data } = await supabase.from('profiles').select('full_name, phone_number, avatar_url, vehicle_model').eq('id', id).maybeSingle();
      setPartnerInfo(data);
    } catch (error) { console.error('Erreur fetchPartnerInfo:', error); }
  };

  // ✅ INITIALISATION SÉCURISÉE (On ne force pas rideStatus ici)
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data: prof } = await supabase.from('profiles').select('role, score').eq('id', user.id).maybeSingle();
        const { data: cond } = await supabase.from('conducteurs').select('id, is_online').eq('id', user.id).maybeSingle();
        const userRole = (cond || prof?.role === 'chauffeur') ? "chauffeur" : "passager";
        setRole(userRole);
        setUserScore(prof?.score ?? 100);
        if (cond) setIsOnline(cond.is_online);
        const { data: activeRide } = await supabase.from('rides_request').select('*').or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`).in('status', ['pending', 'accepted', 'in_progress']).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (activeRide) {
          setCurrentRideId(activeRide.id);
          const partnerId = userRole === 'chauffeur' ? activeRide.passenger_id : activeRide.driver_id;
          if (partnerId) fetchPartnerInfo(partnerId);
          // On laisse MapScreen.tsx décider du rideStatus au chargement
        }
        setIsMapReady(true);
        setTimeout(getCurrentLocation, 2000);
      } catch (error) { console.error('Erreur init:', error); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('rides-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides_request' }, (payload) => {
        const up = payload.new as any;
        if (up.passenger_id === userId || up.driver_id === userId) {
          setRideStatus(up.status);
          setCurrentRideId(up.id);
          if (up.status === 'accepted' || up.status === 'in_progress') {
            const partnerId = role === 'chauffeur' ? up.passenger_id : up.driver_id;
            if (partnerId) fetchPartnerInfo(partnerId);
          }
          if (up.status === 'completed') {
            setFinalRideData(up); setShowSummary(true); setRideStatus(null); setPartnerInfo(null);
          } else if (role === 'chauffeur') {
            updateDriverNavigation(up.status, up);
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides_request' }, (payload) => {
        const nr = payload.new as any;
        if (nr.driver_id === userId && isOnline && !rideStatus) {
          Vibration.vibrate([0, 1000]); setIncomingRide(nr); setShowModal(true);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, role, isOnline, rideStatus]);

  const toggleOnlineStatus = async () => {
    try {
      const nextStatus = !isOnline;
      let lat, lon;
      if (Platform.OS === 'web') { lat = 9.4580; lon = -5.6290; } 
      else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude; lon = loc.coords.longitude;
      }
      await supabase.from('conducteurs').upsert({ id: userId, is_online: nextStatus, location: `POINT(${lon} ${lat})` });
      setIsOnline(nextStatus);
      speakInstruction(nextStatus ? "En ligne" : "Hors ligne");
    } catch (error) { console.error(error); }
  };

  const handleOrderRide = async () => {
    try {
      let pLat, pLon;
      if (Platform.OS === 'web') { pLat = 9.4570; pLon = -5.6280; } 
      else { pLat = pickupLocation?.lat; pLon = pickupLocation?.lon; }
      if (!pLat || !pLon) return;
      const { data: drivers, error: rpcError } = await supabase.rpc('find_nearest_driver', { px_lat: pLat, px_lon: pLon, current_ride_id: null });
      if (rpcError || !drivers || drivers.length === 0) { Alert.alert("DIOMY", "Aucun chauffeur disponible."); return; }
      const { data: newRide, error: insertError } = await supabase.from('rides_request').insert([{ passenger_id: userId, driver_id: drivers[0].id, status: 'pending', destination_name: destination, dest_lat: selectedLocation?.lat || 9.457, dest_lon: selectedLocation?.lon || -5.628, pickup_lat: pLat, pickup_lon: pLon, price: estimatedPrice || 500 }]).select().single();
      if (!insertError) { setCurrentRideId(newRide.id); setRideStatus('pending'); Alert.alert("DIOMY", "Course envoyée !"); }
    } catch (error) { console.error(error); }
  };

  if (!isMapReady) return <View style={styles.loader}><ActivityIndicator size="large" color="#009199" /><Text style={styles.loaderText}>DIOMY...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <WebView ref={webviewRef} originWhitelist={['*']} source={{ html: mapHtml }} style={{ flex: 1, backgroundColor: 'transparent' }} javaScriptEnabled={true} domStorageEnabled={true} onMessage={onMapMessage} />
      </View>

      <TouchableOpacity style={styles.gpsBtn} onPress={getCurrentLocation}><Ionicons name="locate" size={26} color="#1e3a8a" /></TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer} pointerEvents="box-none">
        <View style={styles.overlay}>
          {(rideStatus === 'accepted' || rideStatus === 'in_progress') && partnerInfo && (
            <View style={styles.identityCard}>
              <View style={styles.idHeader}>
                <View style={styles.avatarBox}>
                  {partnerInfo.avatar_url ? <Image source={{ uri: partnerInfo.avatar_url }} style={styles.avatarImg} /> : <Ionicons name="person" size={28} color="#94a3b8" />}
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.idLabel}>{role === 'chauffeur' ? "VOTRE PASSAGER" : "VOTRE CHAUFFEUR"}</Text>
                  <Text style={styles.idName}>{partnerInfo.full_name || "Utilisateur DIOMY"}</Text>
                  {role === 'passager' && <Text style={styles.idMoto}>🏍️ {partnerInfo.vehicle_model || "Moto Standard"}</Text>}
                </View>
                <TouchableOpacity style={styles.phoneCircle} onPress={() => makeCall(partnerInfo.phone_number)}>
                  <Ionicons name="call" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {role === 'chauffeur' ? (
            <View style={styles.driverPane}>
              {!rideStatus && <View style={styles.scoreBadge}><MaterialCommunityIcons name="star-circle" size={22} color="#eab308" /><Text style={styles.scoreText}>Fiabilité : {userScore}/100</Text></View>}
              
              {rideStatus === 'accepted' ? (
                <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#f97316'}]} onPress={async () => {
                    const { error } = await supabase.from('rides_request').update({ status: 'in_progress' }).eq('id', currentRideId);
                    if (!error) {
                        setRideStatus('in_progress');
                        updateDriverNavigation('in_progress', propCurrentRide);
                    }
                }}>
                  <Text style={styles.btnText}>J'AI RÉCUPÉRÉ LE CLIENT</Text>
                </TouchableOpacity>
              ) : rideStatus === 'in_progress' ? (
                <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#22c55e'}]} onPress={handleFinalizeRide}>
                  <Text style={styles.btnText}>TERMINER LA COURSE</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.mainBtn, isOnline ? styles.bgOnline : styles.bgOffline]} onPress={toggleOnlineStatus}>
                  <Text style={styles.btnText}>{isOnline ? "EN LIGNE" : "ACTIVER MA MOTO"}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.passengerPane}>
              {rideStatus ? (
                <View style={styles.statusCard}><FontAwesome5 name="motorcycle" size={24} color="#1e3a8a" /><Text style={styles.statusText}>{rideStatus === 'accepted' ? "Le chauffeur arrive..." : "Course en cours..."}</Text></View>
              ) : (
                <>
                  {suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {suggestions.map((item, i) => (
                          <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => handleLocationSelect(item.geometry.coordinates[1], item.geometry.coordinates[0], item.properties.name)}>
                            <Ionicons name="location-outline" size={20} color="#64748b" /><Text style={styles.suggestionText}>{item.properties.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {(selectedLocation || Platform.OS === 'web') && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleOrderRide}>
                      <View style={styles.priceContainer}>
                        <View style={styles.priceLeft}><Text style={styles.distLabel}>{estimatedDistance || "1.2"} km</Text><Text style={styles.priceLabel}>{estimatedPrice || "500"} FCFA</Text></View>
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
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle course !</Text>
            <Text style={styles.priceText}>{incomingRide?.price} FCFA</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => setShowModal(false)}><Text style={styles.declineText}>REFUSER</Text></TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={async () => {
                await supabase.from('rides_request').update({ status: 'accepted' }).eq('id', incomingRide.id);
                setShowModal(false);
              }}><Text style={styles.acceptText}>ACCEPTER</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 30 }]}>
            <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
            <Text style={styles.modalTitle}>Course Terminée</Text>
            <Text style={styles.priceSummary}>{finalRideData?.price} FCFA</Text>
            <TouchableOpacity style={styles.closeSummaryBtn} onPress={() => { setShowSummary(false); resetSearch(); }}><Text style={styles.closeSummaryText}>FERMER</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ✅ STYLES IDENTIQUES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#009199' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#009199', fontWeight: 'bold' },
  keyboardContainer: { flex: 1, justifyContent: 'flex-end' },
  gpsBtn: { position: 'absolute', right: 20, bottom: 220, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 },
  overlay: { padding: 20, paddingBottom: Platform.OS === 'android' ? 110 : 80 },
  identityCard: { backgroundColor: '#fff', borderRadius: 25, padding: 15, marginBottom: 15, elevation: 10 },
  idHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  idLabel: { fontSize: 9, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' },
  idName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  idMoto: { fontSize: 12, color: '#1e3a8a', marginTop: 2 },
  phoneCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  driverPane: { width: '100%' },
  scoreBadge: { backgroundColor: '#fff', padding: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 4 },
  scoreText: { marginLeft: 10, fontWeight: 'bold', color: '#1e3a8a', fontSize: 14 },
  mainBtn: { height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  bgOnline: { backgroundColor: '#22c55e' },
  bgOffline: { backgroundColor: '#1e3a8a' },
  passengerPane: { width: '100%' },
  searchBar: { backgroundColor: '#fff', height: 65, borderRadius: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', elevation: 10 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 10, elevation: 5, maxHeight: 180, overflow: 'hidden' },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  suggestionText: { fontSize: 14, marginLeft: 10, color: '#1e293b', flex: 1 },
  confirmBtn: { backgroundColor: '#1e3a8a', borderRadius: 20, elevation: 8, marginBottom: 15, padding: 15 },
  statusCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  statusText: { marginLeft: 15, fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLeft: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)', paddingRight: 20 },
  distLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  priceLabel: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  orderLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', padding: 25, borderRadius: 30, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
  priceText: { fontSize: 32, fontWeight: 'bold', color: '#22c55e', marginVertical: 20 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 },
  acceptBtn: { backgroundColor: '#1e3a8a', padding: 15, borderRadius: 15, width: '48%', alignItems: 'center', elevation: 3 },
  declineBtn: { borderWidth: 2, borderColor: '#ef4444', padding: 15, borderRadius: 15, width: '48%', alignItems: 'center', backgroundColor: '#fff' },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  declineText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
  priceSummary: { fontSize: 40, fontWeight: '900', color: '#1e3a8a', marginVertical: 10 },
  closeSummaryBtn: { marginTop: 15, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10, width: '60%', alignItems: 'center' },
  closeSummaryText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 }
});