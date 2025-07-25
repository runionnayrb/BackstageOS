import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Share, Plus } from 'lucide-react';
import { isIOSSafari, getInstallInstructions } from '@/lib/pwa-utils';

interface PWAInstallBannerProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSSafari());
    
    // Check if user has already dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    // For iOS Safari, show banner immediately since there's no beforeinstallprompt
    if (isIOSSafari()) {
      setShowBanner(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        onInstall?.();
      }
    } else if (isIOS) {
      // For iOS, we can't programmatically install, just show instructions
      onInstall?.();
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss?.();
  };

  if (!showBanner) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Download className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Install BackstageOS</h3>
              <p className="text-xs text-muted-foreground">
                Access from your home screen
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm">
                <span>1. Tap</span>
                <Share className="h-4 w-4 text-blue-500" />
                <span>share button</span>
              </div>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <span>2. Select</span>
                <Plus className="h-4 w-4 text-blue-500" />
                <span>"Add to Home Screen"</span>
              </div>
            </div>
            <Button 
              onClick={handleInstall} 
              className="w-full"
              size="sm"
            >
              Got it
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleInstall} 
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing PWA install state
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      return outcome === 'accepted';
    }
    return false;
  };

  return {
    canInstall,
    isInstalled,
    install,
    isIOSDevice: isIOSSafari()
  };
}