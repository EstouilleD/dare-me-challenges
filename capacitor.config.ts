import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dareme.challenges',
  appName: 'Dare Me',
  webDir: 'dist',
  server: {
    // Permet le chargement des ressources web locales
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // Android plugin reads "clientId" (not "serverClientId") to call requestIdToken().
      clientId: "699351948587-oqr8kolidgfq1ekuqjjb0ef667cv8nn8.apps.googleusercontent.com",
      serverClientId: "699351948587-oqr8kolidgfq1ekuqjjb0ef667cv8nn8.apps.googleusercontent.com",
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
