# AppLeo UI/Theme Improvements Integration Guide

## 🚀 Quick Start

### 1. Replace Theme Controls in Profile Screen

Find the "Theme and layout" Card section in `profile.tsx` and replace it with:

```tsx
import { ThemeQuickSettings } from '@/components/ThemeQuickSettings';

// In your render:
<Card>
  <SectionHeader title="Theme & Design" />
  <ThemeQuickSettings />
</Card>
```

### 2. Access Full Theme Customization

Users can click "✨ Customize Theme" to go to `/settings-theme` route with full controls:
- Light/dark mode toggle
- 4 color palette options with visual previews
- 3 surface style options
- Custom color builder with hex inputs
- Live color previews

### 3. Use New UI Components

#### Toggle Component
```tsx
import { Toggle } from '@/components/ui';

<Toggle 
  value={isEnabled} 
  onChange={setIsEnabled}
  label="Enable feature"
/>
```

#### Color Swatch
```tsx
import { ColorSwatch } from '@/components/ui';

<View style={{ flexDirection: 'row', gap: 10 }}>
  <ColorSwatch color="#4d7c6b" label="Sage" />
  <ColorSwatch color="#D08BA0" label="Rose" />
</View>
```

#### Section Header
```tsx
import { SectionHeader } from '@/components/ui';

<SectionHeader 
  title="Display Settings"
  action={<Button label="Reset" onPress={resetSettings} />}
/>
```

#### Button Group
```tsx
import { ButtonGroup } from '@/components/ui';

<ButtonGroup
  buttons={[
    { label: 'Save', onPress: handleSave },
    { label: 'Cancel', onPress: handleCancel, variant: 'ghost' }
  ]}
  direction="row"
/>
```

### 4. Use Theme Animations

```tsx
import { useFadeIn, useCardPressAnimation } from '@/hooks/useThemeAnimation';
import Animated from 'react-native-reanimated';

function MyComponent() {
  const fadeInStyle = useFadeIn(100);
  const { animatedStyle, handlePressIn, handlePressOut } = useCardPressAnimation();

  return (
    <Animated.View style={fadeInStyle}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={animatedStyle}>
          {/* Content */}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
```

## 🎨 Using Enhanced Themes

### Available Theme Variants

```tsx
type ThemeVariant = 'sage' | 'rose' | 'navy' | 'sand';

// Each has:
// - Calming color palette
// - Good contrast for accessibility
// - Works in both light and dark modes
// - Emoji indicator for quick recognition
```

### Accessing Theme Info

```tsx
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { 
    theme,           // Current theme colors
    colors,          // Compatibility colors
    paletteMode,     // 'nuit' | 'jour'
    themeVariant,    // 'sage' | 'rose' | 'navy' | 'sand'
    themeStyle,      // 'default' | 'photo' | 'classic'
    toggleTheme,     // async () => void
    setThemeVariant, // async (variant) => void
  } = useTheme();

  return (
    <View style={{ backgroundColor: theme.bgCard }}>
      {/* Uses current theme colors */}
    </View>
  );
}
```

## 📊 Component Export Reference

### From `ui.tsx`
```tsx
export {
  Page,           // Full page wrapper with safe area
  Card,           // Theme-aware card container
  Heading,        // Section heading with eyebrow
  Button,         // Themed button with variants
  Input,          // Text input with validation
  Segment,        // Tab-like selector
  Chip,           // Pill-shaped buttons
  StatPill,       // Stats display
  EmptyState,     // Empty state placeholder
  EntryCard,      // List item card
  Toggle,         // NEW: Switch component
  ColorSwatch,    // NEW: Color display
  SectionHeader,  // NEW: Section title with action
  ButtonGroup,    // NEW: Button grouping
}
```

### From `ThemeCustomizer.tsx`
```tsx
export {
  ThemeVariantGrid,    // Grid of theme options
  ThemePreview,        // Live theme preview
  HexColorInput,       // Hex color input
  ThemeSurfaceSelector,// Surface style selector
}
```

### From hooks
```tsx
export {
  useThemeTransition,   // Color transition animation
  useCardPressAnimation, // Press feedback animation
  useFadeIn,            // Entrance animation
  usePulseAnimation,    // Pulse animation
}
```

## 🎯 Common Patterns

### Create a Settings Card
```tsx
<Card>
  <SectionHeader title="Display" />
  <Segment value={mode} onChange={setMode} options={modes} />
  <HexColorInput 
    label="Primary Color" 
    value={color} 
    onChange={setColor}
  />
  <ColorSwatch color={color} label="Preview" />
  <ButtonGroup 
    buttons={[
      { label: 'Apply', onPress: applySettings },
      { label: 'Reset', onPress: resetSettings, variant: 'ghost' }
    ]}
  />
</Card>
```

### Quick Theme Toggle
```tsx
<Pressable
  onPress={toggleTheme}
  style={{
    backgroundColor: theme.bgCard,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  }}
>
  <Text style={{ color: theme.textPrimary, flex: 1 }}>
    {paletteMode === 'nuit' ? '🌙' : '☀️'} Theme
  </Text>
  <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: theme.accent }} />
</Pressable>
```

## 📱 Responsive Breakpoints

The ThemeVariantGrid automatically adapts to screen size:
- **Mobile** (< 600px): 1 column
- **Tablet** (600px - 900px): 2 columns  
- **Desktop** (≥ 900px): 4 columns

## ✨ Best Practices

1. **Use ThemeQuickSettings** for profile screens
2. **Link to settings-theme** for full customization
3. **Remember to export** new components from ui.tsx if adding more
4. **Test** custom colors in both light and dark modes
5. **Use emojis** for quick visual recognition of themes
6. **Maintain spacing** with theme.spacing constants
7. **Respect contrast** when creating custom themes

## 🔗 Files Overview

| File | Purpose |
|------|---------|
| `theme.ts` | Theme definitions & tokens |
| `ThemeContext.tsx` | Theme state management |
| `components/ui.tsx` | Base UI components |
| `components/ThemeCustomizer.tsx` | Theme customization UI |
| `components/ThemeQuickSettings.tsx` | Quick access widget |
| `hooks/useThemeAnimation.ts` | Smooth animations |
| `app/(app)/(tabs)/settings-theme.tsx` | Full settings screen |
