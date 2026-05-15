/**
 * Bold pack - filled, high-legibility SVG glyphs for small cards and quick scanning.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { GlyphProps, IconPack } from '../IconPack';

const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const SW = 1.8;

const Wrap = ({ size = 24, children }: { size?: number; children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{children}</Svg>
);

const MealMorning = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M4.5 17C5.9 13.4 8.7 11.4 12 11.4S18.1 13.4 19.5 17Z" fill={color} opacity={0.9} />
    <Line x1={3.5} y1={19.2} x2={20.5} y2={19.2} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={12} y1={4} x2={12} y2={6.4} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={6.2} y1={7.2} x2={8} y2={9} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={17.8} y1={7.2} x2={19.6} y2={5.8} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const MealMidday = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Circle cx={12} cy={12} r={4.6} fill={color} />
    {[3.2, 20.8].map((y) => <Line key={`v-${y}`} x1={12} y1={y} x2={12} y2={y === 3.2 ? 5.4 : 18.6} stroke={color} strokeWidth={SW} {...stroke} />)}
    {[3.2, 20.8].map((x) => <Line key={`h-${x}`} x1={x} y1={12} x2={x === 3.2 ? 5.4 : 18.6} y2={12} stroke={color} strokeWidth={SW} {...stroke} />)}
    <Line x1={5.7} y1={5.7} x2={7.5} y2={7.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={16.5} y1={16.5} x2={18.3} y2={18.3} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={18.3} y1={5.7} x2={16.5} y2={7.5} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={7.5} y1={16.5} x2={5.7} y2={18.3} stroke={color} strokeWidth={SW} {...stroke} />
  </Wrap>
);

const MealSnack = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M5 12.7C5 8.3 8.4 5 12.7 5c.6 0 1.2.1 1.8.2-.8.8-1.2 1.9-1.2 3.1 0 2.3 1.9 4.2 4.2 4.2.6 0 1.1-.1 1.6-.3-.4 3.9-3.7 6.9-7.7 6.9C7.8 19.1 5 16.2 5 12.7Z" fill={color} />
    <Circle cx={9.2} cy={11.2} r={0.9} fill="#fff" opacity={0.75} />
    <Circle cx={12} cy={14.2} r={0.9} fill="#fff" opacity={0.75} />
    <Circle cx={8.4} cy={14.3} r={0.7} fill="#fff" opacity={0.55} />
  </Wrap>
);

const MealEvening = ({ size, color = '#A371F7' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M16.8 14.3c-3.6 0-6.5-2.9-6.5-6.5 0-1.1.3-2.1.8-3-3.7.5-6.5 3.7-6.5 7.7 0 4.6 3.7 8.3 8.3 8.3 3.6 0 6.6-2.3 7.8-5.4-1.1.6-2.4-1.1-3.9-1.1Z" fill={color} />
    <Circle cx={18.5} cy={6.5} r={0.7} fill={color} opacity={0.75} />
  </Wrap>
);

const MealOther = ({ size, color = '#8B6F47' }: GlyphProps) => (
  <Wrap size={size}>
    <Path d="M8 4h2v16H8z" fill={color} />
    <Line x1={6.5} y1={4.5} x2={6.5} y2={10} stroke={color} strokeWidth={SW} {...stroke} />
    <Line x1={11.5} y1={4.5} x2={11.5} y2={10} stroke={color} strokeWidth={SW} {...stroke} />
    <Path d="M15.5 4C13.6 4 12.3 5.5 12.3 8s1.3 4 3.2 4V4Z" fill={color} />
    <Rect x={14.5} y={11} width={2} height={9} rx={1} fill={color} />
  </Wrap>
);

const DropPee = ({ size, color = '#58A6FF' }: GlyphProps) => (
  <Wrap size={size}><Path d="M12 3.8S6.3 10.8 6.3 14.8c0 3.2 2.5 5.7 5.7 5.7s5.7-2.5 5.7-5.7c0-4-5.7-11-5.7-11Z" fill={color} /><Path d="M9 14.2c0-1.4.7-3 2.6-5.4" stroke="#fff" strokeWidth={1.5} opacity={0.65} {...stroke} /></Wrap>
);
const DropPoop = ({ size, color = '#A371F7' }: GlyphProps) => (
  <Wrap size={size}><Path d="M8.6 20c-2 0-3.5-1.5-3.5-3.4 0-.7.2-1.3.6-1.8-.4-.4-.6-.9-.6-1.5 0-1.3 1-2.3 2.4-2.3.2-1.2 1.2-2.1 2.5-2.1.2-1.5 1.5-2.7 3.1-2.7.5 0 .9.1 1.3.3.5-1 1.5-1.8 2.8-1.8 1.8 0 3.2 1.4 3.2 3.2 0 .7-.2 1.3-.6 1.8.8.4 1.3 1.2 1.3 2.1 0 .8-.4 1.5-.9 1.9.4.5.6 1.1.6 1.8 0 1.1-.6 2-1.4 2.5.1.3.2.7.2 1.1 0 .3 0 .6-.1.9H8.6Z" fill={color} /><Circle cx={12} cy={11.3} r={0.7} fill="#fff" opacity={0.55} /></Wrap>
);
const DropVomit = ({ size, color = '#F0B85A' }: GlyphProps) => (
  <Wrap size={size}><Path d="M5 13c2 1 4.5 1.5 7 1.5s5-.5 7-1.5c.2 3.6-2.6 6.5-7 6.5s-7.2-2.9-7-6.5Z" fill={color} /><Path d="M8 9.3c0-1 .8-1.8 2-1.8 1 0 1.6.6 1.6 1.5 0-.9.8-2 2.5-2 1.4 0 2.1 1.2 2.1 2.3" stroke={color} strokeWidth={SW} {...stroke} /></Wrap>
);

const face = (mouth: React.ReactNode, color: string) => (
  <>
    <Circle cx={12} cy={12} r={8.7} fill={color} />
    <Circle cx={9.1} cy={10.5} r={1} fill="#fff" opacity={0.9} />
    <Circle cx={14.9} cy={10.5} r={1} fill="#fff" opacity={0.9} />
    {mouth}
  </>
);
const FaceHappy = ({ size, color = '#56D364' }: GlyphProps) => <Wrap size={size}>{face(<Path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" stroke="#fff" strokeWidth={1.7} {...stroke} />, color)}</Wrap>;
const FaceNeutral = ({ size, color = '#8EB5EA' }: GlyphProps) => <Wrap size={size}>{face(<Line x1={9} y1={14.6} x2={15} y2={14.6} stroke="#fff" strokeWidth={1.7} {...stroke} />, color)}</Wrap>;
const FaceSad = ({ size, color = '#E07A7A' }: GlyphProps) => <Wrap size={size}>{face(<Path d="M8.5 16c1-1.3 2.2-1.9 3.5-1.9s2.5.6 3.5 1.9" stroke="#fff" strokeWidth={1.7} {...stroke} />, color)}<Path d="M16.4 12.4s-.8 1-.8 1.8c0 .6.4 1 0.8 1s.8-.4.8-1c0-.8-.8-1.8-.8-1.8Z" fill="#fff" opacity={0.75} /></Wrap>;

const AmountAll = ({ size, color = '#56D364' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12.5} r={8.3} fill={color} /><Circle cx={12} cy={12.5} r={4.9} fill="#fff" opacity={0.4} /></Wrap>;
const AmountHalf = ({ size, color = '#F0B85A' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12.5} r={8.3} fill={color} opacity={0.25} /><Path d="M4 12.5a8 8 0 0 0 16 0Z" fill={color} /></Wrap>;
const AmountLittle = ({ size, color = '#F0B85A' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12.5} r={8.3} fill={color} opacity={0.25} /><Circle cx={12} cy={12.5} r={2.5} fill={color} /></Wrap>;
const AmountNone = ({ size, color = '#E07A7A' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12.5} r={8.3} fill={color} opacity={0.2} /><Line x1={7} y1={17.2} x2={17.2} y2={7.8} stroke={color} strokeWidth={2.2} {...stroke} /></Wrap>;

const SleepCalm = ({ size, color = '#58A6FF' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12} r={8.7} fill={color} /><Path d="M7.7 10.7c1 1 2.4 1 3.4 0M12.9 10.7c1 1 2.4 1 3.4 0M8 15.5c2.5 1.2 5.5 1.2 8 0" stroke="#fff" strokeWidth={1.6} {...stroke} /><Path d="M16.7 4.4h3l-3 3h3" stroke={color} strokeWidth={1.5} {...stroke} /></Wrap>;
const SleepRestless = ({ size, color = '#F0B85A' }: GlyphProps) => <Wrap size={size}><Circle cx={12} cy={12} r={8.7} fill={color} /><Path d="M8 15.8l2-2 2 2 2-2 2 2" stroke="#fff" strokeWidth={1.8} {...stroke} /><Circle cx={9} cy={10.8} r={1} fill="#fff" /><Circle cx={15} cy={10.8} r={1} fill="#fff" /></Wrap>;
const SleepInterrupted = ({ size, color = '#A371F7' }: GlyphProps) => <Wrap size={size}><Path d="M16.8 14.3c-3.6 0-6.5-2.9-6.5-6.5 0-1.1.3-2.1.8-3-3.7.5-6.5 3.7-6.5 7.7 0 4.6 3.7 8.3 8.3 8.3 3.6 0 6.6-2.3 7.8-5.4-1.1.6-2.4-1.1-3.9-1.1Z" fill={color} /><Path d="M11.3 8.8l2 2-2 2 2 2" stroke="#fff" strokeWidth={1.7} {...stroke} /></Wrap>;

export const boldPack: IconPack = {
  id: 'bold',
  nameKey: 'iconPack.boldName',
  descKey: 'iconPack.boldDesc',
  MealMorning, MealMidday, MealSnack, MealEvening, MealOther,
  DropPee, DropPoop, DropVomit,
  FaceHappy, FaceNeutral, FaceSad,
  AmountAll, AmountHalf, AmountLittle, AmountNone,
  SleepCalm, SleepRestless, SleepInterrupted,
};
