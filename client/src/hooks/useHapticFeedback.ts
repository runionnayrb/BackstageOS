import { useCallback } from 'react';

export function useHapticFeedback() {
  const triggerImpact = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      // Fallback for browsers that support vibration API
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[style]);
    }
    
    // For iOS devices with haptic feedback
    if ('navigator' in window && 'userAgent' in navigator) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && 'DeviceMotionEvent' in window) {
        // Trigger iOS haptic feedback if available
        try {
          // This is a workaround for iOS haptic feedback
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAi2DQAK1VgLxLB'); 
          audio.volume = 0.01;
          audio.play().catch(() => {});
        } catch (e) {
          // Silently fail if audio doesn't work
        }
      }
    }
  }, []);

  const triggerSelection = useCallback(() => {
    triggerImpact('light');
  }, [triggerImpact]);

  const triggerNotification = useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
    const intensities = {
      success: 'light' as const,
      warning: 'medium' as const,
      error: 'heavy' as const
    };
    triggerImpact(intensities[type]);
  }, [triggerImpact]);

  return {
    triggerImpact,
    triggerSelection,
    triggerNotification
  };
}