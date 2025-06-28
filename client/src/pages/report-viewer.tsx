import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Download, Share, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReportViewerParams {
  id: string;
  type: string;
  reportId: string;
}

export default function ReportViewer() {
  const [, setLocation] = useLocation();
  const params = useParams<ReportViewerParams>();
  const projectId = parseInt(params.id!);
  const reportType = params.type!;
  const reportId = parseInt(params.reportId!);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: report } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${projectId}/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports`] });
      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully.",
      });
      setLocation(`/shows/${projectId}/reports/${reportType}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!project || !report) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const reportTypeNames: Record<string, string> = {
    rehearsal: "Rehearsal Report",
    tech: "Tech Report",
    performance: "Performance Report",
    meeting: "Meeting Report"
  };

  const reportTypeName = reportTypeNames[reportType] || "Report";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {reportTypeName}s
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
              <p className="text-gray-600">{project.name} - {new Date(report.date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}/${reportId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Report Document */}
        <Card className="min-h-[600px]">
          <CardContent className="p-8">
            {/* Print-style Document View */}
            <div className="bg-white min-h-[500px] shadow-lg border border-gray-200" style={{ 
              width: "8.5in", 
              margin: "0 auto",
              padding: "1in",
              fontFamily: "Arial, sans-serif"
            }}>
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b">
                <div className="text-lg font-semibold">
                  {report.title}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {project.name} - {new Date(report.date).toLocaleDateString()}
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-6">
                {renderReportContent(report)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Report</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{report?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteDialog(false);
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function renderReportContent(report: any) {
  const content = report.content || {};

  return (
    <>
      {/* Summary */}
      {content.summary && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Summary</div>
          <div className="text-sm whitespace-pre-wrap">{content.summary}</div>
        </div>
      )}

      {/* Report Type Specific Fields */}
      {report.type === 'rehearsal' && (
        <>
          {(content.startTime || content.endTime) && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {content.startTime && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Start Time</div>
                  <div className="text-sm">{content.startTime}</div>
                </div>
              )}
              {content.endTime && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">End Time</div>
                  <div className="text-sm">{content.endTime}</div>
                </div>
              )}
            </div>
          )}
          
          {content.scenesRehearsed && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Scenes Rehearsed</div>
              <div className="text-sm">{content.scenesRehearsed}</div>
            </div>
          )}
          
          {content.notes && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Notes</div>
              <div className="text-sm whitespace-pre-wrap">{content.notes}</div>
            </div>
          )}
          
          {content.nextRehearsal && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Rehearsal</div>
              <div className="text-sm whitespace-pre-wrap">{content.nextRehearsal}</div>
            </div>
          )}
        </>
      )}

      {report.type === 'performance' && (
        <>
          {(content.showTime || content.houseCount || content.houseCapacity) && (
            <div className="grid grid-cols-3 gap-6 mb-6">
              {content.showTime && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Show Time</div>
                  <div className="text-sm">{content.showTime}</div>
                </div>
              )}
              {content.houseCount && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">House Count</div>
                  <div className="text-sm">{content.houseCount}</div>
                </div>
              )}
              {content.houseCapacity && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">House Capacity</div>
                  <div className="text-sm">{content.houseCapacity}</div>
                </div>
              )}
            </div>
          )}
          
          {content.performanceNotes && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Performance Notes</div>
              <div className="text-sm whitespace-pre-wrap">{content.performanceNotes}</div>
            </div>
          )}
          
          {content.issues && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Issues/Incidents</div>
              <div className="text-sm whitespace-pre-wrap">{content.issues}</div>
            </div>
          )}
        </>
      )}

      {report.type === 'tech' && (
        <>
          {(content.techFocus || content.completionStatus) && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {content.techFocus && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Tech Focus</div>
                  <div className="text-sm">{content.techFocus}</div>
                </div>
              )}
              {content.completionStatus && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
                  <div className="text-sm">{content.completionStatus}</div>
                </div>
              )}
            </div>
          )}
          
          {content.technicalIssues && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Technical Issues</div>
              <div className="text-sm whitespace-pre-wrap">{content.technicalIssues}</div>
            </div>
          )}
          
          {content.nextSessionGoals && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
              <div className="text-sm whitespace-pre-wrap">{content.nextSessionGoals}</div>
            </div>
          )}
        </>
      )}

      {report.type === 'meeting' && (
        <>
          {(content.meetingType || content.attendees) && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {content.meetingType && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Meeting Type</div>
                  <div className="text-sm">{content.meetingType}</div>
                </div>
              )}
              {content.attendees && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Attendees</div>
                  <div className="text-sm">{content.attendees}</div>
                </div>
              )}
            </div>
          )}
          
          {content.agendaItems && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Agenda Items</div>
              <div className="text-sm whitespace-pre-wrap">{content.agendaItems}</div>
            </div>
          )}
          
          {content.actionItems && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Action Items</div>
              <div className="text-sm whitespace-pre-wrap">{content.actionItems}</div>
            </div>
          )}
          
          {content.nextMeeting && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Meeting</div>
              <div className="text-sm">{new Date(content.nextMeeting).toLocaleString()}</div>
            </div>
          )}
        </>
      )}

      {/* Custom Fields */}
      {Object.keys(content).map(key => {
        if (['summary', 'startTime', 'endTime', 'scenesRehearsed', 'notes', 'nextRehearsal',
             'showTime', 'houseCount', 'houseCapacity', 'performanceNotes', 'issues',
             'techFocus', 'completionStatus', 'technicalIssues', 'nextSessionGoals',
             'meetingType', 'attendees', 'agendaItems', 'actionItems', 'nextMeeting'].includes(key)) {
          return null;
        }
        
        const value = content[key];
        if (!value) return null;
        
        return (
          <div key={key} className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
            </div>
          </div>
        );
      })}
    </>
  );
}