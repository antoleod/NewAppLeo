/**
 * BabyFlow Custom Glyphs
 *
 * Replaces the Unicode emojis that used to litter the UI (🌅 🌞 🍪 🌙 💧 💩
 * 🤢 😋 …). Reasons we needed our own:
 *
 *  1. Unicode emojis render differently on iOS, Android, Web — same screen
 *     looked like three different products. These render identically.
 *  2. Cluttered, oversaturated. Apple's 🌞 is photorealistic; Google's is
 *     cartoonish; neither belongs in a soft, calm baby app.
 *  3. We lose colour control — `color` prop here drives every glyph so they
 *     blend with the active meal-time / sleep-period / mood tone.
 *
 * Design rules (same dialect as EntryTypeIcons):
 *   - 24×24 viewBox, stroke 1.7, round caps/joins
 *   - Solid fills at 0.16-0.22 opacity for warmth, never plain outlines
 *   - One signature detail per glyph (a sleep cap on the moon, a tiny seed
 *     on the cookie, freckles on the happy face) so they feel hand-drawn
 *     rather than algorithmically generated
 */
import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';

interface GlyphProps {
  size?: number;
  color?: string;
}

const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// ─── MEAL PERIODS ───────────────────────────────────────────────────────────

/** Breakfast — sunrise over a horizon line. Signature: one long ray to the
 *  right, the rest short, evoking the sun "leaning" eastward at dawn. */
export function MealMorning({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 16.5C7 13.5 9.4 12 12 12C14.6 12 17 13.5 18.5 16.5Z" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.7} {...stroke} />
      <Line x1={3} y1={19} x2={21} y2={19} stroke={color} strokeWidth={1.7} {...stroke} />
      <Line x1={12} y1={4.2} x2={12} y2={6.5} stroke={color} strokeWidth={1.6} {...stroke} />
      <Line x1={6.5} y1={7.5} x2={7.8} y2={8.7} stroke={color} strokeWidth={1.6} {...stroke} />
      <Line x1={17.5} y1={7.5} x2={20.4} y2={6} stroke={color} strokeWidth={1.6} {...stroke} />
    </Svg>
  );
}

/** Lunch — full sun, geometric rays. Signature: rays alternate thickness
 *  to feel hand-cut rather than CSS-generated. */
export function MealMidday({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4.2} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.7} />
      <Line x1={12} y1={3} x2={12} y2={5.4} stroke={color} strokeWidth={1.7} {...stroke} />
      <Line x1={12} y1={18.6} x2={12} y2={21} stroke={color} strokeWidth={1.7} {...stroke} />
      <Line x1={3} y1={12} x2={5.4} y2={12} stroke={color} strokeWidth={1.5} {...stroke} />
      <Line x1={18.6} y1={12} x2={21} y2={12} stroke={color} strokeWidth={1.5} {...stroke} />
      <Line x1={5.5} y1={5.5} x2={7.2} y2={7.2} stroke={color} strokeWidth={1.5} {...stroke} />
      <Line x1={16.8} y1={16.8} x2={18.5} y2={18.5} stroke={color} strokeWidth={1.5} {...stroke} />
      <Line x1={18.5} y1={5.5} x2={16.8} y2={7.2} stroke={color} strokeWidth={1.5} {...stroke} />
      <Line x1={7.2} y1={16.8} x2={5.5} y2={18.5} stroke={color} strokeWidth={1.5} {...stroke} />
    </Svg>
  );
}

/** Snack — soft cookie with bite mark on the upper-right. Signature: 3 dots
 *  positioned as a smile rather than symmetrically. */
export function MealSnack({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5C5 8.2 8.4 4.8 12.6 4.8C13.1 4.8 13.6 4.85 14 4.95C13.4 5.85 13 6.95 13 8.1C13 9.6 13.7 10.9 14.8 11.7C14.8 11.7 14.85 11.85 15.3 12.4C15.7 12.9 16.6 13.05 17.1 13.05C18 13.05 18.85 12.65 19.4 12C18.95 16.05 15.6 19.2 11.5 19.2C7.9 19.2 5 16.2 5 12.5Z"
        fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={9.3} cy={11} r={0.9} fill={color} />
      <Circle cx={12} cy={14.2} r={0.9} fill={color} />
      <Circle cx={8.3} cy={14} r={0.7} fill={color} opacity={0.6} />
    </Svg>
  );
}

/** Dinner — crescent moon. Signature: tiny "sleep" cap (a small loop) so it
 *  reads "going to bed" not just "night". */
export function MealEvening({ size = 24, color = '#A371F7' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 14.2C13.3 14.2 10.3 11.2 10.3 7.5C10.3 6.5 10.6 5.5 11.1 4.6C7.5 5.1 4.6 8.4 4.6 12.5C4.6 17.1 8.4 20.8 13 20.8C16.6 20.8 19.7 18.6 20.7 15.3C19.6 16 18.4 14.2 17 14.2Z"
        fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.7} {...stroke} />
      <Circle cx={18} cy={6.5} r={0.6} fill={color} opacity={0.8} />
      <Circle cx={20.5} cy={9} r={0.5} fill={color} opacity={0.6} />
    </Svg>
  );
}

