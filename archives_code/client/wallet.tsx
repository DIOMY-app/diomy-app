import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";

export default function ClientWalletScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-foreground">Mon portefeuille</Text>

          {/* Balance Card */}
          <View className="bg-primary rounded-2xl p-6 gap-4">
            <Text className="text-white/80 text-sm">Solde disponible</Text>
            <Text className="text-4xl font-bold text-white">
              {user?.prepaid_balance?.toLocaleString("fr-CI")} XOF
            </Text>
            <View className="flex-row gap-3 mt-4">
              <Pressable className="flex-1 bg-white/20 rounded-lg py-3 items-center">
                <Text className="text-white font-semibold">Recharger</Text>
              </Pressable>
              <Pressable className="flex-1 bg-white/20 rounded-lg py-3 items-center">
                <Text className="text-white font-semibold">Historique</Text>
              </Pressable>
            </View>
          </View>

          {/* Payment Methods */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Méthodes de paiement</Text>

            {/* Orange Money */}
            <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-2xl">🟠</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">Orange Money</Text>
                  <Text className="text-xs text-muted">Recharge instantanée</Text>
                </View>
              </View>
              <Text className="text-muted">›</Text>
            </Pressable>

            {/* MTN Money */}
            <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-2xl">🟡</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">MTN Money</Text>
                  <Text className="text-xs text-muted">Recharge instantanée</Text>
                </View>
              </View>
              <Text className="text-muted">›</Text>
            </Pressable>

            {/* Moov Money */}
            <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-2xl">🔵</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">Moov Money</Text>
                  <Text className="text-xs text-muted">Recharge instantanée</Text>
                </View>
              </View>
              <Text className="text-muted">›</Text>
            </Pressable>
          </View>

          {/* Transaction History */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Historique des transactions</Text>
            <View className="bg-surface border border-border rounded-lg p-4">
              <Text className="text-muted text-center text-sm">Aucune transaction</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
