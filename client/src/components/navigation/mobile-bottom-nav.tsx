import { Home, Mail, Wrench, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  
  // Get unread email count for badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/email/unread-count'],
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data: any) => data?.count || 0,
  });

  const navItems: NavItem[] = [
    {
      id: 'shows',
      label: 'Shows',
      icon: Home,
      href: '/',
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      href: '/email',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageCircle,
      href: '/chat',
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Wrench,
      href: '/tools',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/' || (location.startsWith('/shows') && !location.includes('/email'));
    }
    return location.startsWith(href);
  };

  return (
    <>
      {/* Bottom navigation - only visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
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
                    <Icon className={cn("h-5 w-5 mb-1", active && "fill-current")} />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    active && "text-blue-600"
                  )}>
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Spacer to prevent content from being hidden behind bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </>
  );
}