/** Other / generic meal — fork + spoon crossed. Signature: handles meet at
 *  a tiny knot rather than perfectly crossing. */
export function MealOther({ size = 24, color = '#8B6F47' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4V11M9 11C9 12 8 12.5 7 12.5M9 11C9 12 10 12.5 11 12.5M7.5 4V9.5M10.5 4V9.5" stroke={color} strokeWidth={1.7} {...stroke} fill="none" />
      <Path d="M15 4C13.5 4 12.5 5.2 12.5 7.5C12.5 9.5 13.5 11 15 11" stroke={color} strokeWidth={1.7} {...stroke} fill={color} fillOpacity={0.2} />
      <Line x1={9} y1={12.5} x2={9} y2={20} stroke={color} strokeWidth={1.7} {...stroke} />
      <Line x1={15} y1={11} x2={15} y2={20} stroke={color} strokeWidth={1.7} {...stroke} />
    </Svg>
  );
}

// ─── DIAPER ────────────────────────────────────────────────────────────────

/** Pee — single water droplet, taller than wide. Signature: highlight curve
 *  inside. */
export function DropPee({ size = 24, color = '#58A6FF' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.8C12 3.8 6.6 10.5 6.6 14.6C6.6 17.7 9 20.2 12 20.2C15 20.2 17.4 17.7 17.4 14.6C17.4 10.5 12 3.8 12 3.8Z"
        fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.7} {...stroke} />
      <Path d="M9 14.6C9 13.1 9.7 11.2 12 8.4" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

/** Poop — abstract stacked swirl. Signature: tiny shine on top-left so it
 *  doesn't read as a stack of stones. */
export function DropPoop({ size = 24, color = '#A371F7' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.8 19.8C7 19.8 5.6 18.4 5.6 16.7C5.6 16.3 5.7 15.9 5.9 15.5C5.5 15.2 5.3 14.7 5.3 14.1C5.3 13 6.2 12.1 7.4 12.1C7.5 11 8.4 10.2 9.5 10.2C9.7 10.2 9.9 10.2 10.1 10.3C10.3 8.9 11.5 7.9 12.9 7.9C13.2 7.9 13.5 7.9 13.8 8C14.1 6.5 15.4 5.5 16.9 5.5C18.4 5.5 19.6 6.6 19.9 8.1C20.6 8.4 21.1 9.1 21.1 9.9C21.1 10.5 20.8 11.1 20.3 11.4C20.6 11.8 20.8 12.4 20.8 13C20.8 13.5 20.6 14 20.4 14.4C20.7 14.8 20.8 15.3 20.8 15.8C20.8 16.5 20.5 17.2 20 17.7C20.2 18.2 20.3 18.7 20.3 19.2C20.3 19.4 20.3 19.6 20.2 19.8H8.8Z"
        fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx={11.5} cy={11.5} r={0.7} fill={color} opacity={0.6} />
      <Circle cx={15.5} cy={9} r={0.5} fill={color} opacity={0.7} />
    </Svg>
  );
}

/** Vomit — wavy splash with motion lines. Signature: 3 droplets escaping. */
export function DropVomit({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13C7 14 9.5 14.5 12 14.5C14.5 14.5 17 14 19 13C19.2 16.5 16.4 19.5 12 19.5C7.6 19.5 4.8 16.5 5 13Z"
        fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.7} {...stroke} />
      <Path d="M8 9.5C8 8.5 8.7 7.5 10 7.5C11 7.5 11.5 8.2 11.5 9C11.5 8.2 12.3 7 14 7C15.4 7 16 8.3 16 9.5" stroke={color} strokeWidth={1.6} {...stroke} fill="none" />
      <Circle cx={9} cy={5} r={0.7} fill={color} opacity={0.6} />
      <Circle cx={13} cy={4} r={0.6} fill={color} opacity={0.7} />
      <Circle cx={16} cy={5.5} r={0.5} fill={color} opacity={0.5} />
    </Svg>
  );
}

// ─── FACE REACTIONS (3-step) ───────────────────────────────────────────────

/** Happy face — soft circle with eyes + upward smile + freckles signature. */
export function FaceHappy({ size = 24, color = '#56D364' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.7} />
      <Path d="M8.5 14C9.5 15.4 10.7 16 12 16C13.3 16 14.5 15.4 15.5 14" stroke={color} strokeWidth={1.7} {...stroke} fill="none" />
      <Path d="M8.5 9.5C8.5 10.5 9 11 9.5 11" stroke={color} strokeWidth={1.7} {...stroke} fill="none" />
      <Path d="M15.5 9.5C15.5 10.5 15 11 14.5 11" stroke={color} strokeWidth={1.7} {...stroke} fill="none" />
      <Circle cx={7} cy={13.5} r={0.6} fill={color} opacity={0.5} />
      <Circle cx={17} cy={13.5} r={0.6} fill={color} opacity={0.5} />
    </Svg>
  );
}

/** Neutral face — flat mouth, dot eyes. Signature: slight asymmetric tilt
 *  in the mouth line. */
