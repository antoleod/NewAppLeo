import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Ellipse, Line, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function DiaperIcon({ size = 24, color = '#E74C3C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Diaper pants - cheerful shape */}
      <Path d="M6 8C6 6 7 5 8 5C9 5 10 6 10 8L10 16C10 18 9 19 8 19C7 19 6 18 6 16Z" fill={color} opacity={0.6} />
      <Path d="M14 8C14 6 15 5 16 5C17 5 18 6 18 8L18 16C18 18 17 19 16 19C15 19 14 18 14 16Z" fill={color} opacity={0.6} />
      {/* Waistband */}
      <Rect x="6" y="7" width="12" height="2" rx="1" fill={color} />
      {/* Happy smile decoration */}
      <Circle cx="12" cy="13" r="2.5" fill={color} opacity={0.4} />
      {/* Stars for fun */}
      <Path d="M18.5 10L19 11L20 11.5L19 12L18.5 13L18 12L17 11.5L18 11Z" fill={color} opacity={0.5} />
      <Path d="M5.5 14L6 15L7 15.5L6 16L5.5 17L5 16L4 15.5L5 15Z" fill={color} opacity={0.5} />
    </Svg>
  );
}

export function TemperatureIcon({ size = 24, color = '#E74C3C' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Warm water drop */}
      <Path d="M12 1C12 1 8 7 8 11C8 14.3 9.8 17 12 17C14.2 17 16 14.3 16 11C16 7 12 1 12 1Z" fill={color} opacity={0.25} stroke={color} strokeWidth="1.2" />
      {/* Thermometer stem */}
      <Rect x="10.8" y="3" width="2.4" height="11" fill={color} opacity={0.6} rx="1.2" />
      {/* Thermometer bulb */}
      <Circle cx="12" cy="15.5" r="2" fill={color} opacity={0.8} />
      {/* Rising mercury inside */}
      <Rect x="11" y="8" width="2" height="6.5" fill={color} opacity={0.5} rx="1" />
      {/* Happy decorative element */}
      <Circle cx="5" cy="9" r="0.7" fill={color} opacity={0.4} />
      <Circle cx="19" cy="10" r="0.7" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function VaccineIcon({ size = 24, color = '#3FB950' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Syringe barrel */}
      <Path d="M5 12L15 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Plunger base */}
      <Circle cx="4.5" cy="12" r="2" fill={color} opacity={0.7} />
      {/* Needle tip */}
      <Path d="M15 11L17.5 12L15 13Z" fill={color} opacity={0.8} />
      {/* Needle line */}
      <Line x1="17.5" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Plunger rod */}
      <Rect x="17" y="11" width="3.5" height="2" fill={color} rx="1" opacity={0.7} />
      {/* Healing sparkles - four pointed stars */}
      <Path d="M11 5L11.5 6.5L13 7L11.5 7.5L11 9L10.5 7.5L9 7L10.5 6.5Z" fill={color} opacity={0.6} />
      <Path d="M8 14.5L8.3 15.5L9.3 16L8.3 16.5L8 17.5L7.7 16.5L6.7 16L7.7 15.5Z" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function SymptomIcon({ size = 24, color = '#8EB5EA' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head circle */}
      <Circle cx="12" cy="11" r="8" stroke={color} strokeWidth="1.5" fill={color} opacity={0.08} />
      {/* Left eye */}
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      {/* Right eye */}
      <Circle cx="15" cy="9" r="1.5" fill={color} />
      {/* Cheeks (happy) */}
      <Circle cx="6.5" cy="12" r="1.2" fill={color} opacity={0.3} />
      <Circle cx="17.5" cy="12" r="1.2" fill={color} opacity={0.3} />
      {/* Happy mouth */}
      <Path d="M9 14Q12 15.5 15 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Temperature indicator - thermometer shape on side */}
      <Rect x="18" y="8" width="2" height="7" rx="1" fill={color} opacity={0.4} />
      <Circle cx="19" cy="16" r="1.5" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function FoodIcon({ size = 24, color = '#F0B85A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bowl outline */}
      <Path d="M4 10C4 8 6 6 12 6C18 6 20 8 20 10L20 14C20 17 18 18.5 12 18.5C6 18.5 4 17 4 14Z" stroke={color} strokeWidth="1.5" fill={color} opacity={0.12} />
      {/* Food inside - colorful */}
      <Ellipse cx="12" cy="11" rx="6" ry="3" fill={color} opacity={0.5} />
      {/* Spoon with rounded bowl */}
      <Ellipse cx="16" cy="6.5" rx="2.5" ry="3" fill={color} opacity={0.7} />
      {/* Spoon handle */}
      <Path d="M16 9.5L17.5 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Yummy bubbles */}
      <Circle cx="9" cy="9" r="0.8" fill={color} opacity={0.4} />
      <Circle cx="14" cy="10" r="0.8" fill={color} opacity={0.4} />
      <Circle cx="11" cy="13" r="0.7" fill={color} opacity={0.3} />
    </Svg>
  );
}

export function MedicationIcon({ size = 24, color = '#7CC2FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left capsule half */}
      <Ellipse cx="9" cy="12" rx="3.5" ry="5" fill={color} opacity={0.5} stroke={color} strokeWidth="1.2" />
      {/* Right capsule half */}
      <Ellipse cx="15" cy="12" rx="3.5" ry="5" fill={color} opacity={0.7} stroke={color} strokeWidth="1.2" />
      {/* Center divider */}
      <Line x1="12" y1="7" x2="12" y2="17" stroke={color} strokeWidth="1" />
      {/* Plus/cross symbol - healing */}
      <Path d="M19 8L21 8M20 7L20 9" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Happy sparkle */}
      <Circle cx="5.5" cy="7.5" r="0.6" fill={color} opacity={0.6} />
      <Circle cx="6.5" cy="6" r="0.5" fill={color} opacity={0.5} />
    </Svg>
  );
}

export function MeasurementIcon({ size = 24, color = '#A371F7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ruler curve */}
      <Path d="M3 10C7 7 17 7 21 10" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Measurement marks */}
      <Line x1="5" y1="8.5" x2="5" y2="11" stroke={color} strokeWidth="1.5" />
      <Line x1="9" y1="7.5" x2="9" y2="11" stroke={color} strokeWidth="1.2" />
      <Line x1="12" y1="7" x2="12" y2="11" stroke={color} strokeWidth="1.5" />
      <Line x1="15" y1="7.5" x2="15" y2="11" stroke={color} strokeWidth="1.2" />
      <Line x1="19" y1="8.5" x2="19" y2="11" stroke={color} strokeWidth="1.5" />
      {/* Growth circle indicator - happy */}
      <Circle cx="12" cy="15" r="3" fill={color} opacity={0.3} />
      <Circle cx="12" cy="15" r="1.8" fill={color} opacity={0.7} />
      {/* Upward arrow for growth */}
      <Path d="M12 17.5L12 19.5M10 18L12 19.5L14 18" stroke={color} strokeWidth="1.2" strokeLinecap="round" stroke-linejoin="round" fill="none" />
    </Svg>
  );
}

