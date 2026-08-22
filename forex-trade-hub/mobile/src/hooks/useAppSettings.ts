import { useEffect, useState } from 'react';
import { type AppSettings, fallbackAppSettings } from '../types/models';
import { observeAppSettings } from '../services/firebase/settingsRepo';

/**
 * Remote configuration.
 *
 * A module-level cache means the second and later callers render with settings
 * already in hand — no flash of default limits — while a single listener keeps
 * every consumer in sync.
 */

let cached: AppSettings = fallbackAppSettings;
let listeners = 0;
let unsubscribe: (() => void) | null = null;
const subscribers = new Set<(s: AppSettings) => void>();

function ensureListener() {
  if (unsubscribe) return;
  unsubscribe = observeAppSettings((settings) => {
    cached = settings;
    subscribers.forEach((fn) => fn(settings));
  });
}

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(cached);

  useEffect(() => {
    listeners += 1;
    subscribers.add(setSettings);
    ensureListener();
    setSettings(cached);

    return () => {
      listeners -= 1;
      subscribers.delete(setSettings);
      if (listeners === 0) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };
  }, []);

  return settings;
}

/** Non-hook read, for services and event handlers. */
export function appSettingsSnapshot(): AppSettings {
  return cached;
}
