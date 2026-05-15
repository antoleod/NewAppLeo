import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number };

/** Signature bottle: angled glass, side grip, milk wave, and three measure ticks. */
export function BottleIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="M11.8 1.8C12.7 1 15.3 1 16.2 1.8L15.8 4.2H12.2Z" fill={color} opacity={0.88} />
      <Rect x={9.8} y={4.1} width={8.4} height={2.4} rx={1} fill={color} />
      <Path
        d="M10.3 6.5L8.9 9.8C8.4 11 8.2 12.2 8.3 13.5L8.8 21.1C9 24.3 11 26.2 14 26.2C17 26.2 19 24.3 19.2 21.1L19.7 13.5C19.8 12.2 19.6 11 19.1 9.8L17.7 6.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.1}
      />
      <Path
        d="M9.1 17.4C10.8 18.1 12.5 18.1 14.1 17.5C15.8 16.8 17.3 16.9 18.9 17.7L18.6 21.1C18.4 23.8 16.7 25.4 14 25.4C11.3 25.4 9.6 23.8 9.4 21.1Z"
        fill={color}
        fillOpacity={0.28}
      />
      <Path d="M10.8 10.6C12.2 9.8 15.8 9.8 17.2 10.6" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.45} />
      <Line x1={15.7} y1={12} x2={18} y2={12} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.72} />
      <Line x1={15.7} y1={14.8} x2={18.2} y2={14.8} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.72} />
      <Line x1={15.7} y1={17.6} x2={17.8} y2={17.6} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.72} />
      <Path d="M10.8 14.2C11.5 13.6 12.6 13.6 13.4 14.2" stroke={color} strokeWidth={1.2} strokeLinecap="round" opacity={0.55} />
    </Svg>
  );
}

/** Signature breastfeeding: crescent parent silhouette cradling a baby close. */
export function BreastfeedingIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx={8.2} cy={5.8} r={3.7} fill={color} />
      <Path
        d="M4.2 10.8C4.6 9.6 6.5 9.2 8.3 9.4C11.1 9.7 12.7 11.5 13.8 14.1C15.8 13 18.1 12.8 20.3 13.7C23 14.8 24.6 17.2 24.2 20.2C23.8 23.3 21.2 25.1 17.8 25.1H10.4C6.5 25.1 3.6 22.4 3.8 18.6Z"
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M6.3 14.2C8.7 17.9 12.3 20 18.4 20.2" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.72} />
      <Circle cx={20.4} cy={17.2} r={4.6} fill={color} fillOpacity={0.92} />
      <Path d="M17.6 14.3C18.4 13.2 20.2 12.6 21.7 13.2" stroke="white" strokeWidth={1} strokeLinecap="round" strokeOpacity={0.62} />
      <Circle cx={22} cy={16.4} r={0.75} fill="white" fillOpacity={0.8} />
      <Path d="M19.5 18.7C20.7 19.8 22.1 19.8 23.2 18.6" stroke="white" strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.62} fill="none" />
      <Path d="M12.3 16.2C13.6 14.8 15.4 14.2 17.2 14.6" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.64} />
    </Svg>
  );
}
