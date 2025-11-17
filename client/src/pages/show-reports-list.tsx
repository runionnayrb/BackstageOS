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

  // Default report types for first-time visitors (will be replaced by API data)
  const defaultReportTypes = [
    { slug: "meetings", name: "Meeting Reports", description: "Production meeting minutes and decisions" },
    { slug: "rehearsal", name: "Rehearsal Reports", description: "Daily rehearsal progress and notes" },
    { slug: "tech", name: "Tech Reports", description: "Technical rehearsal and equipment status" },
    { slug: "previews", name: "Preview Reports", description: "Preview performance notes" },
    { slug: "performance", name: "Performance Reports", description: "Show performance notes and issues" }
  ];

  // Load dynamic report types from API with optimistic placeholder
  const { data: reportTypesData } = useQuery({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: defaultReportTypes, // Show immediately on first load, gets replaced by cache on subsequent loads
  });

  // Transform API data to display format
  const reportTypes = reportTypesData && Array.isArray(reportTypesData) && reportTypesData.length > 0
    ? reportTypesData.map((rt: any) => ({
        type: rt.slug,
        name: rt.name,
        description: rt.description || ""
      }))
    : [];

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