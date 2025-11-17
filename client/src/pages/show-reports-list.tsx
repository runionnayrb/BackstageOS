import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShowReportsListParams {
  id: string;
}

export default function ShowReportsList() {
  const [, setLocation] = useLocation();
  const params = useParams<ShowReportsListParams>();
  const projectId = params.id;
  const isMobile = useIsMobile();

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Load dynamic report types from API
  const { data: reportTypesData } = useQuery({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId,
  });

  // Use dynamic report types or fallback to defaults
  const reportTypes = reportTypesData && Array.isArray(reportTypesData) && reportTypesData.length > 0
    ? reportTypesData.map((rt: any) => ({
        type: rt.slug,
        name: rt.name,
        description: rt.description || ""
      }))
    : [
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
          type: "meetings",
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
      {/* Desktop Header */}
      {!isMobile && (
        <div className="px-4 sm:px-6 lg:px-8 pt-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setLocation(`/shows/${projectId}/templates`)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Template Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Add minimal top padding */}
      {isMobile && <div className="pt-4"></div>}

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