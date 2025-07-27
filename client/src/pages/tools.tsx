import { Calendar, Users, Package, Settings, User, MessageCircle, BarChart3, FileText } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ToolSection {
  title: string;
  description: string;
  tools: Tool[];
}

interface Tool {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

export default function ToolsPage() {
  const toolSections: ToolSection[] = [
    {
      title: "Production Management",
      description: "Core tools for managing your theater productions",
      tools: [
        {
          name: "Calendar",
          description: "Schedule rehearsals and performances",
          href: "/calendar",
          icon: Calendar,
        },
        {
          name: "Props & Costumes",
          description: "Track props and costume requirements",
          href: "/props-costumes",
          icon: Package,
        },
        {
          name: "Contacts",
          description: "Manage cast and crew information",
          href: "/personnel",
          icon: Users,
        },
      ],
    },
    {
      title: "Reports & Documentation",
      description: "Create and manage production reports",
      tools: [
        {
          name: "Reports",
          description: "Rehearsal, tech, and performance reports",
          href: "/reports",
          icon: FileText,
        },
        {
          name: "Templates",
          description: "Customize report templates",
          href: "/templates",
          icon: Settings,
        },
      ],
    },
    {
      title: "Account & Settings",
      description: "Manage your account and preferences",
      tools: [
        {
          name: "Profile Settings",
          description: "Update your profile and preferences",
          href: "/profile",
          icon: User,
        },
        {
          name: "Admin Dashboard",
          description: "System administration (admin only)",
          href: "/admin",
          icon: BarChart3,
          badge: "Admin",
        },
      ],
    },
    {
      title: "Communication",
      description: "Stay connected with your team",
      tools: [
        {
          name: "Team Chat",
          description: "Real-time messaging with cast and crew",
          href: "/chat",
          icon: MessageCircle,
          badge: "Coming Soon",
          disabled: true,
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="hidden md:block text-3xl font-bold text-gray-900 mb-2">Tools</h1>
        <p className="text-gray-600">
          Access all your theater management tools and features in one place.
        </p>
      </div>

      <div className="space-y-8">
        {toolSections.map((section) => (
          <div key={section.title}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{section.title}</h2>
              <p className="text-sm text-gray-600">{section.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.tools.map((tool) => {
                const Icon = tool.icon;
                
                return (
                  <Card 
                    key={tool.name} 
                    className={`hover:shadow-md transition-shadow ${tool.disabled ? 'opacity-50' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">{tool.name}</CardTitle>
                          </div>
                        </div>
                        {tool.badge && (
                          <Badge 
                            variant={tool.disabled ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {tool.badge}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-gray-600 mb-4">
                        {tool.description}
                      </CardDescription>
                      {tool.disabled ? (
                        <Button disabled className="w-full" variant="secondary">
                          Coming Soon
                        </Button>
                      ) : (
                        <Link href={tool.href}>
                          <Button className="w-full" variant="outline">
                            Open Tool
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}