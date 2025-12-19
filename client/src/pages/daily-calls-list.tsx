import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronLeft, Plus, Calendar, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, isAfter, isBefore } from "date-fns";

interface DailyCallsListParams {
  id: string;
}

export default function DailyCallsList() {
  const [, setLocation] = useLocation();
  const params = useParams<DailyCallsListParams>();
  const projectId = params.id;
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Fetch show settings to get week start day
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Fetch all daily calls for this project
  const { data: dailyCalls, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'daily-calls-list'],
  });

  const handleNewCall = () => {
    const today = new Date().toISOString().split('T')[0];
    setLocation(`/shows/${projectId}/calls/${today}?edit=true`);
  };

  // Group calls by week and sort
  const groupedCalls = React.useMemo(() => {
    if (!dailyCalls || !showSettings) return {};
    
    // Get week start day from show settings (0 = Sunday, 1 = Monday)
    const weekStartsOn = showSettings.scheduleSettings?.weekStartDay === 'monday' ? 1 : 0;
    
    // Sort calls by date (most recent first)
    const sortedCalls = [...dailyCalls].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const grouped: { [key: string]: any[] } = {};
    const today = new Date();
    
    sortedCalls.forEach(call => {
      const callDate = parseISO(call.date);
      const weekStart = startOfWeek(callDate, { weekStartsOn });
      const weekEnd = endOfWeek(callDate, { weekStartsOn });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push({
        ...call,
        weekStart,
        weekEnd,
        isCurrentWeek: isAfter(today, weekStart) && isBefore(today, weekEnd) || 
                      format(today, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd') ||
                      format(today, 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')
      });
    });
    
    return grouped;
  }, [dailyCalls, showSettings]);

  // Set expanded weeks - current week and future weeks expanded by default
  React.useEffect(() => {
    if (Object.keys(groupedCalls).length > 0) {
      const today = new Date();
      const expandedWeekKeys = new Set<string>();
      
      Object.entries(groupedCalls).forEach(([weekKey, calls]) => {
        const weekStart = calls[0]?.weekStart;
        if (weekStart && (isAfter(weekStart, today) || calls.some(call => call.isCurrentWeek))) {
          expandedWeekKeys.add(weekKey);
        }
      });
      
      setExpandedWeeks(expandedWeekKeys);
    }
  }, [groupedCalls]);

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

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

  return (
    <div className="w-full">
      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 pt-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Daily Calls</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleNewCall} variant="ghost" size="icon" className="border-0 hover:bg-transparent">
              <Plus className="h-4 w-4 hover:text-blue-600 transition-colors" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: Add minimal top padding */}
      <div className="md:hidden pt-4"></div>

      <div className="px-4 sm:px-6 lg:px-8">
        {!dailyCalls || dailyCalls.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No daily calls yet</h3>
            <p className="text-gray-500 mb-6">Create your first daily call sheet for {project?.name}</p>
          </div>
        ) : (
          <div className="space-y-[5px]">
            {Object.entries(groupedCalls)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort weeks with most recent at top
              .map(([weekKey, calls]) => {
                const weekStart = calls[0]?.weekStart;
                const weekEnd = calls[0]?.weekEnd;
                const isExpanded = expandedWeeks.has(weekKey);
                
                return (
                  <Collapsible
                    key={weekKey}
                    open={isExpanded}
                    onOpenChange={() => toggleWeek(weekKey)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-white rounded-lg">
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {calls.length} call{calls.length !== 1 ? 's' : ''}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1">
                      <div className="space-y-1 pl-4">
                        {calls
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort daily calls by most recent first
                          .map((call: any) => (
                            <div 
                              key={call.id} 
                              className="cursor-pointer hover:bg-gray-50 transition-colors p-3 rounded-lg"
                              onClick={() => setLocation(`/shows/${projectId}/calls/${call.date}`)}
                            >
                              <h4 className="text-base font-medium text-gray-900">
                                {format(parseISO(call.date), 'EEEE, MMMM d, yyyy')}
                              </h4>
                              {call.updatedAt && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Updated {format(parseISO(call.updatedAt), 'MMM d, h:mm a')}
                                </p>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            }
          </div>
        )}
      </div>
    </div>
  );
}