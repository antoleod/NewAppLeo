declare module '@expo/vector-icons' {
  import * as React from 'react';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const Ionicons: React.ComponentType<IconProps> & {
    glyphMap: Record<string, string>;
  };
}
