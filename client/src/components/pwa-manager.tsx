import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PWAInstallBanner } from './pwa-install-banner';

interface PWAManagerProps {
  children?: React.ReactNode;
}

export function PWAManager({ children }: PWAManagerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    // Register service worker
    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for online/offline status
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Standard service worker registration without aggressive cache busting
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('[PWA] Service Worker registered successfully');

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_COMPLETE') {
            console.log('[PWA] Data synced:', event.data.data);
          }
          
          if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
            console.log('[PWA] New version message received:', event.data.version);
            setHasUpdate(true);
          }
          
          if (event.data?.type === 'FORCE_RELOAD') {
            console.log('[PWA] Force reload message received - setting update flag instead of auto-reloading');
            // Set update flag instead of immediately reloading to prevent infinite loops
            setHasUpdate(true);
          }
        });

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    }
  };

  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      setIsUpdating(true);
      console.log('[PWA] Starting force update process');
      
      try {
        // Clear all caches first
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('[PWA] Cleared all caches');
        }
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          // Tell the waiting service worker to skip waiting and become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Force unregister and re-register service worker
        await registration?.unregister();
        console.log('[PWA] Unregistered old service worker');
        
        // Wait a moment then reload with cache busting
        setTimeout(() => {
          window.location.href = window.location.href + '?cache-bust=' + Date.now();
        }, 500);
        
      } catch (error) {
        console.error('[PWA] Update failed:', error);
        // Fallback to hard refresh
        window.location.reload(true);
      } finally {
        setIsUpdating(false);
        setHasUpdate(false);
      }
    }
  };

  return (
    <>
      {children}
      
      {/* PWA Install Banner */}
      <PWAInstallBanner 
        onInstall={() => {
          console.log('[PWA] BackstageOS installed');
        }}
        onDismiss={() => {
          console.log('[PWA] Install banner dismissed');
        }}
      />

      {/* Removed update notifications completely */}
    </>
  );
}

// Hook for PWA features
export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/uploads/favicon-1751583712399.png',
        badge: '/uploads/favicon-1751583712399.png',
        ...options,
      });
    }
  };

  return {
    isOnline,
    isInstalled,
    requestNotificationPermission,
    sendNotification,
  };
}