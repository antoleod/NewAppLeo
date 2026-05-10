import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number };

/** Baby bottle — detailed with nipple, collar, body, liquid fill, graduation marks */
export function BottleIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* nipple tip — rounded taper */}
      <Path
        d="M12 1.5 Q14 0.5 16 1.5 L15.5 4.5 L12.5 4.5 Z"
        fill={color}
      />
      {/* collar ring */}
      <Rect x={10} y={4.5} width={8} height={2} rx={0.8} fill={color} fillOpacity={0.85} />
      {/* bottle body */}
      <Path
        d="M10 6.5 L9 9.5 Q8.5 11.5 8.5 13.5 V20.5 Q8.5 26 14 26 Q19.5 26 19.5 20.5 V13.5 Q19.5 11.5 19 9.5 L18 6.5 Z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round"
        fill={color} fillOpacity={0.1}
      />
      {/* liquid fill — lower ~45% */}
      <Path
        d="M9.2 18.5 Q9.2 25.5 14 25.5 Q18.8 25.5 18.8 18.5 Z"
        fill={color} fillOpacity={0.3}
      />
      {/* graduation marks — right side */}
      <Line x1={15.8} y1={11} x2={18.8} y2={11} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.7} />
      <Line x1={15.8} y1={14} x2={18.8} y2={14} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.7} />
      <Line x1={15.8} y1={17} x2={18.8} y2={17} stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.7} />
    </Svg>
  );
}

/** Breastfeeding — parent cradling baby, baby head at chest */
export function BreastfeedingIcon({ color, size = 28 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* adult head */}
      <Circle cx={7.5} cy={5.5} r={4} fill={color} />
      {/* adult torso + cradling arm — one organic path */}
      <Path
        d="M3.5 10.5 Q3.5 9.5 7.5 9.5 Q12 9.5 13 11.5 L15 15 Q18 13.5 21.5 14.5 Q24 15.5 24 18.5 Q24 22 21 22.5 L13 22.5 Q11 24.5 8.5 25 Q5 25.5 3.5 23.5 Q3 22.5 3.5 21 L3.5 10.5 Z"
        fill={color} fillOpacity={0.18}
        stroke={color} strokeWidth={1.6} strokeLinejoin="round"
      />
      {/* baby head */}
      <Circle cx={21} cy={17.5} r={5} fill={color} fillOpacity={0.9} />
      {/* baby tiny eye */}
      <Circle cx={22.8} cy={16.5} r={0.9} fill="white" fillOpacity={0.75} />
      {/* baby tiny smile curve */}
      <Path
        d="M20 18.5 Q21.5 19.8 23 18.5"
        stroke="white" strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.6} fill="none"
      />
    </Svg>
  );
}
