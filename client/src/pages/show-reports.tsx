import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BatchSendModal } from "@/components/batch-send-modal";

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
  const [batchSendOpen, setBatchSendOpen] = useState(false);

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

  const { data: reportTypes = [], isLoading: reportTypesLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId && isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - serves cached data instantly
  });

  const { data: templatesV2 = [], isLoading: templatesLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates-v2`],
    enabled: !!projectId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalTemplateSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
    enabled: !!projectId && isAuthenticated,
  });

  if (isLoading || projectsLoading || reportTypesLoading || templatesLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  // Get report type name from fetched report types
  const currentReportType = Array.isArray(reportTypes) 
    ? reportTypes.find((rt: any) => rt.slug === reportType)
    : null;
  
  // Get v2 template that matches this report type
  const currentTemplate = Array.isArray(templatesV2) && currentReportType
    ? templatesV2.find((t: any) => t.reportTypeId === currentReportType.id)
    : null;
  
  // Filter reports by the canonical report type slug
  // Use the resolved currentReportType slug if available, otherwise fall back to URL parameter
  const canonicalSlug = currentReportType?.slug || reportType;
  const reports = Array.isArray(allReports) 
    ? allReports.filter((report: any) => report.type === canonicalSlug) 
    : [];
  
  // Helper function to format slug to title case
  const formatSlugToTitle = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Page title = Report Type category name (e.g., "Meeting Reports")
  // Use formatted URL slug as optimistic value, update when data loads
  const pageTitle = currentReportType?.name || formatSlugToTitle(reportType || "Reports");
  
  // Template name for individual reports (e.g., "Production Meeting Report")
  const templateName = currentTemplate?.name || currentReportType?.name || "Report";

  return (
    <div className="w-full">
      {/* Header with title - shown on all devices */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          
          <div className="flex items-center gap-2">
            {reports.length > 0 && (
              <Button variant="outline" onClick={() => setBatchSendOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send Reports
              </Button>
            )}
            <Button onClick={() => {
              const url = currentTemplate 
                ? `/shows/${projectId}/reports/${reportType}/builder?template=${currentTemplate.id}`
                : `/shows/${projectId}/reports/${reportType}/builder`;
              setLocation(url);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {reportsLoading ? (
          <div>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No {pageTitle.toLowerCase()} created yet.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {reports.map((report: any) => {
              // Get the specific template for this report
              const reportTemplate = Array.isArray(templatesV2) 
                ? templatesV2.find((t: any) => t.id === report.templateId)
                : null;
              const reportTemplateName = reportTemplate?.name || currentTemplate?.name || currentReportType?.name || "Report";
              
              return (
                <div 
                  key={report.id} 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${report.id}`)}
                  data-testid={`report-item-${report.id}`}
                >
                  <h3 className="text-lg font-medium text-gray-900" data-testid={`report-title-${report.id}`}>
                    {reportTemplateName} - {project.name} - {new Date(report.date || report.createdAt).toLocaleDateString()}
                  </h3>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {currentReportType && (
        <BatchSendModal
          isOpen={batchSendOpen}
          onClose={() => setBatchSendOpen(false)}
          projectId={parseInt(projectId || '0')}
          reportTypeId={currentReportType.id}
          reportTypeSlug={canonicalSlug}
          reports={reports}
          project={project}
          templates={Array.isArray(templatesV2) ? templatesV2 : []}
          globalTemplateSettings={globalTemplateSettings}
        />
      )}
    </div>
  );
}