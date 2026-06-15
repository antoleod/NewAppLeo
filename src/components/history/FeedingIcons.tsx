import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number };

export function BottleIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* nipple dome */}
      <Path
        d="M11.6 6.2 C11.6 4.4 12.6 3.2 14 3.2 C15.4 3.2 16.4 4.4 16.4 6.2 L16.4 7.4 L11.6 7.4 Z"
        fill={color}
        opacity={0.9}
      />
      {/* collar */}
      <Rect x={10.4} y={7.1} width={7.2} height={2} rx={1} fill={color} />
      {/* body — very round */}
      <Rect
        x={9} y={8.8} width={10} height={15.6} rx={5}
        stroke={color} strokeWidth={2.2} fill={color} fillOpacity={0.08}
      />
      {/* milk fill wave */}
      <Path
        d="M9.1 19.8 C9.1 19.8 10.1 18.6 11.8 18.4 C13 18.2 13.8 18.6 14 19 C14.2 18.6 15 18.2 16.2 18.4 C17.9 18.6 18.9 19.8 18.9 19.8 L18.9 22.2 C18.9 24.1 17 24.8 14 24.8 C11 24.8 9.1 24.1 9.1 22.2 Z"
        fill={color}
        fillOpacity={0.28}
      />
      {/* measure ticks */}
      <Line x1={15.6} y1={11.4} x2={18} y2={11.4} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.55} />
      <Line x1={15.6} y1={13.8} x2={18.2} y2={13.8} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.55} />
      <Line x1={15.6} y1={16.2} x2={18} y2={16.2} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.55} />
    </Svg>
  );
}

export function BreastfeedingIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* maternal arc — large C-curve wrapping */}
      <Path
        d="M22.4 5 C22.4 5 26.6 10.6 26.6 16 C26.6 21.4 22.4 25.4 16.8 25.4 C11.2 25.4 7.8 21.4 7.8 16"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      {/* baby head */}
      <Circle cx={10} cy={9.6} r={6} fill={color} fillOpacity={0.9} />
      {/* eye closed */}
      <Path
        d="M7.8 9.2 C8.3 8.4 9.2 8.2 10 8.6"
        stroke="white"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* nursing mouth — small open circle */}
      <Circle cx={11.8} cy={11.2} r={1.1} fill="white" fillOpacity={0.55} />
    </Svg>
  );
}
