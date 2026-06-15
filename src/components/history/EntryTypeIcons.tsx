import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { BottleIcon, BreastfeedingIcon } from './FeedingIcons';

interface IconProps {
  size?: number;
  color?: string;
}

const strokeProps = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function DiaperIcon({ size = 24, color = '#E74C3C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={1.5} y={7} width={4.5} height={2.8} rx={1.4} fill={color} opacity={0.7} />
      <Rect x={18} y={7} width={4.5} height={2.8} rx={1.4} fill={color} opacity={0.7} />
      <Circle cx={5.2} cy={8.4} r={0.9} fill={color} />
      <Circle cx={18.8} cy={8.4} r={0.9} fill={color} />
      <Path d="M6 8.2 C7.8 6.8 9.8 6.2 12 6.2 C14.2 6.2 16.2 6.8 18 8.2" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path
        d="M6.2 8.4 C6.2 8.4 7.6 10.6 7.6 12.4 C7.6 14.2 6 16.8 5.8 18.4 C5.6 19.8 6.6 21 8 21 L16 21 C17.4 21 18.4 19.8 18.2 18.4 C18 16.8 16.4 14.2 16.4 12.4 C16.4 10.6 17.8 8.4 17.8 8.4 Z"
        stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        fill={color} fillOpacity={0.08}
      />
      <Path d="M9.2 11.2 C10.2 10.4 11.2 10 12 10 C12.8 10 13.8 10.4 14.8 11.2" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
    </Svg>
  );
}

export function TemperatureIcon({ size = 24, color = '#FF8A4C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 13.3V5.8C10 4.3 10.9 3.4 12 3.4C13.1 3.4 14 4.3 14 5.8V13.3C15.2 14 16 15.2 16 16.6C16 18.8 14.2 20.5 12 20.5C9.8 20.5 8 18.8 8 16.6C8 15.2 8.8 14 10 13.3Z" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Line x1={12} y1={8} x2={12} y2={16.2} stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Circle cx={12} cy={16.7} r={2.1} fill={color} opacity={0.24} />
      <Line x1={15.9} y1={6.2} x2={18} y2={6.2} stroke={color} strokeWidth={1.5} {...strokeProps} />
      <Line x1={15.9} y1={9.4} x2={17.4} y2={9.4} stroke={color} strokeWidth={1.5} {...strokeProps} />
    </Svg>
  );
}

export function VaccineIcon({ size = 24, color = '#3FB950' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.2 17.8L16.8 7.2" stroke={color} strokeWidth={1.9} {...strokeProps} />
      <Path d="M13.9 5.1L18.9 10.1" stroke={color} strokeWidth={1.9} {...strokeProps} />
      <Path d="M9.6 9.4L14.6 14.4" stroke={color} strokeWidth={1.9} {...strokeProps} />
      <Path d="M17.7 4.3L19.7 6.3" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Path d="M4.8 19.2L6.4 17.6" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Path d="M18.9 10.1L20.2 11.4" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Path d="M11.9 7.1L16.9 12.1" stroke={color} strokeWidth={4.6} opacity={0.12} {...strokeProps} />
    </Svg>
  );
}

export function SymptomIcon({ size = 24, color = '#8EB5EA' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={7.8} stroke={color} strokeWidth={1.8} opacity={0.9} />
      <Path d="M9.2 14.7C10.1 14 11 13.7 12 13.7C13 13.7 13.9 14 14.8 14.7" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Circle cx={9.2} cy={10.1} r={1} fill={color} />
      <Circle cx={14.8} cy={10.1} r={1} fill={color} />
      <Path d="M18 5.7L19.5 4.2M19.5 7.2L18 5.7L16.5 7.2" stroke={color} strokeWidth={1.4} {...strokeProps} />
      <Path d="M6.2 17.7C7.6 19 9.5 19.8 12 19.8C14.5 19.8 16.4 19 17.8 17.7" stroke={color} strokeWidth={4.2} opacity={0.1} {...strokeProps} />
    </Svg>
  );
}

