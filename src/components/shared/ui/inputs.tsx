import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { radii, spacing } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { typography } from '@/typography';

export function Input({
  label, hint, error, multiline, value, onChangeText, placeholder,
  keyboardType = 'default', secureTextEntry, autoCapitalize = 'none',
  textContentType, inputMode,
}: {
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: any;
  inputMode?: any;
}) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1280;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        inputMode={inputMode}
        style={[
          styles.input,
          isDesktopWeb && styles.inputDesktop,
          { color: theme.textPrimary, borderColor: error ? theme.red : theme.border, backgroundColor: theme.bgCardAlt },
          multiline && styles.textArea,
        ]}
      />
      {error ? (
        <Text style={[styles.hint, { color: theme.red }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { ...typography.statLabel, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 12, ...typography.body },
  inputDesktop: { minHeight: 44, paddingVertical: 10, fontSize: 13, lineHeight: 18 },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  hint: { ...typography.detail, lineHeight: 16 },
});
