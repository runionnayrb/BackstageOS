import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlobalTemplateSettingsContent } from "@/components/GlobalTemplateSettingsContent";
import { ArrowLeft } from "lucide-react";

interface GlobalTemplateSettingsParams {
  id: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  venue?: string;
}

export default function GlobalTemplateSettings() {
  const [, setLocation] = useLocation();
  const params = useParams<GlobalTemplateSettingsParams>();
  const projectId = params.id;

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/templates`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Report Templates
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Template Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure default formatting and layout for all report templates
              </p>
            </div>
          </div>
        </div>

        <GlobalTemplateSettingsContent projectId={projectId!} showSaveButton={true} />
      </div>
    </div>
  );
}
