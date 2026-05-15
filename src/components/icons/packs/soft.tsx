/**
 * Soft pack — the BabyFlow signature look. Hand-drawn SVG glyphs with subtle
 * tonal fills, asymmetric details, and warm rounded strokes. This is the
 * default identity.
 */
import {
  MealMorning, MealMidday, MealSnack, MealEvening, MealOther,
  DropPee, DropPoop, DropVomit,
  FaceHappy, FaceNeutral, FaceSad,
  AmountAll, AmountHalf, AmountLittle, AmountNone,
  SleepCalm, SleepRestless, SleepInterrupted,
} from '@/components/shared/CustomGlyphs';
import type { IconPack } from '../IconPack';

export const softPack: IconPack = {
  id: 'soft',
  nameKey: 'iconPack.softName',
  descKey: 'iconPack.softDesc',
  MealMorning, MealMidday, MealSnack, MealEvening, MealOther,
  DropPee, DropPoop, DropVomit,
  FaceHappy, FaceNeutral, FaceSad,
  AmountAll, AmountHalf, AmountLittle, AmountNone,
  SleepCalm, SleepRestless, SleepInterrupted,
};
