import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminView } from "@/contexts/AdminViewContext";
import { PersonalScheduleShare } from "@/components/personal-schedule-share";
import { ChangeSummaryEditor } from "@/components/ChangeSummaryEditor";
import { InviteTeamMemberDialog } from "@/components/team/InviteTeamMemberDialog";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { ManageTeamRolesModal } from "@/components/team/ManageTeamRolesModal";
import { GlobalTemplateSettingsContent } from "@/components/GlobalTemplateSettingsContent";
import { ScheduleTemplatesSection } from "@/components/schedule-templates/ScheduleTemplatesSection";
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
  GitCompare,
  Theater,
  ChevronUp,
  ChevronDown,
  Layers,
  History,
  RotateCcw,
  Check,
  FileCheck,
  ChevronsLeft,
  Upload,
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isManageTeamRolesOpen, setIsManageTeamRolesOpen] = useState(false);
  
  // Event types and locations management state
  const [isEventTypeDialogOpen, setIsEventTypeDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<any>(null);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  
  // Drag and drop state for locations
  const [draggedLocationId, setDraggedLocationId] = useState<number | null>(null);
  const [dragOverLocationId, setDragOverLocationId] = useState<number | null>(null);
  // Drag and drop state for event types
  const [draggedEventTypeId, setDraggedEventTypeId] = useState<number | null>(null);
  const [dragOverEventTypeId, setDragOverEventTypeId] = useState<number | null>(null);
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

  // Department management state
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<{ key: string; name: string } | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '' });
  const [deletingDepartmentKey, setDeletingDepartmentKey] = useState<string | null>(null);

  // Running order management state
  const [isRunningOrderDialogOpen, setIsRunningOrderDialogOpen] = useState(false);
  const [editingRunningOrderItem, setEditingRunningOrderItem] = useState<{ id: string; name: string; groupId?: string } | null>(null);
  const [runningOrderForm, setRunningOrderForm] = useState({ name: '', group: '', inShow: true, duration: '' });
  const [deletingRunningOrderId, setDeletingRunningOrderId] = useState<string | null>(null);
  const [isRunningOrderMenuExpanded, setIsRunningOrderMenuExpanded] = useState(false);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);
  const [isEditingStructureGroupModalOpen, setIsEditingStructureGroupModalOpen] = useState(false);
  const [editingStructureGroup, setEditingStructureGroup] = useState<{ id: string; name: string; order: number } | null>(null);
  const [structureGroupForm, setStructureGroupForm] = useState({ name: '' });
  const [deletingStructureGroupId, setDeletingStructureGroupId] = useState<string | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  
  // Running order versioning state
  const [isVersionsDialogOpen, setIsVersionsDialogOpen] = useState(false);
  const [expandedVersionIds, setExpandedVersionIds] = useState<Set<number>>(new Set());
  const [isSaveVersionDialogOpen, setIsSaveVersionDialogOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [versionForm, setVersionForm] = useState({ label: '', notes: '' });
  const [selectedVersionForRevert, setSelectedVersionForRevert] = useState<any>(null);
  const [selectedVersionsToCompare, setSelectedVersionsToCompare] = useState<number[]>([]);
  const [viewingVersion, setViewingVersion] = useState<any>(null);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', bcc: '', subject: '', body: '' });
  const [showCCField, setShowCCField] = useState(false);
  const [showBCCField, setShowBCCField] = useState(false);
  
  // Email body rich text editor
  const emailEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
        strike: false,
      }),
      Underline,
    ],
    content: emailForm.body || '',
    onUpdate: ({ editor }) => {
      setEmailForm({ ...emailForm, body: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 [&_ul]:text-inherit [&_li]:text-inherit [&_h3]:text-inherit',
      },
    },
  });

  // Sync email form when modal opens
  useEffect(() => {
    if (isEmailModalOpen && !emailForm.subject) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const subject = `${project?.name || 'Project'} Running Order - ${dateStr}`;
      setEmailForm(prev => ({ ...prev, subject }));
    }
    // Sync editor content
    if (emailEditor && isEmailModalOpen && emailForm.body) {
      emailEditor.commands.setContent(emailForm.body);
    }
  }, [isEmailModalOpen, emailEditor, emailForm.body]);

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

  // Query for running order versions
  const { data: runningOrderVersions = [], refetch: refetchVersions } = useQuery({
    queryKey: [`/api/projects/${params.id}/running-order-versions`],
    enabled: !!params.id && activeTab === 'running-order',
  });

  // Mutation for creating a new version
  const createVersionMutation = useMutation({
    mutationFn: async (data: { label: string; notes: string; status: 'draft' | 'published' }) => {
      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
        ? safeJsonParse((settings as any).scheduleSettings, {}) 
        : ((settings as any)?.scheduleSettings || {});
      const runningOrder = scheduleSettings.runningOrder || [];
      const structureGroups = scheduleSettings.structureGroups || [];
      
      return await apiRequest("POST", `/api/projects/${params.id}/running-order-versions`, {
        ...data,
        runningOrder,
        structureGroups,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/running-order-versions`] });
      setIsSaveVersionDialogOpen(false);
      setVersionForm({ label: '', notes: '' });
      toast({
        title: "Version Saved",
        description: "Your running order has been saved as a new version.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save version. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a version
  const updateVersionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; label?: string; notes?: string; status?: string }) => {
      return await apiRequest("PATCH", `/api/projects/${params.id}/running-order-versions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/running-order-versions`] });
      toast({
        title: "Version Updated",
        description: "Version has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update version. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a version
  const deleteVersionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/projects/${params.id}/running-order-versions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${params.id}/running-order-versions`] });
      toast({
        title: "Version Deleted",
        description: "Version has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete version. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Revert to a previous version
  const revertToVersion = async (version: any) => {
    const currentScheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const updatedScheduleSettings = {
      ...currentScheduleSettings,
      runningOrder: version.runningOrder,
      structureGroups: version.structureGroups || [],
    };

    await updateSettingsMutation.mutateAsync({
      scheduleSettings: JSON.stringify(updatedScheduleSettings),
    } as any);

    setSelectedVersionForRevert(null);
    toast({
      title: "Version Restored",
      description: `Running order has been reverted to version ${version.versionNumber}.`,
    });
  };

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
      let isScheduleFilterUpdate = false;
      try {
        isScheduleFilterUpdate = variables.scheduleSettings && 
          typeof variables.scheduleSettings === 'string' &&
          JSON.parse(variables.scheduleSettings).enabledEventTypes;
      } catch (e) {
        // Ignore parsing errors
      }
      
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

  // Reorder event types mutation
  const reorderEventTypesMutation = useMutation({
    mutationFn: async (eventTypeIds: number[]) => {
      return await apiRequest("PUT", `/api/projects/${params.id}/event-types/reorder`, {
        eventTypeIds
      });
    },
    onSuccess: () => {
      refetchEventTypes();
      toast({
        title: "Event Types Reordered",
        description: "Event type order has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder event types. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Drag and drop handlers for event types
  const handleEventTypeDragStart = (e: React.DragEvent, eventTypeId: number) => {
    setDraggedEventTypeId(eventTypeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEventTypeDragOver = (e: React.DragEvent, eventTypeId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEventTypeId(eventTypeId);
  };

  const handleEventTypeDragLeave = () => {
    setDragOverEventTypeId(null);
  };

  const handleEventTypeDrop = (e: React.DragEvent, dropEventTypeId: number) => {
    e.preventDefault();
    
    if (!draggedEventTypeId || draggedEventTypeId === dropEventTypeId) {
      setDraggedEventTypeId(null);
      setDragOverEventTypeId(null);
      return;
    }

    // Create new order array
    const eventTypesCopy = [...eventTypes];
    const draggedIndex = eventTypesCopy.findIndex(et => et.id === draggedEventTypeId);
    const dropIndex = eventTypesCopy.findIndex(et => et.id === dropEventTypeId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Remove dragged item and insert at new position
    const [draggedItem] = eventTypesCopy.splice(draggedIndex, 1);
    eventTypesCopy.splice(dropIndex, 0, draggedItem);

    // Update sort order and send to server
    const eventTypeIds = eventTypesCopy.map(et => et.id);
    reorderEventTypesMutation.mutate(eventTypeIds);

    setDraggedEventTypeId(null);
    setDragOverEventTypeId(null);
  };

  const handleEventTypeDragEnd = () => {
    setDraggedEventTypeId(null);
    setDragOverEventTypeId(null);
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
    } else if (section === 'departmentNames') {
      // For departmentNames, replace the entire object instead of merging
      const updatedSettings = {
        ...settingsData,
        departmentNames: updates,
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

  // Department CRUD handlers
  const handleAddDepartment = () => {
    if (!departmentForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a department name.",
        variant: "destructive",
      });
      return;
    }

    const key = `new-dept-${Date.now()}`;
    const currentDepartments = (settings as any)?.departmentNames || {};
    
    const updatedDepartments = {
      ...currentDepartments,
      [key]: departmentForm.name,
    };

    handleSettingsUpdate("departmentNames", updatedDepartments);

    setIsDepartmentDialogOpen(false);
    setDepartmentForm({ name: '' });
  };

  const handleEditDepartment = () => {
    if (!departmentForm.name.trim() || !editingDepartment) {
      toast({
        title: "Name required",
        description: "Please enter a department name.",
        variant: "destructive",
      });
      return;
    }

    const currentDepartments = (settings as any)?.departmentNames || {};
    const updatedDepartments = { ...currentDepartments };
    updatedDepartments[editingDepartment.key] = departmentForm.name;

    handleSettingsUpdate("departmentNames", updatedDepartments);

    setIsDepartmentDialogOpen(false);
    setEditingDepartment(null);
    setDepartmentForm({ name: '' });
  };

  const handleDeleteDepartment = (key: string) => {
    const currentDepartments = (settings as any)?.departmentNames || {};
    const { [key]: removed, ...remainingDepartments } = currentDepartments;

    handleSettingsUpdate("departmentNames", remainingDepartments);

    setDeletingDepartmentKey(null);
  };

  // Running order CRUD handlers - stored in scheduleSettings
  const handleAddRunningOrderItem = () => {
    if (!runningOrderForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this item.",
        variant: "destructive",
      });
      return;
    }

    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const id = `ro-${Date.now()}`;
    const currentRunningOrder = scheduleSettings.runningOrder || [];
    
    const newItem = {
      id,
      name: runningOrderForm.name,
      group: runningOrderForm.group || 'Ungrouped',
      order: currentRunningOrder.length,
      inShow: runningOrderForm.inShow,
      duration: runningOrderForm.duration || '',
    };

    const updatedRunningOrder = [...currentRunningOrder, newItem];
    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, runningOrder: updatedRunningOrder });

    setIsRunningOrderDialogOpen(false);
    setRunningOrderForm({ name: '', group: '', inShow: true, duration: '' });
  };

  const handleEditRunningOrderItem = () => {
    if (!runningOrderForm.name.trim() || !editingRunningOrderItem) {
      toast({
        title: "Name required",
        description: "Please enter a name for this item.",
        variant: "destructive",
      });
      return;
    }

    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const currentRunningOrder = scheduleSettings.runningOrder || [];
    const updatedRunningOrder = currentRunningOrder.map((item: any) =>
      item.id === editingRunningOrderItem.id
        ? { ...item, name: runningOrderForm.name, group: runningOrderForm.group || 'Ungrouped', inShow: runningOrderForm.inShow, duration: runningOrderForm.duration || '' }
        : item
    );

    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, runningOrder: updatedRunningOrder });

    setIsRunningOrderDialogOpen(false);
    setEditingRunningOrderItem(null);
    setRunningOrderForm({ name: '', group: '', inShow: true, duration: '' });
  };

  const handleDeleteRunningOrderItem = (id: string) => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const currentRunningOrder = scheduleSettings.runningOrder || [];
    const updatedRunningOrder = currentRunningOrder.filter((item: any) => item.id !== id);

    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, runningOrder: updatedRunningOrder });

    setDeletingRunningOrderId(null);
  };

  // Structure group handlers
  const getStructureGroups = () => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    return scheduleSettings.structureGroups || [];
  };

  const generateRunningOrderHTML = (runningOrderData?: any[]) => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    const runningOrder = runningOrderData || scheduleSettings.runningOrder || [];
    const inShowItems = runningOrder.filter((item: any) => item.inShow !== false);
    
    // Group items by structure group
    const grouped: Record<string, any[]> = {};
    inShowItems.forEach((item: any) => {
      const group = item.group || 'Ungrouped';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });

    const structureGroupsMap = new Map(
      getStructureGroups()
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((g: any) => [g.name, g.order ?? 0])
    );

    const sortedGroups = Object.keys(grouped).sort((a, b) => {
      if (a === 'Ungrouped') return 1;
      if (b === 'Ungrouped') return -1;
      const orderA = structureGroupsMap.get(a) ?? 999;
      const orderB = structureGroupsMap.get(b) ?? 999;
      return orderA - orderB;
    });

    // Generate HTML
    let html = '';
    sortedGroups.forEach((groupName) => {
      if (groupName !== 'Ungrouped') {
        html += `<h3>${groupName}</h3>`;
      }
      html += '<ul style="color: inherit; list-style-color: inherit;">';
      grouped[groupName]
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((item: any) => {
          html += `<li style="color: inherit;">${item.name}</li>`;
        });
      html += '</ul>';
    });

    return html;
  };

  const downloadRunningOrderPDF = (runningOrderData?: any[]) => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    const runningOrder = runningOrderData || scheduleSettings.runningOrder || [];
    const inShowItems = runningOrder.filter((item: any) => item.inShow !== false);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 11]
    });

    // Set default font to Helvetica to match web app styling
    doc.setFont('Helvetica');

    const marginLeft = 1;
    const marginTop = 1;
    const marginRight = 1;
    const pageHeight = 11;
    const pageWidth = 8.5;
    const contentWidth = pageWidth - marginLeft - marginRight;

    let yPosition = marginTop;

    // Add header
    doc.setFontSize(20);
    doc.setFont('Helvetica', 'bold');
    doc.text((project?.name || 'Running Order'), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 0.35;

    doc.setFontSize(18);
    doc.setFont('Helvetica', 'normal');
    doc.text('Running Order', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 0.5;

    // Group items
    const grouped: Record<string, any[]> = {};
    inShowItems.forEach((item: any) => {
      const group = item.group || 'Ungrouped';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });

    const structureGroupsMap = new Map(
      getStructureGroups()
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((g: any) => [g.name, g.order ?? 0])
    );

    const sortedGroups = Object.keys(grouped).sort((a, b) => {
      if (a === 'Ungrouped') return 1;
      if (b === 'Ungrouped') return -1;
      const orderA = structureGroupsMap.get(a) ?? 999;
      const orderB = structureGroupsMap.get(b) ?? 999;
      return orderA - orderB;
    });

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');

    sortedGroups.forEach((groupName) => {
      // Check if we need a new page
      if (yPosition > pageHeight - marginTop - 0.5) {
        doc.addPage();
        yPosition = marginTop;
      }

      // Group header
      doc.setFont('Helvetica', 'bold');
      doc.text(groupName, marginLeft, yPosition);
      yPosition += 0.25;

      // Group items
      doc.setFont('Helvetica', 'normal');
      grouped[groupName]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((item) => {
          if (yPosition > pageHeight - marginTop - 0.3) {
            doc.addPage();
            yPosition = marginTop;
          }
          doc.text(`  • ${item.name}`, marginLeft, yPosition);
          yPosition += 0.2;
        });

      yPosition += 0.15;
    });

    // Add footer to all pages
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const publishedText = `Published: ${dateStr} at ${timeStr}`;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(publishedText, marginLeft, pageHeight - 0.4);
    }

    doc.save(`${project?.name || 'Running Order'} Running Order - ${dateStr}.pdf`);
  };

  const generateRunningOrderPDFBlob = (runningOrderData?: any[]): Blob => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    const runningOrder = runningOrderData || scheduleSettings.runningOrder || [];
    const inShowItems = runningOrder.filter((item: any) => item.inShow !== false);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [8.5, 11]
    });

    doc.setFont('Helvetica');

    const marginLeft = 1;
    const marginTop = 1;
    const marginRight = 1;
    const pageHeight = 11;
    const pageWidth = 8.5;
    const contentWidth = pageWidth - marginLeft - marginRight;

    let yPosition = marginTop;

    doc.setFontSize(20);
    doc.setFont('Helvetica', 'bold');
    doc.text((project?.name || 'Running Order'), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 0.35;

    doc.setFontSize(18);
    doc.setFont('Helvetica', 'normal');
    doc.text('Running Order', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 0.5;

    const grouped: Record<string, any[]> = {};
    inShowItems.forEach((item: any) => {
      const group = item.group || 'Ungrouped';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });

    const structureGroupsMap = new Map(
      getStructureGroups()
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((g: any) => [g.name, g.order ?? 0])
    );

    const sortedGroups = Object.keys(grouped).sort((a, b) => {
      if (a === 'Ungrouped') return 1;
      if (b === 'Ungrouped') return -1;
      const orderA = structureGroupsMap.get(a) ?? 999;
      const orderB = structureGroupsMap.get(b) ?? 999;
      return orderA - orderB;
    });

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');

    sortedGroups.forEach((groupName) => {
      if (yPosition > pageHeight - marginTop - 0.5) {
        doc.addPage();
        yPosition = marginTop;
      }

      doc.setFont('Helvetica', 'bold');
      doc.text(groupName, marginLeft, yPosition);
      yPosition += 0.25;

      doc.setFont('Helvetica', 'normal');
      grouped[groupName]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((item) => {
          if (yPosition > pageHeight - marginTop - 0.3) {
            doc.addPage();
            yPosition = marginTop;
          }
          doc.text(`  • ${item.name}`, marginLeft, yPosition);
          yPosition += 0.2;
        });

      yPosition += 0.15;
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const publishedText = `Published: ${dateStr} at ${timeStr}`;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(publishedText, marginLeft, pageHeight - 0.4);
    }

    return doc.output('blob') as Blob;
  };

  const handleAddStructureGroup = () => {
    if (!structureGroupForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this group.",
        variant: "destructive",
      });
      return;
    }

    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const currentGroups = scheduleSettings.structureGroups || [];
    const newGroup = {
      id: `sg-${Date.now()}`,
      name: structureGroupForm.name,
      order: currentGroups.length,
    };

    const updatedGroups = [...currentGroups, newGroup];
    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, structureGroups: updatedGroups });

    setStructureGroupForm({ name: '' });
  };

  const handleEditStructureGroup = () => {
    if (!structureGroupForm.name.trim() || !editingStructureGroup) {
      toast({
        title: "Name required",
        description: "Please enter a name for this group.",
        variant: "destructive",
      });
      return;
    }

    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const currentGroups = scheduleSettings.structureGroups || [];
    const updatedGroups = currentGroups.map((group: any) =>
      group.id === editingStructureGroup.id
        ? { ...group, name: structureGroupForm.name }
        : group
    );

    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, structureGroups: updatedGroups });

    setEditingStructureGroup(null);
    setStructureGroupForm({ name: '' });
  };

  const handleDeleteStructureGroup = (id: string) => {
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    const currentGroups = scheduleSettings.structureGroups || [];
    const updatedGroups = currentGroups.filter((group: any) => group.id !== id);

    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, structureGroups: updatedGroups });

    setDeletingStructureGroupId(null);
  };

  const handleReorderStructureGroups = (groups: any[]) => {
    const reorderedGroups = groups.map((group, index) => ({
      ...group,
      order: index,
    }));
    
    const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
      ? safeJsonParse((settings as any).scheduleSettings, {}) 
      : ((settings as any)?.scheduleSettings || {});
    
    handleSettingsUpdate("scheduleSettings", { ...scheduleSettings, structureGroups: reorderedGroups });
  };

  const handleStructureGroupDragStart = (e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStructureGroupDragOver = (e: React.DragEvent<HTMLDivElement>, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
  };

  const handleStructureGroupDragLeave = () => {
    setDragOverGroupId(null);
  };

  const handleStructureGroupDrop = (e: React.DragEvent<HTMLDivElement>, targetGroupId: string) => {
    e.preventDefault();
    if (draggedGroupId === targetGroupId || !draggedGroupId) return;

    const groups = getStructureGroups();
    const draggedIndex = groups.findIndex((g: any) => g.id === draggedGroupId);
    const targetIndex = groups.findIndex((g: any) => g.id === targetGroupId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newGroups = [...groups];
    const draggedGroup = newGroups[draggedIndex];
    newGroups.splice(draggedIndex, 1);
    newGroups.splice(targetIndex, 0, draggedGroup);

    handleReorderStructureGroups(newGroups);
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const handleStructureGroupDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
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
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Show Settings</h1>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop tabs - hidden on mobile */}
        <TabsList className="hidden md:flex w-full justify-start">
          <TabsTrigger value="general" className="flex items-center gap-2 flex-1">
            <Edit3 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2 flex-1">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="running-order" className="flex items-center gap-2 flex-1">
            <Theater className="h-4 w-4" />
            Running Order
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2 flex-1">
            <Tag className="h-4 w-4" />
            Departments
          </TabsTrigger>
          {canAccessFeature('report-builder') && (settings as any)?.featureSettings?.reports && (
            <TabsTrigger value="reports" className="flex items-center gap-2 flex-1">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          )}
          <TabsTrigger value="schedule" className="flex items-center gap-2 flex-1">
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
              <SelectItem value="running-order">
                <div className="flex items-center gap-2">
                  <Theater className="h-4 w-4" />
                  Running Order
                </div>
              </SelectItem>
              <SelectItem value="departments">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Departments
                </div>
              </SelectItem>
              {canAccessFeature('report-builder') && (settings as any)?.featureSettings?.reports && (
                <SelectItem value="reports">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Reports
                  </div>
                </SelectItem>
              )}
              <SelectItem value="schedule">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </div>
              </SelectItem>
              <SelectItem value="running-order">
                <div className="flex items-center gap-2">
                  <Theater className="h-4 w-4" />
                  Running Order
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Stage Management Team</CardTitle>
                    <div className="md:hidden flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => setIsManageTeamRolesOpen(true)}
                        data-testid="button-manage-team-roles"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <InviteTeamMemberDialog 
                        variant="editor" 
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                  <div className="hidden md:flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManageTeamRolesOpen(true)}
                      data-testid="button-manage-team-roles"
                    >Manage Team</Button>
                    <InviteTeamMemberDialog variant="editor" />
                  </div>
                  <CardDescription className="md:hidden">Invite up to 3 team members</CardDescription>
                </div>
                <CardDescription className="hidden md:block">
                  Invite up to 3 team members with editing permissions for this production.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamMembersList accessLevel="editor" isActive={activeTab === 'team'} />
              </CardContent>
            </Card>

            {/* Viewer Invitations */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Production Team</CardTitle>
                    <div className="md:hidden">
                      <InviteTeamMemberDialog 
                        variant="viewer" 
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <InviteTeamMemberDialog variant="viewer" />
                  </div>
                  <CardDescription className="md:hidden">Invite unlimited viewers with read-only access</CardDescription>
                </div>
                <CardDescription className="hidden md:block">
                  Invite unlimited viewers with read-only access to production information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamMembersList accessLevel="viewer" isActive={activeTab === 'team'} />
              </CardContent>
            </Card>
          </div>

          <ManageTeamRolesModal 
            open={isManageTeamRolesOpen}
            onOpenChange={setIsManageTeamRolesOpen}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value="running-order" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between flex-1">
                  <CardTitle>Running Order</CardTitle>
                  <div className="md:hidden">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      data-testid="button-add-running-order-item"
                      onClick={() => {
                        setEditingRunningOrderItem(null);
                        setRunningOrderForm({ name: '', group: '', inShow: true, duration: '' });
                        setIsRunningOrderDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <motion.div
                    initial={false}
                    animate={{ width: isRunningOrderMenuExpanded ? 'auto' : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className="hover:bg-transparent"
                        data-testid="button-versions"
                        onClick={() => setIsVersionsDialogOpen(true)}
                      >
                        <History className="h-4 w-4 mr-2 text-foreground hover:text-blue-500 transition-colors" />
                        Versions
                      </Button>
                      <Button
                        variant="ghost"
                        className="hover:bg-transparent"
                        data-testid="button-manage-structure"
                        onClick={() => setIsStructureDialogOpen(true)}
                      >
                        <Layers className="h-4 w-4 mr-2 text-foreground hover:text-blue-500 transition-colors" />
                        Structure
                      </Button>
                    </div>
                  </motion.div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsRunningOrderMenuExpanded(!isRunningOrderMenuExpanded)}
                    data-testid="button-toggle-running-order-menu"
                  >
                    <ChevronsLeft className={`h-4 w-4 transition-transform ${isRunningOrderMenuExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-transparent"
                        data-testid="button-export-running-order"
                      >
                        <Upload className="h-4 w-4 text-foreground hover:text-blue-500 transition-colors" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const runningOrderHTML = generateRunningOrderHTML();
                        const today = new Date();
                        const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        const subject = `${project?.name || 'Project'} Running Order - ${dateStr}`;
                        setIsEmailModalOpen(true);
                        setEmailForm({ to: '', cc: '', bcc: '', subject, body: runningOrderHTML });
                        if (emailEditor) {
                          emailEditor.commands.setContent(runningOrderHTML);
                        }
                      }} data-testid="menu-item-email">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadRunningOrderPDF} data-testid="menu-item-download-pdf">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-transparent"
                    data-testid="button-add-running-order-item"
                    onClick={() => {
                      setEditingRunningOrderItem(null);
                      setRunningOrderForm({ name: '', group: '', inShow: true, duration: '' });
                      setIsRunningOrderDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 text-foreground hover:text-blue-500 transition-colors" />
                  </Button>
                </div>
                
                <Dialog open={isRunningOrderDialogOpen} onOpenChange={setIsRunningOrderDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRunningOrderItem ? 'Edit Running Order Item' : 'Add Running Order Item'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ro-name">Item Name</Label>
                        <Input
                          id="ro-name"
                          placeholder="e.g., Act I, Scene 1, Circus Act A"
                          value={runningOrderForm.name}
                          onChange={(e) => setRunningOrderForm({ ...runningOrderForm, name: e.target.value })}
                          data-testid="input-running-order-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ro-group">Structure Group</Label>
                        <Select
                          value={runningOrderForm.group || 'ungrouped'}
                          onValueChange={(value) => setRunningOrderForm({ ...runningOrderForm, group: value === 'ungrouped' ? '' : value })}
                        >
                          <SelectTrigger id="ro-group" data-testid="select-running-order-group">
                            <SelectValue placeholder="Select a group or leave blank for Ungrouped" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ungrouped">Ungrouped</SelectItem>
                            {getStructureGroups()
                              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                              .map((group: any) => (
                                <SelectItem key={group.id} value={group.name}>
                                  {group.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ro-duration">Duration</Label>
                        <Input
                          id="ro-duration"
                          placeholder="e.g., 5 min, 2:30, 15 minutes"
                          value={runningOrderForm.duration}
                          onChange={(e) => setRunningOrderForm({ ...runningOrderForm, duration: e.target.value })}
                          data-testid="input-running-order-duration"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <Label htmlFor="in-show" className="cursor-pointer">In-Show</Label>
                        <Switch
                          id="in-show"
                          checked={runningOrderForm.inShow}
                          onCheckedChange={(checked) => setRunningOrderForm({ ...runningOrderForm, inShow: checked })}
                          data-testid="switch-in-show"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
                      {editingRunningOrderItem ? (
                        <AlertDialog open={deletingRunningOrderId === editingRunningOrderItem.id} onOpenChange={(open) => !open && setDeletingRunningOrderId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingRunningOrderId(editingRunningOrderItem.id)}
                              data-testid="button-delete-running-order-item-modal"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Running Order Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{editingRunningOrderItem.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  handleDeleteRunningOrderItem(editingRunningOrderItem.id);
                                  setIsRunningOrderDialogOpen(false);
                                  setEditingRunningOrderItem(null);
                                  setRunningOrderForm({ name: '', group: '', inShow: true, duration: '' });
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <div />
                      )}
                      <Button 
                        onClick={editingRunningOrderItem ? handleEditRunningOrderItem : handleAddRunningOrderItem}
                        data-testid="button-confirm-running-order-item"
                      >
                        {editingRunningOrderItem ? 'Update' : 'Add'} Item
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isStructureDialogOpen} onOpenChange={setIsStructureDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Manage Structure Groups</DialogTitle>
                      <DialogDescription>
                        Create and organize your structure groups like Acts, Scenes, or custom categories.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="structure-name">Group Name</Label>
                        <div className="flex gap-2">
                          <Input
                            id="structure-name"
                            placeholder="e.g., Act I, Scene 1"
                            value={structureGroupForm.name}
                            onChange={(e) => setStructureGroupForm({ name: e.target.value })}
                            data-testid="input-structure-group-name"
                          />
                          <Button
                            onClick={editingStructureGroup ? handleEditStructureGroup : handleAddStructureGroup}
                            size="sm"
                            data-testid="button-confirm-structure-group"
                          >
                            {editingStructureGroup ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {getStructureGroups().length === 0 ? (
                          <p className="text-sm text-muted-foreground">No groups yet. Create one above.</p>
                        ) : (
                          getStructureGroups()
                            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                            .map((group: any) => (
                              <div
                                key={group.id}
                                draggable
                                onDragStart={(e) => handleStructureGroupDragStart(e, group.id)}
                                onDragOver={(e) => handleStructureGroupDragOver(e, group.id)}
                                onDragLeave={handleStructureGroupDragLeave}
                                onDrop={(e) => handleStructureGroupDrop(e, group.id)}
                                onDragEnd={handleStructureGroupDragEnd}
                                className={`flex items-center gap-3 cursor-move transition-all select-none ${
                                  draggedGroupId === group.id ? 'opacity-50' : ''
                                } ${
                                  dragOverGroupId === group.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                                }`}
                                onClick={() => {
                                  setEditingStructureGroup(group);
                                  setStructureGroupForm({ name: group.name });
                                  setIsEditingStructureGroupModalOpen(true);
                                }}
                                data-testid={`card-structure-group-${group.id}`}
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium truncate flex-1">{group.name}</span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isEditingStructureGroupModalOpen} onOpenChange={setIsEditingStructureGroupModalOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Structure Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-structure-name">Group Name</Label>
                        <Input
                          id="edit-structure-name"
                          placeholder="e.g., Act I, Scene 1"
                          value={structureGroupForm.name}
                          onChange={(e) => setStructureGroupForm({ name: e.target.value })}
                          data-testid="input-edit-structure-group-name"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
                      <AlertDialog open={deletingStructureGroupId === editingStructureGroup?.id} onOpenChange={(open) => !open && setDeletingStructureGroupId(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingStructureGroupId(editingStructureGroup?.id || null)}
                            data-testid="button-delete-structure-group-modal"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{editingStructureGroup?.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (editingStructureGroup) {
                                  handleDeleteStructureGroup(editingStructureGroup.id);
                                }
                                setIsEditingStructureGroupModalOpen(false);
                                setEditingStructureGroup(null);
                                setStructureGroupForm({ name: '' });
                                setDeletingStructureGroupId(null);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        onClick={() => {
                          handleEditStructureGroup();
                          setIsEditingStructureGroupModalOpen(false);
                          setEditingStructureGroup(null);
                          setStructureGroupForm({ name: '' });
                        }}
                        data-testid="button-save-structure-group"
                      >
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Email Running Order</DialogTitle>
                      <DialogDescription>
                        Send the running order PDF via email
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email-to">To *</Label>
                        <Input
                          id="email-to"
                          placeholder="recipient@example.com"
                          value={emailForm.to}
                          onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                          data-testid="input-email-to"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex gap-6">
                          <button
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            onClick={() => setShowCCField(!showCCField)}
                            type="button"
                          >
                            {showCCField ? '▼' : '▶'} CC
                          </button>
                          {!showCCField && (
                            <button
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              onClick={() => setShowBCCField(!showBCCField)}
                              type="button"
                            >
                              {showBCCField ? '▼' : '▶'} BCC
                            </button>
                          )}
                        </div>
                        {showCCField && (
                          <>
                            <Input
                              placeholder="cc@example.com"
                              value={emailForm.cc}
                              onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                              data-testid="input-email-cc"
                            />
                            <button
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              onClick={() => setShowBCCField(!showBCCField)}
                              type="button"
                            >
                              {showBCCField ? '▼' : '▶'} BCC
                            </button>
                          </>
                        )}
                        {showBCCField && (
                          <Input
                            placeholder="bcc@example.com"
                            value={emailForm.bcc}
                            onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
                            data-testid="input-email-bcc"
                          />
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email-subject">Subject</Label>
                        <Input
                          id="email-subject"
                          placeholder="Email subject"
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          data-testid="input-email-subject"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email-body">Message</Label>
                        {emailEditor && (
                          <div className="border border-gray-200 dark:border-gray-700 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                            {/* Toolbar */}
                            <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex gap-1 bg-gray-50 dark:bg-gray-900">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emailEditor.chain().focus().toggleBold().run()}
                                className={`h-8 w-8 p-0 ${emailEditor.isActive('bold') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                                title="Bold"
                                data-testid="button-email-bold"
                              >
                                <Bold className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emailEditor.chain().focus().toggleItalic().run()}
                                className={`h-8 w-8 p-0 ${emailEditor.isActive('italic') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                                title="Italic"
                                data-testid="button-email-italic"
                              >
                                <Italic className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emailEditor.chain().focus().toggleUnderline().run()}
                                className={`h-8 w-8 p-0 ${emailEditor.isActive('underline') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                                title="Underline"
                                data-testid="button-email-underline"
                              >
                                <UnderlineIcon className="h-4 w-4" />
                              </Button>
                              
                              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emailEditor.chain().focus().toggleBulletList().run()}
                                className={`h-8 w-8 p-0 ${emailEditor.isActive('bulletList') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                                title="Bullet List"
                                data-testid="button-email-bullet-list"
                              >
                                <List className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emailEditor.chain().focus().toggleOrderedList().run()}
                                className={`h-8 w-8 p-0 ${emailEditor.isActive('orderedList') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                                title="Numbered List"
                                data-testid="button-email-ordered-list"
                              >
                                <ListOrdered className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Editor */}
                            <EditorContent 
                              editor={emailEditor}
                              data-testid="editor-email-body"
                              className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[120px]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-900 dark:text-blue-100">
                        📎 Running Order PDF will be attached to this email
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsEmailModalOpen(false)}
                        data-testid="button-email-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!emailForm.to.trim()) {
                            toast({
                              title: "Missing recipient",
                              description: "Please enter at least one email address in the 'To' field.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!emailForm.subject.trim()) {
                            toast({
                              title: "Missing subject",
                              description: "Please enter a subject for the email.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!emailForm.body.trim()) {
                            toast({
                              title: "Missing message",
                              description: "Please add a message to the email.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Parse email addresses (handle comma-separated values)
                          const parseEmails = (str: string) => str.split(',').map(e => e.trim()).filter(e => e);
                          
                          // Use editor content or fallback to form body
                          const emailBodyContent = emailEditor ? emailEditor.getHTML() : emailForm.body;
                          
                          try {
                            // Generate PDF attachment
                            const pdfBlob = generateRunningOrderPDFBlob();
                            const pdfBase64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const base64String = (reader.result as string).split(',')[1];
                                resolve(base64String);
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(pdfBlob);
                            });

                            const today = new Date();
                            const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            const pdfFilename = `${project?.name || 'Project'}-Running-Order-${dateStr}.pdf`;

                            const response = await apiRequest('POST', '/api/user/email-provider/send', {
                              to: parseEmails(emailForm.to),
                              cc: emailForm.cc ? parseEmails(emailForm.cc) : [],
                              bcc: emailForm.bcc ? parseEmails(emailForm.bcc) : [],
                              subject: emailForm.subject,
                              body: emailBodyContent,
                              isHtml: true,
                              attachments: [{
                                filename: pdfFilename,
                                content: pdfBase64,
                                encoding: 'base64',
                                contentType: 'application/pdf',
                              }],
                            });
                            
                            if (response.success || response.messageId) {
                              toast({
                                title: "Email sent successfully!",
                                description: "Your running order has been sent with PDF attachment.",
                              });
                              setIsEmailModalOpen(false);
                              setEmailForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
                            } else {
                              throw new Error(response.message || "Failed to send email");
                            }
                          } catch (error: any) {
                            console.error('Email send error:', error);
                            toast({
                              title: "Failed to send email",
                              description: error.message || "Please make sure you have connected an email account.",
                              variant: "destructive",
                            });
                          }
                        }}
                        data-testid="button-email-send"
                      >
                        Send Email
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Create and organize your show's structure with flexible grouping. Add items like Acts, Scenes, or any organizational unit that works for your production.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                  ? safeJsonParse((settings as any).scheduleSettings, {}) 
                  : ((settings as any)?.scheduleSettings || {});
                const runningOrder = scheduleSettings.runningOrder || [];
                
                return runningOrder.length > 0 ? (
                  <div className="space-y-6">
                    {/* In-Show Items */}
                    {(() => {
                      const inShowItems = runningOrder.filter((item: any) => item.inShow !== false);
                      const grouped: Record<string, any[]> = {};
                      inShowItems.forEach((item: any) => {
                        const group = item.group || 'Ungrouped';
                        if (!grouped[group]) grouped[group] = [];
                        grouped[group].push(item);
                      });
                      
                      const structureGroupsMap = new Map(
                        getStructureGroups()
                          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                          .map((g: any) => [g.name, g.order ?? 0])
                      );
                      
                      const sortedGroups = Object.keys(grouped).sort((a, b) => {
                        if (a === 'Ungrouped') return 1;
                        if (b === 'Ungrouped') return -1;
                        const orderA = structureGroupsMap.get(a) ?? 999;
                        const orderB = structureGroupsMap.get(b) ?? 999;
                        return orderA - orderB;
                      });
                      
                      // Helper function to calculate total duration for a group
                      const calculateGroupTotal = (items: any[]): string => {
                        let totalMinutes = 0;
                        let totalSeconds = 0;
                        items.forEach((item: any) => {
                          if (item.duration) {
                            const parts = item.duration.split(':').map(Number);
                            if (parts.length === 2) {
                              totalMinutes += parts[0] || 0;
                              totalSeconds += parts[1] || 0;
                            } else if (parts.length === 1) {
                              totalMinutes += parts[0] || 0;
                            }
                          }
                        });
                        // Convert overflow seconds to minutes
                        totalMinutes += Math.floor(totalSeconds / 60);
                        totalSeconds = totalSeconds % 60;
                        if (totalMinutes === 0 && totalSeconds === 0) return '';
                        return `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
                      };
                      
                      return inShowItems.length > 0 ? (
                        <div className="space-y-4">
                          <h2 className="text-xl font-bold">In-Show</h2>
                          <div className="space-y-4">
                            {sortedGroups.map((groupName) => {
                              const groupTotal = calculateGroupTotal(grouped[groupName]);
                              return (
                              <div key={groupName} className="space-y-2">
                                <div className="flex items-center justify-between px-2">
                                  <h4 className="text-sm font-semibold text-muted-foreground">{groupName}</h4>
                                  {groupTotal && <div className="text-sm text-muted-foreground flex" style={{gap: '1px', width: '140px'}}><span>Length:</span><span className="text-right flex-1">{groupTotal}</span></div>}
                                </div>
                                <div className="space-y-2">
                                  {grouped[groupName]
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                    .map((item) => (
                                      <div
                                        key={item.id} 
                                        className="cursor-pointer hover:shadow-md transition-shadow select-none p-4 rounded-md bg-background" 
                                        data-testid={`card-running-order-${item.id}`}
                                        onClick={() => {
                                          setEditingRunningOrderItem(item);
                                          setRunningOrderForm({ name: item.name, group: item.group || '', inShow: item.inShow ?? true, duration: item.duration || '' });
                                          setIsRunningOrderDialogOpen(true);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-base select-none flex-1">{item.name}</span>
                                          {item.duration && <div className="text-sm text-muted-foreground flex" style={{gap: '1px', width: '140px'}}><span>Length:</span><span className="text-right flex-1">{item.duration}</span></div>}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );})}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    
                    {/* Out-of-Show Items */}
                    {(() => {
                      const outOfShowItems = runningOrder.filter((item: any) => item.inShow === false);
                      const grouped: Record<string, any[]> = {};
                      outOfShowItems.forEach((item: any) => {
                        const group = item.group || 'Ungrouped';
                        if (!grouped[group]) grouped[group] = [];
                        grouped[group].push(item);
                      });
                      
                      const structureGroupsMap = new Map(
                        getStructureGroups()
                          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                          .map((g: any) => [g.name, g.order ?? 0])
                      );
                      
                      const sortedGroups = Object.keys(grouped).sort((a, b) => {
                        if (a === 'Ungrouped') return 1;
                        if (b === 'Ungrouped') return -1;
                        const orderA = structureGroupsMap.get(a) ?? 999;
                        const orderB = structureGroupsMap.get(b) ?? 999;
                        return orderA - orderB;
                      });
                      
                      return outOfShowItems.length > 0 ? (
                        <div className="space-y-4">
                          <h2 className="text-xl font-bold">Out-of-Show</h2>
                          <div className="space-y-4">
                            {sortedGroups.map((groupName) => (
                              <div key={groupName} className="space-y-2">
                                <h4 className="text-sm font-semibold text-muted-foreground px-2">{groupName}</h4>
                                <div className="space-y-2">
                                  {grouped[groupName]
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                    .map((item) => (
                                      <div
                                        key={item.id} 
                                        className="cursor-pointer hover:shadow-md transition-shadow select-none p-4 rounded-md bg-background opacity-75" 
                                        data-testid={`card-running-order-${item.id}`}
                                        onClick={() => {
                                          setEditingRunningOrderItem(item);
                                          setRunningOrderForm({ name: item.name, group: item.group || '', inShow: item.inShow ?? true, duration: item.duration || '' });
                                          setIsRunningOrderDialogOpen(true);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-base select-none flex-1">{item.name}</span>
                                          {item.duration && <div className="text-sm text-muted-foreground flex" style={{gap: '1px', width: '140px'}}><span>Length:</span><span className="text-right flex-1">{item.duration}</span></div>}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Theater className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No running order items yet</h3>
                    <p className="text-muted-foreground">
                      Create your first running order item to organize your show.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Versions Dialog */}
          <Dialog open={isVersionsDialogOpen} onOpenChange={setIsVersionsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Running Order Versions</DialogTitle>
                <DialogDescription>
                  View and manage saved versions of your running order. Revert to previous versions or compare changes.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end mb-4 gap-2 md:hidden">
                {(runningOrderVersions as any[]).length >= 2 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCompareDialogOpen(true)} 
                    data-testid="button-compare-versions"
                    size="sm"
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare
                  </Button>
                )}
                <Button onClick={() => setIsSaveVersionDialogOpen(true)} data-testid="button-save-new-version" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
              <div className="hidden md:flex justify-end mb-4 gap-2">
                {(runningOrderVersions as any[]).length >= 2 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCompareDialogOpen(true)} 
                    data-testid="button-compare-versions"
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare Versions
                  </Button>
                )}
                <Button onClick={() => setIsSaveVersionDialogOpen(true)} data-testid="button-save-new-version">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Current as New Version
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(runningOrderVersions as any[]).length > 0 ? (
                  <div className="space-y-3">
                    {(runningOrderVersions as any[]).map((version: any) => (
                      <div 
                        key={version.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`version-card-${version.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">v{version.versionNumber}</span>
                              {version.label && (
                                <Badge variant="outline">{version.label}</Badge>
                              )}
                              <Badge variant={version.status === 'published' ? 'default' : 'secondary'}>
                                {version.status === 'published' ? (
                                  <><FileCheck className="h-3 w-3 mr-1" /> Published</>
                                ) : (
                                  'Draft'
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(version.createdAt).toLocaleDateString()} at {new Date(version.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {version.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">{version.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {(version.runningOrder as any[])?.length || 0} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div
                              initial={false}
                              animate={{ width: expandedVersionIds.has(version.id) ? 'auto' : 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setViewingVersion(version)}
                                  data-testid={`button-view-version-${version.id}`}
                                  className="h-8 px-2"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedVersionForRevert(version)}
                                  data-testid={`button-revert-version-${version.id}`}
                                  className="h-8 px-2"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Revert
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-version-export-${version.id}`}
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      const versionRunningOrder = (version.runningOrder as any[]) || [];
                                      const runningOrderHTML = generateRunningOrderHTML(versionRunningOrder);
                                      const today = new Date();
                                      const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                                      const subject = `${project?.name || 'Project'} Running Order - ${dateStr}`;
                                      setIsEmailModalOpen(true);
                                      setEmailForm({ to: '', cc: '', bcc: '', subject, body: runningOrderHTML });
                                      if (emailEditor) {
                                        emailEditor.commands.setContent(runningOrderHTML);
                                      }
                                    }} data-testid={`menu-item-version-email-${version.id}`}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      const versionRunningOrder = (version.runningOrder as any[]) || [];
                                      downloadRunningOrderPDF(versionRunningOrder);
                                    }} data-testid={`menu-item-version-download-${version.id}`}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                const newSet = new Set(expandedVersionIds);
                                if (newSet.has(version.id)) {
                                  newSet.delete(version.id);
                                } else {
                                  newSet.add(version.id);
                                }
                                setExpandedVersionIds(newSet);
                              }}
                              data-testid={`button-toggle-version-menu-${version.id}`}
                            >
                              <ChevronsLeft className={`h-4 w-4 transition-transform ${expandedVersionIds.has(version.id) ? 'rotate-180' : ''}`} />
                            </Button>
                            {version.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateVersionMutation.mutate({ id: version.id, status: 'published' })}
                                data-testid={`button-publish-version-${version.id}`}
                                className="h-8 px-2"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Publish
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No versions saved yet</h3>
                    <p className="text-muted-foreground">
                      Save your current running order as a version to track changes over time.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Save Version Dialog */}
          <Dialog open={isSaveVersionDialogOpen} onOpenChange={setIsSaveVersionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save as New Version</DialogTitle>
                <DialogDescription>
                  Create a snapshot of the current running order that you can revert to later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="version-label">Version Label (optional)</Label>
                  <Input
                    id="version-label"
                    placeholder="e.g., Opening Night, Week 2, After Changes"
                    value={versionForm.label}
                    onChange={(e) => setVersionForm({ ...versionForm, label: e.target.value })}
                    data-testid="input-version-label"
                  />
                </div>
                <div>
                  <Label htmlFor="version-notes">Notes (optional)</Label>
                  <Textarea
                    id="version-notes"
                    placeholder="Add any notes about this version..."
                    value={versionForm.notes}
                    onChange={(e) => setVersionForm({ ...versionForm, notes: e.target.value })}
                    data-testid="input-version-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSaveVersionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createVersionMutation.mutate({ 
                    label: versionForm.label, 
                    notes: versionForm.notes, 
                    status: 'draft' 
                  })}
                  disabled={createVersionMutation.isPending}
                  data-testid="button-confirm-save-version"
                >
                  {createVersionMutation.isPending ? 'Saving...' : 'Save Version'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Version Dialog */}
          <Dialog open={!!viewingVersion} onOpenChange={() => setViewingVersion(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>
                  Version {viewingVersion?.versionNumber}
                  {viewingVersion?.label && ` - ${viewingVersion.label}`}
                </DialogTitle>
                <DialogDescription>
                  Saved on {viewingVersion && new Date(viewingVersion.createdAt).toLocaleDateString()}
                  {viewingVersion?.notes && ` • ${viewingVersion.notes}`}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                {viewingVersion && (
                  <div className="space-y-4">
                    {(() => {
                      const runningOrder = viewingVersion.runningOrder || [];
                      const structureGroups = viewingVersion.structureGroups || [];
                      const grouped: Record<string, any[]> = {};
                      
                      runningOrder.forEach((item: any) => {
                        const group = item.group || 'Ungrouped';
                        if (!grouped[group]) grouped[group] = [];
                        grouped[group].push(item);
                      });
                      
                      const sortedGroups = Object.keys(grouped).sort((a, b) => {
                        if (a === 'Ungrouped') return 1;
                        if (b === 'Ungrouped') return -1;
                        const groupA = structureGroups.find((g: any) => g.name === a);
                        const groupB = structureGroups.find((g: any) => g.name === b);
                        return (groupA?.order ?? 0) - (groupB?.order ?? 0);
                      });
                      
                      return sortedGroups.map((groupName) => (
                        <div key={groupName} className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">{groupName}</h4>
                          <div className="space-y-1 pl-4">
                            {grouped[groupName]
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                              .map((item, index) => (
                                <div key={item.id || index} className="text-sm py-1">
                                  {item.name}
                                </div>
                              ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingVersion(null)}>
                  Close
                </Button>
                <Button 
                  variant="default"
                  onClick={() => {
                    setSelectedVersionForRevert(viewingVersion);
                    setViewingVersion(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revert to This Version
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Revert Confirmation Dialog */}
          <AlertDialog open={!!selectedVersionForRevert} onOpenChange={() => setSelectedVersionForRevert(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revert to Version {selectedVersionForRevert?.versionNumber}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace your current running order with the version from{' '}
                  {selectedVersionForRevert && new Date(selectedVersionForRevert.createdAt).toLocaleDateString()}.
                  {selectedVersionForRevert?.label && ` (${selectedVersionForRevert.label})`}
                  <br /><br />
                  Your current running order will be replaced. Consider saving it as a version first if you haven't already.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => selectedVersionForRevert && revertToVersion(selectedVersionForRevert)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revert
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Version Comparison Dialog */}
          <Dialog open={isCompareDialogOpen} onOpenChange={(open) => {
            setIsCompareDialogOpen(open);
            if (!open) setSelectedVersionsToCompare([]);
          }}>
            <DialogContent className="max-w-4xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Compare Versions</DialogTitle>
                <DialogDescription>
                  Select two versions to compare and see what changed between them.
                </DialogDescription>
              </DialogHeader>
              
              {selectedVersionsToCompare.length < 2 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select {2 - selectedVersionsToCompare.length} more version{selectedVersionsToCompare.length === 1 ? '' : 's'} to compare:
                  </p>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {(runningOrderVersions as any[]).map((version: any) => (
                        <div 
                          key={version.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedVersionsToCompare.includes(version.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            if (selectedVersionsToCompare.includes(version.id)) {
                              setSelectedVersionsToCompare(selectedVersionsToCompare.filter(id => id !== version.id));
                            } else if (selectedVersionsToCompare.length < 2) {
                              setSelectedVersionsToCompare([...selectedVersionsToCompare, version.id]);
                            }
                          }}
                          data-testid={`compare-select-version-${version.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={selectedVersionsToCompare.includes(version.id)}
                                className="pointer-events-none"
                              />
                              <span className="font-semibold">v{version.versionNumber}</span>
                              {version.label && <Badge variant="outline">{version.label}</Badge>}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(version.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                (() => {
                  const versions = runningOrderVersions as any[];
                  const version1 = versions.find(v => v.id === selectedVersionsToCompare[0]);
                  const version2 = versions.find(v => v.id === selectedVersionsToCompare[1]);
                  
                  if (!version1 || !version2) return null;
                  
                  const older = version1.versionNumber < version2.versionNumber ? version1 : version2;
                  const newer = version1.versionNumber < version2.versionNumber ? version2 : version1;
                  
                  const olderItems = (older.runningOrder || []) as any[];
                  const newerItems = (newer.runningOrder || []) as any[];
                  const olderGroups = (older.structureGroups || []) as any[];
                  const newerGroups = (newer.structureGroups || []) as any[];
                  
                  const olderItemIds = new Set(olderItems.map(item => item.id));
                  const newerItemIds = new Set(newerItems.map(item => item.id));
                  const olderGroupNames = new Set(olderGroups.map(g => g.name));
                  const newerGroupNames = new Set(newerGroups.map(g => g.name));
                  
                  const addedItems = newerItems.filter(item => !olderItemIds.has(item.id));
                  const removedItems = olderItems.filter(item => !newerItemIds.has(item.id));
                  const modifiedItems = newerItems.filter(item => {
                    if (!olderItemIds.has(item.id)) return false;
                    const oldItem = olderItems.find(o => o.id === item.id);
                    return oldItem && (oldItem.name !== item.name || oldItem.group !== item.group || oldItem.order !== item.order);
                  });
                  
                  const addedGroups = newerGroups.filter(g => !olderGroupNames.has(g.name));
                  const removedGroups = olderGroups.filter(g => !newerGroupNames.has(g.name));
                  
                  const hasChanges = addedItems.length > 0 || removedItems.length > 0 || modifiedItems.length > 0 || addedGroups.length > 0 || removedGroups.length > 0;
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Comparing:</span>
                          <Badge variant="secondary">v{older.versionNumber} {older.label && `(${older.label})`}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="default">v{newer.versionNumber} {newer.label && `(${newer.label})`}</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedVersionsToCompare([])}
                        >
                          Change Selection
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[400px]">
                        {!hasChanges ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Check className="h-12 w-12 mx-auto mb-4" />
                            <p>No differences found between these versions.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Summary */}
                            <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                              <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-green-600">{addedItems.length}</div>
                                <div className="text-xs text-muted-foreground">Added</div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-red-600">{removedItems.length}</div>
                                <div className="text-xs text-muted-foreground">Removed</div>
                              </div>
                              <div className="text-center flex-1">
                                <div className="text-2xl font-bold text-yellow-600">{modifiedItems.length}</div>
                                <div className="text-xs text-muted-foreground">Modified</div>
                              </div>
                            </div>
                            
                            {/* Added Items */}
                            {addedItems.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                                  <Plus className="h-4 w-4" /> Added Items
                                </h4>
                                <div className="space-y-1 pl-4">
                                  {addedItems.map((item, i) => (
                                    <div key={i} className="text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded border-l-2 border-green-500">
                                      {item.name} {item.group && <span className="text-muted-foreground">({item.group})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Removed Items */}
                            {removedItems.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" /> Removed Items
                                </h4>
                                <div className="space-y-1 pl-4">
                                  {removedItems.map((item, i) => (
                                    <div key={i} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-2 border-red-500 line-through">
                                      {item.name} {item.group && <span className="text-muted-foreground">({item.group})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Modified Items */}
                            {modifiedItems.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                                  <Pencil className="h-4 w-4" /> Modified Items
                                </h4>
                                <div className="space-y-1 pl-4">
                                  {modifiedItems.map((item, i) => {
                                    const oldItem = olderItems.find(o => o.id === item.id);
                                    return (
                                      <div key={i} className="text-sm p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border-l-2 border-yellow-500">
                                        <div className="flex items-center gap-2">
                                          <span className="line-through text-muted-foreground">{oldItem?.name}</span>
                                          <span>→</span>
                                          <span>{item.name}</span>
                                        </div>
                                        {oldItem?.group !== item.group && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Group: {oldItem?.group || 'Ungrouped'} → {item.group || 'Ungrouped'}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Group Changes */}
                            {(addedGroups.length > 0 || removedGroups.length > 0) && (
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                  <Layers className="h-4 w-4" /> Structure Group Changes
                                </h4>
                                <div className="space-y-1 pl-4">
                                  {addedGroups.map((group, i) => (
                                    <div key={`add-${i}`} className="text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                                      <span className="text-green-600">+ </span>{group.name}
                                    </div>
                                  ))}
                                  {removedGroups.map((group, i) => (
                                    <div key={`rem-${i}`} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded line-through">
                                      <span className="text-red-600">- </span>{group.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  );
                })()
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCompareDialogOpen(false);
                  setSelectedVersionsToCompare([]);
                }}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between flex-1">
                  <CardTitle>Departments</CardTitle>
                  <div className="md:hidden">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          data-testid="button-add-department"
                          onClick={() => {
                            setEditingDepartment(null);
                            setDepartmentForm({ name: '' });
                            setIsDepartmentDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
                <div className="hidden md:block">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        data-testid="button-add-department"
                        onClick={() => {
                          setEditingDepartment(null);
                          setDepartmentForm({ name: '' });
                          setIsDepartmentDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Department
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
                
                <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input
                          id="dept-name"
                          placeholder="e.g., Lighting"
                          value={departmentForm.name}
                          onChange={(e) => setDepartmentForm({ name: e.target.value })}
                          data-testid="input-department-name"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
                      {editingDepartment ? (
                        <AlertDialog open={deletingDepartmentKey === editingDepartment.key} onOpenChange={(open) => !open && setDeletingDepartmentKey(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingDepartmentKey(editingDepartment.key)}
                              data-testid="button-delete-department-modal"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Department</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{editingDepartment.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  handleDeleteDepartment(editingDepartment.key);
                                  setIsDepartmentDialogOpen(false);
                                  setEditingDepartment(null);
                                  setDepartmentForm({ name: '' });
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <div />
                      )}
                      <Button 
                        onClick={editingDepartment ? handleEditDepartment : handleAddDepartment}
                        data-testid="button-confirm-add-department"
                      >
                        {editingDepartment ? 'Update' : 'Add'} Department
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {settings?.departmentNames && Object.keys(settings.departmentNames).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(settings.departmentNames)
                    .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                    .map(([key, name]) => (
                      <Card 
                        key={key} 
                        className="cursor-pointer hover:shadow-md transition-shadow select-none" 
                        data-testid={`card-department-${key}`}
                        onClick={() => {
                          setEditingDepartment({ key, name: name as string });
                          setDepartmentForm({ name: name as string });
                          setIsDepartmentDialogOpen(true);
                        }}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base select-none">{name as string}</CardTitle>
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
                  <Button 
                    onClick={() => {
                      setEditingDepartment(null);
                      setDepartmentForm({ name: '' });
                      setIsDepartmentDialogOpen(true);
                    }}
                    data-testid="button-add-first-department"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canAccessFeature('report-builder') && (settings as any)?.featureSettings?.reports && (
          <TabsContent value="reports" className="mt-6">
            <GlobalTemplateSettingsContent projectId={params.id!} showSaveButton={true} />
          </TabsContent>
        )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="dayStartHour">Day Start Time</Label>
                  <Select
                    value={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return String(scheduleSettings?.dayStartHour ?? 8);
                    })()}
                    onValueChange={(value) =>
                      handleSettingsUpdate("scheduleSettings", { dayStartHour: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">12:00 AM (Midnight)</SelectItem>
                      <SelectItem value="1">1:00 AM</SelectItem>
                      <SelectItem value="2">2:00 AM</SelectItem>
                      <SelectItem value="3">3:00 AM</SelectItem>
                      <SelectItem value="4">4:00 AM</SelectItem>
                      <SelectItem value="5">5:00 AM</SelectItem>
                      <SelectItem value="6">6:00 AM</SelectItem>
                      <SelectItem value="7">7:00 AM</SelectItem>
                      <SelectItem value="8">8:00 AM</SelectItem>
                      <SelectItem value="9">9:00 AM</SelectItem>
                      <SelectItem value="10">10:00 AM</SelectItem>
                      <SelectItem value="11">11:00 AM</SelectItem>
                      <SelectItem value="12">12:00 PM (Noon)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">When the schedule day begins</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dayEndHour">Day End Time</Label>
                  <Select
                    value={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? safeJsonParse((settings as any).scheduleSettings, {}) 
                        : ((settings as any)?.scheduleSettings || {});
                      return String(scheduleSettings?.dayEndHour ?? 24);
                    })()}
                    onValueChange={(value) =>
                      handleSettingsUpdate("scheduleSettings", { dayEndHour: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">6:00 PM</SelectItem>
                      <SelectItem value="19">7:00 PM</SelectItem>
                      <SelectItem value="20">8:00 PM</SelectItem>
                      <SelectItem value="21">9:00 PM</SelectItem>
                      <SelectItem value="22">10:00 PM</SelectItem>
                      <SelectItem value="23">11:00 PM</SelectItem>
                      <SelectItem value="24">12:00 AM (Midnight)</SelectItem>
                      <SelectItem value="25">1:00 AM +1</SelectItem>
                      <SelectItem value="26">2:00 AM +1</SelectItem>
                      <SelectItem value="27">3:00 AM +1</SelectItem>
                      <SelectItem value="28">4:00 AM +1</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">When the schedule day ends (+1 means next calendar day)</p>
                </div>
              </div>

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
                    onChange={(e) => handleProjectUpdate({ prepStartDate: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstRehearsalDate">First Rehearsal</Label>
                  <Input
                    id="firstRehearsalDate"
                    type="date"
                    value={(project as any)?.firstRehearsalDate ? new Date((project as any).firstRehearsalDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstRehearsalDate: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="designerRunDate">Designer Run</Label>
                  <Input
                    id="designerRunDate"
                    type="date"
                    value={(project as any)?.designerRunDate ? new Date((project as any).designerRunDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ designerRunDate: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstTechDate">First Tech</Label>
                  <Input
                    id="firstTechDate"
                    type="date"
                    value={(project as any)?.firstTechDate ? new Date((project as any).firstTechDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstTechDate: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="firstPreviewDate">First Preview</Label>
                  <Input
                    id="firstPreviewDate"
                    type="date"
                    value={(project as any)?.firstPreviewDate ? new Date((project as any).firstPreviewDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ firstPreviewDate: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openingNight">Opening Night</Label>
                  <Input
                    id="openingNight"
                    type="date"
                    value={(project as any)?.openingNight ? new Date((project as any).openingNight).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ openingNight: e.target.value.trim() ? new Date(e.target.value) : null })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="closingDate">Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={(project as any)?.closingDate ? new Date((project as any).closingDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleProjectUpdate({ closingDate: e.target.value.trim() ? new Date(e.target.value) : null })}
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

          {/* Weekly Templates */}
          <ScheduleTemplatesSection projectId={parseInt(params.id)} />

          {/* Event Locations Management */}
          <Card className="mt-6 border-0 shadow-none">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Event Locations
                    </CardTitle>
                  </div>
                  <Button onClick={handleCreateLocation} size="sm" variant="ghost" className="h-8 w-8 p-0 md:hidden">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden md:block">
                  <Button onClick={handleCreateLocation} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>
                <CardDescription className="md:hidden">
                  Manage locations where events can take place
                </CardDescription>
              </div>
              <CardDescription className="hidden md:block">
                Manage locations where events can take place
              </CardDescription>
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Event Types
                    </CardTitle>
                  </div>
                  <Button onClick={handleCreateEventType} size="sm" variant="ghost" className="h-8 w-8 p-0 md:hidden">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden md:block">
                  <Button onClick={handleCreateEventType} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event Type
                  </Button>
                </div>
                <CardDescription className="md:hidden">
                  Manage custom event types for your schedule
                </CardDescription>
              </div>
              <CardDescription className="hidden md:block">
                Manage custom event types for your schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading event types...
                  </p>
                ) : (
                  eventTypes.map((eventType: any) => (
                    <div 
                      key={eventType.id} 
                      draggable
                      onDragStart={(e) => handleEventTypeDragStart(e, eventType.id)}
                      onDragOver={(e) => handleEventTypeDragOver(e, eventType.id)}
                      onDragLeave={handleEventTypeDragLeave}
                      onDrop={(e) => handleEventTypeDrop(e, eventType.id)}
                      onDragEnd={handleEventTypeDragEnd}
                      className={`flex items-center p-3 rounded-lg cursor-move transition-colors bg-gray-50/50 ${
                        draggedEventTypeId === eventType.id ? 'opacity-50' : ''
                      } ${
                        dragOverEventTypeId === eventType.id ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-400" />
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
              {/* Email Template Section */}
              <div>
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