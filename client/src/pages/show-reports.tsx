import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText } from "lucide-react";

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

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "reports", reportType],
    enabled: !!projectId && isAuthenticated,
  });

  if (isLoading || projectsLoading) return <div>Loading...</div>;
  if (!project) return <div>Show not found</div>;

  const reportTypeNames: Record<string, string> = {
    rehearsal: "Rehearsal Reports",
    tech: "Tech Reports", 
    previews: "Preview Reports",
    performance: "Performance Reports",
    meetings: "Production Meeting Reports"
  };

  const reportTypeName = reportTypeNames[reportType || ''] || "Reports";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/reports`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{reportTypeName}</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
          <Button onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        {reportsLoading ? (
          <div>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No {reportTypeName.toLowerCase()} created yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div 
                key={report.id} 
                className="cursor-pointer hover:bg-gray-50 py-2 px-3 rounded transition-colors"
                onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${report.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                      {reportTypeName.slice(0, -1)} - {project.name} - {new Date(report.date || report.createdAt).toLocaleDateString()}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}