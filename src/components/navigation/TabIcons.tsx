import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; size?: number; focused?: boolean; iconStyle?: 'soft' | 'bold' | 'outline' | 'classic' };

function visual(focused?: boolean, iconStyle: Props['iconStyle'] = 'soft') {
  const bold = iconStyle === 'bold';
  const outline = iconStyle === 'outline';
  const classic = iconStyle === 'classic';
  return {
    stroke: focused ? (bold ? 2.35 : classic ? 2.1 : 2) : (bold ? 2.05 : classic ? 1.85 : 1.7),
    fill: outline ? 0 : focused ? (bold ? 0.26 : classic ? 0.18 : 0.12) : (bold ? 0.08 : 0),
    detail: focused ? (bold ? 1 : 0.95) : (outline ? 0.8 : 0.55),
  };
}

/** Home: parent nest with a feeding drop, unique to BabyFlow. */
export function HomeTabIcon({ color, size = 24, focused, iconStyle }: Props) {
  const v = visual(focused, iconStyle);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4.2 12.5C4.2 8.3 7.6 4.9 11.9 4.9C16.3 4.9 19.8 8.3 19.8 12.5C19.8 16.9 16.3 20.4 12 20.4C7.7 20.4 4.2 16.9 4.2 12.5Z" stroke={color} strokeWidth={v.stroke} fill={color} fillOpacity={v.fill} />
      <Path d="M7.4 14.4C9.1 16.5 12.4 17.2 16.6 14.4" stroke={color} strokeWidth={v.stroke} strokeLinecap="round" fill="none" />
      <Path d="M12 7.4C12 7.4 9.6 10.5 9.6 12.4C9.6 13.9 10.7 15 12 15C13.3 15 14.4 13.9 14.4 12.4C14.4 10.5 12 7.4 12 7.4Z" fill={color} fillOpacity={iconStyle === 'outline' ? 0 : focused ? 0.95 : 0.32} stroke={iconStyle === 'outline' ? color : 'none'} strokeWidth={iconStyle === 'outline' ? 1.4 : 0} />
      <Path d="M8.8 5.2C9.4 3.9 10.6 3.2 12 3.2C13.4 3.2 14.6 3.9 15.2 5.2" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={v.detail} />
    </Svg>
  );
}

/** History: timeline book with a stitched bookmark. */
export function HistoryTabIcon({ color, size = 24, focused, iconStyle }: Props) {
  const v = visual(focused, iconStyle);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4.5Q8.5 3.5 5.5 4.5Q4.5 5 4.5 6V18.5Q4.5 19.5 5.5 19.5Q8.5 20.5 12 19.5V4.5Z" stroke={color} strokeWidth={v.stroke} strokeLinejoin="round" fill={color} fillOpacity={v.fill} />
      <Path d="M12 4.5Q15.5 3.5 18.5 4.5Q19.5 5 19.5 6V18.5Q19.5 19.5 18.5 19.5Q15.5 20.5 12 19.5V4.5Z" stroke={color} strokeWidth={v.stroke} strokeLinejoin="round" fill={color} fillOpacity={v.fill} />
      <Line x1={12} y1={4.5} x2={12} y2={19.5} stroke={color} strokeWidth={v.stroke} strokeLinecap="round" />
      <Path d="M15.2 8.2H17.8V15.1L16.5 13.9L15.2 15.1Z" fill={color} fillOpacity={iconStyle === 'outline' ? 0 : focused ? 1 : 0.62} stroke={iconStyle === 'outline' ? color : 'none'} strokeWidth={iconStyle === 'outline' ? 1.2 : 0} />
      <Line x1={6.5} y1={9} x2={10} y2={9} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={6.5} y1={12} x2={10} y2={12} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
      <Line x1={6.5} y1={15} x2={10} y2={15} stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.5} />
    </Svg>
  );
}

/** Insights: growth sprout over measured bars. */
export function InsightsTabIcon({ color, size = 24, focused, iconStyle }: Props) {
  const v = visual(focused, iconStyle);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={14} width={4.5} height={8} rx={1.3} stroke={color} strokeWidth={v.stroke} fill={color} fillOpacity={v.fill} />
      <Rect x={9.75} y={9.5} width={4.5} height={12.5} rx={1.3} stroke={color} strokeWidth={v.stroke} fill={color} fillOpacity={v.fill} />
      <Rect x={17.5} y={5} width={4.5} height={17} rx={1.3} stroke={color} strokeWidth={v.stroke} fill={color} fillOpacity={v.fill} />
      <Path d="M4.25 13L12 8.5L19.75 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.6 4.8C18.6 3 19.7 2.2 21.2 2.1C21.2 3.8 20.2 4.8 18.6 4.8Z" fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Path d="M18.6 4.8C18.1 3.4 16.9 2.8 15.7 3.1C16.1 4.5 17.1 5.1 18.6 4.8Z" fill={color} fillOpacity={focused ? 0.72 : 0.45} />
    </Svg>
  );
}

/** Theme: compact palette dial. */
export function SettingsThemeTabIcon({ color, size = 24, focused, iconStyle }: Props) {
  const v = visual(focused, iconStyle);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C12.83 21 13.5 20.33 13.5 19.5C13.5 19.11 13.35 18.76 13.11 18.49C12.88 18.23 12.74 17.88 12.74 17.5C12.74 16.67 13.41 16 14.24 16H16C18.76 16 21 13.76 21 11C21 6.58 16.97 3 12 3Z" stroke={color} strokeWidth={v.stroke} strokeLinejoin="round" fill={color} fillOpacity={v.fill} />
      <Circle cx={6.5} cy={11.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={8.5} cy={7.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={12} cy={6} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
      <Circle cx={15.5} cy={7.5} r={1.2} fill={color} fillOpacity={focused ? 1 : 0.7} />
    </Svg>
  );
}

/** Profile: baby portrait with a leaf-like hair tuft. */
export function ProfileTabIcon({ color, size = 24, focused, iconStyle }: Props) {
  const v = visual(focused, iconStyle);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={10} r={7} stroke={color} strokeWidth={v.stroke} fill={color} fillOpacity={v.fill} />
      <Path d="M5 9.5Q3.2 10 3.2 11Q3.2 12 5 12.5" stroke={color} strokeWidth={v.stroke} strokeLinecap="round" fill="none" />
      <Path d="M19 9.5Q20.8 10 20.8 11Q20.8 12 19 12.5" stroke={color} strokeWidth={v.stroke} strokeLinecap="round" fill="none" />
      <Path d="M9 3.8C9.5 2.4 11 2.1 12 3.2C13 2.1 14.5 2.4 15 3.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={9.5} cy={9.5} r={focused ? 1.3 : 1.1} fill={color} />
      <Circle cx={14.5} cy={9.5} r={focused ? 1.3 : 1.1} fill={color} />
      <Path d="M9.5 12.8Q12 15 14.5 12.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d="M5 22.5Q5 18.5 12 18.5Q19 18.5 19 22.5" stroke={color} strokeWidth={v.stroke} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
