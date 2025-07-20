import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PropsAndCostumesParams {
  id: string;
}

export default function PropsAndCostumes() {
  const [, setLocation] = useLocation();
  const params = useParams<PropsAndCostumesParams>();
  const projectSlug = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectSlug}`],
  });

  const sections = [
    {
      title: "Props Tracker",
      description: "Scene/character organization with status tracking and sourcing notes",
      href: `/shows/${projectSlug}/props`,
    },
    {
      title: "Costume Tracker", 
      description: "Quick-change timing, repair tracking, character-based organization",
      href: `/shows/${projectSlug}/costumes`,
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
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {(project as any)?.name}
          </Button>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Props & Costumes</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-1">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setLocation(section.href)}
            >
              <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}