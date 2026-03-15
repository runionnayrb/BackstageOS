import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { isPerformanceType } from "@/lib/eventUtils";
import { format } from "date-fns";

interface PerformanceNumberingSettingsProps {
  projectId: number;
  settings: any;
  handleSettingsUpdate: (section: string, value: any) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const safeJsonParse = (jsonString: string, fallback: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return fallback;
  }
};

export function PerformanceNumberingSettings({
  projectId,
  settings,
  handleSettingsUpdate,
  isOpen,
  onOpenChange,
}: PerformanceNumberingSettingsProps) {
  const { data: scheduleEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'schedule-events'],
  });

  const { data: eventTypes = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  const performanceEvents = scheduleEvents
    .filter((event: any) => {
      return isPerformanceType(event.type, eventTypes, event.eventTypeId);
    })
    .sort((a: any, b: any) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });

  const scheduleSettings = typeof settings?.scheduleSettings === 'string'
    ? safeJsonParse(settings.scheduleSettings, {})
    : (settings?.scheduleSettings || {});

  const performanceNumbering = scheduleSettings?.performanceNumbering || {
    firstPerformanceEventId: null,
    startingNumber: 1,
  };

  const handleFirstPerformanceChange = (eventId: string) => {
    handleSettingsUpdate("scheduleSettings", {
      ...scheduleSettings,
      performanceNumbering: {
        ...performanceNumbering,
        firstPerformanceEventId: eventId === "none" ? null : parseInt(eventId),
      },
    });
  };

  const handleStartingNumberChange = (value: string) => {
    const num = parseInt(value) || 1;
    handleSettingsUpdate("scheduleSettings", {
      ...scheduleSettings,
      performanceNumbering: {
        ...performanceNumbering,
        startingNumber: Math.max(1, num),
      },
    });
  };

  const formatEventOption = (event: any) => {
    const date = format(new Date(event.date + 'T00:00:00'), 'MMM d, yyyy');
    const time = event.startTime.substring(0, 5);
    return `${event.title} - ${date} at ${time}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Numbering</CardTitle>
                <CardDescription>
                  Automatically number your performances/shows on the calendar.
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startingNumber">
                  Starting Number
                </Label>
                <Input
                  id="startingNumber"
                  type="number"
                  min={1}
                  value={performanceNumbering.startingNumber || 1}
                  onChange={(e) => handleStartingNumberChange(e.target.value)}
                  placeholder="1"
                  data-testid="input-starting-number"
                />
                <p className="text-xs text-muted-foreground">
                  The number to assign to your first performance. Use this if your show has already done many performances.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstPerformance">
                  First Performance
                </Label>
                <Select
                  value={performanceNumbering.firstPerformanceEventId?.toString() || "none"}
                  onValueChange={handleFirstPerformanceChange}
                >
                  <SelectTrigger id="firstPerformance" data-testid="select-first-performance">
                    <SelectValue placeholder="Select the first performance..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Use earliest performance
                    </SelectItem>
                    {performanceEvents.map((event: any) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {formatEventOption(event)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which event should be numbered as #{performanceNumbering.startingNumber || 1}. Subsequent performances will be numbered sequentially.
                </p>
              </div>
            </div>

            {performanceEvents.length === 0 && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No performance or preview events found. Create performance events on your schedule to enable numbering.
                </p>
              </div>
            )}

            {performanceEvents.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>{performanceEvents.length}</strong> performance/preview event{performanceEvents.length !== 1 ? 's' : ''} found. 
                  Performance numbers will appear on event cards in the calendar.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
