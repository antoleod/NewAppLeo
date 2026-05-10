import { Platform } from 'react-native';

function toRgba(color: string, opacity: number): string {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const r = parseInt(hex[1].slice(0, 2), 16);
    const g = parseInt(hex[1].slice(2, 4), 16);
    const b = parseInt(hex[1].slice(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(',').slice(0, 3).map((s) => s.trim());
    return `rgba(${parts.join(',')},${opacity})`;
  }
  return color;
}

export function shadow(
  color: string,
  opacity: number,
  radius: number,
  offsetX: number,
  offsetY: number,
): any {
  if (Platform.OS === 'web') {
    return { boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${toRgba(color, opacity)}` };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: offsetX, height: offsetY },
  };
}

export function textShadow(color: string, offsetX: number, offsetY: number, radius: number): any {
  if (Platform.OS === 'web') {
    return { textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}` };
  }
  return {
    textShadowColor: color,
    textShadowOffset: { width: offsetX, height: offsetY },
    textShadowRadius: radius,
  };
}
