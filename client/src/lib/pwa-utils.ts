// PWA Utility Functions for BackstageOS

export interface PWAInstallationState {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  installPrompt: any | null;
}

export interface PWAUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
}

export interface PWAConnectivityState {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
}

// Check if PWA features are supported
export function isPWASupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'caches' in window &&
    'PushManager' in window
  );
}

// Check if app is currently installed as PWA
export function isPWAInstalled(): boolean {
  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS Safari standalone mode
  if ('standalone' in window.navigator && (window.navigator as any).standalone) {
    return true;
  }
  
  return false;
}

// Get network information
export function getNetworkInfo(): PWAConnectivityState {
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  return {
    isOnline: navigator.onLine,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown'
  };
}

// Check if notifications are supported and permission status
export function getNotificationStatus() {
  if (!('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  
  return {
    supported: true,
    permission: Notification.permission
  };
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
}

// Send a local notification
export function sendNotification(
  title: string, 
  options: NotificationOptions = {}
): Notification | null {
  if ('Notification' in window && Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/uploads/favicon-1751583712399.png',
      badge: '/uploads/favicon-1751583712399.png',
      tag: 'backstageos-notification',
      renotify: false,
      ...options,
    });
  }
  return null;
}

// Cache essential app data for offline use
export async function cacheEssentialData(data: Record<string, any>) {
  if ('caches' in window) {
    try {
      const cache = await caches.open('backstageos-data-v1');
      
      // Cache user data
      if (data.user) {
        await cache.put('/offline/user', new Response(JSON.stringify(data.user)));
      }
      
      // Cache current project data
      if (data.currentProject) {
        await cache.put('/offline/current-project', new Response(JSON.stringify(data.currentProject)));
      }
      
      // Cache recent reports
      if (data.recentReports) {
        await cache.put('/offline/recent-reports', new Response(JSON.stringify(data.recentReports)));
      }
      
      console.log('[PWA] Essential data cached for offline use');
    } catch (error) {
      console.error('[PWA] Failed to cache essential data:', error);
    }
  }
}

// Retrieve cached data when offline
export async function getCachedData(key: string): Promise<any | null> {
  if ('caches' in window) {
    try {
      const cache = await caches.open('backstageos-data-v1');
      const response = await cache.match(`/offline/${key}`);
      
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[PWA] Failed to retrieve cached data:', error);
    }
  }
  return null;
}

// Add to home screen detection for iOS
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if running in iOS Safari
export function isIOSSafari(): boolean {
  return isIOSDevice() && /Safari/.test(navigator.userAgent) && !(window.navigator as any).standalone;
}

// Generate install instructions based on device/browser
export function getInstallInstructions(): string {
  if (isIOSSafari()) {
    return 'Tap the Share button, then "Add to Home Screen"';
  }
  
  if (/Chrome/.test(navigator.userAgent)) {
    return 'Look for the install icon in your address bar, or check the menu for "Install BackstageOS"';
  }
  
  if (/Firefox/.test(navigator.userAgent)) {
    return 'Look for the install icon in your address bar, or check the menu for "Install"';
  }
  
  return 'Look for install options in your browser menu';
}

// Theater-specific PWA utilities
export const theaterPWAUtils = {
  // Send show call notifications
  sendShowCall: (callType: string, showName: string, timeUntil: string) => {
    return sendNotification(`${callType} - ${showName}`, {
      body: `${timeUntil} until ${callType.toLowerCase()}`,
      tag: 'show-call',
      requireInteraction: true,
      actions: [
        { action: 'acknowledge', title: 'Got it' },
        { action: 'snooze', title: 'Remind me in 5 min' }
      ]
    });
  },
  
  // Cache current show data for offline access
  cacheShowData: async (showData: any) => {
    await cacheEssentialData({
      currentProject: showData,
      lastUpdated: new Date().toISOString()
    });
  },
  
  // Check if critical show data is available offline
  hasOfflineShowData: async (): Promise<boolean> => {
    const cachedProject = await getCachedData('current-project');
    return cachedProject !== null;
  },
  
  // Get offline show schedule
  getOfflineSchedule: async () => {
    return await getCachedData('current-project')?.schedule || [];
  }
};

// PWA lifecycle management
export const pwaLifecycle = {
  // Check for app updates
  checkForUpdates: async (): Promise<boolean> => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return registration.waiting !== null;
      }
    }
    return false;
  },
  
  // Apply pending updates
  applyUpdate: async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  },
  
  // Get app version info
  getVersionInfo: async () => {
    // This would typically come from your build process
    return {
      version: '1.0.0', // This should be dynamic
      buildDate: new Date().toISOString(),
      features: ['offline-support', 'push-notifications', 'background-sync']
    };
  }
};