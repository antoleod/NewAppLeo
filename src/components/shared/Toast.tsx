import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shadow } from '@/lib/shadow';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastInternal extends Required<Pick<ToastOptions, 'message' | 'variant' | 'durationMs'>> {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions | string) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastInternal | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback((options: ToastOptions | string) => {
    const normalized: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const next: ToastInternal = {
      id: ++idRef.current,
      message: normalized.message,
      variant: normalized.variant ?? 'info',
      durationMs: normalized.durationMs ?? 3000,
    };
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(next);
    timerRef.current = setTimeout(() => setToast((current) => (current?.id === next.id ? null : current)), next.durationMs);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (message, durationMs) => show({ message, variant: 'success', durationMs }),
    error: (message, durationMs) => show({ message, variant: 'error', durationMs: durationMs ?? 4000 }),
    info: (message, durationMs) => show({ message, variant: 'info', durationMs }),
    warning: (message, durationMs) => show({ message, variant: 'warning', durationMs }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastHost({ toast, onDismiss }: { toast: ToastInternal | null; onDismiss: () => void }) {
  const { theme } = useTheme();
  if (!toast) return null;

  const tone =
    toast.variant === 'success'
      ? theme.green
      : toast.variant === 'error'
        ? theme.red
        : toast.variant === 'warning'
          ? theme.yellow
          : theme.blue;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.host, { pointerEvents: 'box-none' } as any]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(180)}
        style={styles.wrap}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="alert"
          accessibilityLabel={toast.message}
          style={[
            styles.toast,
            {
              backgroundColor: theme.bgCard,
              borderColor: tone,
              ...shadow(theme.textPrimary, 0.18, 20, 0, 10),
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${tone}22` }]}>
            <Ionicons name={VARIANT_ICON[toast.variant]} size={20} color={tone} />
          </View>
          <Text style={[styles.message, { color: theme.textPrimary }]} numberOfLines={3}>
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 24 : 8,
    zIndex: 9998,
  },
  wrap: {
    width: '100%',
    maxWidth: 480,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});