export function FoodIcon({ size = 24, color = '#F0B85A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 11.3H19C18.6 16 16.1 19.2 12 19.2C7.9 19.2 5.4 16 5 11.3Z" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M7.4 11.3C7.8 14.5 9.3 16.4 12 16.4C14.7 16.4 16.2 14.5 16.6 11.3" fill={color} opacity={0.14} />
      <Path d="M8.2 8.4C9.2 7.6 10.5 7.2 12 7.2C13.5 7.2 14.8 7.6 15.8 8.4" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Path d="M17.2 5.1V12.1" stroke={color} strokeWidth={1.7} {...strokeProps} />
      <Path d="M19.3 5.1V8C19.3 9.2 18.4 10.1 17.2 10.1" stroke={color} strokeWidth={1.7} {...strokeProps} />
    </Svg>
  );
}

export function MedicationIcon({ size = 24, color = '#7CC2FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.2 18.6C6.1 16.5 6.1 13.2 8.2 11.1L11.1 8.2C13.2 6.1 16.5 6.1 18.6 8.2C20.7 10.3 20.7 13.6 18.6 15.7L15.7 18.6C13.6 20.7 10.3 20.7 8.2 18.6Z" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M10.6 10.6L16.2 16.2" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M8.4 17.8C10.3 19.5 13.1 19.4 15 17.5L17.5 15C19.4 13.1 19.5 10.3 17.8 8.4" fill={color} opacity={0.13} />
      <Path d="M5.2 6.8H8.8M7 5V8.6" stroke={color} strokeWidth={1.5} {...strokeProps} />
    </Svg>
  );
}

export function MeasurementIcon({ size = 24, color = '#A371F7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.2} y={6.6} width={15.6} height={10.8} rx={2.2} stroke={color} strokeWidth={1.8} />
      <Path d="M7 9.6V12.2M10.3 9.6V11.2M13.6 9.6V12.2M16.9 9.6V11.2" stroke={color} strokeWidth={1.5} {...strokeProps} />
      <Path d="M7.2 15.1H16.8" stroke={color} strokeWidth={1.6} {...strokeProps} />
      <Path d="M5.2 15.6C6.3 17.1 8.2 17.8 10.7 17.8H13.3C15.8 17.8 17.7 17.1 18.8 15.6" fill={color} opacity={0.13} />
    </Svg>
  );
}

export function SleepIcon({ size = 24, color = '#58A6FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* crescent moon — filled solid shape */}
      <Path
        d="M12.2 2.6 C7.4 3.2 3.6 7.4 3.6 12.6 C3.6 17.8 7.6 22 12.6 22 C14.6 22 16.4 21.2 17.8 19.8 C16.2 20.4 14.2 20.2 12.6 19 C9.4 16.8 7.8 13 8.8 9.4 C9.4 7 10.8 5 12.8 3.8 C12.6 3.4 12.4 3 12.2 2.6 Z"
        fill={color}
        opacity={0.9}
      />
      {/* eyes closed — two soft arcs on the moon face */}
      <Path d="M8.6 13 C9 12.4 9.8 12.2 10.4 12.6" stroke="white" strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M11 11.8 C11.4 11.2 12.2 11 12.8 11.4" stroke="white" strokeWidth={1.4} strokeLinecap="round" />
      {/* gentle smile */}
      <Path d="M9 15 C9.8 16 11 16.2 12 15.8" stroke="white" strokeWidth={1.2} strokeLinecap="round" fill="none" />
      {/* cheek blushes */}
      <Circle cx={8.4} cy={14.6} r={1} fill="white" fillOpacity={0.18} />
      <Circle cx={12.8} cy={14.2} r={1} fill="white" fillOpacity={0.18} />
      {/* stars */}
      <Circle cx={20} cy={6} r={1.2} fill={color} />
      <Circle cx={18.6} cy={10.6} r={0.7} fill={color} opacity={0.6} />
      <Circle cx={21.6} cy={10} r={0.5} fill={color} opacity={0.45} />
    </Svg>
  );
}


/** Generic feed — milk droplet with crown highlight. Used when feeding mode
 *  is unknown (e.g. history fallback). Specific bottle/breast icons live in
 *  FeedingIcons.tsx and are picked at the consumer side when mode is known. */
