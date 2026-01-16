import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Cache l'en-tête pour le Login et le Register
        contentStyle: { backgroundColor: 'white' },
      }}
    >
      {/* On déclare la page login qui est dans le dossier (auth) */}
      <Stack.Screen 
        name="login" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}