export function FaceNeutral({ size = 24, color = '#8EB5EA' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.7} />
      <Line x1={8.7} y1={14.4} x2={15.3} y2={14.6} stroke={color} strokeWidth={1.7} {...stroke} />
      <Circle cx={9.2} cy={10.3} r={1} fill={color} />
      <Circle cx={14.8} cy={10.3} r={1} fill={color} />
    </Svg>
  );
}

/** Sad face — downward mouth + a single tear at right. */
export function FaceSad({ size = 24, color = '#E07A7A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.7} />
      <Path d="M8.5 16C9.5 14.6 10.7 14 12 14C13.3 14 14.5 14.6 15.5 16" stroke={color} strokeWidth={1.7} {...stroke} fill="none" />
      <Circle cx={9.2} cy={10.3} r={1} fill={color} />
      <Circle cx={14.8} cy={10.3} r={1} fill={color} />
      <Path d="M16.2 12.3C16.2 12.3 15.5 13.2 15.5 14C15.5 14.5 15.8 14.9 16.2 14.9C16.6 14.9 16.9 14.5 16.9 14C16.9 13.2 16.2 12.3 16.2 12.3Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

// ─── AMOUNT EATEN (4-step ramp) ────────────────────────────────────────────

/** Full plate. */
export function AmountAll({ size = 24, color = '#56D364' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={1.7} fill={color} fillOpacity={0.18} />
      <Circle cx={12} cy={12.5} r={5} fill={color} fillOpacity={0.45} />
      <Path d="M9 11C10 12.2 11 12 12 12C13 12 14 12.2 15 11" stroke={color} strokeWidth={1.2} {...stroke} opacity={0.6} fill="none" />
    </Svg>
  );
}

/** Half plate — bottom half filled. */
export function AmountHalf({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={1.7} fill={color} fillOpacity={0.12} />
      <Path d="M4 12.5C4 16.9 7.6 20.5 12 20.5C16.4 20.5 20 16.9 20 12.5Z" fill={color} fillOpacity={0.4} />
    </Svg>
  );
}

/** Little — small dot in center. */
export function AmountLittle({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={1.7} fill={color} fillOpacity={0.08} />
      <Circle cx={12} cy={12.5} r={2.2} fill={color} fillOpacity={0.5} />
    </Svg>
  );
}

/** None — empty plate with a slash. */
export function AmountNone({ size = 24, color = '#E07A7A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12.5} r={8} stroke={color} strokeWidth={1.7} fill={color} fillOpacity={0.08} />
      <Line x1={7} y1={17} x2={17} y2={8} stroke={color} strokeWidth={1.7} {...stroke} />
    </Svg>
  );
}

// ─── SLEEP QUALITY ─────────────────────────────────────────────────────────

/** Calm sleep — closed crescent eyes + soft Z. */
export function SleepCalm({ size = 24, color = '#58A6FF' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.7} />
      <Path d="M7.5 10.5C8.5 11.5 10 11.5 11 10.5" stroke={color} strokeWidth={1.6} {...stroke} fill="none" />
      <Path d="M13 10.5C14 11.5 15.5 11.5 16.5 10.5" stroke={color} strokeWidth={1.6} {...stroke} fill="none" />
      <Path d="M8 15.5C9 16 10 16 11 15.5C12 15 13 15 14 15.5C15 16 16 16 17 15.5" stroke={color} strokeWidth={1.4} {...stroke} fill="none" opacity={0.6} />
      <Path d="M16.5 4.5H19.5L16.5 7.5H19.5" stroke={color} strokeWidth={1.4} {...stroke} fill="none" />
    </Svg>
  );
}

/** Restless sleep — furrowed brow + zigzag. */
export function SleepRestless({ size = 24, color = '#F0B85A' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.7} />
      <Path d="M7.5 9C8.5 8.5 9.5 8.5 10.5 9" stroke={color} strokeWidth={1.6} {...stroke} fill="none" />
      <Path d="M13.5 9C14.5 8.5 15.5 8.5 16.5 9" stroke={color} strokeWidth={1.6} {...stroke} fill="none" />
      <Circle cx={9} cy={11.5} r={0.9} fill={color} />
      <Circle cx={15} cy={11.5} r={0.9} fill={color} />
      <Path d="M8 16L10 14L12 16L14 14L16 16" stroke={color} strokeWidth={1.5} {...stroke} fill="none" />
    </Svg>
  );
}

/** Interrupted / broken sleep — moon with a crack. */
export function SleepInterrupted({ size = 24, color = '#A371F7' }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 14.2C13.3 14.2 10.3 11.2 10.3 7.5C10.3 6.5 10.6 5.5 11.1 4.6C7.5 5.1 4.6 8.4 4.6 12.5C4.6 17.1 8.4 20.8 13 20.8C16.6 20.8 19.7 18.6 20.7 15.3C19.6 16 18.4 14.2 17 14.2Z"
        fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.7} {...stroke} />
      <Path d="M11 9L13 11L11 13L13 15" stroke={color} strokeWidth={1.5} {...stroke} fill="none" opacity={0.85} />
    </Svg>
  );
}
