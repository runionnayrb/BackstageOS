import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const categories = [
    {
      title: "Cast",
      description: "Actors and performers",
      href: `/shows/${projectId}/contacts/cast`,
    },
    {
      title: "Crew",
      description: "Technical and production crew",
      href: `/shows/${projectId}/contacts/crew`,
    },
    {
      title: "Stage Management",
      description: "Stage managers and assistants",
      href: `/shows/${projectId}/contacts/stage_management`,
    },
    {
      title: "Creative Team",
      description: "Directors, designers, and creative staff",
      href: `/shows/${projectId}/contacts/creative_team`,
    },
    {
      title: "Theater Staff",
      description: "House management and venue staff",
      href: `/shows/${projectId}/contacts/theater_staff`,
    },
  ];

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
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
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-gray-500 mt-2">
            Manage contact information by category
          </p>
        </div>

        <div className="space-y-1">
          {categories.map((category) => (
            <div
              key={category.title}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setLocation(category.href)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}