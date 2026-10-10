// lib/deviceId.ts
// One ID per phone, so free limits (like 3 try-ons a day) count per phone,
// not per account. Signing in with another email doesn't reset it.
// iPhone: Apple's per-app device ID (resets only if the app is deleted and reinstalled).
// Android: the device's app ID (survives reinstalls).

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_KEY = 'halea_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    const id = Platform.OS === 'ios'
      ? await Application.getIosIdForVendorAsync()
      : Application.getAndroidId();
    if (id) return `${Platform.OS}:${id}`;
  } catch {}

  // Fallback (simulator, web): a random ID kept on the phone
  let saved = await AsyncStorage.getItem(FALLBACK_KEY).catch(() => null);
  if (!saved) {
    saved = `gen:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(FALLBACK_KEY, saved).catch(() => {});
  }
  return saved;
}
