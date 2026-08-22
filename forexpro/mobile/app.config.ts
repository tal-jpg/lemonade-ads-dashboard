import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo app configuration.
 *
 * Anything environment-specific (bundle ids, Firebase files, IAP ids) is read
 * from process.env so the same source tree builds dev / staging / production.
 * See .env.example and eas.json.
 */

const APP_NAME = process.env.APP_NAME ?? 'FX Pulse';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'com.fxpulse.app';
const SCHEME = 'fxpulse';
const VERSION = '1.0.0';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'fxpulse',
  version: VERSION,
  scheme: SCHEME,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  primaryColor: '#C6FF3D',
  icon: './assets/icon.png',

  // The splash screen is configured entirely by the expo-splash-screen plugin
  // below; SDK 57 removed the top-level `splash` key.
  assetBundlePatterns: ['**/*'],

  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: '1',
    supportsTablet: true,
    // Firebase iOS requires the plist; keep it out of source control.
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      NSCameraUsageDescription:
        'Allow $(PRODUCT_NAME) to use the camera so you can share chart screenshots with the community.',
      NSPhotoLibraryUsageDescription:
        'Allow $(PRODUCT_NAME) to access your photos so you can set a profile picture and share charts.',
      NSMicrophoneUsageDescription:
        'Allow $(PRODUCT_NAME) to use the microphone so you can send voice notes in the community.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#050505',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.RECORD_AUDIO',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
      'com.android.vending.BILLING',
    ],
    blockedPermissions: ['android.permission.ACCESS_FINE_LOCATION'],
  },

  plugins: [
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-firebase/crashlytics',
    'expo-font',
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        ios: {
          // Required by react-native-firebase: the Firebase iOS SDK ships as
          // static frameworks.
          useFrameworks: 'static',
          // SDK 57 requires at least 16.4.
          deploymentTarget: '16.4',
        },
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#050505',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#C6FF3D',
        defaultChannel: 'signals',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'FX Pulse uses your photos so you can set a profile picture and share charts.',
        cameraPermission: 'FX Pulse uses the camera so you can share chart screenshots.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: 'FX Pulse uses the microphone so you can send voice notes.',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000',
    },
    supportEmail: process.env.SUPPORT_EMAIL ?? 'support@fxpulse.app',
    termsUrl: process.env.TERMS_URL ?? 'https://fxpulse.app/terms',
    privacyUrl: process.env.PRIVACY_URL ?? 'https://fxpulse.app/privacy',
  },
});
