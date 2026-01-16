import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 p-6">
          {/* Header */}
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-foreground">
                Bonjour {user?.full_name || "Chauffeur"}
              </Text>
              <Text className="text-sm text-muted mt-1">Prêt à travailler ?</Text>
            </View>
            <View className="items-center gap-2">
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: "#ccc", true: "#22C55E" }}
              />
              <Text className="text-xs text-muted">
                {isOnline ? "En ligne" : "Hors ligne"}
              </Text>
            </View>
          </View>

          {/* Map Placeholder */}
          <View className="h-48 bg-surface rounded-2xl border border-border items-center justify-center">
            <Text className="text-muted">🗺️ Carte interactive</Text>
          </View>

          {/* Earnings Summary */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Résumé du jour</Text>
            <View className="flex-row gap-3">
              {/* Today Earnings */}
              <View className="flex-1 bg-success/10 border border-success rounded-lg p-4">
                <Text className="text-xs text-muted mb-2">Gains du jour</Text>
                <Text className="text-2xl font-bold text-success">
                  {todayEarnings.toLocaleString("fr-CI")} XOF
                </Text>
              </View>

              {/* Commissions */}
              <View className="flex-1 bg-warning/10 border border-warning rounded-lg p-4">
                <Text className="text-xs text-muted mb-2">Commissions</Text>
                <Text className="text-2xl font-bold text-warning">
                  {totalCommissions.toLocaleString("fr-CI")} XOF
                </Text>
              </View>
            </View>
          </View>

          {/* Balance Alert */}
          {user && user.prepaid_balance < 1000 && (
            <View className="bg-warning/10 border border-warning rounded-lg p-4 gap-2">
              <Text className="font-semibold text-warning">⚠️ Solde faible</Text>
              <Text className="text-sm text-muted">
                Recharge votre portefeuille pour continuer à accepter des trajets.
              </Text>
              <Pressable className="bg-warning rounded-lg py-2 px-4 mt-2 items-center">
                <Text className="text-white font-semibold text-sm">Recharger maintenant</Text>
              </Pressable>
            </View>
          )}

          {/* Ride Requests */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Demandes de trajet</Text>
            <View className="bg-surface border border-border rounded-lg p-4 items-center justify-center py-8">
              <Text className="text-muted text-center text-sm">
                {isOnline
                  ? "Aucune demande pour le moment. Restez en ligne !"
                  : "Passez en ligne pour recevoir des demandes"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
