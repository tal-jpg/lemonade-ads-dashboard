import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from '@react-native-firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from '@react-native-firebase/auth';
import { getStorage, connectStorageEmulator } from '@react-native-firebase/storage';
import { getFunctions, connectFunctionsEmulator } from '@react-native-firebase/functions';
import Constants from 'expo-constants';

/**
 * Firebase singletons.
 *
 * Native config comes from google-services.json / GoogleService-Info.plist at
 * build time — there are no API keys in the JS bundle. Everything below is
 * lazily created so importing this module never forces native init.
 */

let emulatorsConnected = false;

/**
 * Point the SDKs at the local emulator suite when running a dev build with
 * EXPO_PUBLIC_USE_FIREBASE_EMULATOR=1. Never runs in a release build.
 */
function maybeConnectEmulators(): void {
  if (emulatorsConnected) return;
  if (!__DEV__) return;
  if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR !== '1') return;

  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  emulatorsConnected = true;

  connectFirestoreEmulator(getFirestore(getApp()), host, 8080);
  connectAuthEmulator(getAuth(getApp()), `http://${host}:9099`);
  connectStorageEmulator(getStorage(getApp()), host, 9199);
  connectFunctionsEmulator(getFunctions(getApp()), host, 5001);
}

export function db(): Firestore {
  maybeConnectEmulators();
  return getFirestore(getApp());
}

export function auth(): Auth {
  maybeConnectEmulators();
  return getAuth(getApp());
}

export function storage() {
  maybeConnectEmulators();
  return getStorage(getApp());
}

export function functions() {
  maybeConnectEmulators();
  return getFunctions(getApp());
}

export function currentUid(): string | null {
  return auth().currentUser?.uid ?? null;
}

/** App version string used for analytics and the user document. */
export const appVersion: string =
  (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';
