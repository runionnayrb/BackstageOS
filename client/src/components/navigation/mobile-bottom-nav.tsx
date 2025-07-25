import { useState } from "react";
import { FolderOpen, Mail, MessageCircle, MoreHorizontal, Calendar, Package, Users, FileText, Settings, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/admin";
import { useFeatureSettings } from "@/hooks/useFeatureSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GmailEmailComposer } from "@/components/email/gmail-email-composer";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  
  // Get unread email count for badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/email/unread-count'],
    refetchInterval: 600000, // Refresh every 10 minutes (cost reduction)
    select: (data: any) => data?.count || 0,
  });

  // Get email accounts for composer
  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: location.startsWith('/email'),
  });

  // Parse current show ID from URL
  const currentShowId = location.match(/\/shows\/(\d+)/)?.[1];
  
  // Get feature settings for the current show
  const { isFeatureEnabled, isEmailEnabled } = useFeatureSettings(currentShowId);
  
  // Fixed navigation items (conditionally visible based on feature settings)
  const fixedNavItems: NavItem[] = [
    {
      id: 'shows',
      label: 'Shows',
      icon: FolderOpen,
      href: '/',
    },
    // Only show email if enabled globally or if email features are enabled for the current show
    ...((!currentShowId || isEmailEnabled()) ? [{
      id: 'email',
      label: 'Email',
      icon: Mail,
      href: '/email',
      badge: unreadCount > 0 ? unreadCount : undefined,
    }] : []),
    // Only show chat if enabled globally or if chat is enabled for the current show
    ...((!currentShowId || isFeatureEnabled('chat')) ? [{
      id: 'chat',
      label: 'Chat',
      icon: MessageCircle,
      href: '/chat',
    }] : []),
  ];

  // Get contextual menu items based on current location
  const getContextualMenuItems = (): MenuItem[] => {
    if (currentShowId) {
      // In a show context - show production tools based on feature settings
      const menuItems: MenuItem[] = [];
      
      if (isFeatureEnabled('reports')) {
        menuItems.push({ label: 'Reports', href: `/shows/${currentShowId}/reports`, icon: FileText });
      }
      if (isFeatureEnabled('calendar')) {
        menuItems.push({ label: 'Calendar', href: `/shows/${currentShowId}/calendar`, icon: Calendar });
      }
      if (isFeatureEnabled('script')) {
        menuItems.push({ label: 'Script', href: `/shows/${currentShowId}/script`, icon: FileText });
      }
      if (isFeatureEnabled('props')) {
        menuItems.push({ label: 'Props', href: `/shows/${currentShowId}/props`, icon: Package });
      }
      if (isFeatureEnabled('contacts')) {
        menuItems.push({ label: 'Contacts', href: `/shows/${currentShowId}/contacts`, icon: Users });
      }
      
      // Settings always available
      menuItems.push({ label: 'Show Settings', href: `/shows/${currentShowId}/settings`, icon: Settings });
      
      return menuItems;
    } else {
      // Global context - show general tools
      const generalItems: MenuItem[] = [
        { label: 'Profile', href: '/profile', icon: Settings },
      ];
      
      // Only show Admin option if user is an admin
      if (isAdmin(user)) {
        generalItems.push({ label: 'Admin', href: '/admin', icon: Settings });
      }
      
      return generalItems;
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/' || (location.startsWith('/shows') && !location.includes('/email') && !location.includes('/chat'));
    }
    return location.startsWith(href);
  };

  const contextualMenuItems = getContextualMenuItems();
  const isInEmailTab = location.startsWith('/email');
  const primaryEmailAccount = emailAccounts && emailAccounts.length > 0 ? emailAccounts[0] : null;

  return (
    <>
      {/* Bottom navigation - only visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 pwa-footer-nav">
        <div className="flex items-center justify-around py-2">
          {/* Fixed navigation items */}
          {fixedNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link key={item.id} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-4 min-w-[60px] transition-colors relative",
                    active 
                      ? "text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                </button>
              </Link>
            );
          })}
          
          {/* Fourth button - Compose in email context, More menu in other contexts */}
          {isInEmailTab && primaryEmailAccount ? (
            <button
              onClick={() => setShowEmailComposer(true)}
              className="flex flex-col items-center justify-center py-2 px-4 min-w-[60px] transition-colors text-gray-500 hover:text-gray-700"
            >
              <Edit className="h-6 w-6" strokeWidth={1.5} />
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center py-2 px-4 min-w-[60px] transition-colors text-gray-500 hover:text-gray-700"
                >
                  <MoreHorizontal className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 mb-2">
                {contextualMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={index} href={item.href}>
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Email Composer Modal */}
      {primaryEmailAccount && (
        <GmailEmailComposer
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          fromAccountId={primaryEmailAccount.id}
          fromEmail={primaryEmailAccount.emailAddress}
          composeMode="compose"
          projectId={currentShowId ? parseInt(currentShowId) : undefined}
        />
      )}
      
      {/* Spacer to prevent content from being hidden behind bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </>
  );
}