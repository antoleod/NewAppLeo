/**
 * IconPack contract — every visual identity must satisfy this interface.
 * Adding a new pack means adding a file under `packs/` that implements this
 * shape and registering it in `IconPackContext`.
 */
import type { ComponentType } from 'react';

export type GlyphProps = { size?: number; color?: string };
export type Glyph = ComponentType<GlyphProps>;

export type IconPackId = 'soft' | 'bold' | 'classic' | 'outline';

export interface IconPack {
  id: IconPackId;
  /** Display name shown in the settings picker. Translated by the consumer. */
  nameKey: string;
  /** One-line description in the picker. */
  descKey: string;

  // ── Meal periods ──────────────────────────────────────────────────
  MealMorning: Glyph;
  MealMidday: Glyph;
  MealSnack: Glyph;
  MealEvening: Glyph;
  MealOther: Glyph;

  // ── Diaper events ─────────────────────────────────────────────────
  DropPee: Glyph;
  DropPoop: Glyph;
  DropVomit: Glyph;

  // ── Food reactions ────────────────────────────────────────────────
  FaceHappy: Glyph;
  FaceNeutral: Glyph;
  FaceSad: Glyph;

  // ── Amount eaten ──────────────────────────────────────────────────
  AmountAll: Glyph;
  AmountHalf: Glyph;
  AmountLittle: Glyph;
  AmountNone: Glyph;

  // ── Sleep quality ────────────────────────────────────────────────
  SleepCalm: Glyph;
  SleepRestless: Glyph;
  SleepInterrupted: Glyph;
}

/** Default tone palette per concept, used by consumers that don't override. */
export const GLYPH_TONES = {
  mealMorning: '#F0B85A',
  mealMidday: '#F0B85A',
  mealSnack: '#F0B85A',
  mealEvening: '#A371F7',
  mealOther: '#8B6F47',
  dropPee: '#58A6FF',
  dropPoop: '#A371F7',
  dropVomit: '#F0B85A',
  faceHappy: '#56D364',
  faceNeutral: '#8EB5EA',
  faceSad: '#E07A7A',
  amountAll: '#56D364',
  amountHalf: '#F0B85A',
  amountLittle: '#F0B85A',
  amountNone: '#E07A7A',
  sleepCalm: '#58A6FF',
  sleepRestless: '#F0B85A',
  sleepInterrupted: '#A371F7',
} as const;
