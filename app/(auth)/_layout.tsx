import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="setup-profile" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="verify-otp" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}