import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const [rideType, setRideType] = useState<"standard" | "confort">("standard");
  const [destination, setDestination] = useState("");

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 pb-6">
          {/* Header */}
          <View className="px-6 pt-4">
            <Text className="text-2xl font-bold text-foreground">
              Bonjour {user?.full_name || "Client"}
            </Text>
            <Text className="text-sm text-muted mt-1">Où allez-vous aujourd'hui ?</Text>
          </View>

          {/* Map Placeholder */}
          <View className="mx-6 h-48 bg-surface rounded-2xl border border-border items-center justify-center">
            <Text className="text-muted">🗺️ Carte interactive</Text>
          </View>

          {/* Destination Input */}
          <View className="px-6 gap-3">
            <Text className="text-sm font-semibold text-foreground">Destination</Text>
            <TextInput
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder="Où allez-vous ?"
              placeholderTextColor="#9BA1A6"
              value={destination}
              onChangeText={setDestination}
            />
          </View>

          {/* Ride Type Selection */}
          <View className="px-6 gap-3">
            <Text className="text-sm font-semibold text-foreground">Type de trajet</Text>

            {/* Standard */}
            <Pressable
              onPress={() => setRideType("standard")}
              className={`border-2 rounded-lg p-4 ${
                rideType === "standard" ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text
                    className={`font-semibold text-base ${
                      rideType === "standard" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    Standard
                  </Text>
                  <Text className="text-sm text-muted mt-1">Moto standard</Text>
                </View>
                <Text className="text-lg font-bold text-foreground">~500 XOF</Text>
              </View>
            </Pressable>

            {/* Confort */}
            <Pressable
              onPress={() => setRideType("confort")}
              className={`border-2 rounded-lg p-4 ${
                rideType === "confort" ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text
                    className={`font-semibold text-base ${
                      rideType === "confort" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    Confort
                  </Text>
                  <Text className="text-sm text-muted mt-1">Moto neuve + Casque</Text>
                </View>
                <Text className="text-lg font-bold text-foreground">~750 XOF</Text>
              </View>
            </Pressable>
          </View>

          {/* Request Ride Button */}
          <View className="px-6 mt-auto">
            <Pressable className="bg-primary py-4 px-6 rounded-lg items-center justify-center">
              <Text className="text-white font-semibold text-base">Demander un trajet</Text>
            </Pressable>
          </View>

          {/* Recent Rides */}
          <View className="px-6 gap-3">
            <Text className="text-sm font-semibold text-foreground">Trajets récents</Text>
            <View className="bg-surface border border-border rounded-lg p-4">
              <Text className="text-muted text-center text-sm">Aucun trajet récent</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
