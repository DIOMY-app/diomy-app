import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";

export default function ClientProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 p-6">
          {/* Header */}
          <Text className="text-2xl font-bold text-foreground">Mon profil</Text>

          {/* Profile Card */}
          <View className="bg-surface border border-border rounded-2xl p-6 gap-4">
            <View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
              <Text className="text-3xl">👤</Text>
            </View>
            <View className="gap-2">
              <Text className="text-xl font-bold text-foreground">{user?.full_name}</Text>
              <Text className="text-sm text-muted">{user?.phone_number}</Text>
              <View className="flex-row items-center gap-2 mt-2">
                <Text className="text-sm text-muted">⭐ {user?.average_rating?.toFixed(1)}</Text>
                <Text className="text-sm text-muted">({user?.total_ratings} avis)</Text>
              </View>
            </View>
          </View>

          {/* Settings Sections */}
          <View className="gap-4">
            {/* Account Settings */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Compte</Text>
              <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
                <Text className="text-foreground">Modifier le profil</Text>
                <Text className="text-muted">›</Text>
              </Pressable>
              <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
                <Text className="text-foreground">Adresses sauvegardées</Text>
                <Text className="text-muted">›</Text>
              </Pressable>
              <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
                <Text className="text-foreground">Méthodes de paiement</Text>
                <Text className="text-muted">›</Text>
              </Pressable>
            </View>

            {/* Support */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Support</Text>
              <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
                <Text className="text-foreground">Aide et support</Text>
                <Text className="text-muted">›</Text>
              </Pressable>
              <Pressable className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
                <Text className="text-foreground">À propos de DIOMY</Text>
                <Text className="text-muted">›</Text>
              </Pressable>
            </View>

            {/* Sign Out */}
            <Pressable
              onPress={handleSignOut}
              className="bg-error/10 border border-error rounded-lg p-4 items-center"
            >
              <Text className="text-error font-semibold">Se déconnecter</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
