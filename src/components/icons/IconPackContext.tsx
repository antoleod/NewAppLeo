import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconPack, IconPackId } from './IconPack';
import { softPack } from './packs/soft';
import { boldPack } from './packs/bold';
import { classicPack } from './packs/classic';
import { outlinePack } from './packs/outline';

const STORAGE_KEY = 'appleo.iconPack';

export const ALL_PACKS: Record<IconPackId, IconPack> = {
  soft: softPack,
  bold: boldPack,
  classic: classicPack,
  outline: outlinePack,
};

export const ICON_PACK_LIST: IconPack[] = [softPack, boldPack, outlinePack, classicPack];

interface IconPackContextValue {
  pack: IconPack;
  packId: IconPackId;
  setPackId: (id: IconPackId) => void;
}

const IconPackContext = createContext<IconPackContextValue | null>(null);

/**
 * Provider — reads the user's choice from AsyncStorage on mount and persists
 * any subsequent changes. Defaults to `soft` (the BabyFlow signature look).
 */
export function IconPackProvider({ children }: { children: React.ReactNode }) {
  const [packId, setPackIdState] = useState<IconPackId>('soft');

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!alive) return;
      if (stored === 'soft' || stored === 'bold' || stored === 'classic' || stored === 'outline') {
        setPackIdState(stored);
      }
    });
    return () => { alive = false; };
  }, []);

  const setPackId = React.useCallback((id: IconPackId) => {
    setPackIdState(id);
    void AsyncStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<IconPackContextValue>(
    () => ({ pack: ALL_PACKS[packId], packId, setPackId }),
    [packId, setPackId],
  );

  return <IconPackContext.Provider value={value}>{children}</IconPackContext.Provider>;
}

/**
 * Returns the active pack object. Components destructure the glyphs they
 * need: `const { MealMorning, FaceHappy } = useIconPack();`
 */
export function useIconPack(): IconPack {
  const ctx = useContext(IconPackContext);
  // Allow non-provider use (e.g. tests, storybook) by falling back to soft.
  return ctx?.pack ?? softPack;
}

/**
 * Returns the controller {pack, packId, setPackId} — for the settings picker.
 */
export function useIconPackController(): IconPackContextValue {
  const ctx = useContext(IconPackContext);
  if (!ctx) throw new Error('useIconPackController must be used inside IconPackProvider');
  return ctx;
}
