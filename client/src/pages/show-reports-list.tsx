import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";

interface ShowReportsListParams {
  id: string;
}

export default function ShowReportsList() {
  const [, setLocation] = useLocation();
  const params = useParams<ShowReportsListParams>();
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const reportTypes = [
    {
      type: "rehearsal",
      name: "Rehearsal Reports",
      description: "Daily rehearsal progress and notes"
    },
    {
      type: "tech",
      name: "Tech Reports", 
      description: "Technical rehearsal and equipment status"
    },
    {
      type: "performance",
      name: "Performance Reports",
      description: "Show performance notes and issues"
    },
    {
      type: "meeting",
      name: "Meeting Reports",
      description: "Production meeting minutes and decisions"
    }
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/templates`)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Template Settings
          </Button>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-1">
          {reportTypes.map((reportType) => (
            <div
              key={reportType.type}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType.type}`)}
            >
              <h3 className="text-lg font-medium text-gray-900">{reportType.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}