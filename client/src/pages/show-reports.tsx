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
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {project.name}
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
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first {reportTypeName.toLowerCase().slice(0, -1)} to get started.
              </p>
              <Button onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div 
                key={report.id} 
                className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
                onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${report.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(report.date || report.createdAt).toLocaleDateString()}
                    </p>
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