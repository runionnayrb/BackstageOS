import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import ContextAwareBackButton from "@/components/navigation/context-aware-back-button";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShowReportsParams {
  id: string;
  type: string;
}

export default function ShowReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ShowReportsParams>();
  const projectId = params.id;
  const reportType = params.type;
  const isMobile = useIsMobile();

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

  const { data: allReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/reports`],
    enabled: !!projectId && isAuthenticated,
  });

  const { data: reportTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId && isAuthenticated,
  });

  // Filter reports by type
  const reports = Array.isArray(allReports) ? allReports.filter((report: any) => report.type === reportType) : [];

  if (isLoading || projectsLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  // Get report type name from fetched report types
  const currentReportType = Array.isArray(reportTypes) 
    ? reportTypes.find((rt: any) => rt.slug === reportType)
    : null;
  
  const reportTypeName = currentReportType 
    ? `${currentReportType.name} Reports`
    : "Reports";

  return (
    <div className="w-full">
      {/* Mobile: Only show buttons container with minimal padding */}
      {isMobile && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <ContextAwareBackButton 
              showName={project?.name}
            />
            
            <Button onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/builder`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      )}

      {/* Desktop: Full header with title */}
      {!isMobile && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <ContextAwareBackButton 
              showName={project?.name}
            />
            
            <Button onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/builder`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
          
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{reportTypeName}</h1>
            <p className="text-gray-600 mt-1">{project.name}</p>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8">
        {reportsLoading ? (
          <div>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No {reportTypeName.toLowerCase()} created yet.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {reports.map((report: any) => (
              <div 
                key={report.id} 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${report.id}`)}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {report.title} - {project.name} - {new Date(report.date || report.createdAt).toLocaleDateString()}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}