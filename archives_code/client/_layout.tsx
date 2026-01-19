import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function ClientLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ✅ FORCE LE RÉGLAGE POUR L'ORDINATEUR (WEB)
  const isWeb = Platform.OS === "web";
  
  // Sur le Web, on ignore totalement les insets.bottom qui causent la hauteur excessive
  const bottomPadding = isWeb ? 10 : Math.max(insets.bottom, 12);
  const tabBarHeight = isWeb ? 60 : 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          // ✅ Paramètres fixes pour le Web
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          position: isWeb ? 'relative' : 'absolute', // Sur web, position normale
          ...Platform.select({
            web: {
              // On retire les ombres complexes qui peuvent agrandir visuellement le bloc
              boxShadow: "none", 
              borderTopWidth: 1,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginBottom: isWeb ? 5 : 0, // Ajustement texte sur ordi
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: "Trajets",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Portefeuille",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}