export function SleepIcon({ size = 24, color = '#58A6FF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cloud background */}
      <Path d="M3 13C3 11 4 10 5 10C5.5 8.5 7 7 8.5 7C9.5 5.5 11 5 12 5C15 5 17 7 17 10C18 10 19 11 19 13C19 15 18 16 16 16H4C2 16 3 15 3 13Z" fill={color} opacity={0.15} stroke={color} strokeWidth="1.2" />
      {/* Happy sleeping face */}
      <Circle cx="10" cy="12" r="1.2" fill={color} />
      {/* Closed eye (peaceful crescent) */}
      <Path d="M13 11.5Q13.5 12 14 11.5" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Peaceful smile */}
      <Path d="M9 13Q10.5 13.8 12 13Q13.5 12.2 15 13" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Moon in corner - bright and friendly */}
      <Circle cx="16" cy="7.5" r="2" fill={color} opacity={0.5} />
      <Circle cx="17.5" cy="7" r="1.8" fill="white" opacity={0.3} />
      {/* Sleep bubbles */}
      <Circle cx="6" cy="6" r="0.6" fill={color} opacity={0.4} />
      <Circle cx="5.5" cy="8" r="0.5" fill={color} opacity={0.3} />
    </Svg>
  );
}

export function GetEntryIcon(entryType: string, size: number = 24, color?: string) {
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
    default:
      return null;
  }
}
