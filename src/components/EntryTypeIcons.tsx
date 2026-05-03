import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

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
      <Path d="M5 7.2C7 8.3 9.3 8.9 12 8.9C14.7 8.9 17 8.3 19 7.2" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M5.5 7.5L7.1 17.4C7.3 18.7 8.4 19.6 9.7 19.6H14.3C15.6 19.6 16.7 18.7 16.9 17.4L18.5 7.5" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M8.2 10.4L9.5 15.4C9.8 16.5 10.8 17.2 12 17.2C13.2 17.2 14.2 16.5 14.5 15.4L15.8 10.4" fill={color} opacity={0.14} />
      <Circle cx={8.5} cy={7.2} r={1.1} fill={color} opacity={0.55} />
      <Circle cx={15.5} cy={7.2} r={1.1} fill={color} opacity={0.55} />
    </Svg>
  );
}

export function TemperatureIcon({ size = 24, color = '#E74C3C' }: IconProps) {
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
      <Path d="M17.8 14.5C14.2 14.5 11.3 11.6 11.3 8C11.3 6.8 11.6 5.6 12.2 4.6C8 5.1 4.8 8.6 4.8 12.9C4.8 17.5 8.5 21.2 13.1 21.2C16.5 21.2 19.4 19.2 20.7 16.3C19.8 16.2 18.8 15.8 17.8 14.5Z" stroke={color} strokeWidth={1.8} {...strokeProps} />
      <Path d="M13.2 18.5C16 18.5 18.4 17.1 19.8 15" fill={color} opacity={0.14} />
      <Path d="M16.8 4.8H20.4L16.8 8.6H20.4" stroke={color} strokeWidth={1.5} {...strokeProps} />
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
