import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
import { PublicCalendarShare } from "@/components/public-calendar-share";
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
  const { user } = useAuth();
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
  const [eventTypeForm, setEventTypeForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [locationForm, setLocationForm] = useState({ name: '', address: '', description: '', capacity: '', notes: '' });

  // Phase 5 schedule settings state
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [newTemplateCategory, setNewTemplateCategory] = useState({ name: '', description: '' });
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);

  const isFullTime = user?.profileType === "fulltime";
  const showLabel = isFullTime ? "Show" : "Project";

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: [`/api/projects/${params.id}`],
    enabled: !!params.id,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/projects/${params.id}/settings`],
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

  const { data: emailTemplateCategories = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/email-template-categories`],
    enabled: !!params.id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${params.id}/contacts`],
    enabled: !!params.id,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ShowSettings>) => {
      return await apiRequest("PATCH", `/api/projects/${params.id}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/settings`] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProjectUpdate = (updates: any) => {
    setProjectUpdates((prev: any) => ({ ...prev, ...updates }));
  };

  const saveProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${params.id}`, projectUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}`] });
      toast({
        title: "Important Dates Updated",
        description: "Your production dates have been saved successfully.",
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

  const handleDeleteShow = () => {
    deleteProjectMutation.mutate();
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
    setLocationForm({ name: '', address: '', description: '', capacity: '', notes: '' });
    setIsLocationDialogOpen(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || '',
      address: location.address || '',
      description: location.description || '',
      capacity: location.capacity?.toString() || '',
      notes: location.notes || ''
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

  // Public calendar sharing functions
  const copyCalendarLink = async (contactId: number) => {
    try {
      const response = await apiRequest("POST", `/api/projects/${params.id}/calendar/public-link`, { contactId });
      const publicLink = response.publicLink;
      
      await navigator.clipboard.writeText(publicLink);
      toast({
        title: "Calendar Link Copied",
        description: "The shareable calendar link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate calendar link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadCalendarFile = async (contactId: number) => {
    try {
      const response = await apiRequest("GET", `/api/projects/${params.id}/calendar/ics/${contactId}`);
      const icsContent = response.icsContent;
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'schedule'}_${contacts.find((c: any) => c.id === contactId)?.name || 'contact'}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Calendar Downloaded",
        description: "The ICS calendar file has been downloaded to your device.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download calendar file. Please try again.",
        variant: "destructive",
      });
    }
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
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${params.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {(project as any)?.name ? `Back to ${(project as any).name}` : 'Back to Show'}
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Show Settings</h1>
          </div>
          <p className="text-muted-foreground">{(project as any)?.name} • Configure settings and permissions</p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop tabs - hidden on mobile */}
        <TabsList className="hidden md:grid w-full grid-cols-7">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Sharing
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="dates" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Important Dates
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
              <SelectItem value="sharing">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Sharing
                </div>
              </SelectItem>
              <SelectItem value="templates">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
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
              <SelectItem value="dates">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Important Dates
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
                    <Input
                      id="venue"
                      value={showBasicInfo.venue || ""}
                      onChange={(e) => setShowBasicInfo(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="Enter venue"
                    />
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
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this show and all associated data.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Member Settings</CardTitle>
              <CardDescription>
                Configure how team members can join and participate in this {showLabel.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Team Invitations</Label>
                  <p className="text-sm text-muted-foreground">
                    Team members can invite others to join this {showLabel.toLowerCase()}
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.teamMemberSettings?.allowInvitations || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("teamMemberSettings", { allowInvitations: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New team members need approval before joining
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.teamMemberSettings?.requireApproval || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("teamMemberSettings", { requireApproval: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultRole">Default Role</Label>
                  <Select
                    value={(settings as any)?.teamMemberSettings?.defaultRole || "member"}
                    onValueChange={(value) =>
                      handleSettingsUpdate("teamMemberSettings", { defaultRole: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Team Member</SelectItem>
                      <SelectItem value="assistant">Assistant {isFullTime ? "Stage Manager" : "Manager"}</SelectItem>
                      <SelectItem value="lead">Lead {isFullTime ? "Stage Manager" : "Manager"}</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxMembers">Maximum Members</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="1"
                    max="100"
                    value={(settings as any)?.teamMemberSettings?.maxMembers || 20}
                    onChange={(e) =>
                      handleSettingsUpdate("teamMemberSettings", { maxMembers: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
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

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>
                Configure how templates are managed and shared within this {showLabel.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Default Templates</Label>
                  <p className="text-sm text-muted-foreground">
                    Include standard theater templates in this {showLabel.toLowerCase()}
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.templateSettings?.useDefaultTemplates !== false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("templateSettings", { useDefaultTemplates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Custom Templates</Label>
                  <p className="text-sm text-muted-foreground">
                    Team members can create and modify templates
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.templateSettings?.allowCustomTemplates !== false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("templateSettings", { allowCustomTemplates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Template Approval Required</Label>
                  <p className="text-sm text-muted-foreground">
                    New templates need approval before use
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.templateSettings?.templateApprovalRequired || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("templateSettings", { templateApprovalRequired: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shared Template Library</Label>
                  <p className="text-sm text-muted-foreground">
                    Access templates from other {isFullTime ? "shows" : "projects"} in your organization
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.templateSettings?.sharedTemplateLibrary || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("templateSettings", { sharedTemplateLibrary: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>
                Configure report generation, review, and archival settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultReportType">Default Report Type</Label>
                <Select
                  value={(settings as any)?.reportSettings?.defaultReportType || "rehearsal"}
                  onValueChange={(value) =>
                    handleSettingsUpdate("reportSettings", { defaultReportType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rehearsal">Rehearsal Report</SelectItem>
                    <SelectItem value="performance">Performance Report</SelectItem>
                    <SelectItem value="tech">Tech Report</SelectItem>
                    <SelectItem value="meeting">Meeting Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Review</Label>
                  <p className="text-sm text-muted-foreground">
                    Reports need approval before being finalized
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.reportSettings?.requireReview || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("reportSettings", { requireReview: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Archive Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically archive old reports
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.reportSettings?.autoArchive || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("reportSettings", { autoArchive: checked })
                  }
                />
              </div>

              {(settings as any)?.reportSettings?.autoArchive && (
                <div className="space-y-2">
                  <Label htmlFor="archiveDays">Archive After (Days)</Label>
                  <Input
                    id="archiveDays"
                    type="number"
                    min="1"
                    max="365"
                    value={(settings as any)?.reportSettings?.archiveDays || 30}
                    onChange={(e) =>
                      handleSettingsUpdate("reportSettings", { archiveDays: parseInt(e.target.value) })
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when reports are created or updated
                  </p>
                </div>
                <Switch
                  checked={(settings as any)?.reportSettings?.notificationsEnabled !== false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("reportSettings", { notificationsEnabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
              <CardDescription>
                Configure timezone, working hours, and scheduling preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workStart">Work Start Time</Label>
                  <Input
                    id="workStart"
                    type="time"
                    value={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.workingHours?.start || "09:00";
                    })()}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...(() => {
                            const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                              ? safeJsonParse((settings as any).scheduleSettings, {}) 
                              : ((settings as any)?.scheduleSettings || {});
                            return scheduleSettings?.workingHours || {};
                          })(),
                          start: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workEnd">Work End Time</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    value={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.workingHours?.end || "18:00";
                    })()}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...(() => {
                            const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                              ? safeJsonParse((settings as any).scheduleSettings, {}) 
                              : ((settings as any)?.scheduleSettings || {});
                            return scheduleSettings?.workingHours || {};
                          })(),
                          end: e.target.value,
                        },
                      })
                    }
                  />
                </div>

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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Schedule Conflicts</Label>
                  <p className="text-sm text-muted-foreground">
                    Permit overlapping events in the schedule
                  </p>
                </div>
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Event Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders before scheduled events
                  </p>
                </div>
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

          {/* Show Schedule Filtering */}
          <Card className="mt-6">
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
                    <div key={eventType.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: eventType.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{eventType.name}</h4>
                            {eventType.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                System
                              </span>
                            )}
                          </div>
                          {eventType.description && (
                            <p className="text-sm text-muted-foreground">{eventType.description}</p>
                          )}
                        </div>
                      </div>
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
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> These settings control which event types appear in your schedule views. 
                    You can still create all event types, but only enabled ones will be visible in the calendar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Types Management */}
          <Card className="mt-6">
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
                    <div key={eventType.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: eventType.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{eventType.name}</h4>
                            {eventType.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                System
                              </span>
                            )}
                          </div>
                          {eventType.description && (
                            <p className="text-sm text-muted-foreground">{eventType.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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

          {/* Event Locations Management */}
          <Card className="mt-6">
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
                    <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
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

          {/* Google Calendar Integration */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                One-way sync from BackstageOS to Google Calendar for team coordination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarIntegrations.length > 0 ? (
                <div className="space-y-4">
                  {calendarIntegrations.map((integration: any) => (
                    <div key={integration.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Link className="h-5 w-5 text-green-600" />
                          <div>
                            <h4 className="font-medium">{integration.calendarName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Connected {new Date(integration.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectCalendar.mutate(integration.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Sync Personal Schedules</Label>
                          <Switch
                            checked={integration.syncSettings?.syncPersonalSchedules || false}
                            onCheckedChange={(checked) =>
                              updateSyncSettings.mutate({
                                integrationId: integration.id,
                                syncSettings: {
                                  ...integration.syncSettings,
                                  syncPersonalSchedules: checked,
                                },
                              })
                            }
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Default Reminders</Label>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="1440"
                                placeholder="15"
                                value={integration.syncSettings?.defaultReminders?.[0]?.minutes || ''}
                                onChange={(e) => {
                                  const minutes = parseInt(e.target.value) || 0;
                                  updateSyncSettings.mutate({
                                    integrationId: integration.id,
                                    syncSettings: {
                                      ...integration.syncSettings,
                                      defaultReminders: [{ method: 'popup', minutes }],
                                    },
                                  });
                                }}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">minutes before event</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Connect Google Calendar</h3>
                  <p className="text-muted-foreground mb-4">
                    Sync your schedule to Google Calendar for better team coordination.
                  </p>
                  <Button onClick={() => connectGoogleCalendar.mutate()}>
                    <Link className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Public Calendar Sharing */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Public Calendar Sharing
              </CardTitle>
              <CardDescription>
                Generate shareable calendar links for non-users (like producers) to add personal schedules to their Google Calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((contact: any) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCalendarLink(contact.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadCalendarFile(contact.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download ICS
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No contacts available. Add team members to generate shareable calendar links.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Team Notification Preferences */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Team Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how team members receive schedule update notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <div className="space-y-4">
                  {contacts.map((contact: any) => {
                    const prefs = notificationPreferences.find((p: any) => p.contactId === contact.id) || {};
                    return (
                      <div key={contact.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">{contact.name}</h4>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Schedule Updates</Label>
                            <Switch
                              checked={prefs.scheduleUpdates !== false}
                              onCheckedChange={(checked) =>
                                updateNotificationPreferences.mutate({
                                  contactId: contact.id,
                                  preferences: { ...prefs, scheduleUpdates: checked },
                                })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Major Versions Only</Label>
                            <Switch
                              checked={prefs.majorVersionsOnly || false}
                              onCheckedChange={(checked) =>
                                updateNotificationPreferences.mutate({
                                  contactId: contact.id,
                                  preferences: { ...prefs, majorVersionsOnly: checked },
                                })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Email Notifications</Label>
                            <Switch
                              checked={prefs.emailEnabled !== false}
                              onCheckedChange={(checked) =>
                                updateNotificationPreferences.mutate({
                                  contactId: contact.id,
                                  preferences: { ...prefs, emailEnabled: checked },
                                })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Calendar Sync</Label>
                            <Switch
                              checked={prefs.calendarSync || false}
                              onCheckedChange={(checked) =>
                                updateNotificationPreferences.mutate({
                                  contactId: contact.id,
                                  preferences: { ...prefs, calendarSync: checked },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No team members found. Add contacts to configure notification preferences.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Version Analytics */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Schedule Version Analytics
              </CardTitle>
              <CardDescription>
                Track and analyze changes between schedule versions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changeStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{changeStats.totalVersions || 0}</div>
                    <div className="text-sm text-blue-600">Total Versions</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{changeStats.totalChanges || 0}</div>
                    <div className="text-sm text-green-600">Total Changes</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{changeStats.eventsAdded || 0}</div>
                    <div className="text-sm text-yellow-600">Events Added</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{changeStats.eventsRemoved || 0}</div>
                    <div className="text-sm text-red-600">Events Removed</div>
                  </div>
                </div>
              ) : null}
              
              {scheduleComparisons.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium">Recent Comparisons</h4>
                  {scheduleComparisons.slice(0, 5).map((comparison: any) => (
                    <div key={comparison.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Version {comparison.fromVersionId} → Version {comparison.toVersionId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comparison.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {comparison.comparisonData?.summary?.totalChanges || 0} changes
                          </p>
                          <p className="text-xs text-muted-foreground">
                            +{comparison.comparisonData?.summary?.eventsAdded || 0} 
                            ~{comparison.comparisonData?.summary?.eventsModified || 0} 
                            -{comparison.comparisonData?.summary?.eventsRemoved || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GitCompare className="h-12 w-12 mx-auto mb-4" />
                  <p>No version comparisons yet. Comparisons are generated automatically when schedules are published.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Template Categories */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Email Template Categories
                  </CardTitle>
                  <CardDescription>
                    Organize schedule notification templates by purpose or audience.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewCategoryDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emailTemplateCategories.length > 0 ? (
                <div className="space-y-3">
                  {emailTemplateCategories.map((category: any) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplateCategory.mutate(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4" />
                  <p>No template categories created yet. Organize your email templates by creating categories.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Public Calendar Sharing */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <PublicCalendarShare projectId={parseInt(params.id)} />
            </CardContent>
          </Card>

          {/* New Template Category Dialog */}
          <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template Category</DialogTitle>
                <DialogDescription>
                  Create a new category to organize your schedule notification templates.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newTemplateCategory.name}
                    onChange={(e) => setNewTemplateCategory({ ...newTemplateCategory, name: e.target.value })}
                    placeholder="e.g., Cast Notifications, Crew Updates"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDescription">Description (Optional)</Label>
                  <Input
                    id="categoryDescription"
                    value={newTemplateCategory.description}
                    onChange={(e) => setNewTemplateCategory({ ...newTemplateCategory, description: e.target.value })}
                    placeholder="Brief description of this category"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createTemplateCategory.mutate(newTemplateCategory)}
                  disabled={!newTemplateCategory.name}
                >
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="dates" className="mt-6">
          <Card>
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
              
              <div className="pt-4 border-t">
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
      </div>
    </div>
  );
}