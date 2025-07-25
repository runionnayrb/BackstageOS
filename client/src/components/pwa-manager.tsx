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
      toast({
        title: "Back online",
        description: "Your data will sync automatically.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Don't worry - you can still use BackstageOS. Changes will sync when you're back online.",
        variant: "destructive",
      });
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
        // Force registration update by adding timestamp
        const registration = await navigator.serviceWorker.register('/sw.js?v=' + Date.now());
        
        console.log('[PWA] Service Worker registered successfully');
        
        // Force immediate update check
        await registration.update();

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
                toast({
                  title: "Dynamic Island Update Available!",
                  description: "New PWA features are ready to install.",
                  action: (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleUpdate}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Now'
                      )}
                    </Button>
                  ),
                });
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_COMPLETE') {
            toast({
              title: "Data synced",
              description: `${event.data.data.reportsCount} reports synchronized.`,
            });
          }
          
          if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
            console.log('[PWA] New version message received:', event.data.version);
            setHasUpdate(true);
            toast({
              title: "Dynamic Island Update v" + event.data.version,
              description: "PWA features have been updated!",
              action: (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUpdate}
                >
                  Update Now
                </Button>
              ),
            });
          }
          
          if (event.data?.type === 'FORCE_RELOAD') {
            console.log('[PWA] NUCLEAR: Force reload triggered by service worker');
            toast({
              title: "NUCLEAR UPDATE v" + event.data.version,
              description: event.data.message,
            });
            // Force immediate reload with cache busting
            setTimeout(() => {
              window.location.href = window.location.href + '?nuclear=' + Date.now();
            }, 1000);
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
        toast({
          title: "BackstageOS installed!",
          description: "You can now access BackstageOS from your home screen.",
        });
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
          toast({
            title: "BackstageOS installed!",
            description: "You can now access BackstageOS from your home screen.",
          });
        }}
        onDismiss={() => {
          console.log('[PWA] Install banner dismissed');
        }}
      />

      {/* Offline Indicator */}
      <div className="fixed top-4 right-4 z-50">
        {!isOnline && (
          <div className="bg-yellow-500 text-yellow-50 px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
          </div>
        )}
        
        {isOnline && hasUpdate && (
          <div className="bg-blue-500 text-blue-50 px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>Update available</span>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="ml-2 h-6 px-2 text-xs"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </div>
        )}
      </div>
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