/**
 * Outline pack — pure stroke, no fills. Calm, minimal, almost wireframe-like.
 * Good for low-light environments and parents who find tonal fills too busy.
 *
 * All glyphs share the same construction grammar: stroke 1.6, round caps,
 * no fill ever. This is what gives the pack its identity — the absence of
 * colour fills is itself the design.
 */
import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { GlyphProps, IconPack } from '../IconPack';

const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const SW = 1.6;

const Wrap = ({ size = 24, children }: { size?: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{children}</Svg>
);

// ── Meal periods ───────────────────────────────────────────────────────────

const MealMorning = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M5.5 17C7 14 9.4 12.5 12 12.5C14.6 12.5 17 14 18.5 17" stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={3.5} y1={19.5} x2={20.5} y2={19.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={12} y1={4} x2={12} y2={6.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={6.5} y1={7.5} x2={8} y2={9} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={17.5} y1={7.5} x2={20} y2={6} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const MealMidday = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={3.6} stroke={color} strokeWidth={SW} />
    <Line x1={12} y1={3} x2={12} y2={5.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={12} y1={18.5} x2={12} y2={21} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={3} y1={12} x2={5.5} y2={12} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={18.5} y1={12} x2={21} y2={12} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={5.6} y1={5.6} x2={7.4} y2={7.4} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={16.6} y1={16.6} x2={18.4} y2={18.4} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={18.4} y1={5.6} x2={16.6} y2={7.4} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={7.4} y1={16.6} x2={5.6} y2={18.4} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const MealSnack = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={7.5} stroke={color} strokeWidth={SW} />
    <Circle cx={9.5} cy={10.5} r={0.9} stroke={color} strokeWidth={1.2} />
    <Circle cx={13.5} cy={9.5} r={0.7} stroke={color} strokeWidth={1.2} />
    <Circle cx={11} cy={14} r={0.8} stroke={color} strokeWidth={1.2} />
    <Circle cx={14.5} cy={13.5} r={0.6} stroke={color} strokeWidth={1.2} />
  </Wrap>
);

const MealEvening = ({ size, color = '#A371F7' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M17 14.5C13.5 14.5 10.5 11.5 10.5 8C10.5 7 10.8 6 11.3 5C7.5 5.5 4.5 8.8 4.5 13C4.5 17.5 8.3 21 13 21C16.5 21 19.5 18.8 20.5 15.5C19.5 16 18.3 14.5 17 14.5Z"
      stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const MealOther = ({ size, color = '#8B6F47' }: GlyphProps) => (
  <Wrap size={size}>
    <Line x1={9} y1={4} x2={9} y2={20} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={7.5} y1={4} x2={7.5} y2={9.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={10.5} y1={4} x2={10.5} y2={9.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Path d="M15 4C13.5 4 12.5 5.2 12.5 7.5C12.5 9.5 13.5 11 15 11" stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={15} y1={11} x2={15} y2={20} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

// ── Diaper ─────────────────────────────────────────────────────────────────

const DropPee = ({ size, color = '#58A6FF' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M12 4C12 4 6.5 11 6.5 14.7C6.5 17.7 9 20.2 12 20.2C15 20.2 17.5 17.7 17.5 14.7C17.5 11 12 4 12 4Z"
      stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const DropPoop = ({ size, color = '#A371F7' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M9 19.8C7 19.8 5.5 18.3 5.5 16.5C5.5 16 5.7 15.6 6 15.2C5.5 14.9 5.3 14.4 5.3 13.8C5.3 12.7 6.2 11.8 7.4 11.8C7.5 10.7 8.4 9.9 9.5 9.9C9.7 9.9 9.9 9.9 10.1 10C10.4 8.6 11.6 7.6 13 7.6C13.3 7.6 13.6 7.6 13.9 7.7C14.2 6.2 15.5 5.2 17 5.2C18.5 5.2 19.7 6.4 20 7.9C20.7 8.2 21.2 8.9 21.2 9.7C21.2 10.3 20.9 10.9 20.4 11.2C20.7 11.6 20.9 12.2 20.9 12.8C20.9 13.3 20.7 13.8 20.5 14.2C20.7 14.6 20.9 15.1 20.9 15.6C20.9 16.3 20.6 16.9 20.2 17.4C20.4 17.9 20.5 18.4 20.5 18.9C20.5 19.2 20.4 19.5 20.4 19.8H9Z"
      stroke={color} strokeWidth={SW} strokeLinejoin="round" />
  </Wrap>
);

const DropVomit = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M5 13C7 14 9.5 14.5 12 14.5C14.5 14.5 17 14 19 13C19.2 16.5 16.4 19.5 12 19.5C7.6 19.5 4.8 16.5 5 13Z"
      stroke={color} strokeWidth={SW} {...stroke} />
    <Path d="M8 9.5C8 8.5 8.7 7.5 10 7.5C11 7.5 11.5 8.2 11.5 9C11.5 8.2 12.3 7 14 7C15.4 7 16 8.3 16 9.5"
      stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

// ── Faces ──────────────────────────────────────────────────────────────────

const FaceHappy = ({ size, color = '#56D364' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={SW} />
    <Path d="M8.5 14C9.5 15.4 10.7 16 12 16C13.3 16 14.5 15.4 15.5 14" stroke={color} strokeWidth={SW} {...stroke} />
    <Circle cx={9.2} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
    <Circle cx={14.8} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
  </Wrap>
);

const FaceNeutral = ({ size, color = '#8EB5EA' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={SW} />
    <Line x1={9} y1={14.5} x2={15} y2={14.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Circle cx={9.2} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
    <Circle cx={14.8} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
  </Wrap>
);

const FaceSad = ({ size, color = '#E07A7A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={SW} />
    <Path d="M8.5 16C9.5 14.6 10.7 14 12 14C13.3 14 14.5 14.6 15.5 16" stroke={color} strokeWidth={SW} {...stroke} />
    <Circle cx={9.2} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
    <Circle cx={14.8} cy={10.3} r={0.6} stroke={color} strokeWidth={1.2} />
  </Wrap>
);

// ── Amount eaten ───────────────────────────────────────────────────────────

const AmountAll = ({ size, color = '#56D364' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={SW} />
    <Circle cx={12} cy={12.5} r={5} stroke={color} strokeWidth={SW} />
  </Wrap>
);

const AmountHalf = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={SW} />
    <Path d="M4 12.5L20 12.5" stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const AmountLittle = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={SW} />
    <Circle cx={12} cy={12.5} r={2} stroke={color} strokeWidth={SW} />
  </Wrap>
);

const AmountNone = ({ size, color = '#E07A7A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={SW} />
    <Line x1={7} y1={17} x2={17} y2={8} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

// ── Sleep ──────────────────────────────────────────────────────────────────

const SleepCalm = ({ size, color = '#58A6FF' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={SW} />
    <Path d="M8 11C9 12 10.5 12 11.5 11" stroke={color} strokeWidth={SW} {...stroke} />
    <Path d="M12.5 11C13.5 12 15 12 16 11" stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const SleepRestless = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={SW} />
    <Path d="M8 16L10 14L12 16L14 14L16 16" stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const SleepInterrupted = ({ size, color = '#A371F7' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M17 14.5C13.5 14.5 10.5 11.5 10.5 8C10.5 7 10.8 6 11.3 5C7.5 5.5 4.5 8.8 4.5 13C4.5 17.5 8.3 21 13 21C16.5 21 19.5 18.8 20.5 15.5C19.5 16 18.3 14.5 17 14.5Z"
      stroke={color} strokeWidth={SW} {...stroke} />
    <Path d="M11 9L13 11L11 13L13 15" stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

export const outlinePack: IconPack = {
  id: 'outline',
  nameKey: 'iconPack.outlineName',
  descKey: 'iconPack.outlineDesc',
  MealMorning, MealMidday, MealSnack, MealEvening, MealOther,
  DropPee, DropPoop, DropVomit,
  FaceHappy, FaceNeutral, FaceSad,
  AmountAll, AmountHalf, AmountLittle, AmountNone,
  SleepCalm, SleepRestless, SleepInterrupted,
};
