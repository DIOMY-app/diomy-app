import React from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function DriverRidesScreen() {
  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-4 p-6">
          <Text className="text-2xl font-bold text-foreground">Mes trajets</Text>

          {/* Empty State */}
          <View className="flex-1 items-center justify-center gap-4">
            <Text className="text-4xl">📋</Text>
            <Text className="text-lg font-semibold text-foreground">Aucun trajet</Text>
            <Text className="text-sm text-muted text-center">
              Vous n'avez pas encore effectué de trajet. Passez en ligne pour en recevoir !
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
