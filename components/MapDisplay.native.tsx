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
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import SwipeButton from 'react-native-swipe-button'; 

// ✅ NOUVEAUX IMPORTS PHASE 2 (Cloisonnement)
import ServiceSelector from './ServiceSelector';
import DeliveryForm from './DeliveryForm';

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
  userStatus?: string | null; 
  rideStatus?: string | null; 
  currentRide?: any;
  initialDestination?: {
    address: string;
    lat?: number;
    lon?: number;
  };         
}

export default function MapDisplay({ 
  userRole: initialRole, 
  userStatus, 
  rideStatus: propRideStatus, 
  currentRide: propCurrentRide,
  initialDestination 
}: MapDisplayProps) {
  const webviewRef = useRef<WebView>(null); 
  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ ÉTATS DE SÉLECTION DU SERVICE
  const [activeService, setActiveService] = useState<'transport' | 'delivery' | null>(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false); 
  
  // ✅ ÉTATS AJOUTÉS SÉCURITÉ PHASE 2
  const [deliveryPin, setDeliveryPin] = useState<string | null>(null); 
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const hasNotifiedProximity = useRef(false);

  const isHandlingModal = useRef(false);
  const lastProcessedRideId = useRef<string | null>(null);
  const hasNotifiedArrival = useRef(false); 
  const hasCenteredInitially = useRef(false);

  const [role, setRole] = useState<string | null>(initialRole || null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number>(100); 
  const [isOnline, setIsOnline] = useState(false);
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [pickupLocation, setPickupLocation] = useState<{lat: number, lon: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number} | null>(null);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [finalRideData, setFinalRideData] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false); 
  const [partnerInfo, setPartnerInfo] = useState<any>(null);

  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(null);

  const [realTraveledDistance, setRealTraveledDistance] = useState(0);
  const lastLocForDistance = useRef<{lat: number, lon: number} | null>(null);

  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0); 
  const waitingTimerRef = useRef<any>(null);

  const [hasArrivedAtPickup, setHasArrivedAtPickup] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  const [userRating, setUserRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const STADIA_API_KEY = "21bfb3bb-affc-4360-8e0f-c2a636e1db34"; 

  const canGoOnline = userStatus === 'validated' || userStatus === 'valide';

  const speak = async (text: string) => {
    try {
      await Speech.stop();
      Speech.speak(text, { language: 'fr', pitch: 1, rate: 0.95 });
    } catch (e) { console.error("Speech error:", e); }
  };

  // ✅ FONCTION NOTIFICATION PUSH GRATUITE
  const sendPushNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, priority: 'high' },
      trigger: null,
    });
  };

  const handleCancelRide = async () => {
    if (!currentRideId) return;

    Alert.alert(
      "Annuler la course",
      "Voulez-vous vraiment annuler ? (Pénalité de 2 points sur votre score)",
      [
        { text: "Non", style: "cancel" },
        { 
          text: "Oui, Annuler", 
          style: "destructive",
          onPress: async () => {
            try {
              const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
              const { data: ride } = await supabase.from(table).select('created_at').eq('id', currentRideId).single();
              
              if (ride) {
                const now = new Date().getTime();
                const createdAt = new Date(ride.created_at).getTime();
                const diffInSeconds = (now - createdAt) / 1000;

                if (diffInSeconds > 120) {
                  const { data: prof } = await supabase.from('profiles').select('score').eq('id', userId).single();
                  await supabase.from('profiles').update({ score: Math.max(0, (prof?.score || 100) - 2) }).eq('id', userId);
                  Alert.alert("Pénalité", "Délai de 2mn dépassé : -2 points de fiabilité.");
                } else {
                  Alert.alert("Annulation Gratuite", "Course annulée sans pénalité.");
                }
              }

              await supabase.from(table).update({ status: 'cancelled' }).eq('id', currentRideId);
              sendMessage("⚠️ La course a été annulée.");
              speak("Course annulée.");
              resetSearch();
            } catch (err) {
              console.error("Erreur annulation:", err);
            }
          }
        }
      ]
    );
  };

  const handleDeliveryOrder = async (deliveryData: any) => {
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    setDeliveryPin(pinCode); 
    
    // ✅ LOGIQUE TARIF PAR TAILLE
    let basePrice = 500; // Petit
    if (deliveryData.packageType === 'Moyen') basePrice = 750;
    if (deliveryData.packageType === 'Grand') basePrice = 1000;

    try {
      const { data } = await supabase.from('delivery_requests').insert([{
        sender_id: userId,
        pickup_lat: pickupLocation?.lat, pickup_lon: pickupLocation?.lon,
        delivery_lat: selectedLocation?.lat, delivery_lon: selectedLocation?.lon,
        recipient_name: deliveryData.recipientName,
        recipient_phone: deliveryData.recipientPhone,
        package_type: deliveryData.packageType,
        verification_code: pinCode, // ✅ PIN ENREGISTRÉ
        status: 'pending',
        price: estimatedPrice || basePrice // ✅ PRIX BASÉ SUR LA TAILLE
      }]).select().single();

      if (data) {
        Alert.alert("Colis Enregistré ! 📦", `Code de vérification : ${pinCode}`);
        speak("Livraison enregistrée.");
        setRideStatus('pending'); 
        setCurrentRideId(data.id);
        setShowDeliveryForm(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleOnline = async () => {
    if (!canGoOnline) {
      Alert.alert("DIOMY", "Votre dossier est en cours d'analyse.");
      return;
    }
    
    const { data: soldeData } = await supabase.from('chauffeur_solde_net').select('solde_disponible').eq('driver_id', userId).maybeSingle();
    if (!isOnline && (soldeData?.solde_disponible || 0) < 50) { 
      Alert.alert("DIOMY", "Solde insuffisant."); 
      return; 
    }

    const nextStatus = !isOnline;
    speak(nextStatus ? "Vous êtes en ligne." : "Vous êtes déconnecté.");
    setIsOnline(nextStatus);

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await supabase.from('conducteurs').upsert({ 
        id: userId, 
        is_online: nextStatus, 
        location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})` 
      });
    } catch (err) { console.error("Sync error:", err); }
  };

  useEffect(() => {
    if (isWaiting) {
      waitingTimerRef.current = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
    }
    return () => { if (waitingTimerRef.current) clearInterval(waitingTimerRef.current); };
  }, [isWaiting]);

  const toggleWaiting = () => {
    const nextState = !isWaiting;
    setIsWaiting(nextState);
    if (nextState) {
      sendMessage("⏳ Le chauffeur a activé le mode attente.");
      speak("Mode attente activé");
    } else {
      sendMessage("✅ Le trajet reprend.");
      speak("Reprise du trajet");
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const injectLocationToMap = (lat: number, lon: number, focus: boolean = false) => {
    if (!webviewRef.current) return;
    
    // On prépare un objet simple avec les données
    const locationData = JSON.stringify({
      type: 'set_location',
      lat: lat,
      lon: lon,
      focus: focus
    });

    // On l'envoie à la carte via postMessage (plus stable)
    webviewRef.current.postMessage(locationData);
  };
  
  const getCurrentLocation = async (forceFocus = false) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("GPS", "Veuillez autoriser la localisation précise.");
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const currentPos = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setPickupLocation(currentPos);
      
      injectLocationToMap(currentPos.lat, currentPos.lon, forceFocus || !hasCenteredInitially.current);

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        async (location) => {
          const { latitude, longitude } = location.coords;
          const currentPos = { lat: latitude, lon: longitude };

          // ✅ LOGIQUE PROXIMITÉ 500M (Phase 2)
          if (role === 'chauffeur' && rideStatus === 'in_progress' && !hasNotifiedProximity.current && selectedLocation) {
            const dToDest = calculateDistance(latitude, longitude, selectedLocation.lat, selectedLocation.lon) * 1000;
            if (dToDest < 500) {
              hasNotifiedProximity.current = true;
              sendMessage("🚀 Je suis à moins de 500m de l'arrivée !");
              sendPushNotification("DIOMY", "Votre colis arrive dans 2 minutes !");
            }
          }

          if (role === 'chauffeur' && rideStatus === 'accepted' && !hasNotifiedArrival.current && currentRideId) {
              const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
              const { data: ride } = await supabase.from(table).select('pickup_lat, pickup_lon').eq('id', currentRideId).single();
              if (ride) {
                  const dist = calculateDistance(latitude, longitude, ride.pickup_lat, ride.pickup_lon) * 1000;
                  if (dist < 50) {
                      hasNotifiedArrival.current = true;
                      setHasArrivedAtPickup(true);
                      sendMessage("🏁 Je suis arrivé au point de rendez-vous !");
                      speak("Vous êtes arrivé au point de rendez-vous.");
                      Vibration.vibrate(500);
                  }
              }
          }

          if (rideStatus === 'in_progress' && lastLocForDistance.current) {
            const d = calculateDistance(lastLocForDistance.current.lat, lastLocForDistance.current.lon, latitude, longitude);
            setRealTraveledDistance(prev => prev + d);
          }
          lastLocForDistance.current = currentPos;
          setPickupLocation(currentPos);
          injectLocationToMap(latitude, longitude, !hasCenteredInitially.current);
          if (!hasCenteredInitially.current) hasCenteredInitially.current = true;
        }
      );
    } catch (error) {
      console.log("Erreur GPS:", error);
    }
  };

  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (pickupLocation) {
        injectLocationToMap(pickupLocation.lat, pickupLocation.lon, false);
      }
    }, 4000);
    return () => clearInterval(heartbeat);
  }, [pickupLocation]);

  useEffect(() => {
    if (role === 'chauffeur' && isOnline) {
      const interval = setInterval(async () => {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await supabase.from('conducteurs').update({ 
            location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})` 
        }).eq('id', userId);
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [isOnline, role]);

  const getRoute = async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.[0]) {
        const coords = JSON.stringify(data.routes[0].geometry.coordinates);
        webviewRef.current?.injectJavaScript(`
          if(routeLayer) map.removeLayer(routeLayer);
          routeLayer = L.polyline(${coords}.map(c=>[c[1],c[0]]), {color: '${activeService === 'delivery' ? '#f97316' : '#2563eb'}', weight:6, opacity:0.8}).addTo(map);
          map.fitBounds(routeLayer.getBounds().pad(0.3));
          true;
        `);
        return data.routes[0];
      }
    } catch (e) { console.error('Erreur OSRM:', e); }
    return null;
  };

  const updateDriverNavigation = async (status: string, rideId: string) => {
    const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
    const { data: ride } = await supabase.from(table).select('*').eq('id', rideId).single();
    if (!ride) return;
    const myLoc = await Location.getCurrentPositionAsync({});
    
    if (status === 'accepted') {
      speak("Trajet vers le point de retrait.");
      await getRoute(myLoc.coords.latitude, myLoc.coords.longitude, ride.pickup_lat, ride.pickup_lon);
    } else if (status === 'in_progress') {
      speak("Course débutée.");
      setRealTraveledDistance(0); 
      // Pour les colis, la destination est dans delivery_lat/lon
      const destLat = activeService === 'delivery' ? ride.delivery_lat : ride.dest_lat;
      const destLon = activeService === 'delivery' ? ride.delivery_lon : ride.dest_lon;
      await getRoute(myLoc.coords.latitude, myLoc.coords.longitude, destLat, destLon);
    }
  };

  const handleLocationSelect = async (lat: number, lon: number, name: string) => {
    setSelectedLocation({ lat, lon });
    setDestination(name);
    setSuggestions([]);
    
    const loc = await Location.getCurrentPositionAsync({});
    const r = await getRoute(loc.coords.latitude, loc.coords.longitude, lat, lon);
    if (r) {
      const distanceKm = r.distance / 1000;
      setEstimatedDistance(distanceKm.toFixed(1));
      
      const isColis = activeService === 'delivery';
      const basePrice = isColis ? 500 : 250;
      const threshold = isColis ? 3.0 : 1.5; 
      const price = Math.ceil((basePrice + (distanceKm > threshold ? (distanceKm - threshold) * 100 : 0)) / 50) * 50;
      setEstimatedPrice(price);
      
      webviewRef.current?.injectJavaScript(`
        if(markers.d) map.removeLayer(markers.d);
        markers.d = L.marker([${lat}, ${lon}]).addTo(map);
        map.setView([${lat}, ${lon}], 16);
        true;
      `);
    }
  };

  // ✅ VÉRIFICATION PIN CHAUFFEUR
  const handleVerifyPinAndFinish = async () => {
    const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
    const { data: ride } = await supabase.from(table).select('verification_code').eq('id', currentRideId).single();
    if (activeService === 'delivery' && enteredPin !== ride?.verification_code) {
      Alert.alert("DIOMY", "Code PIN incorrect."); Vibration.vibrate(500); return;
    }
    setShowPinModal(false);
    handleFinalizeRide();
  };

  const handleFinalizeRide = async () => {
    try {
      const isColis = activeService === 'delivery';
      const table = isColis ? 'delivery_requests' : 'rides_request';
      const { data: rideToFinish } = await supabase.from(table).select('*').eq('id', currentRideId).single();
      
      const waitingCharge = Math.ceil(waitingTime / 60) * 25;
      const threshold = isColis ? 3.0 : 1.5;
      
      // ✅ LOGIQUE PRIX DE BASE
      let basePrice = 250; // Taxi par défaut
      if (isColis) {
        if (rideToFinish.package_type === 'Moyen') basePrice = 750;
        else if (rideToFinish.package_type === 'Grand') basePrice = 1000;
        else basePrice = 500;
      }

      const finalPrice = Math.ceil((basePrice + (realTraveledDistance > threshold ? (realTraveledDistance - threshold) * 100 : 0) + waitingCharge) / 50) * 50;
      
      // ✅ CALCUL COMMISSION DIOMY (15% ou 12%)
      const commissionRate = isColis ? 0.15 : 0.12; 
      const finalCommission = Math.ceil(finalPrice * commissionRate);

      await supabase.from(table).update({ 
        status: 'completed', 
        price: finalPrice,
        commission_amount: finalCommission // ✅ COMMISSION PRÉLEVÉE
      }).eq('id', currentRideId);

      setFinalRideData({ ...rideToFinish, price: finalPrice });
      setShowSummary(true); 
      setIsWaiting(false);
      speak(`Terminé. Montant ${finalPrice} francs.`);
    } catch (err) { console.error(err); }
  };

  const fetchPartnerInfo = async (id: string) => {
    try {
      const { data } = await supabase.from('profiles').select('full_name, phone_number, avatar_url, vehicle_model').eq('id', id).maybeSingle();
      setPartnerInfo(data);
    } catch (error) { console.error(error); }
  };

  const resetSearch = () => {
    setDestination(''); setSuggestions([]); setSelectedLocation(null);
    setEstimatedPrice(null); setEstimatedDistance(null);
    setCurrentRideId(null); setRideStatus(null); setPartnerInfo(null);
    setChatMessages([]); setShowChat(false);
    isHandlingModal.current = false;
    lastProcessedRideId.current = null;
    hasNotifiedArrival.current = false;
    hasNotifiedProximity.current = false;
    setHasArrivedAtPickup(false);
    setIsWaiting(false); setWaitingTime(0); setRealTraveledDistance(0);
    setActiveService(null); 
    setShowDeliveryForm(false); 
    setDeliveryPin(null);
    setEnteredPin('');
    webviewRef.current?.injectJavaScript(`
      if(markers.p) map.removeLayer(markers.p);
      if(markers.d) map.removeLayer(markers.d);
      if(routeLayer) map.removeLayer(routeLayer);
      map.setView([9.4580,-5.6290],15);
      true;
    `);
  };

  const submitRating = async () => {
    if (userRating === 0 || !finalRideData) return;
    setIsSubmittingRating(true);
    try {
      const targetId = role === 'chauffeur' ? (finalRideData.passenger_id || finalRideData.sender_id) : finalRideData.driver_id;
      await supabase.from('ride_ratings').insert([{ 
        ride_id: finalRideData.id, 
        passenger_id: finalRideData.passenger_id || finalRideData.sender_id, 
        driver_id: finalRideData.driver_id, 
        rating: userRating, 
        rated_by: role 
      }]);
      let scoreChange = userRating === 5 ? 2 : userRating === 4 ? 1 : userRating <= 2 ? -5 : 0;
      if (scoreChange !== 0) {
        const { data: targetProf } = await supabase.from('profiles').select('score').eq('id', targetId).single();
        await supabase.from('profiles').update({ score: Math.max(0, Math.min(100, (targetProf?.score || 100) + scoreChange)) }).eq('id', targetId);
      }
      setShowSummary(false); setUserRating(0); resetSearch();
    } catch (error) { console.error(error); } finally { setIsSubmittingRating(false); }
  };

  const sendMessage = async (content?: string) => {
    const msg = content || newMessage.trim();
    if (!msg || !currentRideId) return;
    if (!content) setNewMessage('');
    try {
      await supabase.from('ride_messages').insert([{ ride_id: currentRideId, sender_id: userId, content: msg }]);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data: prof } = await supabase.from('profiles').select('role, score').eq('id', user.id).maybeSingle();
        const { data: cond } = await supabase.from('conducteurs').select('id, is_online').eq('id', user.id).maybeSingle();
        setRole((cond || prof?.role === 'chauffeur') ? "chauffeur" : "passager");
        setUserScore(prof?.score ?? 100);
        if (cond) setIsOnline(cond.is_online);
        Speech.speak("", { language: 'fr' });
        setIsMapReady(true);
        setTimeout(() => getCurrentLocation(true), 1500);
      } catch (error) { console.error(error); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
    const channel = supabase.channel('rides-realtime-secure')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: table }, (payload) => {
        const up = payload.new as any;
        if (up.passenger_id === userId || up.sender_id === userId || up.driver_id === userId) {
          setRideStatus(up.status);
          setCurrentRideId(up.id);
          if (up.status === 'completed') { setFinalRideData(up); setShowSummary(true); setRideStatus(null); setPartnerInfo(null); }
          if (up.status === 'accepted' || up.status === 'in_progress') {
             const partnerId = role === 'chauffeur' ? (up.passenger_id || up.sender_id) : up.driver_id;
             if (partnerId) fetchPartnerInfo(partnerId);
             if (role === 'chauffeur') updateDriverNavigation(up.status, up.id);
          }
          if (up.status === 'cancelled') {
              Alert.alert("DIOMY", "La course a été annulée par votre partenaire.");
              speak("Course annulée.");
              resetSearch();
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: table, filter: `status=eq.pending` }, (payload) => {
        const nr = payload.new as any;
        if (nr.driver_id === userId && isOnline && !rideStatus && !isHandlingModal.current && nr.id !== lastProcessedRideId.current) { 
          speak("Nouvelle demande.");
          Vibration.vibrate([0, 500, 200, 500]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isOnline, rideStatus, activeService]);

  useEffect(() => {
    if (!currentRideId) return;
    const loadHistory = async () => {
      const { data } = await supabase.from('ride_messages').select('*').eq('ride_id', currentRideId).order('created_at', { ascending: true });
      if (data) setChatMessages(data);
    };
    loadHistory();
    const chatChannel = supabase.channel(`chat-${currentRideId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${currentRideId}` }, (payload) => {
        const msg = payload.new as any;
        setChatMessages(prev => [...prev, msg]);
        if (msg.sender_id !== userId) {
            Vibration.vibrate(100);
            speak(msg.content);
            if (msg.content === "🏁 Je suis arrivé au point de rendez-vous !") {
                Vibration.vibrate([0, 500, 200, 500]);
                speak("Votre chauffeur est arrivé.");
                setHasArrivedAtPickup(true);
            }
            if (msg.content.includes("⏳")) setIsWaiting(true);
            if (msg.content.includes("✅")) setIsWaiting(false);
        }
      }).subscribe();
    return () => { supabase.removeChannel(chatChannel); };
  }, [currentRideId]);

  const mapHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body,html{margin:0;padding:0;height:100%;width:100%;overflow:hidden;}#map{height:100vh;width:100vw;background:#f8fafc;}
      .blue-dot{width:20px;height:20px;background:#2563eb;border:4px solid white;border-radius:50%;box-shadow:0 0 15px rgba(37,99,235,0.7);}
      .korhogo-label{background:transparent;border:none;box-shadow:none;color:#1e3a8a;font-weight:bold;text-shadow:0 0 5px white, 0 0 10px white;font-size:12px;white-space:nowrap;text-align:center;}
    </style></head><body><div id="map"></div><script>
    var map=L.map('map',{zoomControl:false, fadeAnimation: true, markerZoomAnimation: true}).setView([9.4580,-5.6290],15);
    L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}.png?api_key=${STADIA_API_KEY}',{maxZoom:20, updateWhenIdle: true, keepBuffer: 2}).addTo(map);
    var markers={};var routeLayer=null;
    var spots = [{n: "Université Peleforo GC", c: [9.4411, -5.6264]},{n: "Hôpital CHR", c: [9.4542, -5.6288]},{n: "Grand Marché", c: [9.4585, -5.6315]}];
    spots.forEach(function(s){ L.marker(s.c, { icon: L.divIcon({ className: 'korhogo-label', html: '<div>'+s.n+'</div>', iconSize: [120, 20], iconAnchor: [60, 10] }), interactive: false }).addTo(map); });
    
    // ✅ LOGIQUE DE RÉCEPTION DU POINT BLEU
    window.addEventListener("message",function(e){
        var data=JSON.parse(e.data);
        if(data.type==='set_location'){
            if(markers.p) map.removeLayer(markers.p);
            markers.p = L.marker([data.lat, data.lon], {
                icon: L.divIcon({ className: 'blue-dot', iconSize: [20, 20], iconAnchor: [10, 10] })
            }).addTo(map);
            if(data.focus) map.setView([data.lat, data.lon], 17);
        }
        if(data.type==='reset_map'){ if(markers.p) map.removeLayer(markers.p); if(markers.d) map.removeLayer(markers.d); if(routeLayer) map.removeLayer(routeLayer); map.setView([9.4580,-5.6290], 15); }
    });

    map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'map_click',lat:e.latlng.lat,lon:e.latlng.lng}));});</script></body></html>`;

  if (!isMapReady) return <View style={styles.loader}><ActivityIndicator size="large" color="#009199" /><Text style={styles.loaderText}>DIOMY...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <WebView 
          ref={webviewRef} 
          originWhitelist={['*']} 
          source={{ html: mapHtml }} 
          style={{ flex: 1, backgroundColor: 'transparent' }} 
          javaScriptEnabled={true} 
          domStorageEnabled={true} 
          androidLayerType="hardware"
          onLoadEnd={() => { if (pickupLocation) injectLocationToMap(pickupLocation.lat, pickupLocation.lon, true); }}
          onMessage={async (e) => {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === 'map_click' && role === 'passager' && !rideStatus) {
              const { data: street } = await supabase.rpc('get_logical_address', { lat: data.lat, lon: data.lon });
              handleLocationSelect(data.lat, data.lon, street || "Destination choisie");
            }
          }} 
        />
      </View>

      {/* ✅ MÉMOIRE CODE PIN (Badge permanent) */}
      {deliveryPin && (rideStatus === 'pending' || rideStatus === 'accepted' || rideStatus === 'in_progress') && (
        <View style={styles.pinReminder}>
          <Text style={styles.pinLabel}>CODE COLIS</Text>
          <Text style={styles.pinValue}>{deliveryPin}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.gpsBtn} onPress={() => getCurrentLocation(true)}><Ionicons name="locate" size={26} color="#1e3a8a" /></TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer} pointerEvents="box-none">
        <View style={styles.overlay}>
          
          {/* ✅ SÉLECTEUR INITIAL */}
          {role === 'passager' && !activeService && !rideStatus && (
            <ServiceSelector onSelect={(m) => setActiveService(m)} />
          )}

          {/* ✅ RECHERCHE DESTINATION */}
          {role === 'passager' && activeService !== null && !rideStatus && !showDeliveryForm && (
            <View style={styles.passengerPane}>
              {suggestions.length > 0 && destination.length > 0 && (
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
              {selectedLocation && destination.length > 0 && (
                <TouchableOpacity 
                  style={[styles.confirmBtn, activeService === 'delivery' && {backgroundColor: '#f97316'}]} 
                  onPress={async () => {
                    if (activeService === 'transport') {
                      const { data: drivers } = await supabase.rpc('find_nearest_driver', { px_lat: pickupLocation?.lat, px_lon: pickupLocation?.lon, max_dist: 1000 });
                      if (drivers?.[0]) {
                        const { data } = await supabase.from('rides_request').insert([{ passenger_id: userId, driver_id: drivers[0].id, status: 'pending', destination_name: destination, dest_lat: selectedLocation.lat, dest_lon: selectedLocation.lon, pickup_lat: pickupLocation?.lat, pickup_lon: pickupLocation?.lon, price: estimatedPrice || 500 }]).select().single();
                        if (data) { setRideStatus('pending'); setCurrentRideId(data.id); speak("Recherche de chauffeur."); fetchPartnerInfo(drivers[0].id); }
                      } else { Alert.alert("DIOMY", "Aucun chauffeur à proximité."); }
                    } else {
                      setShowDeliveryForm(true); 
                    }
                  }}>
                  <View style={styles.priceContainer}>
                    <View style={styles.priceLeft}>
                        <Text style={styles.distLabel}>{estimatedDistance} km</Text>
                        <Text style={styles.priceLabel}>{estimatedPrice} FCFA</Text>
                        {activeService === 'delivery' && <Text style={{color: '#fff', fontSize: 8, fontWeight: 'bold'}}>BASE 3 KM INCLUS</Text>}
                    </View>
                    <Text style={styles.orderLabel}>{activeService === 'transport' ? 'COMMANDER' : 'SUIVANT'}</Text>
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={22} color={activeService === 'delivery' ? "#f97316" : "#1e3a8a"} style={{marginRight: 10}} />
                <TextInput style={styles.input} placeholder={activeService === 'delivery' ? "Où envoyer le colis ?" : "Où allez-vous ?"} value={destination} onChangeText={async (t) => {
                  setDestination(t);
                  if (t.length === 0) resetSearch();
                  else if (t.length > 2) {
                    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(t)}&bbox=-5.70,9.35,-5.55,9.55&limit=10`);
                    const d = await res.json(); setSuggestions(d.features || []);
                  }
                }} />
                {destination.length > 0 && <TouchableOpacity onPress={resetSearch}><Ionicons name="close-circle" size={20} color="#94a3b8" /></TouchableOpacity>}
              </View>
            </View>
          )}

          {/* ✅ PHASE 2 : FORMULAIRE COLIS */}
          {showDeliveryForm && activeService === 'delivery' && !rideStatus && (
            <DeliveryForm onConfirm={handleDeliveryOrder} onCancel={() => { setShowDeliveryForm(false); setActiveService(null); }} />
          )}

          {/* ✅ IDENTITY CARD */}
          {(rideStatus === 'accepted' || rideStatus === 'in_progress' || rideStatus === 'pending') && partnerInfo && (
            <View style={styles.identityCard}>
              <View style={styles.idHeader}>
                <View style={styles.avatarBox}>{partnerInfo.avatar_url ? <Image source={{ uri: partnerInfo.avatar_url }} style={styles.avatarImg} /> : <Ionicons name="person" size={28} color="#94a3b8" />}</View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.idLabel}>{role === 'chauffeur' ? "VOTRE PARTENAIRE" : (activeService === 'delivery' ? "LIVREUR" : "VOTRE CHAUFFEUR")}</Text>
                  <Text style={styles.idName}>{partnerInfo.full_name || "Utilisateur"}</Text>
                  {role === 'passager' && <Text style={styles.idMoto}>🏍️ {partnerInfo.vehicle_model || "Moto Standard"}</Text>}
                </View>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={[styles.actionCircle, {backgroundColor: '#ef4444'}]} onPress={handleCancelRide}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionCircle, {backgroundColor: '#1e3a8a'}]} onPress={() => setShowChat(true)}><Ionicons name="chatbubble-ellipses" size={20} color="#fff" /></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionCircle, {backgroundColor: '#22c55e'}]} onPress={() => Linking.openURL(`tel:${partnerInfo.phone_number}`)}><Ionicons name="call" size={20} color="#fff" /></TouchableOpacity>
                </View>
              </View>
              {isWaiting && (
                <View style={styles.waitingIndicator}>
                  <ActivityIndicator size="small" color="#f59e0b" />
                  <Text style={styles.waitingText}>⏳ Attente : {Math.floor(waitingTime/60)}m {waitingTime%60}s</Text>
                </View>
              )}
            </View>
          )}

          {role === 'chauffeur' ? (
            <View style={styles.driverPane}>
              {!rideStatus && <View style={styles.scoreBadge}><MaterialCommunityIcons name="star-circle" size={22} color="#eab308" /><Text style={styles.scoreText}>Fiabilité : {userScore}/100</Text></View>}
              
              {rideStatus === 'accepted' ? (
                <View style={{ width: '100%' }}>
                  {!hasArrivedAtPickup ? (
                    <SwipeButton
                      title="GLISSER POUR L'ARRIVÉE"
                      onSwipeSuccess={() => { setHasArrivedAtPickup(true); sendMessage("🏁 Je suis arrivé au point de rendez-vous !"); speak("Vous êtes arrivé."); }}
                      railBackgroundColor="#cbd5e1" railFillBackgroundColor="#1e3a8a" railFillBorderColor="#1e3a8a"
                      thumbIconBackgroundColor="#fff" thumbIconBorderColor="#1e3a8a" titleColor="#1e3a8a" titleFontSize={14}
                    />
                  ) : (
                    <SwipeButton
                      title="GLISSER POUR DÉBUTER"
                      onSwipeSuccess={async () => { 
                        const table = activeService === 'delivery' ? 'delivery_requests' : 'rides_request';
                        await supabase.from(table).update({ status: 'in_progress' }).eq('id', currentRideId); 
                        speak("Course débutée."); 
                      }}
                      railBackgroundColor="#ffedd5" railFillBackgroundColor="#f97316" railFillBorderColor="#f97316"
                      thumbIconBackgroundColor="#fff" thumbIconBorderColor="#f97316" titleColor="#f97316" titleFontSize={14}
                    />
                  )}
                </View>
              ) : rideStatus === 'in_progress' ? (
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={[styles.mainBtn, {backgroundColor: isWaiting ? '#ef4444' : '#f59e0b', height: 45}]} onPress={toggleWaiting}>
                    <Text style={styles.btnText}>{isWaiting ? "REPRENDRE LE TRAJET" : "PAUSE / ATTENTE"}</Text>
                  </TouchableOpacity>
                  <SwipeButton
                    title={activeService === 'delivery' ? "LIVRER (Saisir PIN)" : "GLISSER POUR TERMINER"}
                    onSwipeSuccess={() => activeService === 'delivery' ? setShowPinModal(true) : handleFinalizeRide()}
                    railBackgroundColor="#dcfce7" railFillBackgroundColor="#22c55e" railFillBorderColor="#22c55e"
                    thumbIconBackgroundColor="#fff" thumbIconBorderColor="#22c55e" titleColor="#22c55e" titleFontSize={14}
                  />
                </View>
              ) : (
                <TouchableOpacity style={[styles.mainBtn, isOnline ? styles.bgOnline : styles.bgOffline, !canGoOnline && { backgroundColor: '#94a3b8' }]} onPress={handleToggleOnline}>
                  <Text style={styles.btnText}>{!canGoOnline ? "DOSSIER EN COURS" : (isOnline ? "EN LIGNE" : "ACTIVER MA MOTO")}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            rideStatus === 'pending' && (
              <View style={styles.statusCard}>
                <ActivityIndicator color="#1e3a8a" />
                <Text style={styles.statusText}>Recherche de partenaire DIOMY...</Text>
                <TouchableOpacity onPress={handleCancelRide}><Ionicons name="close-circle" size={30} color="#ef4444" /></TouchableOpacity>
              </View>
            )
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showChat} animationType="slide" transparent={false}>
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChat(false)}><Ionicons name="chevron-back" size={28} color="#1e3a8a" /></TouchableOpacity>
            <Text style={styles.chatTitle}>Discussion</Text>
            <View style={{width: 28}} />
          </View>
          <ScrollView ref={chatScrollRef} style={styles.messagesList} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}>
            {chatMessages.map((msg, idx) => (
              <View key={idx} style={[styles.messageBubble, msg.sender_id === userId ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, msg.sender_id === userId ? styles.myText : styles.theirText]}>{msg.content}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.chatInputArea}>
            <TextInput style={styles.chatInput} placeholder="Écrivez votre message..." value={newMessage} onChangeText={setNewMessage} />
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}><Ionicons name="send" size={24} color="#1e3a8a" /></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 25 }]}>
            <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
            <Text style={styles.modalTitle}>Terminé !</Text>
            <Text style={styles.priceSummary}>{finalRideData?.price} FCFA</Text>
            <TouchableOpacity style={[styles.closeSummaryBtn, { backgroundColor: '#1e3a8a' }]} onPress={() => setShowSummary(false)}>
              <Text style={[styles.closeSummaryText, { color: '#fff' }]}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ MODAL SAISIE PIN SÉCURISÉ */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="lock-check" size={50} color="#1e3a8a" />
            <Text style={styles.modalTitle}>Vérification PIN</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20 }}>Demandez le code au destinataire pour valider.</Text>
            <TextInput 
              style={[styles.searchBar, { textAlign: 'center', fontSize: 30, letterSpacing: 10, width: '100%' }]} 
              placeholder="0000" keyboardType="number-pad" maxLength={4} value={enteredPin} onChangeText={setEnteredPin} 
            />
            <TouchableOpacity style={[styles.mainBtn, { width: '100%', marginTop: 20, backgroundColor: '#22c55e' }]} onPress={handleVerifyPinAndFinish}>
              <Text style={styles.btnText}>TERMINER LIVRAISON</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPinModal(false)} style={{ marginTop: 15 }}><Text style={{ color: '#ef4444' }}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#009199' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#009199', fontWeight: 'bold' },
  keyboardContainer: { flex: 1, justifyContent: 'flex-end' },
  gpsBtn: { position: 'absolute', right: 20, bottom: 220, backgroundColor: 'white', padding: 12, borderRadius: 30, elevation: 5, zIndex: 10 },
  overlay: { padding: 20, paddingBottom: 110 },
  pinReminder: { position: 'absolute', top: 60, right: 20, backgroundColor: '#f97316', padding: 10, borderRadius: 15, alignItems: 'center', elevation: 10, zIndex: 100 },
  pinLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  pinValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  identityCard: { backgroundColor: '#fff', borderRadius: 25, padding: 15, marginBottom: 15, elevation: 10 },
  idHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  idLabel: { fontSize: 9, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' },
  idName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  idMoto: { fontSize: 12, color: '#1e3a8a' },
  actionCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
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
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLeft: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)', paddingRight: 20 },
  distLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  priceLabel: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  orderLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statusCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  statusText: { marginLeft: 15, fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  waitingIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: '#fef3c7', borderRadius: 10 },
  waitingText: { marginLeft: 8, color: '#d97706', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', padding: 25, borderRadius: 30, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
  priceSummary: { fontSize: 40, fontWeight: '900', color: '#1e3a8a', marginVertical: 10 },
  closeSummaryBtn: { marginTop: 15, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 10, width: '70%', alignItems: 'center' },
  closeSummaryText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  chatContainer: { flex: 1, backgroundColor: '#fff' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingTop: 50 },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  messagesList: { flex: 1, padding: 15 },
  messageBubble: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#1e3a8a' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9' },
  messageText: { fontSize: 14 },
  myText: { color: '#fff' },
  theirText: { color: '#1e293b' },
  chatInputArea: { flexDirection: 'row', padding: 15, alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9' },
  chatInput: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 20, marginRight: 10 },
  sendBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }
});