export function FeedIcon({ size = 24, color = '#C9A227' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.8C12 3.8 6.6 10.5 6.6 14.6C6.6 17.7 9 20.2 12 20.2C15 20.2 17.4 17.7 17.4 14.6C17.4 10.5 12 3.8 12 3.8Z" stroke={color} strokeWidth={1.8} {...strokeProps} fill={color} fillOpacity={0.14} />
      <Path d="M9 14.6C9 13.1 9.7 11.2 12 8.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <Circle cx={10.6} cy={13.3} r={0.9} fill={color} opacity={0.6} />
    </Svg>
  );
}

/** Milestone — five-pointed star with inner sparkle accent. Single signature
 *  ray slightly longer at top-right gives the star its own personality
 *  (most milestone icons in libraries are perfectly symmetrical). */
export function MilestoneIcon({ size = 24, color = '#F0B85A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.4L13.9 8.9L19.7 9.1L15.1 12.6L16.7 18.2L12 14.9L7.3 18.2L8.9 12.6L4.3 9.1L10.1 8.9Z"
        stroke={color} strokeWidth={1.8} {...strokeProps}
        fill={color} fillOpacity={0.15}
      />
      <Path d="M18.5 4.7L17.2 5.6L17.6 4.1L16.8 3.2L18.1 3.4L18.7 2.1L19.1 3.4L20.4 3.4L19.4 4.3L19.7 5.6Z" fill={color} opacity={0.6} />
      <Circle cx={12} cy={11.2} r={1.2} fill={color} opacity={0.5} />
    </Svg>
  );
}

/** Breast pump — flange + collection bottle. Signature: small swirl inside the
 *  funnel suggesting suction motion, distinct from a plain bottle. */
export function PumpIcon({ size = 24, color = '#F778BA' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Funnel / flange */}
      <Path d="M5.2 5.5L18.8 5.5L15.3 11.3L8.7 11.3Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={color} fillOpacity={0.14} />
      {/* Suction swirl signature */}
      <Path d="M10.5 7.5C11.4 7 12.6 7 13.5 7.5C14 8 14 8.7 13.4 9" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.75} />
      {/* Neck */}
      <Path d="M10.3 11.3L10.3 13.4L13.7 13.4L13.7 11.3" stroke={color} strokeWidth={1.7} {...strokeProps} />
      {/* Bottle body */}
      <Path d="M8.8 13.6L8.8 18.8C8.8 19.9 9.6 20.6 10.7 20.6L13.3 20.6C14.4 20.6 15.2 19.9 15.2 18.8L15.2 13.6Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      {/* Liquid */}
      <Path d="M8.9 17.2L15.1 17.2L15.1 18.6C15.1 19.7 14.4 20.4 13.4 20.4L10.6 20.4C9.6 20.4 8.9 19.7 8.9 18.6Z" fill={color} fillOpacity={0.3} />
    </Svg>
  );
}

/**
 * Optional context lets callers refine the icon when they know more:
 *  - feed:    `mode = 'bottle' | 'breast'` picks the matching feeding icon.
 *  Without context we render the generic FeedIcon (milk droplet).
 */
export function GetEntryIcon(
  entryType: string,
  size: number = 24,
  color?: string,
  context?: { mode?: 'bottle' | 'breast' },
) {
  switch (entryType) {
    case 'diaper':
      return <DiaperIcon size={size} color={color} />;
    case 'temperature':
      return <TemperatureIcon size={size} color={color} />;
    case 'vaccine':
      return <VaccineIcon size={size} color={color} />;
    case 'symptom':
      return <SymptomIcon size={size} color={color} />;
    case 'food':
      return <FoodIcon size={size} color={color} />;
    case 'medication':
      return <MedicationIcon size={size} color={color} />;
    case 'measurement':
      return <MeasurementIcon size={size} color={color} />;
    case 'sleep':
      return <SleepIcon size={size} color={color} />;
    case 'feed':
      if (context?.mode === 'bottle') return <BottleIcon size={size} color={color ?? '#C9A227'} />;
      if (context?.mode === 'breast') return <BreastfeedingIcon size={size} color={color ?? '#C9A227'} />;
      return <FeedIcon size={size} color={color} />;
    case 'milestone':
      return <MilestoneIcon size={size} color={color} />;
    case 'pump':
      return <PumpIcon size={size} color={color} />;
    default:
      return null;
  }
}
