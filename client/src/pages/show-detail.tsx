import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  BookOpen, 
  Users, 
  CheckSquare,
  ArrowLeft,
  Plus,
  Settings
} from "lucide-react";

interface ShowDetailParams {
  id: string;
}

export default function ShowDetail() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ShowDetailParams>();
  const projectId = params.id;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });
  
  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  if (isLoading || projectsLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  // Adapt terminology based on profile type
  const isFreelance = user?.profileType === 'freelance';
  const projectLabel = isFreelance ? "Project" : "Production";
  const showLabel = isFreelance ? "Project" : "Show";

  const categories = [
    {
      title: "Reports",
      description: isFreelance ? "Project reports and documentation" : "Show reports and documentation",
      icon: FileText,
      items: [
        { name: "All Reports", href: `/shows/${projectId}/reports` },
      ],
    },
    {
      title: "Calendar",
      description: isFreelance ? "Project schedules and calls" : "Rehearsal schedules and daily calls",
      icon: Calendar,
      items: [
        { name: "Schedule", href: `/shows/${projectId}/calendar/schedule` },
        { name: "Daily Calls", href: `/shows/${projectId}/calendar/calls` },
      ],
    },
    {
      title: "Script",
      description: isFreelance ? "Script and materials" : "Script management and notes",
      icon: BookOpen,
      items: [
        { name: "Script Editor", href: `/shows/${projectId}/script` },
      ],
    },
    {
      title: "Props & Costumes",
      description: isFreelance ? "Project inventory tracking" : "Props and costume management",
      icon: FileText,
      items: [
        { name: "Props Tracker", href: `/shows/${projectId}/props` },
        { name: "Costume Tracker", href: `/shows/${projectId}/costumes` },
      ],
    },
    {
      title: "Cast",
      description: isFreelance ? "Team and character information" : "Cast and character information",
      icon: Users,
      items: [
        { name: isFreelance ? "Team List" : "Cast List", href: `/shows/${projectId}/cast` },
        { name: "Characters", href: `/shows/${projectId}/characters` },
      ],
    },
    {
      title: "Tasks",
      description: isFreelance ? "Project task management" : "Production task tracking",
      icon: CheckSquare,
      items: [
        { name: "List View", href: `/shows/${projectId}/tasks/list` },
        { name: "Board View", href: `/shows/${projectId}/tasks/board` },
      ],
    },
    {
      title: "Settings",
      description: isFreelance ? "Project configuration" : "Show configuration and permissions",
      icon: Settings,
      items: [
        { name: "General Settings", href: `/shows/${projectId}/settings` },
        { name: "Report Templates", href: `/shows/${projectId}/templates` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shows
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground mt-2">{project.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-sm">
              {project.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.title} className="border rounded-lg">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y">
                  {category.items.map((item) => (
                    <div
                      key={item.name}
                      className="p-3 hover:bg-muted/50 transition-colors cursor-pointer flex justify-between items-center"
                      onClick={() => setLocation(item.href)}
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">→</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}