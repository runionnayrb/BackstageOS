import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, Calendar, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DailyCallsListParams {
  id: string;
}

export default function DailyCallsList() {
  const [, setLocation] = useLocation();
  const params = useParams<DailyCallsListParams>();
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Fetch all daily calls for this project
  const { data: dailyCalls, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'daily-calls-list'],
  });

  if (isLoading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading daily calls...</p>
        </div>
      </div>
    );
  }

  const handleNewCall = () => {
    const today = new Date().toISOString().split('T')[0];
    setLocation(`/shows/${projectId}/calls/${today}?edit=true`);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}`)}
              className="text-gray-600 hover:text-gray-900 mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to {project?.name}
            </Button>
            <h1 className="text-3xl font-bold">Daily Calls</h1>
            <p className="text-gray-500 mt-2">View and manage daily call sheets</p>
          </div>
          <Button onClick={handleNewCall} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Call
          </Button>
        </div>

        {!dailyCalls || dailyCalls.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No daily calls yet</h3>
            <p className="text-gray-500 mb-6">Create your first daily call sheet for {project?.name}</p>
            <Button onClick={handleNewCall} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create First Call
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Daily Call Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {dailyCalls.map((call: any) => (
                  <div 
                    key={call.id} 
                    className="cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => setLocation(`/shows/${projectId}/calls/${call.date}`)}
                  >
                    <h3 className="text-xl font-medium text-gray-900">
                      {format(parseISO(call.date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Daily Call Sheet
                      {call.updatedAt && ` • Updated ${format(parseISO(call.updatedAt), 'MMM d, h:mm a')}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}