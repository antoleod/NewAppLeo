import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number; focused?: boolean };

/** Baby bottle — Home */
export function HomeTabIcon({ color, size = 24, focused }: Props) {
  const s = focused ? 2 : 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* nipple */}
      <Rect x={10} y={1.5} width={4} height={2.5} rx={1.2}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.3}
      />
      {/* collar */}
      <Rect x={8.5} y={4} width={7} height={1.5} rx={0.6}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.25}
      />
      {/* bottle body */}
      <Path
        d="M8.5 5.5 L7.5 8 Q7 10 7 12 V18 Q7 21.5 12 21.5 Q17 21.5 17 18 V12 Q17 10 16.5 8 L15.5 5.5 Z"
        stroke={color} strokeWidth={s} strokeLinejoin="round"
        fill={focused ? color : 'none'} fillOpacity={0.1}
      />
      {/* liquid fill when active */}
      {focused && (
        <Path
          d="M7.5 15.5 Q7.5 21 12 21 Q16.5 21 16.5 15.5 Z"
          fill={color} fillOpacity={0.25}
        />
      )}
      {/* graduation marks */}
      <Line x1={13.5} y1={10} x2={16} y2={10} stroke={color} strokeWidth={1} strokeLinecap="round" strokeOpacity={0.65} />
      <Line x1={13.5} y1={13} x2={16} y2={13} stroke={color} strokeWidth={1} strokeLinecap="round" strokeOpacity={0.65} />
      <Line x1={13.5} y1={16} x2={16} y2={16} stroke={color} strokeWidth={1} strokeLinecap="round" strokeOpacity={0.65} />
    </Svg>
  );
}

/** Baby diary / open book with heart — History */
export function HistoryTabIcon({ color, size = 24, focused }: Props) {
  const s = focused ? 2 : 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* left page */}
      <Path
        d="M12 4.5 Q8.5 3.5 5.5 4.5 Q4.5 5 4.5 6 V18.5 Q4.5 19.5 5.5 19.5 Q8.5 20.5 12 19.5 V4.5 Z"
        stroke={color} strokeWidth={s} strokeLinejoin="round"
        fill={focused ? color : 'none'} fillOpacity={0.08}
      />
      {/* right page */}
      <Path
        d="M12 4.5 Q15.5 3.5 18.5 4.5 Q19.5 5 19.5 6 V18.5 Q19.5 19.5 18.5 19.5 Q15.5 20.5 12 19.5 V4.5 Z"
        stroke={color} strokeWidth={s} strokeLinejoin="round"
        fill={focused ? color : 'none'} fillOpacity={0.08}
      />
      {/* spine */}
      <Line x1={12} y1={4.5} x2={12} y2={19.5} stroke={color} strokeWidth={s} strokeLinecap="round" />
      {/* heart on right page */}
      <Path
        d="M16 9.5 A1.35 1.35 0 0 1 17.35 10.85 C 17.35 12.5 16 13.5 16 13.5 C 16 13.5 14.65 12.5 14.65 10.85 A 1.35 1.35 0 0 1 16 9.5 Z"
        fill={color} fillOpacity={focused ? 1 : 0.6}
      />
      {/* ruled lines on left page */}
      <Line x1={6.5} y1={9} x2={10} y2={9} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={6.5} y1={12} x2={10} y2={12} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={6.5} y1={15} x2={10} y2={15} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
    </Svg>
  );
}

/** Growth bar chart with trend + heart peak — Insights */
export function InsightsTabIcon({ color, size = 24, focused }: Props) {
  const s = focused ? 2 : 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* bar 1 – short */}
      <Rect x={2} y={14} width={4.5} height={8} rx={1.3}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.15}
      />
      {/* bar 2 – medium */}
      <Rect x={9.75} y={9.5} width={4.5} height={12.5} rx={1.3}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.15}
      />
      {/* bar 3 – tall */}
      <Rect x={17.5} y={5} width={4.5} height={17} rx={1.3}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.15}
      />
      {/* trend line */}
      <Path
        d="M4.25 13 L12 8.5 L19.75 4"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* heart at trend peak */}
      <Path
        d="M19.75 1.8 A1.15 1.15 0 0 1 20.9 2.95 C 20.9 4.4 19.75 5.1 19.75 5.1 C 19.75 5.1 18.6 4.4 18.6 2.95 A 1.15 1.15 0 0 1 19.75 1.8 Z"
        fill={color}
      />
    </Svg>
  );
}

/** Paint palette — Theme settings */
export function SettingsThemeTabIcon({ color, size = 24, focused }: Props) {
  const s = focused ? 2 : 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* palette body */}
      <Path
        d="M12 3 C7.03 3 3 7.03 3 12 C3 16.97 7.03 21 12 21 C12.83 21 13.5 20.33 13.5 19.5 C13.5 19.11 13.35 18.76 13.11 18.49 C12.88 18.23 12.74 17.88 12.74 17.5 C12.74 16.67 13.41 16 14.24 16 H16 C18.76 16 21 13.76 21 11 C21 6.58 16.97 3 12 3 Z"
        stroke={color} strokeWidth={s} strokeLinejoin="round"
        fill={focused ? color : 'none'} fillOpacity={0.1}
      />
      {/* color dots */}
      <Circle cx={6.5} cy={11.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={8.5} cy={7.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={12} cy={6} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={15.5} cy={7.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
    </Svg>
  );
}

/** Baby face — Profile */
export function ProfileTabIcon({ color, size = 24, focused }: Props) {
  const s = focused ? 2 : 1.7;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* head */}
      <Circle cx={12} cy={10} r={7}
        stroke={color} strokeWidth={s}
        fill={focused ? color : 'none'} fillOpacity={0.12}
      />
      {/* ears */}
      <Path d="M5 9.5 Q3.2 10 3.2 11 Q3.2 12 5 12.5"
        stroke={color} strokeWidth={s} strokeLinecap="round" fill="none"
      />
      <Path d="M19 9.5 Q20.8 10 20.8 11 Q20.8 12 19 12.5"
        stroke={color} strokeWidth={s} strokeLinecap="round" fill="none"
      />
      {/* hair tuft */}
      <Path d="M9 3.8 Q10.5 2 12 3.2 Q13.5 2 15 3.8"
        stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* eyes */}
      <Circle cx={9.5} cy={9.5} r={focused ? 1.3 : 1.1} fill={color} />
      <Circle cx={14.5} cy={9.5} r={focused ? 1.3 : 1.1} fill={color} />
      {/* smile */}
      <Path d="M9.5 12.8 Q12 15 14.5 12.8"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none"
      />
      {/* shoulders */}
      <Path d="M5 22.5 Q5 18.5 12 18.5 Q19 18.5 19 22.5"
        stroke={color} strokeWidth={s} strokeLinecap="round" fill="none"
      />
    </Svg>
  );
}
