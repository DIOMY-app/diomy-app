import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  Image, ScrollView, RefreshControl, Dimensions, Linking, Platform, Modal, TextInput 
} from 'react-native';
import { supabase } from '../../lib/supabase'; 
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [soldeInfo, setSoldeInfo] = useState<any>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]); 
  
  const [showFavModal, setShowFavModal] = useState(false);
  const [selectedFavType, setSelectedFavType] = useState<'home' | 'work' | null>(null);
  const [tempAddress, setTempAddress] = useState('');
  const [isSavingFav, setIsSavingFav] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('profile-sync')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles'
      }, (payload) => {
        if (payload.new.id === profile?.id && !loading) {
          fetchData();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (prof) {
        setProfile({ ...prof, email: user.email });
        const roleClean = prof.role?.toLowerCase().trim();
        const driverCheck = ['chauffeur', 'conducteur', 'conducteurs'].includes(roleClean);
        setIsDriver(driverCheck);
        
        if (driverCheck) {
          const { data: solde } = await supabase
            .from('chauffeur_solde_net')
            .select('solde_disponible')
            .eq('driver_id', user.id)
            .maybeSingle();
          if (solde) setSoldeInfo(solde);
        } else {
          const { data: rides } = await supabase
            .from('rides_request')
            .select('*')
            .eq('passenger_id', user.id)
            .eq('status', 'completed')
            .order('sent_at', { ascending: false })
            .limit(20);
          setHistory(rides || []);

          const { data: favs } = await supabase
            .from('user_favorites')
            .select('*')
            .eq('user_id', user.id);
          setFavorites(favs || []);
        }
      }
    } catch (e) { 
      console.log("Erreur fetchData:", e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  }

  const handleFavPress = (type: 'home' | 'work') => {
    const fav = favorites.find(f => f.label === type);
    if (fav && fav.latitude !== 0) {
      router.push({
        pathname: "/map" as any, 
        params: { address: fav.address_name, lat: fav.latitude, lon: fav.longitude }
      });
    } else {
      Alert.alert(
        "Localisation GPS",
        `Voulez-vous définir l'emplacement de votre ${type === 'home' ? 'Domicile' : 'Travail'} sur la carte ?`,
        [
          { text: "Plus tard", style: "cancel" },
          { 
            text: "Ouvrir la Carte", 
            onPress: () => router.push({
                pathname: "/map" as any,
                params: { mode: 'SET_FAVORITE', favType: type }
            }) 
          }
        ]
      );
    }
  };

  const saveFavorite = async () => {
    if (!tempAddress.trim() || !selectedFavType) return;
    setIsSavingFav(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('user_favorites').upsert({
          user_id: user.id, label: selectedFavType, address_name: tempAddress, latitude: 0, longitude: 0
        }, { onConflict: 'user_id, label' });
      if (error) throw error;
      Alert.alert("Succès", "Destination enregistrée !");
      setShowFavModal(false); setTempAddress(''); fetchData(); 
    } catch (err) { Alert.alert("Erreur", "Impossible d'enregistrer."); } finally { setIsSavingFav(false); }
  };

  const handleUpdateAvatar = async () => {
    Alert.alert("Photo de profil", "Choisissez une option", [
      { text: "Prendre une photo", onPress: () => openPicker(true) },
      { text: "Choisir dans la galerie", onPress: () => openPicker(false) },
      { text: "Annuler", style: "cancel" }
    ]);
  };

  const openPicker = async (useCamera: boolean) => {
    const permission = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') { Alert.alert("Erreur", "Permission refusée"); return; }
    const result = useCamera 
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (result && !result.canceled) {
      setLoading(true);
      try {
        const photo = result.assets[0];
        const ext = photo.uri.split('.').pop();
        const fileName = `${profile.id}-${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append('file', { uri: photo.uri, name: fileName, type: `image/${ext}` } as any);
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, formData as any);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
          setProfile({ ...profile, avatar_url: publicUrl });
          Alert.alert("Succès", "Photo mise à jour");
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    const j = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${j}/${m} à ${h}:${min}`;
  };

  async function handleSignOut() {
    // ✅ On laisse le layout racine gérer la redirection via SIGNED_OUT
    await supabase.auth.signOut();
  }

  if (loading && !refreshing) return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.container}
        // ✅ Correction Ergonomie : On augmente le padding pour dépasser la barre de nav
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleUpdateAvatar} style={styles.avatarContainer}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Ionicons name="camera" size={40} color="#1e3a8a" />}
          </TouchableOpacity>
          <Text style={styles.username}>{profile?.full_name || 'Utilisateur DIOMY'}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{isDriver ? "CHAUFFEUR DIOMY" : "PASSAGER DIOMY"}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Ionicons name="star" size={12} color="#eab308" />
              <Text style={styles.scoreText}>{profile?.score || 100}</Text>
            </View>
          </View>
        </View>

        {isDriver && soldeInfo && (
          <View style={styles.financeContainer}>
            <Text style={styles.sectionTitle}>Ma Trésorerie</Text>
            <View style={styles.financeCard}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Solde Disponible</Text>
                <Text style={styles.statValue}>{soldeInfo.solde_disponible || 0} F</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Statut Compte</Text>
                <Text style={[styles.statValue, {color: soldeInfo.solde_disponible > 500 ? '#22c55e' : '#ef4444'}]}>
                  {soldeInfo.solde_disponible > 500 ? 'ACTIF' : 'BAS'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes Favoris</Text>
            <TouchableOpacity style={styles.favRow} onPress={() => handleFavPress('home')}>
              <Ionicons name="home" size={20} color="#1e3a8a" />
              <Text style={styles.infoText}>{favorites.find(f => f.label === 'home')?.address_name || 'Ajouter mon domicile'}</Text>
              <TouchableOpacity onPress={() => { setSelectedFavType('home'); setShowFavModal(true); }}>
                <Ionicons name={favorites.find(f => f.label === 'home') ? "pencil" : "add-circle"} size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.favRow} onPress={() => handleFavPress('work')}>
              <Ionicons name="briefcase" size={20} color="#1e3a8a" />
              <Text style={styles.infoText}>{favorites.find(f => f.label === 'work')?.address_name || 'Ajouter mon lieu de travail'}</Text>
              <TouchableOpacity onPress={() => { setSelectedFavType('work'); setShowFavModal(true); }}>
                <Ionicons name={favorites.find(f => f.label === 'work') ? "pencil" : "add-circle"} size={20} color="#cbd5e1" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon Compte</Text>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{profile?.phone_number || 'Aucun numéro'}</Text>
          </View>
        </View>

        {!isDriver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dernières courses</Text>
            {history.length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyText}>Aucun trajet terminé.</Text></View>
            ) : (
              history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyIcon}><FontAwesome5 name="map-marker-alt" size={16} color="#1e3a8a" /></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.historyDest} numberOfLines={1}>{item.destination_name || "Course"}</Text>
                    <Text style={styles.historyDate}>{formatDate(item.sent_at || item.created_at)}</Text>
                  </View>
                  <Text style={styles.historyPrice}>{item.price?.toLocaleString()} F</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ✅ Marge augmentée pour isoler le bouton */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFavModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier {selectedFavType === 'home' ? 'mon Domicile' : 'mon Travail'}</Text>
            <TextInput style={styles.input} placeholder="Ex: Quartier Commerce, Face à la BICICI" value={tempAddress} onChangeText={setTempAddress} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowFavModal(false); setTempAddress(''); }}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveFavorite}>
                {isSavingFav ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#fff', elevation: 5 },
  avatarImage: { width: '100%', height: '100%' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginTop: 10 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  roleBadge: { backgroundColor: '#1e3a8a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  scoreBadge: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  scoreText: { color: '#1e293b', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 8, elevation: 1 },
  favRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  infoText: { flex: 1, marginLeft: 12, color: '#334155', fontSize: 14 },
  financeContainer: { marginBottom: 25 },
  financeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', elevation: 4 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%', backgroundColor: '#f1f5f9' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, marginBottom: 8, elevation: 1 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  historyDest: { fontSize: 13, fontWeight: '700', color: '#334155' },
  historyDate: { fontSize: 10, color: '#94a3b8' },
  historyPrice: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a' },
  emptyBox: { padding: 10, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 12 },
  // ✅ On augmente la marge ici pour bien isoler le bouton du reste
  signOutBtn: { backgroundColor: '#fee2e2', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 50, marginBottom: 20 },
  signOutText: { color: '#ef4444', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 25, width: width * 0.85 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#1e3a8a', padding: 15, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: 'bold' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});