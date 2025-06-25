import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 ml-3 lg:ml-0">
              Backstage OS
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>
            
            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center space-x-3 p-2"
                onClick={() => window.location.href = '/api/logout'}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getInitials(user?.firstName, user?.lastName)}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.firstName || user?.lastName 
                    ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                    : user?.email
                  }
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
