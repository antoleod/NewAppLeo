import React from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Input } from '@/components/ui';

interface AnimatedInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric' | 'email-address';
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  multiline?: boolean;
}

export function AnimatedInput({
  label,
  value,
  onChangeText,
  keyboardType,
  inputMode,
  multiline,
}: AnimatedInputProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{ overflow: 'hidden' }}
    >
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        inputMode={inputMode}
        multiline={multiline}
      />
    </Animated.View>
  );
}
