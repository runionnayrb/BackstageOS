import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {project?.name}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Calls</h1>
          </div>
          <Button onClick={handleNewCall} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Call
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {!dailyCalls || dailyCalls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No daily calls yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first daily call sheet for {project?.name}
              </p>
              <Button onClick={handleNewCall} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create First Call
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {dailyCalls.map((call: any) => (
              <Card
                key={call.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/shows/${projectId}/calls/${call.date}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(parseISO(call.date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <p className="text-gray-600">
                          {call.eventCount} {call.eventCount === 1 ? 'event' : 'events'} scheduled
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {call.locations?.length} {call.locations?.length === 1 ? 'location' : 'locations'}
                      </p>
                      {call.updatedAt && (
                        <p className="text-xs text-gray-400">
                          Updated {format(parseISO(call.updatedAt), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}