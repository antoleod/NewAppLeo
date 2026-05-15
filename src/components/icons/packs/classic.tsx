/**
 * Classic pack — native Unicode emojis. Familiar, fast to scan, but render
 * differently across iOS / Android / Web (Apple's are detailed, Google's are
 * cartoonish, Twemoji on Web is flat). Choose this if you prefer the
 * "ecosystem-native" feel over the brand identity.
 */
import React from 'react';
import { Text } from 'react-native';
import type { GlyphProps, IconPack } from '../IconPack';

const makeEmoji = (emoji: string) =>
  React.memo(function EmojiGlyph({ size = 24 }: GlyphProps) {
    // Rough scaling — emojis are denser than SVGs so we drop the displayed
    // size by ~10% to match the visual weight of the Soft pack.
    return <Text style={{ fontSize: Math.round(size * 0.9), lineHeight: size }}>{emoji}</Text>;
  });

export const classicPack: IconPack = {
  id: 'classic',
  nameKey: 'iconPack.classicName',
  descKey: 'iconPack.classicDesc',

  MealMorning: makeEmoji('🌅'),
  MealMidday: makeEmoji('🌞'),
  MealSnack: makeEmoji('🍪'),
  MealEvening: makeEmoji('🌙'),
  MealOther: makeEmoji('🍴'),

  DropPee: makeEmoji('💧'),
  DropPoop: makeEmoji('💩'),
  DropVomit: makeEmoji('🤢'),

  FaceHappy: makeEmoji('😊'),
  FaceNeutral: makeEmoji('😐'),
  FaceSad: makeEmoji('😕'),

  AmountAll: makeEmoji('🍽️'),
  AmountHalf: makeEmoji('🥗'),
  AmountLittle: makeEmoji('🥄'),
  AmountNone: makeEmoji('🚫'),

  SleepCalm: makeEmoji('😴'),
  SleepRestless: makeEmoji('😣'),
  SleepInterrupted: makeEmoji('🌙'),
};
