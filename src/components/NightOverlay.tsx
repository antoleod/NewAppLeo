import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getAppSettings } from '@/lib/storage';

function isNightWindow(date: Date) {
  const hour = date.getHours();
  return hour >= 0 && hour < 5;
}

export function NightOverlay() {
  const [visible, setVisible] = useState(() => isNightWindow(new Date()));

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const settings = await getAppSettings();
      if (!mounted) return;
      setVisible(isNightWindow(new Date()) || settings.redNightMode);
    };
    void update();
    const timer = setInterval(update, 60_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  if (!visible) return null;

  return <View pointerEvents="none" style={styles.overlay} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 0, 0, 0.08)',
  },
});
