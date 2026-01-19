// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// --- ACQUIS : NOUVEL IDENTIFIANT PRO ---
const bundleId = "ci.diomy.taxi"; 
// On conserve le timestamp original pour le scheme afin de ne pas casser les liens profonds existants
const timestamp = "20260107171623"; 
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  appName: "DIOMY",
  appSlug: "diomy-app",
  logoUrl: "",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  // Ton ID de projet Expo unique
  projectId: "0147201b-6667-47da-8d53-2938912a21ef" 
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
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
    // --- ACQUIS : CONFIGURATION FIREBASE ---
    package: env.androidPackage,
    googleServicesFile: "./google-services.json", 
    adaptiveIcon: {
      backgroundColor: "#009199", 
      foregroundImage: "./assets/images/icon.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // Permissions optimisées pour DIOMY
    permissions: [
      "POST_NOTIFICATIONS", 
      "ACCESS_COARSE_LOCATION", 
      "ACCESS_FINE_LOCATION", 
      "FOREGROUND_SERVICE",
      "CAMERA",
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
    // --- ACQUIS MIS À JOUR : IMAGE PICKER (GALERIE + CAMÉRA) ---
    [
      "expo-image-picker",
      {
        "photosPermission": "Autoriser DIOMY à accéder à vos photos pour personnaliser votre profil.",
        "cameraPermission": "Autoriser DIOMY à utiliser l'appareil photo pour votre profil."
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
          // On force le projet à ne pas inclure de briques Google Maps natives
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