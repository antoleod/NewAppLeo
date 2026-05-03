import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/lib/haptics';

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric' | 'email-address';
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

export function InlineEditField({ label, value, onSave, keyboardType, inputMode }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const { colors } = useTheme();

  const handleEdit = () => {
    haptics.light();
    setEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() !== value.trim()) {
      haptics.medium();
      onSave(editValue);
    }
    haptics.light();
    setEditing(false);
  };

  const handleCancel = () => {
    haptics.light();
    setEditValue(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
        <Input
          label={label}
          value={editValue}
          onChangeText={setEditValue}
          keyboardType={keyboardType}
          inputMode={inputMode}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="Save" onPress={handleSave} variant="primary" size="sm" />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Cancel" onPress={handleCancel} variant="secondary" size="sm" />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500', textTransform: 'uppercase' }}>{label}</Text>
        <Pressable onPress={handleEdit} hitSlop={8}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{value}</Text>
    </Animated.View>
  );
}
