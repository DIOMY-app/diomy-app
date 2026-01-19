import { Redirect } from 'expo-router';

export default function Index() {
  // TypeScript préfère le chemin sans les parenthèses pour l'URL
  return <Redirect href="/auth/setup-profile" />;
}