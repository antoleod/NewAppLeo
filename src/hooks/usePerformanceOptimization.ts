import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  transitionTime: number;
}

export const usePerformanceOptimization = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    transitionTime: 0,
  });

  const startTimeRef = useRef<number>(0);

  const startPerformanceTimer = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const endPerformanceTimer = useCallback((operation: keyof PerformanceMetrics) => {
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;
    metricsRef.current[operation] = duration;
    
    // Log performance warnings
    if (duration > 100) {
      console.warn(`Slow ${operation}: ${duration}ms`);
    }
  }, []);

  const prefetchData = useCallback(async (dataFetchers: Array<() => Promise<any>>) => {
    try {
      // Prefetch data in parallel with timeout
      const results = await Promise.allSettled(
        dataFetchers.map(fetcher => 
          Promise.race([
            fetcher(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 2000)
            )
          ])
        )
      );
      
      return results;
    } catch (error) {
      console.warn('Prefetch failed:', error);
      return [];
    }
  }, []);

  const debounceRender = useCallback((fn: Function, delay: number = 16) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }, []);

  // Cleanup unused resources
  useEffect(() => {
    const handleAppStateChange = (state: string) => {
      if (state === 'background') {
        // Clear caches and reduce memory usage
        if ('gc' in global && typeof global.gc === 'function') {
          global.gc();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return {
    metrics: metricsRef.current,
    startPerformanceTimer,
    endPerformanceTimer,
    prefetchData,
    debounceRender,
  };
};
