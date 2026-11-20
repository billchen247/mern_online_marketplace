import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { catalogApi } from '../api/services';
import type { PublicSettings } from '../types';

export const DEFAULT_SETTINGS: PublicSettings = {
  marketplaceName: 'Bazaarly',
  tagline: 'Shop independent sellers, all in one place',
  primaryColor: '#4f46e5',
  shipping: { flatRate: 5.99, freeShippingThreshold: 75 },
  tax: { rate: 8 },
};
const Ctx = createContext<{ settings: PublicSettings; reload: () => void }>({ settings: DEFAULT_SETTINGS, reload: () => undefined });

export function SettingsProvider({ children, onLoaded }: { children: ReactNode; onLoaded?: (s: PublicSettings) => void }) {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    catalogApi
      .settings()
      .then((s) => {
        setSettings(s);
        onLoaded?.(s);
        document.title = `${s.marketplaceName} — ${s.tagline}`;
      })
      .catch(() => undefined);
  }, [tick, onLoaded]);
  return <Ctx.Provider value={{ settings, reload: () => setTick((t) => t + 1) }}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);
