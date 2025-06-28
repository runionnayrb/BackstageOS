import { Settings, Users, LogOut, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/admin";

export default function Header() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
              onClick={() => setLocation("/")}
              className="text-xl font-semibold text-gray-900 p-0 hover:bg-transparent"
            >
              Backstage OS
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Feedback */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/feedback')}
              className="flex items-center space-x-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">Feedback</span>
            </Button>
            

            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 p-2"
                >
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {(user as any)?.firstName || (user as any)?.lastName 
                      ? `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim()
                      : (user as any)?.email
                    }
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                
                {isAdmin(user) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation('/admin')}>
                      <Users className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
