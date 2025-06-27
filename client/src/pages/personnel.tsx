import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PersonnelParams {
  id: string;
}

export default function Personnel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PersonnelParams>();
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const isFreelance = user?.profileType === 'freelance';

  const sections = [
    {
      title: isFreelance ? "Team List" : "Cast List",
      description: isFreelance ? "Team member contact information and roles" : "Cast member contact information and roles",
      href: `/shows/${projectId}/personnel/list`,
    },
    {
      title: "Characters", 
      description: "Character breakdowns with scene appearances and requirements",
      href: `/shows/${projectId}/characters`,
    },
  ];

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {(project as any)?.name}
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Personnel</h1>
          <p className="text-gray-500 mt-2">
            {isFreelance ? "Manage team members and character information" : "Manage cast members and character information"}
          </p>
        </div>

        <div className="space-y-1">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setLocation(section.href)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}