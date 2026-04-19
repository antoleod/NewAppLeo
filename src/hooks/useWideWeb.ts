import { Platform, useWindowDimensions } from 'react-native';

const WIDE_WEB_BREAKPOINT = 1280;

export function useWideWeb() {
  const { width, height } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= WIDE_WEB_BREAKPOINT;
  return { isWideWeb, width, height };
}
