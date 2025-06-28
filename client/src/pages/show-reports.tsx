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

  const { data: allReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/reports`],
    enabled: !!projectId && isAuthenticated,
  });

  // Filter reports by type
  const reports = Array.isArray(allReports) ? allReports.filter((report: any) => report.type === reportType) : [];

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{reportTypeName}</h1>
              <p className="text-gray-600 mt-1">{project.name}</p>
            </div>
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
          <div className="space-y-8">
            {reports.map((report: any) => (
              <div 
                key={report.id} 
                className="cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${report.id}`)}
              >
                <h3 className="text-xl font-medium text-gray-900">
                  {reportTypeName.slice(0, -1)} - {project.name} - {new Date(report.date || report.createdAt).toLocaleDateString()}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}