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
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const sections = [
    {
      title: "Props Tracker",
      description: "Scene/character organization with status tracking and sourcing notes",
      href: `/shows/${projectId}/props`,
    },
    {
      title: "Costume Tracker", 
      description: "Quick-change timing, repair tracking, character-based organization",
      href: `/shows/${projectId}/costumes`,
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
          <h1 className="text-3xl font-bold">Props & Costumes</h1>
          <p className="text-gray-500 mt-2">
            Manage props and costume tracking for your production
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setLocation(section.href)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                </div>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}