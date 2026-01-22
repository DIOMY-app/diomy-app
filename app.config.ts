import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "ci.diomy.taxi"; 
const timestamp = "20260107171623"; 
const schemeFromBundleId = `diomy${timestamp}`;

const env = {
  appName: "DIOMY",
  appSlug: "diomy-app",
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  supabaseUrl: "https://gmvlwhadpkojsevnljwe.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtdmx3aGFkcGtvanNldm5sanczIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzAwMjIsImV4cCI6MjA1MTg0NjAyMn0.VlS_rX4_B4_R0_VlS_rX4_B4_R0", 
  projectId: "89551eb6-93ef-43b2-9854-d4b92b09b1f4" 
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.1", // ✅ Mis à jour pour la nouvelle version
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  extra: {
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
    eas: {
      projectId: env.projectId
    }
  },

  updates: {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 30000,
    url: `https://u.expo.dev/${env.projectId}`
  },

  runtimeVersion: {
    policy: "appVersion"
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
  },

  android: {
    package: env.androidPackage,
    versionCode: 2, // ✅ Ajouté pour permettre la mise à jour sur le téléphone
    googleServicesFile: "./google-services.json", 
    adaptiveIcon: {
      backgroundColor: "#009199", 
      foregroundImage: "./assets/images/icon.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "POST_NOTIFICATIONS", 
      "ACCESS_COARSE_LOCATION", 
      "ACCESS_FINE_LOCATION", 
      "FOREGROUND_SERVICE",
      "CAMERA",
      "READ_CONTACTS", // ✅ AJOUTÉ pour le répertoire
      "WRITE_CONTACTS", // ✅ AJOUTÉ pour le répertoire
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-contacts", // ✅ AJOUTÉ pour le fonctionnement natif Android
      {
        "contactsPermission": "Autoriser DIOMY à accéder à vos contacts pour faciliter l'envoi de colis."
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Autoriser DIOMY à accéder à vos photos pour personnaliser votre profil.",
        "cameraPermission": "Autoriser DIOMY à utiliser l'appareil photo pour la preuve de livraison."
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Autoriser DIOMY à accéder au micro.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png", 
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#009199", 
        dark: {
          backgroundColor: "#009199",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          extraMavenRepos: ["https://www.jitpack.io"]
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;