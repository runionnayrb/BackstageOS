import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderOpen,
  Plus,
  Users,
  UserPlus,
  FileText,
  Edit3,
  Settings,
  Calendar,
  Mail,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const isFullTime = user?.profileType === "fulltime";
  const projectLabel = isFullTime ? "Shows" : "Projects";
  const projectSingle = isFullTime ? "Show" : "Project";

  const navigation = [
    {
      title: "Overview",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
      ],
    },
    {
      title: projectLabel,
      items: [
        { name: `All ${projectLabel}`, href: "/projects", icon: FolderOpen },
        { name: `New ${projectSingle}`, href: "/onboarding", icon: Plus },
      ],
    },
    {
      title: "Team",
      items: [
        { name: "Team Members", href: "/team", icon: Users },
        { name: "Invite Members", href: "/invitations", icon: UserPlus },
      ],
    },
    {
      title: "Communication",
      items: [
        { name: "Email Manager", href: "/email", icon: Mail },
      ],
    },
    {
      title: "Reports",
      items: [
        { name: "All Reports", href: "/reports", icon: FileText },
        { name: "Report Builder", href: "/report-builder", icon: Edit3 },
        { name: "Templates", href: "/templates", icon: FileText },
        { name: "Show Documents", href: "/documents", icon: FileText },
        { name: "Characters", href: "/characters", icon: Users },
        { name: "Schedules", href: "/schedules", icon: FileText },
      ],
    },
  ];

  const handleNavClick = (href: string) => {
    setLocation(href);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex-1 px-3 space-y-1">
              {navigation.map((section) => (
                <div key={section.title} className="mb-8">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {section.title}
                  </h3>
                  <nav className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Button
                          key={item.name}
                          variant="ghost"
                          className={cn(
                            "w-full justify-start",
                            isActive
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          )}
                          onClick={() => handleNavClick(item.href)}
                        >
                          <item.icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
