import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorNotification } from '@shared/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ErrorNotificationsProps {
  userId?: string;
}

export function ErrorNotifications({ userId }: ErrorNotificationsProps) {
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<number>>(new Set());

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/error-notifications', userId],
    queryFn: async () => {
      const response = await fetch(`/api/error-notifications${userId ? `?userId=${userId}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 30000, // Check every 30 seconds for new notifications
    enabled: !!userId
  });

  const activeNotifications = notifications.filter(
    (notification: ErrorNotification) => 
      !dismissedNotifications.has(notification.id) && 
      !notification.isRead
  );

  const handleDismiss = async (notificationId: number) => {
    try {
      await fetch(`/api/error-notifications/${notificationId}/dismiss`, {
        method: 'POST'
      });
      setDismissedNotifications(prev => new Set(prev).add(notificationId));
      toast({
        title: "Notification dismissed",
        description: "You won't see this notification again.",
      });
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'resolved':
        return 'default';
      default:
        return 'default';
    }
  };

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {activeNotifications.map((notification: ErrorNotification) => (
        <Alert 
          key={notification.id} 
          variant={getAlertVariant(notification.notificationType)}
          className="pr-12 shadow-lg border"
        >
          {getIcon(notification.notificationType)}
          <AlertTitle className="flex items-center justify-between">
            {notification.notificationType.charAt(0).toUpperCase() + notification.notificationType.slice(1)} Error
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 absolute top-2 right-2"
              onClick={() => handleDismiss(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            {notification.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}