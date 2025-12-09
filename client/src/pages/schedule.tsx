import { useState, useRef, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, Calendar, X, History, Settings, FileText, User, Send, Crown, Megaphone, Bell, LayoutTemplate, Copy, CalendarPlus, Trash2 } from "lucide-react";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";
import { ChangeSummaryEditor } from "@/components/ChangeSummaryEditor";
import WeeklyScheduleView from "@/components/weekly-schedule-view";
import MobileWeeklyScheduleView from "@/components/mobile-weekly-schedule-view";
import DailyScheduleView from "@/components/daily-schedule-view";
import MonthlyScheduleView from "@/components/monthly-schedule-view-new";
import ScheduleFilter from "@/components/schedule-filter";
import EventForm from "@/components/event-form";
import { ScheduleVersionHistory } from "@/components/schedule-version-control/schedule-version-history";
import { SchedulePhase5Settings } from "@/components/schedule-phase5/SchedulePhase5Settings";
import { PersonalScheduleShare } from "@/components/personal-schedule-share";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseScheduleSettings } from "@/lib/timeUtils";

// Helper function to safely parse JSON with error handling
const safeJsonParse = (jsonString: string, fallback: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

interface ScheduleParams {
  id: string;
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const params = useParams<ScheduleParams>();
  const projectId = params.id;

  // Guard against missing projectId
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Schedule Not Found</h1>
          <p className="text-muted-foreground mb-4">The schedule you're looking for doesn't exist or the URL is invalid.</p>
          <Button onClick={() => setLocation('/shows')}>
            Go to Shows
          </Button>
        </div>
      </div>
    );
  }
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('weekly');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedIndividualTypes, setSelectedIndividualTypes] = useState<string[]>([]);
  const [showProductionCalendar, setShowProductionCalendar] = useState(true); // Default to true for monthly view
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);
  const [createEventDialog, setCreateEventDialog] = useState(false);
  const [createEventData, setCreateEventData] = useState<{
    date?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  }>({});
  const [showVersionControl, setShowVersionControl] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedVersionType, setSelectedVersionType] = useState<'major' | 'minor'>('major');
  const [showPublishVersionConfirm, setShowPublishVersionConfirm] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [showResendScheduleDialog, setShowResendScheduleDialog] = useState(false);
  const [resendSelectedContacts, setResendSelectedContacts] = useState<number[]>([]);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [skipConflicts, setSkipConflicts] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Email template refs
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  
  // Template variables for email templates
  const templateVariables = [
    { key: '{{contactName}}', displayName: 'Contact Name', description: 'Contact\'s name' },
    { key: '{{showName}}', displayName: 'Show Name', description: 'Show/project name' },
    { key: '{{version}}', displayName: 'Version', description: 'Version number' },
    { key: '{{personalScheduleLink}}', displayName: 'Personal Schedule Link', description: 'Personal schedule link' },
    { key: '{{changesSummary}}', displayName: 'Full Changes Summary', description: 'Complete summary of all changes' },
    { key: '{{addedEvents}}', displayName: 'Added Events', description: 'List of newly added events' },
    { key: '{{changedEvents}}', displayName: 'Changed Events', description: 'List of modified events' },
    { key: '{{removedEvents}}', displayName: 'Removed Events', description: 'List of cancelled events' },
    { key: '{{publishDate}}', displayName: 'Publish Date', description: 'Publication date' },
    { key: '{{weekStart}}', displayName: 'Week Start', description: 'Week start date (e.g., Sun, Jul 13, 2025)' },
    { key: '{{weekEnd}}', displayName: 'Week End', description: 'Week end date (e.g., Sat, Jul 18, 2025)' },
    { key: '{{weekRange}}', displayName: 'Week Range', description: 'Full week range (e.g., Sun, Jul 13, 2025 - Sat, Jul 18, 2025)' }
  ];
  
  // Function to insert variable into email template fields
  const [localEmailSubject, setLocalEmailSubject] = useState('');
  const [localEmailBody, setLocalEmailBody] = useState('');
  const [emailBodyEditor, setEmailBodyEditor] = useState(null);
  const [localChangeSummary, setLocalChangeSummary] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection hook
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const insertVariable = (field: 'subject' | 'body' | 'changeSummary', variable: string) => {
    if (field === 'changeSummary') {
      // For rich text editor, append the variable to the current content
      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
        ? safeJsonParse((settings as any).scheduleSettings, {}) 
        : ((settings as any)?.scheduleSettings || {});
      
      const currentContent = localChangeSummary || scheduleSettings.changeSummary || autoChangesSummary?.changesSummary || '';
      const newContent = currentContent + (currentContent ? ' ' : '') + variable;
      
      setLocalChangeSummary(newContent);
      return;
    }

    // Use the variable key directly (already includes braces)
    const displayText = variable;
    
    if (field === 'subject') {
      const input = emailSubjectRef.current;
      if (!input) return;
      
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value || '';
      const newValue = currentValue.substring(0, start) + displayText + currentValue.substring(end);
      
      setLocalEmailSubject(newValue);
      
      setTimeout(() => {
        input.focus();
        const newCursorPos = start + displayText.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (field === 'body') {
      // For rich text editor, insert at cursor position if editor is available
      if (emailBodyEditor) {
        emailBodyEditor.chain().focus().insertContent(' ' + displayText + ' ').run();
      } else {
        // Fallback: append to end
        const currentContent = localEmailBody || (() => {
          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
            ? safeJsonParse((settings as any).scheduleSettings, {}) 
            : ((settings as any)?.scheduleSettings || {});
          return scheduleSettings?.emailTemplate?.body || "";
        })();
        
        const newContent = currentContent + (currentContent ? ' ' : '') + displayText;
        setLocalEmailBody(newContent);
      }
    }
  }

  const saveEmailTemplate = () => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    handleSettingsUpdate("scheduleSettings", {
      ...scheduleSettings,
      emailTemplate: {
        ...scheduleSettings?.emailTemplate,
        subject: localEmailSubject || scheduleSettings?.emailTemplate?.subject || "Schedule Update - Show Name (Version Number)",
        body: localEmailBody || scheduleSettings?.emailTemplate?.body || `Hi Contact Name,

The schedule for Show Name has been updated with version Version Number.

Added Events

Changed Events

Removed Events

You can view your personal schedule here: Personal Schedule Link

Best regards,
The Production Team`
      }
    });
  };

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: user } = useQuery({
    queryKey: [`/api/user`],
  });

  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Get schedule versions to find current published version
  const { data: scheduleVersions = [], isLoading: isLoadingVersions } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-versions`],
    enabled: !!projectId
  });

  // Fetch contacts for event creation
  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types for event creation
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  // Fetch schedule events for updated timestamp
  const { data: events = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch all users for "updated by" information
  const { data: users = [] } = useQuery({
    queryKey: [`/api/admin/users`],
  });

  // Fetch personal schedules with contact information
  const { data: personalSchedules = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/personal-schedules`],
  });

  // Fetch email accounts for reply-to configuration
  const { data: emailAccounts = [] } = useQuery({
    queryKey: [`/api/email/accounts`],
    enabled: showScheduleSettings, // Only fetch when modal is open
  });

  // Fetch auto-generated changes summary
  const { data: autoChangesSummary } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-changes-summary`],
    enabled: showScheduleSettings, // Only fetch when modal is open
  });

  // Fetch structured changes for individual template variables
  const { data: structuredChanges } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-changes-structured`],
    enabled: showScheduleSettings, // Only fetch when modal is open
  });

  // Fetch schedule templates
  const { data: scheduleTemplates = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/schedule-templates`],
  });

  // Test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/send-test-email`, {
        testEmailAddress: testEmailAddress.trim() || undefined,
        emailSubject: localEmailSubject,
        emailBody: localEmailBody
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Test Email Sent",
        description: `Test email sent successfully to ${data.sentTo || testEmailAddress || user?.email} with sender name "${data.senderName}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendTestEmail = () => {
    sendTestEmailMutation.mutate();
    setShowTestEmailDialog(false);
  };

  // Resend schedule mutation
  const resendScheduleMutation = useMutation({
    mutationFn: async (contactIds: number[]) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/resend-schedule`, {
        contactIds,
        currentViewDate: currentDate.toISOString() // Pass the current viewing date
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Resent",
        description: `Schedule successfully resent to ${data.sentCount || resendSelectedContacts.length} contacts.`,
      });
      setShowResendScheduleDialog(false);
      setResendSelectedContacts([]);
    },
    onError: (error: any) => {
      // Handle the case where there are no events in the current week
      if (error.hasEvents === false) {
        toast({
          title: "No Events This Week",
          description: error.message + (error.suggestion ? ` ${error.suggestion}` : ''),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to resend schedule. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleResendSchedule = () => {
    if (resendSelectedContacts.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one contact to resend the schedule to.",
        variant: "destructive",
      });
      return;
    }
    resendScheduleMutation.mutate(resendSelectedContacts);
  };

  // Create template (snapshot) mutation
  const createTemplateMutation = useMutation({
    mutationFn: async ({ name, description, weekStartDate }: { name: string; description: string; weekStartDate: string }) => {
      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
        ? JSON.parse((settings as any).scheduleSettings) 
        : ((settings as any)?.scheduleSettings || {});
      const weekStartDay = scheduleSettings?.weekStartDay || 'sunday';
      const weekStartDayNumber = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekStartDay);
      
      const response = await apiRequest('POST', `/api/projects/${projectId}/schedule-templates/snapshot`, {
        name,
        description,
        weekStartDate,
        weekStartDay: weekStartDayNumber >= 0 ? weekStartDayNumber : 0
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-templates`] });
      toast({
        title: "Template Created",
        description: "Weekly schedule template has been saved successfully.",
      });
      setShowCreateTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, targetWeekStartDate, skipConflicts }: { templateId: number; targetWeekStartDate: string; skipConflicts: boolean }) => {
      const response = await apiRequest('POST', `/api/schedule-templates/${templateId}/apply`, {
        targetWeekStartDate,
        skipConflicts
      });
      return response;
    },
    onSuccess: (data) => {
      const eventsCreated = data.createdEvents?.length || 0;
      
      // Immediately update ALL schedule event caches with new events for instant UI update
      if (data.createdEvents && data.createdEvents.length > 0) {
        const pid = projectId; // String from URL params
        const pidNum = parseInt(projectId); // Number version for matching
        
        // Update all schedule event caches using setQueriesData for partial key matching
        // This updates both daily view (no date params) and weekly view (with date params)
        queryClient.setQueriesData(
          { queryKey: ['/api/projects', pid, 'schedule-events'] },
          (oldData: any[] | undefined) => {
            if (!oldData) return data.createdEvents;
            // Avoid duplicates by filtering out any events that already exist
            const existingIds = new Set(oldData.map((e: any) => e.id));
            const newEvents = data.createdEvents.filter((e: any) => !existingIds.has(e.id));
            return [...oldData, ...newEvents];
          }
        );
        
        // Also try with numeric projectId in case WeeklyScheduleView uses number
        queryClient.setQueriesData(
          { queryKey: ['/api/projects', pidNum, 'schedule-events'] },
          (oldData: any[] | undefined) => {
            if (!oldData) return data.createdEvents;
            const existingIds = new Set(oldData.map((e: any) => e.id));
            const newEvents = data.createdEvents.filter((e: any) => !existingIds.has(e.id));
            return [...oldData, ...newEvents];
          }
        );
        
        // Also update the string-format cache key used by some queries
        queryClient.setQueryData(
          [`/api/projects/${projectId}/schedule-events`],
          (oldData: any[] | undefined) => {
            if (!oldData) return data.createdEvents;
            const existingIds = new Set(oldData.map((e: any) => e.id));
            const newEvents = data.createdEvents.filter((e: any) => !existingIds.has(e.id));
            return [...oldData, ...newEvents];
          }
        );
      }
      
      // Force refetch all schedule-events queries to ensure UI is in sync
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', parseInt(projectId), 'schedule-events'] });
      
      toast({
        title: "Template Applied",
        description: `Created ${eventsCreated} events from template.`,
      });
      setShowApplyTemplateDialog(false);
      setSelectedTemplateId(null);
      setSkipConflicts(false);
    },
    onError: (error: any) => {
      if (error.conflicts) {
        toast({
          title: "Scheduling Conflicts Detected",
          description: `${error.conflicts.length} time conflicts were found. Enable "Skip conflicts" to create non-conflicting events only.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to apply template. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Organize contacts by group for resend dialog
  const organizedContacts = contacts.reduce((acc: any, contact: any) => {
    const groupName = contact.contactGroup?.name || 'Unassigned';
    
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push({
      id: contact.id,
      name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email || 'Unknown Contact',
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email
    });
    return acc;
  }, {});

  // Get all contact IDs for "Full Company" toggle
  const allContactIds = contacts.map((contact: any) => contact.id);

  // Calculate the week start date string for the current viewed week
  const currentWeekStartStr = useMemo(() => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? JSON.parse((settings as any).scheduleSettings) 
      : ((settings as any)?.scheduleSettings || {});
    const weekStartDay = scheduleSettings?.weekStartDay || 'sunday';
    const weekStartDayNumber = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekStartDay);
    
    const startOfWeek = new Date(currentDate);
    const currentDay = startOfWeek.getDay();
    const diff = currentDay - weekStartDayNumber;
    startOfWeek.setDate(startOfWeek.getDate() - (diff < 0 ? diff + 7 : diff));
    
    return startOfWeek.toISOString().split('T')[0];
  }, [currentDate, settings]);

  // Get the current published version for THIS WEEK (weekly versioning)
  const currentPublishedVersion = useMemo(() => {
    if (!scheduleVersions || scheduleVersions.length === 0) return null;
    
    // Filter versions for the current week only
    const weekVersions = scheduleVersions.filter((v: any) => v.weekStart === currentWeekStartStr);
    
    if (weekVersions.length === 0) return null;
    
    // Sort versions by published date, latest first
    const sortedVersions = [...weekVersions].sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    // Return the most recent version for this week
    return sortedVersions[0];
  }, [scheduleVersions, currentWeekStartStr]);

  // Check if the current week is a draft (never been published)
  const isCurrentWeekDraft = !currentPublishedVersion;

  // Calculate week range consistently for template dialogs
  const currentWeekRange = useMemo(() => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? JSON.parse((settings as any).scheduleSettings) 
      : ((settings as any)?.scheduleSettings || {});
    const weekStartDay = scheduleSettings?.weekStartDay || 'sunday';
    const weekStartDayNumber = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekStartDay);
    
    const startOfWeek = new Date(currentDate);
    const currentDay = startOfWeek.getDay();
    const diff = currentDay - weekStartDayNumber;
    startOfWeek.setDate(startOfWeek.getDate() - (diff < 0 ? diff + 7 : diff));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      startDateStr: startOfWeek.toISOString().split('T')[0],
      displayText: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      weekStartDayNumber
    };
  }, [currentDate, settings]);

  // Handle Full Company toggle
  const handleFullCompanyToggle = (checked: boolean) => {
    if (checked) {
      setResendSelectedContacts(allContactIds);
    } else {
      setResendSelectedContacts([]);
    }
  };

  // Handle individual contact toggle
  const handleContactToggle = (contactId: number, checked: boolean) => {
    if (checked) {
      setResendSelectedContacts(prev => [...prev, contactId]);
    } else {
      setResendSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  // Organize personal schedules by contact group (from Manage Contact Groups)
  // Only use contact group names - no fallback to old category field
  const organizedSchedules = personalSchedules.reduce((acc: any, schedule: any) => {
    if (schedule.contact) {
      // Use contact group name only - show "Unassigned" for contacts without a group
      const groupName = schedule.contact.contactGroup?.name || 'Unassigned';
      
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push({
        name: `${schedule.contact.firstName || ''} ${schedule.contact.lastName || ''}`.trim() || schedule.contact.email || 'Unknown Contact',
        token: schedule.accessToken,
        contactId: schedule.contact.id
      });
    }
    return acc;
  }, {});

  // Function to navigate to personal schedule
  const navigateToPersonalSchedule = (token: string) => {
    window.open(`/personal-schedule/${token}`, '_blank');
  };

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => apiRequest('POST', `/api/projects/${projectId}/schedule-events`, {
      ...eventData,
    }),
    onMutate: async (eventData: any) => {
      const numericProjectId = parseInt(projectId);
      
      const matchesScheduleEventsQuery = (query: any) => {
        const key = query.queryKey as any[];
        // Match weekly view format: ['/api/projects', projectId, 'schedule-events', ...]
        // OR daily view format: ['/api/projects/${projectId}/schedule-events']
        return (
          (key[0] === '/api/projects' && key[1] === numericProjectId && key[2] === 'schedule-events') ||
          (key[0] === `/api/projects/${numericProjectId}/schedule-events`)
        );
      };
      
      await queryClient.cancelQueries({ predicate: matchesScheduleEventsQuery });
      
      const previousEvents = queryClient.getQueriesData({ predicate: matchesScheduleEventsQuery });
      
      const optimisticEvent = {
        ...eventData,
        id: Date.now(),
        projectId: numericProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: eventData.participantIds?.map((id: number) => ({
          contactId: id,
          contact: contacts.find((c: any) => c.id === id)
        })) || [],
      };
      
      queryClient.setQueriesData(
        { predicate: matchesScheduleEventsQuery },
        (old: any) => {
          if (!old) return old;
          return [...old, optimisticEvent];
        }
      );
      
      return { previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      setCreateEventDialog(false);
      setCreateEventData({});
      toast({
        title: "Event created successfully",
        description: "The event has been added to your schedule.",
      });
    },
    onError: (error: any, _variables, context) => {
      // Rollback the optimistic update on error
      if (context?.previousEvents) {
        context.previousEvents.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      // Handle conflict validation (409 status) with user-friendly messages
      if (error.status === 409 && error.conflicts) {
        const conflictMessages = error.conflicts.map((conflict: any) => {
          if (conflict.conflictType === 'unavailable') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'schedule_overlap') {
            return `${conflict.contactName} is already scheduled during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'location_unavailable') {
            return `${conflict.locationName} is unavailable during ${conflict.conflictTime}`;
          }
          return conflict.conflictDetails;
        });
        
        toast({
          title: "Scheduling Conflict",
          description: conflictMessages.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error creating event",
          description: error.message || "Failed to create event. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, eventData }: { eventId: number; eventData: any }) => 
      apiRequest('PATCH', `/api/projects/${projectId}/schedule-events/${eventId}`, eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      // Also invalidate Show Settings query since Important Date events sync to project settings
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
      setEditingEvent(null);
      toast({
        title: "Event updated successfully",
        description: "The event has been updated.",
      });
    },
    onError: (error: any) => {
      // Handle conflict validation (409 status) with user-friendly messages
      if (error.status === 409 && error.conflicts) {
        const conflictMessages = error.conflicts.map((conflict: any) => {
          if (conflict.conflictType === 'unavailable') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'schedule_overlap') {
            return `${conflict.contactName} is already scheduled during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'location_unavailable') {
            return `${conflict.locationName} is unavailable during ${conflict.conflictTime}`;
          }
          return conflict.conflictDetails;
        });
        
        toast({
          title: "Scheduling Conflict",
          description: conflictMessages.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating event",
          description: error.message || "Failed to update event. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => 
      apiRequest('DELETE', `/api/projects/${projectId}/schedule-events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
      setEditingEvent(null);
      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting event",
        description: error.message || "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Publish schedule version mutation with optimistic updates for instant UI feedback
  const publishVersionMutation = useMutation({
    mutationFn: ({ versionType, weekStart }: { versionType: 'major' | 'minor'; weekStart: string }) => {
      return apiRequest('POST', `/api/projects/${projectId}/schedule-versions`, {
        versionType,
        weekStart
      });
    },
    onMutate: async ({ versionType, weekStart }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/schedule-versions`] });
      
      // Snapshot current data for rollback
      const previousVersions = queryClient.getQueryData([`/api/projects/${projectId}/schedule-versions`]);
      
      // Calculate optimistic version based on THIS WEEK's versions only
      const currentVersions = (previousVersions as any[]) || [];
      const weekVersions = currentVersions.filter((v: any) => v.weekStart === weekStart);
      let newMajor = 1;
      let newMinor = 0;
      
      if (weekVersions.length > 0) {
        const sorted = [...weekVersions].sort((a, b) => 
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        const latest = sorted[0];
        const currentMajor = parseInt(latest.version) || 1;
        const currentMinor = latest.minorVersion || 0;
        
        if (versionType === 'major') {
          newMajor = currentMajor + 1;
          newMinor = 0;
        } else {
          newMajor = currentMajor;
          newMinor = currentMinor + 1;
        }
      }
      
      // Create optimistic version entry
      const optimisticVersion = {
        id: -Date.now(), // Temporary negative ID
        projectId: parseInt(projectId),
        weekStart, // Track which week this version belongs to
        version: newMajor.toString(),
        minorVersion: newMinor,
        versionType,
        title: `${versionType === 'major' ? 'Major' : 'Minor'} Version ${newMajor}.${newMinor}`,
        publishedAt: new Date().toISOString(),
        isCurrent: true,
      };
      
      // Optimistically update the cache
      queryClient.setQueryData([`/api/projects/${projectId}/schedule-versions`], (old: any[]) => {
        const updated = (old || []).map(v => ({ ...v, isCurrent: false }));
        return [optimisticVersion, ...updated];
      });
      
      // Close dialog and show toast immediately
      setShowPublishVersionConfirm(false);
      toast({
        title: "Schedule published!",
        description: `Version ${newMajor}.${newMinor} is now live for this week.`,
      });
      
      return { previousVersions };
    },
    onSuccess: (data) => {
      // Replace optimistic data with real server response
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-versions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/personal-schedules`] });
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousVersions) {
        queryClient.setQueryData([`/api/projects/${projectId}/schedule-versions`], context.previousVersions);
      }
      toast({
        title: "Error publishing schedule",
        description: error.message || "Failed to publish. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle publish confirmation
  const handlePublishConfirm = () => {
    publishVersionMutation.mutate({ versionType: selectedVersionType, weekStart: currentWeekStartStr });
  };

  // Safe JSON parse helper
  const safeJsonParse = (jsonString: any, defaultValue: any = {}) => {
    if (typeof jsonString !== 'string') return jsonString || defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  };

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settingsData: any) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/settings`, settingsData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
      toast({
        title: "Settings updated",
        description: "Your schedule settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating settings",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle settings update
  const handleSettingsUpdate = (section: string, updates: any) => {
    const settingsData = settings as any || {};
    
    // Handle scheduleSettings specially since it's stored as JSON string
    if (section === 'scheduleSettings') {
      const currentScheduleSettings = typeof settingsData.scheduleSettings === 'string' 
        ? safeJsonParse(settingsData.scheduleSettings, {}) 
        : (settingsData.scheduleSettings || {});
      
      const updatedScheduleSettings = {
        ...currentScheduleSettings,
        ...updates,
      };
      
      const updatedSettings = {
        ...settingsData,
        scheduleSettings: JSON.stringify(updatedScheduleSettings),
      };
      updateSettingsMutation.mutate(updatedSettings);
    } else {
      const updatedSettings = {
        ...settingsData,
        [section]: {
          ...(settingsData[section] || {}),
          ...updates,
        },
      };
      updateSettingsMutation.mutate(updatedSettings);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('daily');
  };

  // Handle create event
  const handleCreateEvent = (eventData: any) => {
    createEventMutation.mutate(eventData);
  };

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else { // daily
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else { // daily
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };



  // Format header text based on current view
  const getHeaderText = () => {
    if (viewMode === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (viewMode === 'weekly') {
      // Calculate week range
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endOfWeek.getFullYear()}`;
      }
    } else { // daily
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    }
  };

  return (
    <div className="w-full">
      {/* Desktop Header - Unified Weekly View Style */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-50 bg-white">
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Dynamic Date/Range display */}
          <div className="flex items-center">
            <div>
              <h1 className="hidden md:block text-3xl font-bold text-gray-900">
                {getHeaderText()}
              </h1>
              {isLoadingVersions ? (
                <p className="text-sm text-gray-400 mt-1">Loading...</p>
              ) : currentPublishedVersion ? (
                <p className="text-sm text-gray-600 mt-1">
                  Version {currentPublishedVersion.version}.{currentPublishedVersion.minorVersion || 0}, Published: {(() => {
                    try {
                      const date = new Date(currentPublishedVersion.publishedAt);
                      if (isNaN(date.getTime())) {
                        console.error('Invalid publishedAt date:', currentPublishedVersion.publishedAt);
                        return 'Invalid Date';
                      }
                      const { timeFormat, timezone } = parseScheduleSettings(settings?.scheduleSettings);
                      const dateStr = date.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        timeZone: timezone
                      });
                      const timeStr = timeFormat === '24' 
                        ? date.toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: timezone
                          })
                        : date.toLocaleTimeString('en-US', { 
                            hour12: true, 
                            hour: 'numeric', 
                            minute: '2-digit',
                            timeZone: timezone
                          });
                      return `${dateStr} at ${timeStr}`;
                    } catch (error) {
                      console.error('Date formatting error:', error, currentPublishedVersion);
                      return 'Date formatting error';
                    }
                  })()}
                </p>
              ) : (
                <p className="text-sm text-amber-600 mt-1 font-medium">
                  This week is unpublished
                </p>
              )}
            </div>
          </div>

          {/* Right side - Controls matching weekly view order */}
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2">
            <ScheduleFilter
              projectId={parseInt(projectId)}
              selectedContactIds={selectedContactIds}
              onFilterChange={setSelectedContactIds}
              selectedEventTypes={selectedEventTypes}
              onEventTypeFilterChange={setSelectedEventTypes}
              selectedIndividualTypes={selectedIndividualTypes}
              onIndividualTypeFilterChange={setSelectedIndividualTypes}
              showProductionCalendar={showProductionCalendar}
              onProductionCalendarFilterChange={setShowProductionCalendar}
              viewMode={viewMode}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
                  {timeIncrement} Min
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTimeIncrement(15)}>
                  15 Min
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeIncrement(30)}>
                  30 Min
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeIncrement(60)}>
                  60 Min
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showAllDayEvents ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllDayEvents(!showAllDayEvents)}
              className="text-xs px-2 py-1 h-auto"
            >
              All Day
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
                  {viewMode === 'monthly' ? 'Month' : viewMode === 'weekly' ? 'Week' : 'Day'}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewMode('monthly')}>
                  Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('weekly')}>
                  Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('daily')}>
                  Day
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => {
              const today = new Date();
              setCurrentDate(today);
            }} size="sm" className="text-xs px-2 py-1 h-auto">
              Today
            </Button>
            <div className="flex items-center">
              <button onClick={goToPrevious} className="p-1 hover:bg-gray-100 rounded-l transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToNext} className="p-1 hover:bg-gray-100 rounded-r transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1 text-xs px-2 py-1 h-auto ml-2 ${!isLoadingVersions && isCurrentWeekDraft ? 'bg-amber-50 border-amber-200 text-amber-700' : ''}`}
                    disabled={isLoadingVersions}
                  >
                    {isLoadingVersions ? 'Publish' : isCurrentWeekDraft ? 'DRAFT' : 'Publish'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedVersionType('major');
                      setShowPublishVersionConfirm(true);
                    }}
                  >
                    <Megaphone className="h-4 w-4 mr-2" />
                    {isCurrentWeekDraft ? 'Publish Week' : 'Major Version'}
                  </DropdownMenuItem>
                  {!isCurrentWeekDraft && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedVersionType('minor');
                        setShowPublishVersionConfirm(true);
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Minor Version
                    </DropdownMenuItem>
                  )}
                  {!isCurrentWeekDraft && (
                    <DropdownMenuItem
                      onClick={() => {
                        setShowResendScheduleDialog(true);
                        setResendSelectedContacts([]);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Resend Schedule
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {Object.keys(organizedSchedules).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs px-2 py-1 h-auto ml-2"
                    >
                      Personal
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {Object.entries(organizedSchedules).map(([contactType, contacts]: [string, any[]]) => (
                      <div key={contactType}>
                        <div className="px-2 py-1.5 text-xs font-bold text-gray-800 uppercase border-b">
                          {contactType}
                        </div>
                        {contacts.map((contact) => (
                          <DropdownMenuItem
                            key={contact.contactId}
                            onClick={() => navigateToPersonalSchedule(contact.token)}
                            className="text-sm"
                          >
                            {contact.name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-1 hover:bg-gray-100 rounded ml-2 transition-colors"
                    data-testid="button-add-schedule-menu"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setCreateEventDialog(true)}
                    data-testid="menu-add-event"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Add Event
                  </DropdownMenuItem>
                  {scheduleTemplates.length > 0 && (
                    <DropdownMenuItem 
                      onClick={() => setShowApplyTemplateDialog(true)}
                      data-testid="menu-apply-template"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Apply Weekly Template
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowCreateTemplateDialog(true)}
                    data-testid="menu-save-template"
                  >
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Save Week as Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
            
            {/* Updated timestamp positioned under the controls */}
            {(() => {
              // Find the most recently updated event
              const mostRecentEvent = events?.reduce((latest, event) => {
                const eventDate = new Date(event.updatedAt);
                const latestDate = latest ? new Date(latest.updatedAt) : new Date(0);
                return eventDate > latestDate ? event : latest;
              }, null);

              if (!mostRecentEvent || !users) return null;

              const updatedBy = users.find(user => user.id === (mostRecentEvent.updatedBy || mostRecentEvent.createdBy));
              if (!updatedBy) return null;

              const date = new Date(mostRecentEvent.updatedAt);
              if (isNaN(date.getTime())) return null;

              const { timeFormat, timezone } = parseScheduleSettings(settings?.scheduleSettings);
              const dateStr = date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                timeZone: timezone
              });
              const timeStr = timeFormat === '24' 
                ? date.toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: timezone
                  })
                : date.toLocaleTimeString('en-US', { 
                    hour12: true, 
                    hour: 'numeric', 
                    minute: '2-digit',
                    timeZone: timezone
                  });

              const userName = updatedBy.firstName && updatedBy.lastName 
                ? `${updatedBy.firstName} ${updatedBy.lastName}` 
                : updatedBy.email?.split('@')[0] || 'Unknown User';

              return (
                <p className="text-sm text-gray-600 mt-1">
                  Updated: {dateStr} at {timeStr} by {userName}
                </p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-white">
        {/* Main Mobile Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Dynamic Title */}
            <h1 className="text-xl font-semibold text-gray-900">
              {getHeaderText()}
            </h1>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <ScheduleFilter
                projectId={parseInt(projectId)}
                selectedContactIds={selectedContactIds}
                onFilterChange={setSelectedContactIds}
                selectedEventTypes={selectedEventTypes}
                onEventTypeFilterChange={setSelectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                onIndividualTypeFilterChange={setSelectedIndividualTypes}
                showProductionCalendar={showProductionCalendar}
                onProductionCalendarFilterChange={setShowProductionCalendar}
                viewMode={viewMode}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="p-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="p-2"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

            </div>
          </div>
        </div>

        {/* Mobile View Mode Selector */}
        <div className="pl-0 pr-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* View Mode Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'monthly' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'weekly' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'daily' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  console.log('Today button clicked, setting date to:', today.toDateString());
                  setCurrentDate(today);
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Today
              </button>
            </div>

            {/* Buttons and Settings - Complete unified control layout */}
            <div className="flex items-center space-x-2 justify-end pr-2">
              {/* Time Increment for all views - rightmost */}
              <div className="no-chevron">
                <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
                  <SelectTrigger className="w-8 h-8 border-0 bg-transparent shadow-none p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[80px] w-auto">
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* All Day Button - middle - show in all views */}
              <button
                onClick={() => setShowAllDayEvents(!showAllDayEvents)}
                className="p-2 h-8 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors"
              >
                <Calendar className={`h-4 w-4 ${showAllDayEvents ? 'text-blue-500' : 'text-gray-600'}`} />
              </button>
              
              {/* Mobile Publish Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`p-2 h-8 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors ${!isLoadingVersions && isCurrentWeekDraft ? 'bg-amber-50' : ''}`}
                    disabled={isLoadingVersions}
                  >
                    <FileText className={`h-4 w-4 ${!isLoadingVersions && isCurrentWeekDraft ? 'text-amber-600' : 'text-gray-600'}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedVersionType('major');
                      setShowPublishVersionConfirm(true);
                    }}
                  >
                    <Megaphone className="h-4 w-4 mr-2" />
                    {isCurrentWeekDraft ? 'Publish Week' : 'Major Version'}
                  </DropdownMenuItem>
                  {!isCurrentWeekDraft && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedVersionType('minor');
                        setShowPublishVersionConfirm(true);
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Minor Version
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowVersionControl(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Version History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Personal Schedules Dropdown - moved to right of publish */}
              {Object.keys(organizedSchedules).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                    {Object.entries(organizedSchedules).map(([contactType, contacts]: [string, any[]]) => (
                      <div key={contactType}>
                        <div className="px-2 py-1.5 text-xs font-bold text-gray-800 uppercase border-b">
                          {contactType}
                        </div>
                        {contacts.map((contact) => (
                          <DropdownMenuItem
                            key={contact.contactId}
                            onClick={() => navigateToPersonalSchedule(contact.token)}
                            className="text-sm"
                          >
                            {contact.name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* Content Container - Responsive Padding */}
      <div className="px-0 md:px-4 lg:px-8">
        {viewMode === 'monthly' ? (
          <MonthlyScheduleView 
            projectId={parseInt(projectId)} 
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
            onFilterChange={setSelectedContactIds}
            selectedEventTypes={selectedEventTypes}
            onEventTypeFilterChange={setSelectedEventTypes}
            selectedIndividualTypes={selectedIndividualTypes}
            onIndividualTypeFilterChange={setSelectedIndividualTypes}
            showProductionCalendar={showProductionCalendar}
            onProductionCalendarFilterChange={setShowProductionCalendar}
            timeIncrement={timeIncrement}
            setTimeIncrement={setTimeIncrement}
            showAllDayEvents={showAllDayEvents}
            setShowAllDayEvents={setShowAllDayEvents}
            createEventDialog={createEventDialog}
            setCreateEventDialog={setCreateEventDialog}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onEventEdit={(event) => {
              setEditingEvent(event);
            }}
            onEventClick={(event) => {
              // Set the date to the event's date and switch to daily view
              setCurrentDate(new Date(event.date));
              setViewMode('daily');
            }}
          />
        ) : viewMode === 'weekly' ? (
          <>
            {/* Desktop Weekly View */}
            <div className="hidden md:block">
              <WeeklyScheduleView 
                projectId={parseInt(projectId)} 
                onDateClick={handleDateClick}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedContactIds={selectedContactIds}
                onFilterChange={setSelectedContactIds}
                selectedEventTypes={selectedEventTypes}
                onEventTypeFilterChange={setSelectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                onIndividualTypeFilterChange={setSelectedIndividualTypes}
                timeIncrement={timeIncrement}
                setTimeIncrement={setTimeIncrement}
                showAllDayEvents={showAllDayEvents}
                setShowAllDayEvents={setShowAllDayEvents}
                createEventDialog={createEventDialog}
                setCreateEventDialog={setCreateEventDialog}
                setCreateEventData={setCreateEventData}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            </div>
            {/* Mobile Weekly View - 2 days with continuous scroll */}
            <div className="md:hidden">
              <MobileWeeklyScheduleView 
                projectId={parseInt(projectId)} 
                onDateClick={handleDateClick}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedContactIds={selectedContactIds}
                onFilterChange={setSelectedContactIds}
                selectedEventTypes={selectedEventTypes}
                onEventTypeFilterChange={setSelectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                onIndividualTypeFilterChange={setSelectedIndividualTypes}
                timeIncrement={timeIncrement}
                setTimeIncrement={setTimeIncrement}
                showAllDayEvents={showAllDayEvents}
                setShowAllDayEvents={setShowAllDayEvents}
                settings={settings}
                createEventDialog={createEventDialog}
                setCreateEventDialog={setCreateEventDialog}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onEventEdit={(event) => {
                  setEditingEvent(event);
                }}
              />
            </div>
          </>
        ) : (
          <DailyScheduleView 
            projectId={parseInt(projectId)} 
            selectedDate={currentDate}
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
            onFilterChange={setSelectedContactIds}
            selectedEventTypes={selectedEventTypes}
            onEventTypeFilterChange={setSelectedEventTypes}
            selectedIndividualTypes={selectedIndividualTypes}
            onIndividualTypeFilterChange={setSelectedIndividualTypes}
            timeIncrement={timeIncrement}
            setTimeIncrement={setTimeIncrement}
            showAllDayEvents={showAllDayEvents}
            setShowAllDayEvents={setShowAllDayEvents}
            createEventDialog={createEventDialog}
            setCreateEventDialog={setCreateEventDialog}
            setCreateEventData={setCreateEventData}
            viewMode={viewMode}
            setViewMode={setViewMode}
            editingEvent={editingEvent}
            setEditingEvent={setEditingEvent}
          />
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createEventDialog} onOpenChange={setCreateEventDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6">
            <EventForm
              projectId={parseInt(projectId)}
              contacts={contacts}
              eventTypes={eventTypes}
              initialDate={createEventData.date}
              onSubmit={handleCreateEvent}
              onCancel={() => setCreateEventDialog(false)}
              timeFormat={settings?.scheduleSettings?.timeFormat || '12'}
              showButtons={false}
              initialValues={{
                startDate: createEventData.date,
                endDate: createEventData.endDate || createEventData.date,
                startTime: createEventData.startTime,
                endTime: createEventData.endTime,
              }}
              key="create-event-form"
            />
          </div>
          
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateEventDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="event-form"
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          
          {editingEvent && (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6">
                <EventForm
                  key={`edit-event-${editingEvent.id}`}
                  projectId={parseInt(projectId)}
                  contacts={contacts}
                  eventTypes={eventTypes}
                  initialDate={editingEvent.date}
                  onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
                  onCancel={() => setEditingEvent(null)}
                  timeFormat={settings?.scheduleSettings?.timeFormat || '12'}
                  showButtons={false}
                  initialValues={{
                    title: editingEvent.title,
                    description: editingEvent.description || '',
                    type: editingEvent.type,
                    startDate: editingEvent.date,
                    endDate: editingEvent.date,
                    startTime: editingEvent.startTime,
                    endTime: editingEvent.endTime,
                    location: editingEvent.location || '',
                    notes: editingEvent.notes || '',
                    isAllDay: editingEvent.isAllDay,
                    isProductionLevel: editingEvent.isProductionLevel,
                    participantIds: editingEvent.participants.map((p: any) => p.contactId),
                  }}
                />
              </div>
              
              <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
                <div className="flex justify-between items-center">
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                        deleteEventMutation.mutate(editingEvent.id);
                      }
                    }}
                    disabled={deleteEventMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingEvent(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      form="event-form"
                      disabled={updateEventMutation.isPending}
                    >
                      {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Control - Mobile Sheet / Desktop Dialog */}
      {isMobile ? (
        <Sheet open={showVersionControl} onOpenChange={setShowVersionControl}>
          <SheetContent 
            side="bottom" 
            className="h-[95vh] p-0 flex flex-col rounded-t-lg"
          >
            <SheetHeader className="p-4 pb-3 border-b bg-white sticky top-0 z-10 rounded-t-lg flex-row items-center justify-between">
              <SheetTitle className="text-left text-lg font-semibold">Schedule Version History</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersionControl(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <ScheduleVersionHistory 
                  projectId={projectId}
                  onClose={() => setShowVersionControl(false)}
                  hideHeader={true}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showVersionControl} onOpenChange={setShowVersionControl}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden w-[95vw] sm:w-full mx-auto">
            <ScheduleVersionHistory 
              projectId={projectId}
              onClose={() => setShowVersionControl(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Advanced Settings Dialog */}
      <Dialog open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <SchedulePhase5Settings 
              projectId={parseInt(projectId)}
              projectName={project?.name || 'Project'}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Settings Modal */}
      <Dialog open={showScheduleSettings} onOpenChange={setShowScheduleSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Schedule Settings Card */}
            <Card className="border-0 shadow-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeZone">Time Zone</Label>
                    <Select
                      value={(() => {
                        const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                          ? safeJsonParse((settings as any).scheduleSettings, {}) 
                          : ((settings as any)?.scheduleSettings || {});
                        return scheduleSettings?.timeZone || "America/New_York";
                      })()}
                      onValueChange={(value) =>
                        handleSettingsUpdate("scheduleSettings", { timeZone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekStart">Week Start</Label>
                    <Select
                      value={(() => {
                        const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                          ? safeJsonParse((settings as any).scheduleSettings, {}) 
                          : ((settings as any)?.scheduleSettings || {});
                        return scheduleSettings?.weekStartDay || "sunday";
                      })()}
                      onValueChange={(value) =>
                        handleSettingsUpdate("scheduleSettings", { weekStartDay: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeFormat">Time Format</Label>
                    <Select
                      value={(() => {
                        const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                          ? safeJsonParse((settings as any).scheduleSettings, {}) 
                          : ((settings as any)?.scheduleSettings || {});
                        return scheduleSettings?.timeFormat || "12";
                      })()}
                      onValueChange={(value) =>
                        handleSettingsUpdate("scheduleSettings", { timeFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12-Hour (AM/PM)</SelectItem>
                        <SelectItem value="24">24-Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


              </CardContent>
            </Card>

            {/* Show Schedule Filtering */}
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Show Schedule Filtering</CardTitle>
                <CardDescription>
                  Configure which event types appear in your schedule views by default. Only enabled types will be shown in monthly, weekly, and daily views.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {eventTypes.map((eventType: any) => (
                      <div key={eventType.id} className="flex items-center justify-between p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: eventType.color }}
                          />
                          <div>
                            <h4 className="font-medium">{eventType.name}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {eventType.isDefault && (
                            <span className="text-xs text-blue-700 font-medium">
                              System
                            </span>
                          )}
                          <Switch
                            checked={(() => {
                              const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                                ? safeJsonParse((settings as any).scheduleSettings, {}) 
                                : ((settings as any)?.scheduleSettings || {});
                              const enabledTypes = scheduleSettings?.enabledEventTypes || [];
                              return enabledTypes.includes(eventType.id) || enabledTypes.includes(eventType.name);
                            })()}
                            onCheckedChange={(checked) => {
                              const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                                ? safeJsonParse((settings as any).scheduleSettings, {}) 
                                : ((settings as any)?.scheduleSettings || {});
                              let enabledTypes = scheduleSettings?.enabledEventTypes || [];
                              
                              if (checked) {
                                // Add the event type (using name for system types, id for custom types)
                                const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
                                if (!enabledTypes.includes(typeIdentifier)) {
                                  enabledTypes = [...enabledTypes, typeIdentifier];
                                }
                              } else {
                                // Remove the event type
                                enabledTypes = enabledTypes.filter((type: any) => 
                                  type !== eventType.id && type !== eventType.name
                                );
                              }
                              
                              handleSettingsUpdate("scheduleSettings", {
                                ...scheduleSettings,
                                enabledEventTypes: enabledTypes
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50/50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> These settings control which event types appear in your schedule views. 
                      You can still create all event types, but only enabled ones will be visible in the calendar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Template */}
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Schedule Publication Email</CardTitle>
                <CardDescription>
                  Customize the email template sent to team members when schedules are published.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Sender Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-900">Email Sender Configuration</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sender Name */}
                    <div className="space-y-2">
                      <Label htmlFor="senderName">Sender Name</Label>
                      <Input
                        id="senderName"
                        placeholder={`${project?.name || 'Show Name'} SM`}
                        value={(() => {
                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          return scheduleSettings?.emailSender?.senderName || `${project?.name || 'Show Name'} SM`;
                        })()}
                        onChange={(e) => {
                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          handleSettingsUpdate("scheduleSettings", {
                            ...scheduleSettings,
                            emailSender: {
                              ...scheduleSettings?.emailSender,
                              senderName: e.target.value
                            }
                          });
                        }}
                      />
                      <p className="text-xs text-gray-500">This name will appear as the sender in recipients' inboxes</p>
                    </div>

                    {/* Reply-To Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="replyToType">Reply-To</Label>
                      <Select
                        value={(() => {
                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          return scheduleSettings?.emailSender?.replyToType || 'account';
                        })()}
                        onValueChange={(value) => {
                          // Handle navigation to email page for new team account
                          if (value === 'new_team_account') {
                            setLocation('/email');
                            return;
                          }

                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          
                          let replyToEmail;
                          if (value === 'backstage_email') {
                            const backstageAccount = emailAccounts.find((account: any) => account.emailAddress?.includes('@backstageos.com'));
                            replyToEmail = backstageAccount?.emailAddress;
                          } else if (value === 'account') {
                            replyToEmail = user?.email;
                          } else if (value.startsWith('team_')) {
                            const teamAccountId = value.replace('team_', '');
                            const teamAccount = emailAccounts.find((account: any) => account.id === parseInt(teamAccountId));
                            replyToEmail = teamAccount?.emailAddress || user?.email;
                          } else if (value === 'external') {
                            replyToEmail = scheduleSettings?.emailSender?.replyToEmail || '';
                          }

                          handleSettingsUpdate("scheduleSettings", {
                            ...scheduleSettings,
                            emailSender: {
                              ...scheduleSettings?.emailSender,
                              replyToType: value,
                              replyToEmail: replyToEmail
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reply-to address" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailAccounts.find((account: any) => account.emailAddress?.includes('@backstageos.com')) && (
                            <SelectItem value="backstage_email">
                              {emailAccounts.find((account: any) => account.emailAddress?.includes('@backstageos.com'))?.emailAddress} (BackstageOS Email)
                            </SelectItem>
                          )}
                          <SelectItem value="account">{user?.email} (Account Email)</SelectItem>
                          {emailAccounts
                            .filter((account: any) => account.projectId === parseInt(projectId) && account.accountType === 'team')
                            .map((teamAccount: any) => (
                              <SelectItem key={teamAccount.id} value={`team_${teamAccount.id}`}>
                                {teamAccount.emailAddress} (Team Email)
                              </SelectItem>
                            ))}
                          <SelectItem value="external">Custom Email Address</SelectItem>
                          {!emailAccounts.find((account: any) => 
                            account.projectId === parseInt(projectId) && 
                            account.accountType === 'team') && (
                            <SelectItem 
                              value="new_team_account"
                              className="text-blue-600 font-medium"
                            >
                              + New Team Account
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">All emails send from schedules@backstageos.com with your chosen reply-to address</p>
                    </div>
                  </div>

                  {/* Custom Reply-To Email Configuration - Show when external is selected */}
                  {(() => {
                    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                      ? safeJsonParse((settings as any).scheduleSettings, {}) 
                      : ((settings as any)?.scheduleSettings || {});
                    return scheduleSettings?.emailSender?.replyToType === 'external';
                  })() && (
                    <div className="space-y-2">
                      <Label htmlFor="customReplyToEmail">Custom Reply-To Email</Label>
                      <Input
                        id="customReplyToEmail"
                        type="email"
                        placeholder="your-reply-to@example.com"
                        value={(() => {
                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          return scheduleSettings?.emailSender?.replyToEmail || '';
                        })()}
                        onChange={(e) => {
                          const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                            ? safeJsonParse((settings as any).scheduleSettings, {}) 
                            : ((settings as any)?.scheduleSettings || {});
                          handleSettingsUpdate("scheduleSettings", {
                            ...scheduleSettings,
                            emailSender: {
                              ...scheduleSettings?.emailSender,
                              replyToEmail: e.target.value
                            }
                          });
                        }}
                      />
                      <p className="text-xs text-gray-500">Enter the email address where replies should be sent</p>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50/50 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <strong>Important:</strong> Configure the Reply-To email to ensure all responses from team members about schedule changes reach the stage management team. This prevents lost communication.
                    </p>
                  </div>
                </div>

                {/* Email Template Section */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-4">Email Template</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">Email Subject</Label>
                  <Input
                    ref={(el) => { emailSubjectRef.current = el; }}
                    id="emailSubject"
                    placeholder="Schedule Update - Show Name (Version Number)"
                    value={localEmailSubject || (() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.emailTemplate?.subject || "";
                    })()}
                    onChange={(e) => {
                      setLocalEmailSubject(e.target.value);
                    }}
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {templateVariables.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        onClick={() => insertVariable('subject', variable.key)}
                        title={variable.description}
                      >
                        {variable.displayName}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailBody">Email Body</Label>
                  <div ref={(el) => { emailBodyRef.current = el; }} className="min-h-32 w-full rounded-md border border-input bg-background">
                    <ChangeSummaryEditor
                      content={localEmailBody || (() => {
                        const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                          ? safeJsonParse((settings as any).scheduleSettings, {}) 
                          : ((settings as any)?.scheduleSettings || {});
                        return scheduleSettings?.emailTemplate?.body || "";
                      })()}
                      onChange={setLocalEmailBody}
                      onEditorReady={setEmailBodyEditor}
                      placeholder={`Hi {{contactName}},

The schedule for {{showName}} has been updated with version {{version}}.

{{addedEvents}}

{{changedEvents}}

{{removedEvents}}

You can view your personal schedule here: {{personalScheduleLink}}

Best regards,
The Production Team`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {templateVariables.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        onClick={() => insertVariable('body', variable.key)}
                        title={variable.description}
                      >
                        {variable.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Click the variable buttons above to insert them at your cursor position, or type them manually in the template fields.</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => setShowTestEmailDialog(true)}
                    variant="outline"
                    disabled={sendTestEmailMutation.isPending}
                  >
                    Send Test Email
                  </Button>
                  <Button
                    onClick={saveEmailTemplate}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Save Email Template as Default
                  </Button>
                </div>
                </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Summary</CardTitle>
                <CardDescription>
                  This summary is automatically generated based on actual schedule changes. You can edit it before sending notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="changeSummary">Summary of Changes</Label>
                  <ChangeSummaryEditor
                    content={localChangeSummary || (() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      
                      // If there's custom content, use it; otherwise show saved template or auto-generated as default preview
                      if (scheduleSettings.changeSummary) {
                        return scheduleSettings.changeSummary;
                      }
                      
                      // Use saved template as default, fallback to auto-generated content
                      return scheduleSettings.changeSummaryTemplate || autoChangesSummary?.changesSummary || '';
                    })()}
                    onChange={(content) => {
                      setLocalChangeSummary(content);
                    }}
                    placeholder="Changes will be automatically detected and displayed here..."
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { key: '{{addedEvents}}', displayName: 'Added Events', description: 'List of newly added events' },
                      { key: '{{changedEvents}}', displayName: 'Changed Events', description: 'List of modified events' },
                      { key: '{{removedEvents}}', displayName: 'Removed Events', description: 'List of cancelled events' },
                      { key: '{{changesSummary}}', displayName: 'Full Summary', description: 'Complete summary of all changes' }
                    ].map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        onClick={() => insertVariable('changeSummary', variable.key)}
                        title={variable.description}
                      >
                        {variable.displayName}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      This summary is automatically generated from schedule changes and can be edited. Use template variables to customize the format.
                    </p>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                          ? safeJsonParse((settings as any).scheduleSettings, {}) 
                          : ((settings as any)?.scheduleSettings || {});
                        
                        const contentToSave = localChangeSummary || scheduleSettings.changeSummary;
                        if (contentToSave) {
                          handleSettingsUpdate("scheduleSettings", {
                            ...scheduleSettings,
                            changeSummary: contentToSave,
                            changeSummaryTemplate: contentToSave
                          });
                          toast({
                            title: "Template Saved",
                            description: "Your formatted changes have been saved as the default template.",
                          });
                          setLocalChangeSummary(''); // Clear local state after saving
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save Change Summary as Default
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Sharing */}
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Schedule Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalScheduleShare projectId={parseInt(projectId)} />
              </CardContent>
            </Card>

          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Version Confirmation Dialog */}
      <AlertDialog open={showPublishVersionConfirm} onOpenChange={setShowPublishVersionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCurrentWeekDraft 
                ? 'Publish This Week?' 
                : `Publish ${selectedVersionType === 'major' ? 'Major' : 'Minor'} Version?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCurrentWeekDraft 
                ? 'This will publish this week\'s schedule (Version 1.0) and make it visible to all team members with personal schedules.'
                : `This will create a new ${selectedVersionType} version of your schedule and update all team members' personal schedules. ${selectedVersionType === 'major' ? 'Major versions typically indicate significant schedule changes.' : 'Minor versions typically indicate small adjustments or corrections.'}`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePublishConfirm}
              disabled={publishVersionMutation.isPending}
            >
              {publishVersionMutation.isPending 
                ? 'Publishing...' 
                : isCurrentWeekDraft 
                  ? 'Publish Week'
                  : `Publish ${selectedVersionType === 'major' ? 'Major' : 'Minor'} Version`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Schedule Dialog */}
      <Dialog open={showResendScheduleDialog} onOpenChange={setShowResendScheduleDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Resend Schedule</DialogTitle>
            <DialogDescription>
              Select contacts to resend {currentPublishedVersion ? `version ${currentPublishedVersion.version}` : 'the most recent published version'} of the schedule.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 min-h-0 flex-1">
            {/* Full Company Toggle */}
            <div className="flex-shrink-0 flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border-2">
              <Checkbox
                id="fullCompany"
                checked={resendSelectedContacts.length === allContactIds.length && allContactIds.length > 0}
                onCheckedChange={handleFullCompanyToggle}
                className="h-5 w-5"
              />
              <Label 
                htmlFor="fullCompany" 
                className="text-sm font-bold text-gray-900 cursor-pointer"
              >
                FULL COMPANY ({allContactIds.length} contacts)
              </Label>
            </div>

            {/* Contact List organized by type - Scrollable */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4 min-h-0">
              {Object.keys(organizedContacts).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contacts found for this show.</p>
                </div>
              ) : (
                Object.entries(organizedContacts).map(([contactType, contacts]: [string, any[]]) => (
                  <div key={contactType} className="space-y-2">
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wide px-2 py-1 bg-gray-100 rounded">
                      {contactType}
                    </div>
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-3 px-2">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={resendSelectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => handleContactToggle(contact.id, checked)}
                            className="h-4 w-4"
                          />
                          <Label 
                            htmlFor={`contact-${contact.id}`} 
                            className="text-sm text-gray-900 cursor-pointer flex-1"
                          >
                            {contact.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected contacts indicator - always present to prevent layout shifts */}
            <div className="flex-shrink-0 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              Selected: {resendSelectedContacts.length} contact{resendSelectedContacts.length !== 1 ? 's' : ''}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowResendScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResendSchedule}
              disabled={resendScheduleMutation.isPending || resendSelectedContacts.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {resendScheduleMutation.isPending ? 'Sending...' : `Resend to ${resendSelectedContacts.length} Contact${resendSelectedContacts.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter an email address to test how your schedule notifications will appear to recipients with the "{project?.name} SM" sender format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder={user?.email || "Enter email address"}
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave blank to send to your account email ({user?.email})
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowTestEmailDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={sendTestEmail}
              disabled={sendTestEmailMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendTestEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Template Dialog */}
      <Dialog 
        open={showCreateTemplateDialog} 
        onOpenChange={(open) => {
          setShowCreateTemplateDialog(open);
          if (!open) {
            setTemplateName('');
            setTemplateDescription('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Week as Template</DialogTitle>
            <DialogDescription>
              Save the current week's schedule as a reusable template. You can apply this template to other weeks later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Tech Week Schedule"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="mt-1"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label htmlFor="templateDescription">Description (optional)</Label>
              <Input
                id="templateDescription"
                placeholder="Describe what this template is for..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="mt-1"
                data-testid="input-template-description"
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-medium">Week being saved:</p>
              <p>{currentWeekRange.displayText}</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateTemplateDialog(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!templateName.trim()) {
                  toast({
                    title: "Template name required",
                    description: "Please enter a name for the template.",
                    variant: "destructive",
                  });
                  return;
                }
                
                createTemplateMutation.mutate({
                  name: templateName.trim(),
                  description: templateDescription.trim(),
                  weekStartDate: currentWeekRange.startDateStr
                });
              }}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template-confirm"
            >
              {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog 
        open={showApplyTemplateDialog} 
        onOpenChange={(open) => {
          setShowApplyTemplateDialog(open);
          if (!open) {
            setSelectedTemplateId(null);
            setSkipConflicts(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Weekly Template</DialogTitle>
            <DialogDescription>
              Select a template to apply to the current week. Events from the template will be created on the corresponding days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="selectTemplate">Select Template</Label>
              <Select
                value={selectedTemplateId?.toString() || ''}
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger className="mt-1" data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTemplates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplateId && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                {(() => {
                  const template = scheduleTemplates.find((t: any) => t.id === selectedTemplateId);
                  return template ? (
                    <>
                      <p className="font-medium">{template.name}</p>
                      {template.description && <p className="text-gray-600">{template.description}</p>}
                    </>
                  ) : null;
                })()}
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-medium">Target week:</p>
              <p>{currentWeekRange.displayText}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipConflicts"
                checked={skipConflicts}
                onCheckedChange={(checked) => setSkipConflicts(checked as boolean)}
                data-testid="checkbox-skip-conflicts"
              />
              <Label htmlFor="skipConflicts" className="text-sm">
                Skip conflicting events (create only non-overlapping events)
              </Label>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApplyTemplateDialog(false);
                setSelectedTemplateId(null);
                setSkipConflicts(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!selectedTemplateId) {
                  toast({
                    title: "No template selected",
                    description: "Please select a template to apply.",
                    variant: "destructive",
                  });
                  return;
                }
                
                applyTemplateMutation.mutate({
                  templateId: selectedTemplateId,
                  targetWeekStartDate: currentWeekRange.startDateStr,
                  skipConflicts
                });
              }}
              disabled={applyTemplateMutation.isPending || !selectedTemplateId}
              data-testid="button-apply-template-confirm"
            >
              {applyTemplateMutation.isPending ? 'Applying...' : 'Apply Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton onClick={() => setCreateEventDialog(true)} />
    </div>
  );
}