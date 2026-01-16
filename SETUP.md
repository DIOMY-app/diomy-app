# DIOMY - Guide de Configuration

Bienvenue dans DIOMY, l'application de taxi-moto pour Korhogo ! Ce guide vous aidera à configurer et déployer l'application.

## 🚀 Démarrage Rapide

### 1. Cloner le projet
```bash
git clone <repository-url>
cd diomy-app
```

### 2. Installer les dépendances
```bash
pnpm install
```

### 3. Configurer Supabase

#### Étape 1 : Créer les tables dans Supabase
1. Allez sur votre tableau de bord Supabase : https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans l'onglet "SQL Editor"
4. Créez une nouvelle requête
5. Copiez et collez le contenu du fichier `scripts/init-supabase.sql`
6. Cliquez sur "Run"

#### Étape 2 : Configurer les variables d'environnement
Créez un fichier `.env.local` à la racine du projet :
```
EXPO_PUBLIC_SUPABASE_URL=https://pwhzvgfkmvuvpsshpxbx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Démarrer l'application

```bash
# Démarrer le serveur de développement
pnpm dev

# Ou pour une plateforme spécifique
pnpm ios      # iOS
pnpm android  # Android
pnpm web      # Web
```

## 📱 Architecture de l'Application

### Structure des Dossiers

```
diomy-app/
├── app/                          # Écrans et navigation
│   ├── auth/                     # Écrans d'authentification
│   │   ├── login.tsx             # Connexion par OTP
│   │   ├── verify-otp.tsx        # Vérification du code OTP
│   │   └── setup-profile.tsx     # Configuration du profil
│   ├── client/                   # Écrans pour les clients
│   │   ├── _layout.tsx           # Navigation client
│   │   ├── index.tsx             # Accueil client
│   │   ├── rides.tsx             # Historique des trajets
│   │   ├── wallet.tsx            # Portefeuille client
│   │   └── profile.tsx           # Profil client
│   ├── driver/                   # Écrans pour les chauffeurs
│   │   ├── _layout.tsx           # Navigation chauffeur
│   │   ├── index.tsx             # Accueil chauffeur
│   │   ├── rides.tsx             # Historique des trajets
│   │   ├── wallet.tsx            # Portefeuille chauffeur
│   │   └── profile.tsx           # Profil chauffeur
│   └── _layout.tsx               # Layout racine
├── lib/
│   ├── supabase.ts               # Client Supabase et types
│   ├── auth-context.tsx          # Contexte d'authentification
│   └── services/
│       ├── auth.ts               # Service d'authentification
│       ├── rides.ts              # Service de gestion des trajets
│       └── wallet.ts             # Service de gestion du portefeuille
├── components/                   # Composants réutilisables
├── scripts/
│   ├── init-supabase.sql         # Schéma de base de données
│   └── setup-database.py         # Script de configuration
└── package.json
```

## 🔑 Fonctionnalités Principales

### Authentification
- Connexion par numéro de téléphone + OTP
- Création de profil (Client ou Chauffeur)
- Gestion de session sécurisée

### Pour les Clients
- Demander un trajet
- Sélectionner le type de trajet (Standard ou Confort)
- Suivi en temps réel du trajet
- Évaluation du chauffeur
- Gestion du portefeuille
- Historique des trajets

### Pour les Chauffeurs
- Recevoir les demandes de trajet
- Accepter/Refuser les trajets
- Navigation vers le client et la destination
- Système de portefeuille prépayé
- Suivi des commissions (15%)
- Historique des gains
- Recharge via Mobile Money

## 💳 Système de Paiement

### Tarification
- **Standard** : 500 XOF + 100 XOF/km
- **Confort** : 750 XOF + 150 XOF/km (50% de surcharge)

### Commission
- Les chauffeurs paient une commission de **15%** par trajet
- La commission est automatiquement déduite du solde prépayé
- Si le solde est insuffisant, le chauffeur ne peut pas accepter de trajets

### Mobile Money
- Orange Money
- MTN Money
- Moov Money

## 🗺️ Géolocalisation et Cartes

L'application utilise :
- **expo-location** : Pour la géolocalisation GPS
- **react-native-maps** : Pour l'affichage des cartes

> Note : Les cartes sont actuellement des placeholders. Pour l'intégration complète, vous devrez configurer les clés API Google Maps ou Mapbox.

## 🧪 Tests

```bash
# Exécuter les tests
pnpm test

# Tester la configuration Supabase
pnpm test supabase.test.ts
```

## 📦 Déploiement

### Build pour iOS
```bash
eas build --platform ios
```

### Build pour Android
```bash
eas build --platform android
```

### Build pour Web
```bash
pnpm run build
```

## 🐛 Dépannage

### Erreur : "Missing Supabase environment variables"
- Vérifiez que les variables d'environnement sont correctement configurées dans `.env.local`
- Assurez-vous que `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` sont définis

### Erreur : "Tables not found"
- Vérifiez que vous avez exécuté le script SQL `init-supabase.sql` dans Supabase
- Vérifiez les permissions RLS (Row Level Security) si activées

### L'application ne se charge pas
- Vérifiez la connexion Internet
- Vérifiez les logs du serveur de développement
- Essayez de redémarrer le serveur : `pnpm dev`

## 📚 Documentation Supplémentaire

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev)
- [NativeWind Documentation](https://www.nativewind.dev)

## 📞 Support

Pour toute question ou problème, veuillez contacter l'équipe de développement.

## 📄 Licence

Ce projet est propriétaire et confidentiel.
