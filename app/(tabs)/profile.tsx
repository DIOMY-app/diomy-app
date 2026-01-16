import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  Image, ScrollView, RefreshControl, Dimensions, Linking, Platform 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: prof, error } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (prof) {
        setProfile({ ...prof, email: user.email });
        const { data: rides } = await supabase
          .from('rides_request')
          .select('*')
          .or(`passenger_id.eq.${user.id},driver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(5);
        setHistory(rides || []);
      }
    } catch (error: any) {
      console.log("Erreur Profile:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/"); 
  }

  // --- LOGIQUE DE STATUT ---
  const roleClean = profile?.role?.toLowerCase().trim();
  const isDriver = roleClean === 'chauffeur' || roleClean === 'conducteur' || roleClean === 'conducteurs';
  const isPending = profile?.status === 'en_attente_validation';
  const isRejected = profile?.status === 'rejete';
  const isValidated = profile?.status === 'valide';

  const renderStars = (score: number) => {
    const starCount = Math.round((score || 100) / 20); 
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons key={i} name={i <= starCount ? "star" : "star-outline"} size={16} color={i <= starCount ? "#eab308" : "#cbd5e1"} style={{ marginRight: 2 }} />
      );
    }
    return (
      <View style={styles.starsRow}>
        {stars}
        <Text style={styles.scoreText}>({score || 100}/100)</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>
    );
  }

  return (
    <View style={[styles.mainWrapper, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}><Ionicons name="person" size={50} color="#1e3a8a" /></View>
            )}
          </View>
          <Text style={styles.username}>{profile?.full_name || 'Utilisateur'}</Text>
          
          {/* BADGE DE RÔLE DYNAMIQUE */}
          <View style={[
            styles.roleBadge, 
            { backgroundColor: isPending ? '#f59e0b' : (isDriver && isValidated ? '#1e3a8a' : '#22c55e') }
          ]}>
            <Text style={styles.roleBadgeText}>
              {isPending ? 'VÉRIFICATION EN COURS' : (isDriver ? 'CONDUCTEUR DIOMY' : 'PASSAGER')}
            </Text>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{history.length}</Text>
            <Text style={styles.statLab}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {renderStars(profile?.score)}
            <Text style={styles.statLab}>Fiabilité</Text>
          </View>
        </View>

        {/* --- SECTION ÉTAT DU DOSSIER CONDUCTEUR --- */}
        
        {/* 1. Dossier en attente */}
        {isPending && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Ionicons name="time" size={24} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Dossier en cours de revue</Text>
              <Text style={styles.pendingSub}>Nos équipes vérifient vos documents. Cela prend généralement moins de 24h.</Text>
            </View>
          </View>
        )}

        {/* 2. Dossier Rejeté */}
        {isRejected && (
          <TouchableOpacity style={styles.rejectedCard} onPress={() => router.push('/become-driver' as any)}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.rejectedTitle}>Dossier refusé</Text>
              <Text style={styles.rejectedSub}>Cliquez ici pour corriger vos documents et renvoyer votre demande.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* 3. Proposer de devenir conducteur (Uniquement si passager pur et sans dossier en cours) */}
        {!isDriver && !isPending && !isRejected && (
          <TouchableOpacity style={styles.driverPromoCard} onPress={() => router.push('/become-driver' as any)}>
            <View style={styles.driverPromoIcon}><MaterialCommunityIcons name="motorbike" size={28} color="white" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverPromoTitle}>Gagnez de l'argent avec DIOMY</Text>
              <Text style={styles.driverPromoSub}>Devenez conducteur dès aujourd'hui</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}

        {/* SUPPORT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Sécurité</Text>
          <View style={styles.supportCard}>
            <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL('whatsapp://send?phone=2250102030405')}>
              <View style={[styles.supportIcon, { backgroundColor: '#dcfce7' }]}><Ionicons name="logo-whatsapp" size={20} color="#22c55e" /></View>
              <Text style={styles.supportText}>Contacter l'assistance</Text>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* HISTORIQUE RAPIDE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derniers trajets</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Aucun trajet enregistré</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <Ionicons name="bicycle" size={20} color="#1e3a8a" style={{marginRight:12}} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDest} numberOfLines={1}>{item.destination_name || 'Trajet DIOMY'}</Text>
                  <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.historyPrice}>{item.price} F</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="white" />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>DIOMY App v1.0.5</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingTop: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  username: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 10 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 5 },
  roleBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 25, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' },
  statLab: { fontSize: 11, color: '#64748b' },
  statDivider: { width: 1, height: '70%', backgroundColor: '#f1f5f9' },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  scoreText: { fontSize: 10, color: '#94a3b8', marginLeft: 4 },
  
  // Nouveaux Styles de cartes d'état
  pendingCard: { backgroundColor: '#fffbeb', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#fef3c7' },
  pendingIcon: { width: 40, height: 40, backgroundColor: '#fef3c7', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  pendingTitle: { color: '#92400e', fontWeight: 'bold', fontSize: 14 },
  pendingSub: { color: '#b45309', fontSize: 11, marginTop: 2 },

  rejectedCard: { backgroundColor: '#fef2f2', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#fee2e2' },
  rejectedTitle: { color: '#b91c1c', fontWeight: 'bold', fontSize: 14 },
  rejectedSub: { color: '#ef4444', fontSize: 11 },

  driverPromoCard: { backgroundColor: '#009199', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 3 },
  driverPromoIcon: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverPromoTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  driverPromoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  supportCard: { backgroundColor: '#fff', borderRadius: 20, padding: 5, elevation: 1 },
  supportItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  supportIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  supportText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, marginBottom: 8, elevation: 1 },
  historyDest: { fontSize: 13, fontWeight: '600', color: '#334155' },
  historyDate: { fontSize: 11, color: '#94a3b8' },
  historyPrice: { fontWeight: 'bold', color: '#22c55e', fontSize: 13 },
  emptyText: { color: '#94a3b8', textAlign: 'center', fontSize: 12, marginVertical: 10 },
  signOutBtn: { backgroundColor: '#ef4444', flexDirection: 'row', height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  signOutText: { color: 'white', fontWeight: 'bold' },
  versionText: { textAlign: 'center', color: '#cbd5e1', fontSize: 10, marginTop: 20 }
});