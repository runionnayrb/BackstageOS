import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  FolderOpen,
  FileText,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const isFullTime = user?.profileType === "fulltime";
  const projectLabel = isFullTime ? "Shows" : "Projects";

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/reports"],
  });

  const activeProjects = projects.filter((p: any) => 
    p.status !== "closed"
  ).length;

  const recentProjects = projects.slice(0, 3);
  const recentReports = reports.slice(0, 3);

  const getProjectInitial = (name: string) => name.charAt(0).toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning": return "bg-gray-500";
      case "pre-production": return "bg-blue-500";
      case "rehearsal": return "bg-yellow-500";
      case "tech": return "bg-orange-500";
      case "performance": return "bg-green-500";
      case "closed": return "bg-gray-400";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="hidden md:block text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Overview of your current projects and activities</p>
      </div>



      {/* Recent Activity & Current Projects */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent {projectLabel}</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/projects")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No projects yet</p>
                <Button 
                  className="mt-4"
                  onClick={() => setLocation("/onboarding")}
                >
                  Create Your First {projectLabel.slice(0, -1)}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project: any) => (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/shows/${project.id}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {getProjectInitial(project.name)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(project.status)}`}></span>
                          <p className="text-sm text-gray-500 capitalize">{project.status}</p>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Reports</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/reports")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reports yet</p>
                <Button 
                  className="mt-4"
                  onClick={() => setLocation("/report-builder")}
                >
                  Create Your First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReports.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{report.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{report.type} Report</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
