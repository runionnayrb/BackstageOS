import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminView } from "@/contexts/AdminViewContext";
import { PersonalScheduleShare } from "@/components/personal-schedule-share";
import { ChangeSummaryEditor } from "@/components/ChangeSummaryEditor";
import { InviteTeamMemberDialog } from "@/components/team/InviteTeamMemberDialog";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { GlobalTemplateSettingsContent } from "@/components/GlobalTemplateSettingsContent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Users,
  Share2,
  FileText,
  BarChart3,
  Calendar,
  Save,
  Trash2,
  Archive,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Download,
  Shield,
  Clock,
  ArrowLeft,
  Edit3,
  Plus,
  GripVertical,
  MapPin,
  Tag,
  Palette,
  Link,
  Unlink,
  Mail,
  GitCompare
} from "lucide-react";

// Helper function to safely parse JSON with error handling
const safeJsonParse = (jsonString: string, fallback: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

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

interface ShowSettingsParams {
  id: string;
}

interface ShowSettings {
  id: number;
  projectId: number;
  teamMemberSettings: {
    allowInvitations: boolean;
    requireApproval: boolean;
    defaultRole: string;
    maxMembers: number;
  };
  sharingSettings: {
    isPublic: boolean;
    allowGuestView: boolean;
    shareableLink: string;
    linkExpiration: string | null;
    password: string | null;
  };
  templateSettings: {
    useDefaultTemplates: boolean;
    allowCustomTemplates: boolean;
    templateApprovalRequired: boolean;
    sharedTemplateLibrary: boolean;
  };
  reportSettings: {
    defaultReportType: string;
    requireReview: boolean;
    autoArchive: boolean;
    archiveDays: number;
    notificationsEnabled: boolean;
  };
  scheduleSettings: {
    timeZone: string;
    workingHours: {
      start: string;
      end: string;
    };
    allowConflicts: boolean;
    reminderSettings: {
      enabled: boolean;
      minutesBefore: number;
    };
  };
}

export default function ShowSettings() {
  const params = useParams<ShowSettingsParams>();
  const { id } = params;
  const { user } = useAuth();
  const { canAccessFeature } = useBetaFeatures();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<any>({});
  const [showBasicInfo, setShowBasicInfo] = useState<any>({});
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  // Event types and locations management state
  const [isEventTypeDialogOpen, setIsEventTypeDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<any>(null);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  
  // Drag and drop state for locations
  const [draggedLocationId, setDraggedLocationId] = useState<number | null>(null);
  const [dragOverLocationId, setDragOverLocationId] = useState<number | null>(null);
  const [eventTypeForm, setEventTypeForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [locationForm, setLocationForm] = useState({ name: '', address: '', description: '', capacity: '', notes: '', locationType: 'main' });

  // Phase 5 schedule settings state
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [newTemplateCategory, setNewTemplateCategory] = useState({ name: '', description: '' });
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  
  // Venue creation state
  const [showNewVenueDialog, setShowNewVenueDialog] = useState(false);
  const [newVenueForm, setNewVenueForm] = useState({ name: '', address: '', capacity: '', notes: '' });
  
  // Email template refs
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const [localChangeSummary, setLocalChangeSummary] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);

  // Use admin view context to override profile type for testing
  const { selectedProfileType } = useAdminView();
  const effectiveProfileType = user ? (selectedProfileType === 'all' ? user.profileType : selectedProfileType) : 'freelance';
  const isFullTime = effectiveProfileType === "fulltime";
  const showLabel = isFullTime ? "Show" : "Project";

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: [`/api/projects/${params.id}`],
    enabled: !!params.id,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/projects/${params.id}/settings`],
    enabled: !!params.id,
  });

  // Query for auto-generated change summary (for the change summary section)
  const { data: autoChangesSummary } = useQuery({
    queryKey: [`/api/projects/${params.id}/schedule-changes-summary`],
    enabled: !!params.id,
  });

  const { data: eventTypes = [], refetch: refetchEventTypes } = useQuery({
    queryKey: [`/api/projects/${params.id}/event-types`],
    enabled: !!params.id && !!user,
  });

  const { data: locations = [], refetch: refetchLocations } = useQuery({
    queryKey: [`/api/projects/${params.id}/event-locations`],
    enabled: !!params.id && !!user,
  });

  // Phase 5 queries
  const { data: calendarIntegrations = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/calendar/integrations`],
    enabled: !!params.id,
  });

  const { data: notificationPreferences = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/notification-preferences`],
    enabled: !!params.id,
  });

  const { data: scheduleComparisons = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/schedule/comparisons`],
    enabled: !!params.id,
  });

  const { data: changeStats } = useQuery({
    queryKey: [`/api/projects/${params.id}/schedule/change-stats`],
    enabled: !!params.id,
  });

  // Query venues for full-time users
  const { data: venues = [], refetch: refetchVenues } = useQuery({
    queryKey: ["/api/venues"],
    enabled: !!user && isFullTime,
  });



  const { data: emailTemplateCategories = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/email-template-categories`],
    enabled: !!params.id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/contacts`],
    enabled: !!params.id,
  });

  // Query for email accounts
  const { data: emailAccounts = [] } = useQuery({
    queryKey: [`/api/email/accounts`],
    enabled: !!user,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ShowSettings>) => {
      return await apiRequest("PATCH", `/api/projects/${params.id}/settings`, data);
    },
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${params.id}/settings`] });
      
      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData([`/api/projects/${params.id}/settings`]);
      
      // Optimistically update to the new value
      queryClient.setQueryData([`/api/projects/${params.id}/settings`], (oldData: any) => {
        if (!oldData) return newSettings;
        return { ...oldData, ...newSettings };
      });
      
      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/settings`] });
      
      // Check if this is a schedule filtering update (no toast for these)
      const isScheduleFilterUpdate = variables.scheduleSettings && 
        JSON.parse(variables.scheduleSettings || '{}').enabledEventTypes;
      
      if (!isScheduleFilterUpdate) {
        toast({
          title: "Settings Updated",
          description: "Your settings have been saved successfully.",
        });
      }
    },
    onError: (error, variables, context) => {
      // Roll back to the previous value
      if (context?.previousSettings) {
        queryClient.setQueryData([`/api/projects/${params.id}/settings`], context.previousSettings);
      }
      
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
        ? safeJsonParse((settings as any).scheduleSettings, {}) 
        : ((settings as any)?.scheduleSettings || {});
      
      const emailData = {
        emailSubject: localEmailSubject || scheduleSettings?.emailTemplate?.subject || "Schedule Update - {{showName}} ({{version}})",
        emailBody: localEmailBody || scheduleSettings?.emailTemplate?.body || `Hi {{contactName}},

The schedule for {{showName}} has been updated with version {{version}}.

{{addedEvents}}

{{changedEvents}}

{{removedEvents}}

You can view your personal schedule here: {{personalScheduleLink}}

Best regards,
The Production Team`,
        testEmailAddress: testEmailAddress || user?.email || ""
      };
      
      return await apiRequest("POST", `/api/projects/${params.id}/send-test-email`, emailData);
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

  const handleProjectUpdate = (updates: any) => {
    setProjectUpdates((prev: any) => ({ ...prev, ...updates }));
  };
  
  const sendTestEmail = () => {
    sendTestEmailMutation.mutate();
    setShowTestEmailDialog(false);
  };

  // Function to insert variable into email template fields
  const [localEmailSubject, setLocalEmailSubject] = useState('');
  const [localEmailBody, setLocalEmailBody] = useState('');
  const [emailBodyEditor, setEmailBodyEditor] = useState(null);

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

  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/projects/${params.id}`, projectUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/schedule-events`] });
      setProjectUpdates({}); // Clear the pending updates
      toast({
        title: "Important Dates Updated",
        description: "Your production dates have been saved successfully and will appear on the calendar as all-day events.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save important dates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBasicInfoMutation = useMutation({
    mutationFn: async (data: { name?: string; venue?: string; description?: string }) => {
      return await apiRequest("PUT", `/api/projects/${params.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditingBasicInfo(false);
      toast({
        title: "Show Updated",
        description: "Show information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update show information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setLocation("/");
      toast({
        title: "Show Deleted",
        description: "The show has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete show. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${params.id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}`] });
      setLocation("/");
      toast({
        title: "Show Archived",
        description: "The show has been moved to archives while preserving all data.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive show. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${params.id}/share-link`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "settings"] });
      toast({
        title: "Share Link Generated",
        description: "A new shareable link has been created.",
      });
    },
  });

  // Event type mutations
  const createEventTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/projects/${params.id}/event-types`, data);
    },
    onSuccess: () => {
      refetchEventTypes();
      setIsEventTypeDialogOpen(false);
      setEventTypeForm({ name: '', description: '', color: '#3b82f6' });
      setEditingEventType(null);
      toast({
        title: "Event Type Created",
        description: "Event type has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEventTypeMutation = useMutation({
    mutationFn: async ({ id: eventTypeId, data }: { id: number; data: any }) => {
      // For system event types (negative IDs), include projectId in the data
      const updateData = eventTypeId < 0 ? { ...data, projectId: parseInt(id!) } : data;
      return await apiRequest("PUT", `/api/event-types/${eventTypeId}`, updateData);
    },
    onSuccess: () => {
      refetchEventTypes();
      setIsEventTypeDialogOpen(false);
      setEventTypeForm({ name: '', description: '', color: '#3b82f6' });
      setEditingEventType(null);
      toast({
        title: "Event Type Updated",
        description: "Event type has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventTypeMutation = useMutation({
    mutationFn: async (eventTypeId: number) => {
      // For system event types (negative IDs), pass projectId in request body
      const body = eventTypeId < 0 ? { projectId: parseInt(id!) } : {};
      return await apiRequest("DELETE", `/api/event-types/${eventTypeId}`, body);
    },
    onSuccess: () => {
      refetchEventTypes();
      toast({
        title: "Event Type Deleted",
        description: "Event type has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete event type. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/projects/${params.id}/event-locations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/event-locations`] });
      refetchLocations();
      setIsLocationDialogOpen(false);
      setLocationForm({ name: '', address: '', description: '', capacity: '', notes: '' });
      setEditingLocation(null);
      toast({
        title: "Location Created",
        description: "Location has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id: locationId, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/event-locations/${locationId}`, data);
    },
    onSuccess: () => {
      refetchLocations();
      setIsLocationDialogOpen(false);
      setLocationForm({ name: '', address: '', description: '', capacity: '', notes: '' });
      setEditingLocation(null);
      toast({
        title: "Location Updated",
        description: "Location has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: number) => {
      return await apiRequest("DELETE", `/api/event-locations/${locationId}`);
    },
    onSuccess: () => {
      refetchLocations();
      toast({
        title: "Location Deleted",
        description: "Location has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reorderLocationsMutation = useMutation({
    mutationFn: async (locationIds: number[]) => {
      return await apiRequest("PUT", `/api/projects/${params.id}/event-locations/reorder`, {
        locationIds
      });
    },
    onSuccess: () => {
      refetchLocations();
      toast({
        title: "Locations Reordered",
        description: "Location order has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder locations. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Drag and drop handlers for locations
  const handleLocationDragStart = (e: React.DragEvent, locationId: number) => {
    setDraggedLocationId(locationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLocationDragOver = (e: React.DragEvent, locationId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLocationId(locationId);
  };

  const handleLocationDragLeave = () => {
    setDragOverLocationId(null);
  };

  const handleLocationDrop = (e: React.DragEvent, dropLocationId: number) => {
    e.preventDefault();
    
    if (!draggedLocationId || draggedLocationId === dropLocationId) {
      setDraggedLocationId(null);
      setDragOverLocationId(null);
      return;
    }

    // Create new order array
    const locationsCopy = [...locations];
    const draggedIndex = locationsCopy.findIndex(loc => loc.id === draggedLocationId);
    const dropIndex = locationsCopy.findIndex(loc => loc.id === dropLocationId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Remove dragged item and insert at new position
    const [draggedItem] = locationsCopy.splice(draggedIndex, 1);
    locationsCopy.splice(dropIndex, 0, draggedItem);

    // Update sort order and send to server
    const locationIds = locationsCopy.map(loc => loc.id);
    reorderLocationsMutation.mutate(locationIds);

    setDraggedLocationId(null);
    setDragOverLocationId(null);
  };

  const handleLocationDragEnd = () => {
    setDraggedLocationId(null);
    setDragOverLocationId(null);
  };

  // Phase 5 mutations
  const connectGoogleCalendar = useMutation({
    mutationFn: async () => {
      // Always use real OAuth flow - let server handle development bypasses
      console.log('Starting Google Calendar connection...');
      const response = await apiRequest('GET', `/api/projects/${params.id}/calendar/auth-url`);
      console.log('API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Auth URL:', response?.authUrl);
      
      return new Promise((resolve, reject) => {
        const authUrl = response?.authUrl;
        if (!authUrl) {
          console.error('No authUrl in response:', response);
          reject(new Error('No auth URL received from server'));
          return;
        }
        
        console.log('Opening popup with URL:', authUrl);
        const popup = window.open(authUrl, '_blank', 'width=500,height=600');
        
        // Listen for messages from the popup
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            window.removeEventListener('message', messageHandler);
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/calendar/integrations`] });
            resolve(event.data.data);
            
            // Handle both real and temporary integrations
            if (event.data.data.temporary) {
              toast({
                title: "Google Calendar Connected (Temporary)",
                description: "Temporary integration created for testing OAuth consent screen configuration.",
              });
            } else {
              toast({
                title: "Google Calendar Connected",
                description: "Successfully connected to Google Calendar.",
              });
            }
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Handle popup being closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            reject(new Error('Authorization window was closed'));
          }
        }, 1000);
      });
    },
    onSuccess: () => {
      // Success handled in the promise above
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Google Calendar",
        variant: "destructive",
      });
    },
  });

  const updateSyncSettings = useMutation({
    mutationFn: async ({ integrationId, syncSettings }: { integrationId: number; syncSettings: any }) => {
      return apiRequest('PUT', `/api/projects/${params.id}/calendar/integrations/${integrationId}`, { syncSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/calendar/integrations`] });
      toast({
        title: "Settings updated",
        description: "Google Calendar sync settings have been updated.",
      });
    },
  });

  const disconnectCalendar = useMutation({
    mutationFn: async (integrationId: number) => {
      return apiRequest('DELETE', `/api/projects/${params.id}/calendar/integrations/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/calendar/integrations`] });
      toast({
        title: "Calendar disconnected",
        description: "Google Calendar has been disconnected.",
      });
    },
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: async ({ contactId, preferences }: { contactId: number; preferences: any }) => {
      return apiRequest('PUT', `/api/projects/${params.id}/notification-preferences/${contactId}`, preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/notification-preferences`] });
      toast({
        title: "Preferences updated",
        description: "Notification preferences have been updated.",
      });
    },
  });

  const createTemplateCategory = useMutation({
    mutationFn: async (categoryData: { name: string; description: string }) => {
      return apiRequest('POST', `/api/projects/${params.id}/email-template-categories`, categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/email-template-categories`] });
      setShowNewCategoryDialog(false);
      setNewTemplateCategory({ name: '', description: '' });
      toast({
        title: "Category created",
        description: "Email template category has been created.",
      });
    },
  });

  const deleteTemplateCategory = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest('DELETE', `/api/projects/${params.id}/email-template-categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/email-template-categories`] });
      toast({
        title: "Category deleted",
        description: "Email template category has been deleted.",
      });
    },
  });

  // Venue mutations for full-time users
  const createVenueMutation = useMutation({
    mutationFn: async (venueData: { name: string; address?: string; capacity?: string; notes?: string }) => {
      return apiRequest('POST', '/api/venues', {
        ...venueData,
        capacity: venueData.capacity ? parseInt(venueData.capacity) : null,
      });
    },
    onSuccess: () => {
      refetchVenues();
      setShowNewVenueDialog(false);
      setNewVenueForm({ name: '', address: '', capacity: '', notes: '' });
      toast({
        title: "Venue created",
        description: "New venue has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create venue. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const copyShareLink = async () => {
    if ((settings as any)?.sharingSettings?.shareableLink) {
      try {
        // Check if Clipboard API is available
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText((settings as any).sharingSettings.shareableLink);
          toast({
            title: "Link Copied",
            description: "Share link copied to clipboard.",
          });
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement("textarea");
          textArea.value = (settings as any).sharingSettings.shareableLink;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
          toast({
            title: "Link Copied",
            description: "Share link copied to clipboard.",
          });
        }
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Unable to copy link to clipboard. Please copy manually.",
          variant: "destructive",
        });
      }
    }
  };

  const generateNewShareLink = () => {
    setIsGeneratingLink(true);
    generateShareLinkMutation.mutate(undefined, {
      onSettled: () => setIsGeneratingLink(false),
    });
  };

  const handleBasicInfoEdit = () => {
    if (project) {
      setShowBasicInfo({
        name: (project as any).name || "",
        venue: (project as any).venue || "",
        venueId: (project as any).venueId || null,
        description: (project as any).description || "",
      });
      setIsEditingBasicInfo(true);
    }
  };

  const handleBasicInfoSave = () => {
    updateBasicInfoMutation.mutate(showBasicInfo);
  };

  const handleBasicInfoCancel = () => {
    setIsEditingBasicInfo(false);
    setShowBasicInfo({});
  };

  const handleCreateVenue = () => {
    if (!newVenueForm.name.trim()) {
      toast({
        title: "Venue name required",
        description: "Please enter a venue name.",
        variant: "destructive",
      });
      return;
    }

    createVenueMutation.mutate(newVenueForm);
  };

  const handleDeleteShow = () => {
    deleteProjectMutation.mutate();
  };

  const handleArchiveShow = () => {
    archiveProjectMutation.mutate();
  };

  // Event type management functions
  const handleCreateEventType = () => {
    setEditingEventType(null);
    setEventTypeForm({ name: '', description: '', color: '#3b82f6' });
    setIsEventTypeDialogOpen(true);
  };

  const handleEditEventType = (eventType: any) => {
    setEditingEventType(eventType);
    setEventTypeForm({
      name: eventType.name || '',
      description: eventType.description || '',
      color: eventType.color || '#3b82f6'
    });
    setIsEventTypeDialogOpen(true);
  };

  const handleSaveEventType = () => {
    if (editingEventType) {
      updateEventTypeMutation.mutate({
        id: editingEventType.id,
        data: eventTypeForm
      });
    } else {
      createEventTypeMutation.mutate(eventTypeForm);
    }
  };

  const handleDeleteEventType = (eventTypeId: number) => {
    deleteEventTypeMutation.mutate(eventTypeId);
  };

  // Location management functions
  const handleCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({ name: '', address: '', description: '', capacity: '', notes: '', locationType: 'main' });
    setIsLocationDialogOpen(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || '',
      address: location.address || '',
      description: location.description || '',
      capacity: location.capacity?.toString() || '',
      notes: location.notes || '',
      locationType: location.locationType || 'main'
    });
    setIsLocationDialogOpen(true);
  };

  const handleSaveLocation = () => {
    const data = {
      ...locationForm,
      capacity: locationForm.capacity ? parseInt(locationForm.capacity) : null,
      projectId: parseInt(id!)
    };

    if (editingLocation) {
      updateLocationMutation.mutate({
        id: editingLocation.id,
        data
      });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  const handleDeleteLocation = (locationId: number) => {
    deleteLocationMutation.mutate(locationId);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6"></div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Show Settings</h1>
          </div>
          <p className="text-muted-foreground">{(project as any)?.name} • Configure settings and permissions</p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop tabs - hidden on mobile */}
        <TabsList className="hidden md:grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Sharing
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Mobile dropdown - shown only on mobile */}
        <div className="md:hidden mb-6">
          <Select
            value={activeTab}
            onValueChange={(value) => setActiveTab(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  General
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </div>
              </SelectItem>
              <SelectItem value="departments">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Departments
                </div>
              </SelectItem>
              <SelectItem value="sharing">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Sharing
                </div>
              </SelectItem>
              <SelectItem value="reports">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </div>
              </SelectItem>
              <SelectItem value="schedule">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Show Information</CardTitle>
              <CardDescription>
                Manage basic show details and settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isEditingBasicInfo ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Show Name</Label>
                    <p className="text-lg">{(project as any)?.name || "Untitled Show"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Venue</Label>
                    <p className="text-lg">{(project as any)?.venue || "No venue specified"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-lg">{(project as any)?.description || "No description provided"}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleBasicInfoEdit} className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Edit Show Information
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="showName">Show Name</Label>
                    <Input
                      id="showName"
                      value={showBasicInfo.name || ""}
                      onChange={(e) => setShowBasicInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter show name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="venue">Venue</Label>
                    {isFullTime ? (
                      <Select
                        value={showBasicInfo.venueId ? showBasicInfo.venueId.toString() : ""}
                        onValueChange={(value) => {
                          if (value === "new") {
                            setShowNewVenueDialog(true);
                          } else {
                            const selectedVenue = venues.find((v: any) => v.id.toString() === value);
                            setShowBasicInfo((prev: any) => ({ 
                              ...prev, 
                              venueId: selectedVenue ? selectedVenue.id : null,
                              venue: selectedVenue ? selectedVenue.name : ""
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select venue" />
                        </SelectTrigger>
                        <SelectContent>
                          {venues?.map((venue: any) => (
                            <SelectItem key={venue.id} value={venue.id.toString()}>
                              {venue.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="new" className="border-t mt-2 pt-2">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              New Venue
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="venue"
                        value={showBasicInfo.venue || ""}
                        onChange={(e) => setShowBasicInfo((prev: any) => ({ ...prev, venue: e.target.value }))}
                        placeholder="Enter venue"
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={showBasicInfo.description || ""}
                      onChange={(e) => setShowBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter show description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleBasicInfoSave}
                      disabled={updateBasicInfoMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateBasicInfoMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={handleBasicInfoCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>App Features</CardTitle>
              <CardDescription>
                Choose which features are available for this show. Hidden features won't appear in navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Communication Features */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Team Email</Label>
                      <p className="text-xs text-muted-foreground">
                        Team-wide email management and notifications
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.email?.team ?? true}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          email: {
                            ...(settings as any)?.featureSettings?.email,
                            team: checked
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Chat</Label>
                      <p className="text-xs text-muted-foreground">
                        Team messaging and communication
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.chat ?? true}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          chat: checked
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Reports
                        {!canAccessFeature('report-builder') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Rehearsal, tech, and performance reports
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.reports ?? true}
                      disabled={!canAccessFeature('report-builder')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          reports: checked
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Calendar
                        {!canAccessFeature('calendar-management') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Show schedule and event management
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.calendar ?? true}
                      disabled={!canAccessFeature('calendar-management')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          calendar: checked
                        })
                      }
                    />
                  </div>
                </div>

                {/* Production Features */}
                <div className="space-y-3">

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Script
                        {!canAccessFeature('script-editor') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Script editing and collaboration tools
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.script ?? true}
                      disabled={!canAccessFeature('script-editor')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          script: checked
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Props
                        {!canAccessFeature('props-tracker') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Props tracking and management
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.props ?? true}
                      disabled={!canAccessFeature('props-tracker')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          props: checked
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Costumes
                        {!canAccessFeature('costume-tracker') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Costume tracking and quick change management
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.costumes ?? true}
                      disabled={!canAccessFeature('costume-tracker')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          costumes: checked
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        Contacts
                        {!canAccessFeature('contact-management') && (
                          <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Cast and crew contact management
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any)?.featureSettings?.contacts ?? true}
                      disabled={!canAccessFeature('contact-management')}
                      onCheckedChange={(checked) =>
                        handleSettingsUpdate("featureSettings", { 
                          ...(settings as any)?.featureSettings,
                          contacts: checked
                        })
                      }
                    />
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Archive or permanently delete this show and all associated data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Archive Show</h4>
                <p className="text-sm text-muted-foreground">
                  Hide this show from active projects while preserving all data. Archived shows can be accessed from the footer.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
                      <Archive className="h-4 w-4" />
                      Archive Show
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive "{(project as any)?.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide the show from your active projects while preserving all data including reports, contacts, schedules, and templates. You can access archived shows from the footer link.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleArchiveShow}
                        className="bg-orange-600 hover:bg-orange-700"
                        disabled={archiveProjectMutation.isPending}
                      >
                        {archiveProjectMutation.isPending ? "Archiving..." : "Yes, archive show"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <h4 className="font-medium text-red-600">Delete Show</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this show and all associated data. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Show
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete "{(project as any)?.name}" 
                        and remove all show data including reports, contacts, schedules, and templates.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteShow}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteProjectMutation.isPending}
                      >
                        {deleteProjectMutation.isPending ? "Deleting..." : "Yes, delete show"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="space-y-6">
            {/* Editor Invitations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stage Management Team (Editors)</CardTitle>
                    <CardDescription>
                      Invite up to 3 team members with editing permissions for this production.
                    </CardDescription>
                  </div>
                  <InviteTeamMemberDialog variant="editor" />
                </div>
              </CardHeader>
              <CardContent>
                <TeamMembersList accessLevel="editor" />
              </CardContent>
            </Card>

            {/* Viewer Invitations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Production Team</CardTitle>
                    <CardDescription>
                      Invite unlimited viewers with read-only access to production information.
                    </CardDescription>
                  </div>
                  <InviteTeamMemberDialog variant="viewer" />
                </div>
              </CardHeader>
              <CardContent>
                <TeamMembersList accessLevel="viewer" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Management</CardTitle>
                  <CardDescription>
                    Manage departments for organizing report sections (e.g., Lighting, Sound, Stage Management)
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-department">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Department</DialogTitle>
                      <DialogDescription>
                        Create a new department to organize report sections.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input
                          id="dept-name"
                          placeholder="e.g., Lighting"
                          data-testid="input-department-name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" data-testid="button-cancel-add-department">
                        Cancel
                      </Button>
                      <Button data-testid="button-confirm-add-department">
                        Add Department
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {settings?.departmentNames && Object.keys(settings.departmentNames).length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(settings.departmentNames).map(([key, name]) => (
                    <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-department-${key}`}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{name as string}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-edit-department-${key}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-delete-department-${key}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first department to organize report sections.
                  </p>
                  <Button data-testid="button-add-first-department">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sharing & Privacy Settings</CardTitle>
              <CardDescription>
                Control who can access this {showLabel.toLowerCase()} and how it can be shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make {showLabel} Public</Label>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can view this {showLabel.toLowerCase()}
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.sharingSettings?.isPublic || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("sharingSettings", { isPublic: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Guest Viewing</Label>
                  <p className="text-sm text-muted-foreground">
                    Non-team members can view read-only content
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.sharingSettings?.allowGuestView || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("sharingSettings", { allowGuestView: checked })
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={(settings as any)?.sharingSettings?.shareableLink || "No link generated"}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyShareLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={generateNewShareLink}
                  disabled={isGeneratingLink}
                  className="w-full"
                >
                  {isGeneratingLink ? "Generating..." : "Generate New Link"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkPassword">Link Password (Optional)</Label>
                <Input
                  id="linkPassword"
                  type="password"
                  placeholder="Set a password for the share link"
                  value={(settings as any)?.sharingSettings?.password || ""}
                  onChange={(e) =>
                    handleSettingsUpdate("sharingSettings", { password: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <GlobalTemplateSettingsContent projectId={params.id!} showSaveButton={true} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
              <CardDescription>
                Configure timezone and scheduling preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label>Allow Schedule Conflicts</Label>
                  <p className="text-sm text-muted-foreground">
                    Permit overlapping events in the schedule
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.allowConflicts || false;
                    })()}
                    onCheckedChange={(checked) =>
                      handleSettingsUpdate("scheduleSettings", { allowConflicts: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <Label>Event Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders before scheduled events
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={(settings as any)?.scheduleSettings?.reminderSettings?.enabled !== false}
                    onCheckedChange={(checked) =>
                      handleSettingsUpdate("scheduleSettings", {
                        reminderSettings: {
                          ...(settings as any)?.scheduleSettings?.reminderSettings,
                          enabled: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {(settings as any)?.scheduleSettings?.reminderSettings?.enabled !== false && (
                <div className="space-y-2">
                  <Label htmlFor="reminderMinutes">Reminder Time (Minutes Before)</Label>
                  <Input
                    id="reminderMinutes"
                    type="number"
                    min="5"
                    max="1440"
                    value={(settings as any)?.scheduleSettings?.reminderSettings?.minutesBefore || 30}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        reminderSettings: {
                          ...(settings as any)?.scheduleSettings?.reminderSettings,
                          minutesBefore: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
              <CardDescription>
                Configure key production milestones and dates for this {showLabel.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepStartDate">Prep Start Date</Label>
                  <Input
                    id="prepStartDate"
                    type="date"
                    value={(project as any)?.prepStartDate ? new Date((project as any).prepStartDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ prepStartDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstRehearsalDate">First Rehearsal</Label>
                  <Input
                    id="firstRehearsalDate"
                    type="date"
                    value={(project as any)?.firstRehearsalDate ? new Date((project as any).firstRehearsalDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstRehearsalDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="designerRunDate">Designer Run</Label>
                  <Input
                    id="designerRunDate"
                    type="date"
                    value={(project as any)?.designerRunDate ? new Date((project as any).designerRunDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ designerRunDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstTechDate">First Tech</Label>
                  <Input
                    id="firstTechDate"
                    type="date"
                    value={(project as any)?.firstTechDate ? new Date((project as any).firstTechDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstTechDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstPreviewDate">First Preview</Label>
                  <Input
                    id="firstPreviewDate"
                    type="date"
                    value={(project as any)?.firstPreviewDate ? new Date((project as any).firstPreviewDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstPreviewDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openingNight">Opening Night</Label>
                  <Input
                    id="openingNight"
                    type="date"
                    value={(project as any)?.openingNight ? new Date((project as any).openingNight).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ openingNight: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="closingDate">Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={(project as any)?.closingDate ? new Date((project as any).closingDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ closingDate: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => saveProjectMutation.mutate()}
                  disabled={saveProjectMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveProjectMutation.isPending ? "Saving..." : "Save Important Dates"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Locations Management */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Event Locations
                  </CardTitle>
                  <CardDescription>
                    Manage locations where events can take place
                  </CardDescription>
                </div>
                <Button onClick={handleCreateLocation} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No locations created yet. Create your first location to get started.
                  </p>
                ) : (
                  locations.map((location: any) => (
                    <div 
                      key={location.id} 
                      draggable
                      onDragStart={(e) => handleLocationDragStart(e, location.id)}
                      onDragOver={(e) => handleLocationDragOver(e, location.id)}
                      onDragLeave={handleLocationDragLeave}
                      onDrop={(e) => handleLocationDrop(e, location.id)}
                      onDragEnd={handleLocationDragEnd}
                      className={`flex items-center p-3 rounded-lg cursor-move transition-colors bg-gray-50/50 ${
                        draggedLocationId === location.id ? 'opacity-50' : ''
                      } ${
                        dragOverLocationId === location.id ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium">{location.name}</h4>
                          {location.address && (
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          )}
                          {location.description && (
                            <p className="text-sm text-muted-foreground">{location.description}</p>
                          )}
                          {location.capacity && (
                            <p className="text-sm text-muted-foreground">Capacity: {location.capacity}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          location.locationType === 'main' ? 'text-blue-600' : 
                          location.locationType === 'auxiliary' ? 'text-purple-600' :
                          location.locationType === 'fittings' ? 'text-green-600' :
                          location.locationType === 'appointments' ? 'text-orange-600' : 'text-gray-600'
                        }`}>
                          {location.locationType === 'main' ? 'Primary' : 
                           location.locationType === 'auxiliary' ? 'Secondary' :
                           location.locationType === 'fittings' ? 'Fittings' :
                           location.locationType === 'appointments' ? 'Appointments' : location.locationType}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLocation(location);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Location</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{location.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteLocation(location.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Types Management */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Event Types
                  </CardTitle>
                  <CardDescription>
                    Manage custom event types for your schedule
                  </CardDescription>
                </div>
                <Button onClick={handleCreateEventType} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading event types...
                  </p>
                ) : (
                  eventTypes.map((eventType: any) => (
                    <div key={eventType.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEventType(eventType)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {eventType.isDefault ? 'Remove System Event Type' : 'Delete Event Type'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {eventType.isDefault 
                                  ? `Are you sure you want to remove "${eventType.name}" from this show? You can add it back later by creating a custom event type with the same name.`
                                  : `Are you sure you want to delete "${eventType.name}"? This action cannot be undone.`
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEventType(eventType.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {eventType.isDefault ? 'Remove' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Show Schedule Filtering */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <CardTitle>Show Schedule Filtering</CardTitle>
              <CardDescription>
                Configure which event types appear in your schedule views by default. Only enabled types will be shown in monthly, weekly, and daily views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eventTypes.map((eventType: any) => (
                    <div key={eventType.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: eventType.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{eventType.name}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
          <Card className="mt-6 border-0 shadow-none">
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
                        return scheduleSettings?.emailSender?.replyToType || 'personal';
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
                          replyToEmail = backstageAccount?.emailAddress || user?.email;
                        } else if (value === 'account') {
                          replyToEmail = user?.email;
                        } else if (value.startsWith('team_')) {
                          const teamAccountId = value.replace('team_', '');
                          const teamAccount = emailAccounts.find((account: any) => account.id === parseInt(teamAccountId));
                          replyToEmail = teamAccount?.emailAddress || user?.email;
                        } else if (value === 'external') {
                          // For external, keep existing reply-to or clear it
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
                          .filter((account: any) => account.projectId === parseInt(params.id) && account.accountType === 'team')
                          .map((teamAccount: any) => (
                            <SelectItem key={teamAccount.id} value={`team_${teamAccount.id}`}>
                              {teamAccount.emailAddress} (Team Email)
                            </SelectItem>
                          ))}
                        <SelectItem value="external">Custom Email Address</SelectItem>
                        {!emailAccounts.find((account: any) => 
                          account.projectId === parseInt(params.id) && 
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
                    <p className="text-xs text-gray-500">Where replies from team members will be sent</p>
                  </div>
                </div>

                {/* Custom Reply-To Email - Show when external is selected */}
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
                      placeholder="stage.manager@example.com"
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
                    <p className="text-xs text-gray-500">
                      Replies from team members will be sent to this email address. This ensures all responses reach the stage management team.
                    </p>
                  </div>
                )}
              </div>

              {/* Email Template Section */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-sm text-gray-900 mb-4">Email Template</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailSubject">Email Subject</Label>
                    <Input
                      ref={emailSubjectRef}
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
                    <div ref={emailBodyRef} className="min-h-32 w-full rounded-md border border-input bg-background">
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
              </div>
            </CardContent>
          </Card>

          {/* Change Summary Template Customization */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <CardTitle>Change Summary</CardTitle>
              <CardDescription>
                This summary is automatically generated based on actual schedule changes. You can edit it before sending notifications and customize the format with template variables.
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
                    This summary is automatically generated from schedule changes and can be edited. Use template variables to customize the format with sample data showing exactly how changes will appear.
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
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <CardTitle>Schedule Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonalScheduleShare projectId={parseInt(params.id)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Type Dialog */}
      <Dialog open={isEventTypeDialogOpen} onOpenChange={setIsEventTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEventType ? 'Edit Event Type' : 'Create Event Type'}
            </DialogTitle>
            <DialogDescription>
              {editingEventType 
                ? 'Update the event type details below.'
                : 'Create a new event type for your schedule.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventTypeName">Name</Label>
              <Input
                id="eventTypeName"
                value={eventTypeForm.name}
                onChange={(e) => setEventTypeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Rehearsal, Performance, Meeting"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventTypeDescription">Description (Optional)</Label>
              <Textarea
                id="eventTypeDescription"
                value={eventTypeForm.description}
                onChange={(e) => setEventTypeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this event type"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventTypeColor">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="eventTypeColor"
                  type="color"
                  value={eventTypeForm.color}
                  onChange={(e) => setEventTypeForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={eventTypeForm.color}
                  onChange={(e) => setEventTypeForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEventTypeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEventType}
              disabled={!eventTypeForm.name.trim() || createEventTypeMutation.isPending || updateEventTypeMutation.isPending}
            >
              {createEventTypeMutation.isPending || updateEventTypeMutation.isPending ? 'Saving...' : 'Save Event Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Create Location'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation 
                ? 'Update the location details below.'
                : 'Create a new location for your events.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Name</Label>
              <Input
                id="locationName"
                value={locationForm.name}
                onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Theater, Studio A, Conference Room"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locationType">Location Type</Label>
              <Select
                value={locationForm.locationType}
                onValueChange={(value) => setLocationForm(prev => ({ ...prev, locationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Primary</SelectItem>
                  <SelectItem value="auxiliary">Secondary</SelectItem>
                  <SelectItem value="fittings">Fittings</SelectItem>
                  <SelectItem value="appointments">Appointments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locationAddress">Address (Optional)</Label>
              <Input
                id="locationAddress"
                value={locationForm.address}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street address or building location"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locationDescription">Description (Optional)</Label>
              <Textarea
                id="locationDescription"
                value={locationForm.description}
                onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this location"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locationCapacity">Capacity (Optional)</Label>
              <Input
                id="locationCapacity"
                type="number"
                min="1"
                value={locationForm.capacity}
                onChange={(e) => setLocationForm(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="Maximum number of people"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="locationNotes">Notes (Optional)</Label>
              <Textarea
                id="locationNotes"
                value={locationForm.notes}
                onChange={(e) => setLocationForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or special requirements"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!locationForm.name.trim() || createLocationMutation.isPending || updateLocationMutation.isPending}
            >
              {createLocationMutation.isPending || updateLocationMutation.isPending ? 'Saving...' : 'Save Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Venue Dialog */}
      <Dialog open={showNewVenueDialog} onOpenChange={setShowNewVenueDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Venue</DialogTitle>
            <DialogDescription>
              Create a new venue that can be used across all your shows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="venueName">Venue Name *</Label>
              <Input
                id="venueName"
                value={newVenueForm.name}
                onChange={(e) => setNewVenueForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter venue name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="venueAddress">Address</Label>
              <Input
                id="venueAddress"
                value={newVenueForm.address}
                onChange={(e) => setNewVenueForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter venue address"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="venueCapacity">Capacity</Label>
              <Input
                id="venueCapacity"
                type="number"
                value={newVenueForm.capacity}
                onChange={(e) => setNewVenueForm(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="Enter seating capacity"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="venueNotes">Notes</Label>
              <Textarea
                id="venueNotes"
                value={newVenueForm.notes}
                onChange={(e) => setNewVenueForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this venue"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewVenueDialog(false);
                setNewVenueForm({ name: '', address: '', capacity: '', notes: '' });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVenue}
              disabled={!newVenueForm.name.trim() || createVenueMutation.isPending}
            >
              {createVenueMutation.isPending ? 'Creating...' : 'Create Venue'}
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
      </div>
    </div>
  );
}