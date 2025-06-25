import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Edit3, FileText, Download } from "lucide-react";
import { useState } from "react";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/reports"],
  });

  const getReportIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "rehearsal": return <FileText className={`${iconClass} text-blue-600`} />;
      case "tech": return <FileText className={`${iconClass} text-green-600`} />;
      case "performance": return <FileText className={`${iconClass} text-purple-600`} />;
      case "meeting": return <FileText className={`${iconClass} text-orange-600`} />;
      default: return <FileText className={`${iconClass} text-gray-600`} />;
    }
  };

  const getReportBg = (type: string) => {
    switch (type) {
      case "rehearsal": return "bg-blue-100";
      case "tech": return "bg-green-100";
      case "performance": return "bg-purple-100";
      case "meeting": return "bg-orange-100";
      default: return "bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-500";
      case "draft": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTitle = (title: string) => {
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports</h2>
          <p className="text-gray-600">View and manage all production reports</p>
        </div>
        <Button onClick={() => setLocation("/report-builder")}>
          <Edit3 className="w-5 h-5 mr-2" />
          Create Report
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Report Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Report Types</SelectItem>
                  <SelectItem value="rehearsal">Rehearsal Reports</SelectItem>
                  <SelectItem value="tech">Tech Reports</SelectItem>
                  <SelectItem value="performance">Performance Reports</SelectItem>
                  <SelectItem value="meeting">Production Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-500 mb-6">Start documenting your productions by creating reports</p>
              <Button onClick={() => setLocation("/report-builder")}>
                <Edit3 className="w-5 h-5 mr-2" />
                Create First Report
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((report: any) => (
                <div key={report.id} className="py-4 flex items-center justify-between hover:bg-gray-50 rounded px-2">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 ${getReportBg(report.type)} rounded-lg`}>
                      {getReportIcon(report.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{report.title}</p>
                      <p className="text-sm text-gray-500">
                        {formatTitle(report.type)} Report • {formatDate(report.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      className={`${getStatusColor(report.status)} text-white`}
                    >
                      {formatTitle(report.status)}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
