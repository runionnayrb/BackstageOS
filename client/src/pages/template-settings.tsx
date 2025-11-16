import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import ReportNotesManager from "@/components/report-notes-manager";
import EditableDepartmentHeader from "@/components/editable-department-header";
import InlineFormattingToolbar from "@/components/inline-formatting-toolbar";
import EditableFieldHeading from "@/components/editable-field-heading";
import EditableHeaderFooter from "@/components/editable-header-footer";
import FlexibleLayoutEditor from "@/components/flexible-layout-editor";
import { getAllDepartmentNames, type DepartmentKey } from "@/utils/departmentUtils";
import { formatTimestamp, parseScheduleSettings } from "@/lib/timeUtils";
import type { ShowSettings } from "@/../../shared/schema";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Type,
  Calendar,
  Clock,
  User,
  MapPin,
  Settings,
  X,
  Lock,
  Unlock,
  RotateCcw
} from "lucide-react";

interface TemplateSettingsParams {
  id: string;
}

interface TemplateField {
  id: string;
  type: "text" | "textarea" | "number" | "date" | "time" | "select" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select fields
  order: number;
}

interface ProductionTemplate {
  id: string;
  phase: "meetings" | "rehearsal" | "tech" | "previews" | "performance";
  name: string;
  description: string;
  header: string;
  footer: string;
  fields: TemplateField[];
  layoutConfiguration?: any; // Add layout support to all templates
}

const defaultTemplates: Record<string, Omit<ProductionTemplate, "id">> = {
  meetings: {
    phase: "meetings",
    name: "Production Meeting Report",
    description: "Production meetings and team coordination documentation",
    header: "{{showName}} - Production Meeting Report\nDate: {{date}}\nStage Manager: {{stageManager}}",
    footer: "Next meeting due: {{nextMeetingDate}}\nContact: {{contactInfo}}",
    fields: [
      { id: "meetingType", type: "text", label: "Meeting Type", placeholder: "e.g., Production Meeting, Design Meeting", required: true, order: 1 },
      { id: "attendees", type: "textarea", label: "Attendees", placeholder: "List of meeting attendees", required: true, order: 2 },
      { id: "agendaItems", type: "textarea", label: "Agenda Items", placeholder: "Topics discussed", required: false, order: 3 },
      { id: "actionItems", type: "textarea", label: "Action Items", placeholder: "Tasks and assignments", required: true, order: 4 },
      { id: "notes", type: "textarea", label: "Additional Notes", required: false, order: 5 }
    ]
  },
  rehearsal: {
    phase: "rehearsal",
    name: "Rehearsal Report",
    description: "Daily rehearsal progress and notes",
    header: "{{showName}} - Rehearsal Report\nDate: {{date}} | Day {{rehearsalDay}}\nStage Manager: {{stageManager}}",
    footer: "Next rehearsal: {{nextRehearsal}}\nCompany Manager: {{companyManager}}",
    fields: [
      { id: "location", type: "text", label: "Location", placeholder: "Rehearsal room/venue", required: true, order: 1 },
      { id: "scenes", type: "textarea", label: "Scenes Worked", placeholder: "Act I, Scene 1-3", required: true, order: 2 },
      { id: "notes", type: "textarea", label: "Director's Notes", required: true, order: 3 },
      { id: "technical", type: "textarea", label: "Technical Notes", placeholder: "Props, costumes, set pieces", required: false, order: 4 },
      { id: "attendance", type: "textarea", label: "Attendance Notes", placeholder: "Late arrivals, absences", required: false, order: 5 }
    ]
  },
  tech: {
    phase: "tech",
    name: "Technical Rehearsal Report", 
    description: "Technical rehearsal and cue integration with department notes",
    header: "{{showName}} - Tech Rehearsal Report\nStage Manager: {{stageManager}}",
    footer: "Technical Director: {{technicalDirector}}",
    fields: [
      { id: "todaysSchedule", type: "textarea", label: "Today's Schedule", placeholder: "1. No notes. Thank you.", required: true, order: 1 },
      { id: "late", type: "textarea", label: "Late", placeholder: "1. No notes. Thank you.", required: false, order: 2 },
      { id: "injuryIllness", type: "textarea", label: "Injury / Illness", placeholder: "1. No notes. Thank you.", required: false, order: 3 },
      { id: "generalNotes", type: "textarea", label: "General Notes", placeholder: "1. No notes. Thank you.", required: false, order: 4 }
    ]
  },
  previews: {
    phase: "previews",
    name: "Preview Performance Report",
    description: "Preview performance tracking and notes",
    header: "{{showName}} - Preview Report\nDate: {{date}} | Preview {{previewNumber}}\nStage Manager: {{stageManager}}",
    footer: "Next preview: {{nextPreview}}\nAudience: {{audienceCount}}",
    fields: [
      { id: "previewNumber", type: "number", label: "Preview #", required: true, order: 1 },
      { id: "audienceCount", type: "number", label: "Audience Count", required: false, order: 2 },
      { id: "runtime", type: "text", label: "Runtime", placeholder: "2h 15min", required: false, order: 3 },
      { id: "technical", type: "textarea", label: "Technical Notes", required: false, order: 4 },
      { id: "performance", type: "textarea", label: "Performance Notes", required: true, order: 5 },
      { id: "audienceResponse", type: "textarea", label: "Audience Response", required: false, order: 6 }
    ]
  },
  performance: {
    phase: "performance",
    name: "Performance Report",
    description: "Official performance documentation",
    header: "{{showName}} - Performance Report\nDate: {{date}} | Performance {{performanceNumber}}\nStage Manager: {{stageManager}}",
    footer: "Next performance: {{nextPerformance}}\nBox Office: {{ticketsSold}}/{{capacity}}",
    fields: [
      { id: "performanceNumber", type: "number", label: "Performance #", required: true, order: 1 },
      { id: "ticketsSold", type: "number", label: "Tickets Sold", required: false, order: 2 },
      { id: "runtime", type: "text", label: "Total Runtime", placeholder: "2h 18min", required: false, order: 3 },
      { id: "technical", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, delays", required: false, order: 4 },
      { id: "incidentReport", type: "textarea", label: "Incident Report", placeholder: "Accidents, emergencies, unusual events", required: false, order: 5 },
      { id: "companyNotes", type: "textarea", label: "Company Notes", placeholder: "Cast/crew notes, announcements", required: false, order: 6 }
    ]
  }
};

export default function TemplateSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateSettingsParams>();
  const projectId = params.id;
  
  const [selectedPhase, setSelectedPhase] = useState<string>("meetings");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, ProductionTemplate>>({});
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Template editor state - per template type
  const [editModes, setEditModes] = useState<Record<string, boolean>>({
    meetings: false,
    rehearsal: false,
    tech: false,
    previews: false,
    performance: false
  });
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Global save state - track all pending changes
  const [pendingChanges, setPendingChanges] = useState({
    departmentNames: {} as Record<string, string>,
    departmentFormatting: {} as Record<string, any>,
    fieldHeaderFormatting: {} as any,
    layoutConfiguration: null as any,
    hasChanges: false
  });
  
  // Department reordering state
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Array<{ key: DepartmentKey; displayName: string }>>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  // Ref to connect to FlexibleLayoutEditor
  const flexibleLayoutRef = useRef<{ addNewItem: (type: string) => void; removeItem: (id: string) => void; resetLayout: () => void; getCurrentConfiguration: () => any } | null>(null);

  // Toolbar functions
  const addNewItem = (type: string) => {
    console.log('Add new item:', type);
    if (flexibleLayoutRef.current) {
      flexibleLayoutRef.current.addNewItem(type);
    }
  };

  const handleResetClick = () => {
    setShowResetDialog(true);
  };

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the result (gcTime is the new name for cacheTime in v5)
  });

  // Load user-created templates
  const { data: userTemplates } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates`],
  });

  // Fetch global template settings for tech report headers/footers
  const { data: globalSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
    enabled: !!projectId,
  });

  // Load report types (custom categories)
  const { data: reportTypes } = useQuery({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId,
  });

  // Initialize selectedPhase and editModes based on report types
  useEffect(() => {
    if (reportTypes && Array.isArray(reportTypes) && reportTypes.length > 0) {
      // Set initial selected phase to first report type
      if (!selectedPhase || selectedPhase === "meetings") {
        setSelectedPhase(reportTypes[0].slug);
      }
      
      // Initialize edit modes for all report types
      const newEditModes: Record<string, boolean> = {};
      reportTypes.forEach((rt: any) => {
        newEditModes[rt.slug] = editModes[rt.slug] ?? false;
      });
      setEditModes(newEditModes);
    }
  }, [reportTypes]);

  // Initialize templates with defaults and merge with user templates
  useEffect(() => {
    console.log('🔄 TEMPLATE INIT EFFECT: Running template initialization...');
    console.log('🔍 Effect deps:', { 
      projectId, 
      hasUserTemplates: !!userTemplates, 
      hasShowSettings: !!showSettings,
      hasReportTypes: !!reportTypes,
      showSettingsLayoutConfig: !!showSettings?.layoutConfiguration 
    });
    
    if (!reportTypes || !Array.isArray(reportTypes) || reportTypes.length === 0) {
      console.log('⏳ Waiting for report types to load...');
      return;
    }
    
    const initialTemplates: Record<string, ProductionTemplate> = {};
    
    // Initialize templates based on report types
    reportTypes.forEach((reportType: any) => {
      const slug = reportType.slug;
      
      // Use default template if available, otherwise create a minimal one
      const defaultTemplate = defaultTemplates[slug] || {
        phase: slug as any,
        name: reportType.name,
        description: reportType.description || "",
        header: "",
        footer: "",
        fields: []
      };
      
      initialTemplates[slug] = {
        ...defaultTemplate,
        id: `default-${slug}`,
        phase: slug as any,
        // Keep the default template name on first initialization
      };
    });

    // Override with user-created templates if they exist
    if (userTemplates && Array.isArray(userTemplates)) {
      userTemplates.forEach((userTemplate: any) => {
        const slug = userTemplate.phase || userTemplate.type;
        const matchingReportType = reportTypes.find((rt: any) => rt.slug === slug);
        const defaultTemplate = defaultTemplates[slug];
        
        if (slug && initialTemplates[slug]) {
          initialTemplates[slug] = {
            id: userTemplate.id.toString(),
            phase: slug as any,
            // Preserve user's custom template name, fallback to report type name, then default
            name: userTemplate.name ?? matchingReportType?.name ?? defaultTemplate?.name ?? slug,
            description: userTemplate.description || "",
            header: userTemplate.header || "",
            footer: userTemplate.footer || "",
            fields: userTemplate.fields || [],
            layoutConfiguration: userTemplate.layoutConfiguration
          };
        }
      });
    }

    // FALLBACK: Only apply global layoutConfiguration to templates that don't have their own
    if ((showSettings as any)?.layoutConfiguration) {
      const layoutConfig = (showSettings as any).layoutConfiguration;
      
      Object.keys(initialTemplates).forEach(templateKey => {
        if (!initialTemplates[templateKey].layoutConfiguration) {
          initialTemplates[templateKey] = {
            ...initialTemplates[templateKey],
            layoutConfiguration: layoutConfig
          };
        }
      });
    }

    console.log('✅ Templates initialized with unified showSettings approach - single database table!');
    
    setTemplates(initialTemplates);
  }, [projectId, userTemplates, showSettings, reportTypes]);

  // Update departments list when settings change (only if not currently reordering)
  useEffect(() => {
    if (showSettings && !isReordering) {
      const departmentOrder = showSettings.departmentOrder as string[] | undefined;
      const departmentNames = showSettings.departmentNames as Record<string, string> | undefined;
      const newDepartments = getAllDepartmentNames(departmentNames, departmentOrder);
      
      // Only update if the order has actually changed to prevent unnecessary re-renders
      if (JSON.stringify(newDepartments.map(d => d.key)) !== JSON.stringify(departments.map(d => d.key))) {
        setDepartments(newDepartments);
      }
    }
  }, [showSettings, isReordering, departments]);

  // Department order mutation
  const saveDepartmentOrderMutation = useMutation({
    mutationFn: async (departmentOrder: string[]) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/settings/department-order`, {
        departmentOrder
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache immediately with new data
      queryClient.setQueryData(['/api/projects', projectId, 'settings'], data);
      // Then invalidate to trigger a fresh fetch
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'settings']
      });
      toast({
        title: "Department order saved",
        description: "Changes will persist across sessions",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save department order",
        variant: "destructive",
      });
      // Revert to the saved order from the server on error
      if (showSettings) {
        const departmentOrder = showSettings.departmentOrder as string[] | undefined;
        const departmentNames = showSettings.departmentNames as Record<string, string> | undefined;
        setDepartments(getAllDepartmentNames(departmentNames, departmentOrder));
      }
    },
  });

  // Add department functionality
  const addDepartment = () => {
    if (newDepartmentName.trim()) {
      const newKey = newDepartmentName.toLowerCase().replace(/\s+/g, '_') as DepartmentKey;
      const newDepartment = {
        key: newKey,
        displayName: newDepartmentName.trim()
      };
      
      // Add to local state immediately
      setDepartments([...departments, newDepartment]);
      
      // Update department names and order in backend
      const newDepartmentNames = {
        ...(showSettings?.departmentNames as Record<string, string> || {}),
        [newKey]: newDepartmentName.trim()
      };
      const newOrder = [...departments.map(d => d.key), newKey];
      
      // Save both department names and order
      Promise.all([
        apiRequest("PUT", `/api/projects/${projectId}/settings`, {
          departmentNames: newDepartmentNames
        }),
        saveDepartmentOrderMutation.mutateAsync(newOrder)
      ]).then(() => {
        toast({
          title: "Department added",
          description: `${newDepartmentName} has been added to the list`,
        });
      }).catch(() => {
        // Revert on error
        setDepartments(departments);
        toast({
          title: "Error",
          description: "Failed to add department",
          variant: "destructive",
        });
      });
      
      setNewDepartmentName("");
      setShowAddDialog(false);
    }
  };

  // Remove department functionality
  const removeDepartment = (keyToRemove: DepartmentKey) => {
    const newDepartments = departments.filter(d => d.key !== keyToRemove);
    setDepartments(newDepartments);
    
    // Update department order in backend
    const newOrder = newDepartments.map(d => d.key);
    saveDepartmentOrderMutation.mutate(newOrder, {
      onSuccess: () => {
        toast({
          title: "Department removed",
          description: "Department has been removed from the list",
        });
      },
      onError: () => {
        // Revert on error
        setDepartments(departments);
        toast({
          title: "Error", 
          description: "Failed to remove department",
          variant: "destructive",
        });
      }
    });
  };

  // Field header formatting "Apply to All" functionality
  const applyFormattingToAllFieldHeaders = () => {
    console.log('🔥 Apply to All Field Headers function called from template-settings!');
    
    // Find any currently editing field header using the correct data attribute
    const activeElement = document.querySelector('[data-field-heading="true"][contenteditable="true"]') as HTMLElement;
    if (!activeElement) {
      console.log('No active editing element found - looking for [data-field-heading="true"][contenteditable="true"]');
      // Try alternative selector
      const toolbarVisible = document.querySelector('.inline-formatting-toolbar');
      if (toolbarVisible) {
        console.log('Toolbar is visible, but no contenteditable element found');
      }
      return;
    }

    console.log('Found active editing element:', activeElement);

    // Get computed styles instead of inline styles for more accurate formatting
    const computedStyle = window.getComputedStyle(activeElement);
    const currentFormatting = {
      fontWeight: computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      textDecoration: computedStyle.textDecoration,
      textAlign: computedStyle.textAlign,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
    };

    console.log('Current formatting to apply:', currentFormatting);

    // Apply formatting to all field header elements
    const allFieldHeaders = document.querySelectorAll('[data-field-heading="true"]');
    console.log('Found field headers to format:', allFieldHeaders.length);
    
    allFieldHeaders.forEach((element) => {
      const htmlElement = element as HTMLElement;
      Object.entries(currentFormatting).forEach(([property, value]) => {
        if (value && value !== 'rgba(0, 0, 0, 0)') {
          const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          htmlElement.style.setProperty(cssProperty, value as string);
        }
      });
    });

    // Save formatting to database
    apiRequest("PUT", `/api/projects/${projectId}/settings/field-header-formatting`, {
      formatting: currentFormatting
    }).then(() => {
      toast({
        title: "Formatting applied",
        description: "Field header formatting applied to all fields",
      });
      
      // Invalidate cache to refresh settings
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'settings']
      });
    }).catch((error) => {
      console.error('Failed to save field header formatting:', error);
      toast({
        title: "Error",
        description: "Failed to save field header formatting",
        variant: "destructive",
      });
    });
  };

  // Drag and drop handlers for department reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReordering) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    if (!isReordering || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== targetIndex) {
      const newDepartments = [...departments];
      const draggedItem = newDepartments[draggedIndex];
      newDepartments.splice(draggedIndex, 1);
      newDepartments.splice(targetIndex, 0, draggedItem);
      setDepartments(newDepartments);
      setDraggedIndex(targetIndex);
    }
  };

  const handleDragEnd = () => {
    if (!isReordering) return;
    setDraggedIndex(null);
    
    // Save the new order to the database with optimistic update
    const departmentOrder = departments.map(d => d.key);
    
    // Store the current order before mutation for potential rollback
    const currentOrder = [...departments];
    
    saveDepartmentOrderMutation.mutate(departmentOrder, {
      onError: () => {
        // Revert to previous order on error
        setDepartments(currentOrder);
      }
    });
  };

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      order: currentTemplate.fields.length + 1
    };
    
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: [...prev[selectedPhase].fields, newField]
      }
    }));
  };

  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: prev[selectedPhase].fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  };

  const deleteField = (fieldId: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: prev[selectedPhase].fields.filter(field => field.id !== fieldId)
      }
    }));
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const fields = [...currentTemplate.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if ((direction === "up" && index > 0) || (direction === "down" && index < fields.length - 1)) {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      
      // Update order numbers
      fields.forEach((field, i) => {
        field.order = i + 1;
      });
      
      setTemplates(prev => ({
        ...prev,
        [selectedPhase]: {
          ...prev[selectedPhase],
          fields
        }
      }));
    }
  };

  const saveTemplate = useMutation({
    mutationFn: async (template: ProductionTemplate) => {
      setIsSaving(true);
      
      // Check if this is an existing template (has numeric ID) or new template
      const isExisting = typeof template.id === 'string' && /^\d+$/.test(template.id);
      
      const templateData = {
        name: template.name,
        description: template.description,
        type: template.phase, // Use phase as type
        phase: template.phase,
        header: template.header,
        footer: template.footer,
        fields: template.fields,
        layoutConfiguration: template.layoutConfiguration, // Include layout configuration
      };

      let response;
      if (isExisting) {
        // Update existing template
        response = await apiRequest("PATCH", `/api/projects/${projectId}/templates/${template.id}`, templateData);
      } else {
        // Create new template - don't include ID for auto-generation
        response = await apiRequest("POST", `/api/projects/${projectId}/templates`, templateData);
      }
      
      return response;
    },
    onSuccess: (response) => {
      setIsSaving(false);
      setLastSaved(new Date());
      
      console.log('🎉 Template save successful:', response);
      
      // If this was a new template creation, update the local state with the new ID
      if (response && response.id) {
        console.log('📝 Updating template ID from default to:', response.id);
        const templateWithNewId = {
          ...templates[selectedPhase],
          id: response.id.toString()
        };
        setTemplates(prev => ({
          ...prev,
          [selectedPhase]: templateWithNewId
        }));
      }
      
      // Force update the show settings timestamp by touching the settings
      const touchSettings = async () => {
        try {
          // Get current settings and save them again to update timestamp
          const currentSettings = await apiRequest("GET", `/api/projects/${projectId}/settings`);
          if (currentSettings) {
            await apiRequest("PUT", `/api/projects/${projectId}/settings`, {
              ...currentSettings,
              updatedAt: new Date().toISOString()
            });
            console.log('✅ Settings timestamp updated');
          }
        } catch (error) {
          console.log('⚠️ Could not update timestamp directly:', error);
        }
      };
      
      touchSettings();
      
      // CRITICAL FIX: Force refresh of ALL related queries to ensure layout changes are loaded
      console.log('🔄 GLOBAL SAVE: Invalidating queries to refresh data...');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/templates`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      
      // Force immediate refetch to ensure data consistency
      setTimeout(() => {
        console.log('🔄 FORCED REFETCH: Re-fetching settings to ensure latest data loaded');
        queryClient.refetchQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      }, 100);
    },
    onError: (error) => {
      setIsSaving(false);
      console.error("Template save error:", error);
      toast({
        title: "Error", 
        description: "Failed to save template",
        variant: "destructive",
      });
    },
  });

  // Global save mutation - handles all template changes at once
  const globalSaveMutation = useMutation({
    mutationFn: async (saveData: { data?: any; templateName?: string }) => {
      setIsSaving(true);
      console.log('🔒 GLOBAL SAVE: Starting comprehensive template save...');
      
      // Use provided save data or fall back to pending changes
      const dataToSave = saveData?.data || pendingChanges;
      console.log('🔍 Save data being used:', dataToSave);
      
      // Prepare all changes to save
      const savePromises = [];
      
      // CRITICAL FIX: Save layout configuration with the TEMPLATE, not global settings
      // The layout configuration should be part of the template data
      const currentTemplate = templates[selectedPhase];
      if (currentTemplate && dataToSave.layoutConfiguration) {
        console.log('💾 GLOBAL SAVE: Saving template with layout configuration...');
        
        // Save the template with the layout configuration included
        const templateData = {
          name: currentTemplate.name,
          description: currentTemplate.description,
          type: currentTemplate.phase,
          phase: currentTemplate.phase,
          header: currentTemplate.header,
          footer: currentTemplate.footer,
          fields: currentTemplate.fields,
          layoutConfiguration: dataToSave.layoutConfiguration,
        };
        
        const isExisting = typeof currentTemplate.id === 'string' && /^\d+$/.test(currentTemplate.id);
        
        if (isExisting) {
          savePromises.push(
            apiRequest("PATCH", `/api/projects/${projectId}/templates/${currentTemplate.id}`, templateData)
          );
        } else {
          savePromises.push(
            apiRequest("POST", `/api/projects/${projectId}/templates`, templateData)
          );
        }
      } else {
        console.log('⚠️ GLOBAL SAVE: No layout configuration changes to save');
      }
      
      // Save department names if there are changes
      if (Object.keys(dataToSave.departmentNames || {}).length > 0) {
        console.log('📝 Saving department names...', dataToSave.departmentNames);
        savePromises.push(
          apiRequest("PUT", `/api/projects/${projectId}/settings/department-names-bulk`, {
            departmentNames: dataToSave.departmentNames
          })
        );
      }
      
      // Save department formatting if there are changes
      if (Object.keys(dataToSave.departmentFormatting || {}).length > 0) {
        console.log('🎨 Saving department formatting...', dataToSave.departmentFormatting);
        savePromises.push(
          apiRequest("PUT", `/api/projects/${projectId}/settings/department-formatting-bulk`, {
            departmentFormatting: dataToSave.departmentFormatting
          })
        );
      }
      
      // Save field header formatting if there are changes
      if (dataToSave.fieldHeaderFormatting && Object.keys(dataToSave.fieldHeaderFormatting).length > 0) {
        console.log('📋 Saving field header formatting...', dataToSave.fieldHeaderFormatting);
        savePromises.push(
          apiRequest("PUT", `/api/projects/${projectId}/settings/field-header-formatting`, {
            formatting: dataToSave.fieldHeaderFormatting
          })
        );
      }
      
      // Execute all saves simultaneously
      await Promise.all(savePromises);
      return saveData.templateName;
    },
    onSuccess: async (templateName?: string) => {
      console.log('✅ GLOBAL SAVE: All template changes saved successfully');
      setIsSaving(false);
      setLastSaved(new Date());
      
      // Clear pending changes
      setPendingChanges({
        departmentNames: {},
        departmentFormatting: {},
        fieldHeaderFormatting: {},
        layoutConfiguration: null,
        hasChanges: false
      });
      
      console.log('🧹 GLOBAL SAVE: Pending changes cleared after successful save');
      
      // CRITICAL FIX: Wait for cache invalidation to complete before showing success
      console.log('🔄 Refreshing data and waiting for completion...');
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      
      // Wait a bit more to ensure data is fully refreshed
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Cache refresh completed - data is now current');
      
      toast({
        title: templateName ? `${templateName} saved` : "Template saved",
        description: "All template changes have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('❌ GLOBAL SAVE: Failed to save template changes:', error);
      setIsSaving(false);
      toast({
        title: "Error saving template",
        description: "Failed to save template changes. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Track department name changes
  const updateDepartmentName = (department: string, newName: string) => {
    console.log('🚨 TEMPLATE-SETTINGS: updateDepartmentName called!', { department, newName });
    setPendingChanges(prev => ({
      ...prev,
      departmentNames: {
        ...prev.departmentNames,
        [department]: newName
      },
      hasChanges: true
    }));
    console.log('🚨 TEMPLATE-SETTINGS: Department name updated in pendingChanges only - NO DATABASE SAVE');
  };
  
  // Track department formatting changes
  const updateDepartmentFormatting = (department: string, formatting: any) => {
    setPendingChanges(prev => ({
      ...prev,
      departmentFormatting: {
        ...prev.departmentFormatting,
        [department]: formatting
      },
      hasChanges: true
    }));
  };
  
  // Track field header formatting changes
  const updateFieldHeaderFormatting = (formatting: any) => {
    console.log('🚨 TEMPLATE-SETTINGS: updateFieldHeaderFormatting called!', formatting);
    setPendingChanges(prev => ({
      ...prev,
      fieldHeaderFormatting: formatting,
      hasChanges: true
    }));
    console.log('🚨 TEMPLATE-SETTINGS: Field header formatting updated in pendingChanges only - NO DATABASE SAVE');
  };

  const currentTemplate = templates[selectedPhase];
  
  // CRITICAL FIX: Always prioritize database layout data over template defaults
  const activeTemplate = currentTemplate ? {
    ...currentTemplate,
    layoutConfiguration: (showSettings as any)?.layoutConfiguration || currentTemplate.layoutConfiguration
  } : null;
  
  // Debug the active template being passed to FlexibleLayoutEditor
  useEffect(() => {
    if (activeTemplate) {
      console.log('🎯 ACTIVE TEMPLATE: Passing to FlexibleLayoutEditor');
      console.log('🎯 Has layoutConfiguration:', !!activeTemplate.layoutConfiguration);
      console.log('🎯 Layout items count:', activeTemplate.layoutConfiguration?.items?.length || 0);
      if (activeTemplate.layoutConfiguration?.items?.length > 0) {
        console.log('🎯 ACTIVE TEMPLATE: Layout positions:', activeTemplate.layoutConfiguration.items.map((item: any) => ({
          id: item.id,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h
        })));
      }
    }
  }, [activeTemplate]);

  if (!project || !currentTemplate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
              <p className="text-gray-500 mt-2">Customize report templates for each production phase</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation(`/shows/${projectId}/global-template-settings`)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Global Settings
              </Button>
              <Button
                onClick={() => setLocation(`/shows/${projectId}/templates/new`)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Template
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/shows/${projectId}/global-template-settings`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
            <Button
              onClick={() => setLocation(`/shows/${projectId}/templates/new`)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Template
            </Button>

            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
        </div>

        <Tabs value={selectedPhase} onValueChange={setSelectedPhase} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto">
            {reportTypes && Array.isArray(reportTypes) && reportTypes.length > 0 ? (
              reportTypes.map((reportType: any) => (
                <TabsTrigger key={reportType.slug} value={reportType.slug} className="flex-1">
                  {reportType.name}
                </TabsTrigger>
              ))
            ) : (
              <>
                <TabsTrigger value="meetings" className="flex-1">Meetings</TabsTrigger>
                <TabsTrigger value="rehearsal" className="flex-1">Rehearsal</TabsTrigger>
                <TabsTrigger value="tech" className="flex-1">Tech</TabsTrigger>
                <TabsTrigger value="previews" className="flex-1">Previews</TabsTrigger>
                <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
              </>
            )}
          </TabsList>
          


          {Object.entries(templates).map(([phase, template]) => (
            <TabsContent key={phase} value={phase} className="space-y-6">
              {/* Always show inline editable preview mode */}
              <Card className="min-h-[600px]">
                <CardHeader>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {editModes[phase] ? (
                        <Input
                          value={template.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setTemplates(prev => ({
                              ...prev,
                              [phase]: {
                                ...prev[phase],
                                name: newName
                              }
                            }));
                          }}
                          className="text-lg font-semibold"
                          data-testid={`input-template-name-${phase}`}
                        />
                      ) : (
                        template.name
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentEditMode = editModes[phase];
                          const newEditMode = !currentEditMode;
                          console.log(`🔄 GLOBAL SAVE TOGGLE: ${currentEditMode ? 'LOCKING (SAVE ALL)' : 'UNLOCKING'} - UI updates immediately`);
                          console.log('🔄 STATE DEBUG:', { phase, currentEditMode, newEditMode, willSave: !newEditMode });
                          
                          // If locking (saving), get the latest configuration and trigger global save
                          if (!newEditMode) {
                            console.log('🔒 LOCKING: Getting latest configuration before save...');
                            
                            // Get the latest configuration from the FlexibleLayoutEditor
                            let currentConfig = null;
                            console.log('🔒 STEP 1: Getting ref status...', {
                              hasRef: !!flexibleLayoutRef.current,
                              refType: typeof flexibleLayoutRef.current
                            });
                            
                            if (flexibleLayoutRef.current) {
                              console.log('🔒 STEP 2: Calling getCurrentConfiguration...');
                              currentConfig = flexibleLayoutRef.current.getCurrentConfiguration();
                              console.log('🔒 STEP 3: Got configuration:', !!currentConfig, currentConfig?.items?.length);
                              console.log('🔍 SAVING: Late field position before save:', currentConfig?.items.find(item => item.id?.includes('late')));
                              console.log('🔍 SAVING: ALL positions being saved:', currentConfig?.items?.map(item => ({
                                id: item.id,
                                x: item.x,
                                y: item.y,
                                w: item.w,
                                h: item.h
                              })));
                              
                              // Update pending changes with latest config before saving
                              setPendingChanges(prev => ({
                                ...prev,
                                layoutConfiguration: currentConfig,
                                hasChanges: true
                              }));
                            } else {
                              console.error('❌ CRITICAL: No flexibleLayoutRef.current available!');
                            }
                            
                            console.log('🔒 LOCKING: Saving all template changes...');
                            // Create the save data directly instead of relying on state timing
                            const saveData = {
                              ...pendingChanges,
                              layoutConfiguration: currentConfig,
                              hasChanges: true
                            };
                            console.log('🔒 SAVE DATA prepared:', {
                              hasLayoutConfig: !!saveData.layoutConfiguration,
                              itemsCount: saveData.layoutConfiguration?.items?.length,
                              hasChanges: saveData.hasChanges
                            });
                            
                            // Call the save function with the prepared data and template name
                            console.log('🔒 EXECUTING MUTATION: About to call globalSaveMutation.mutate...');
                            globalSaveMutation.mutate({ 
                              data: saveData,
                              templateName: template.name // Use the actual template name from state
                            });
                          }
                          
                          // Update edit mode for this specific template only
                          setEditModes(prev => ({
                            ...prev,
                            [phase]: newEditMode
                          }));
                        }}
                        className="h-6 w-6 p-0"
                      >
                        {editModes[phase] ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>
                      
                      {editModes[phase] && (
                        <>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  console.log('🏢 ADD DEPARTMENT clicked');
                                  flexibleLayoutRef.current?.addNewItem('department-header');
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Department
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  console.log('📝 ADD PROPERTY clicked');
                                  flexibleLayoutRef.current?.addNewItem('field-header');
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Property
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => flexibleLayoutRef.current?.addNewItem('empty-space')}
                            className="h-6 w-6 p-0"
                          >
                            [    ]
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => flexibleLayoutRef.current?.resetLayout()}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </CardTitle>
                    {/* Updated timestamp using template updatedAt */}
                    <div className="text-sm text-gray-500 mt-1">
                      {(template?.updatedAt || showSettings?.updatedAt) ? (
                        <span>
                          Updated: {(() => {
                            // Parse user's schedule settings for time format and timezone
                            const scheduleSettings = parseScheduleSettings(showSettings?.scheduleSettings);
                            const timeFormat = scheduleSettings.timeFormat === '24' ? '24' : '12';
                            const timezone = scheduleSettings.timezone;
                            // Use template updatedAt first, fallback to show settings updatedAt
                            const date = new Date(template?.updatedAt || showSettings?.updatedAt);
                            
                            // Format date as "July 22, 2025"
                            const dateStr = date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: timezone || 'America/New_York'
                            });
                            
                            // Format time without seconds based on user preference
                            const timeStr = date.toLocaleTimeString('en-US', {
                              hour12: timeFormat !== '24',
                              hour: timeFormat === '24' ? '2-digit' : 'numeric',
                              minute: '2-digit',
                              timeZone: timezone || 'America/New_York'
                            });
                            
                            return `${dateStr} at ${timeStr}`;
                          })()}
                        </span>
                      ) : (
                        <span>Updated</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">


                  {/* Document-style Preview */}
                  <div className="bg-white min-h-[500px] shadow-lg border border-gray-200 mx-auto" style={{ 
                    width: "8.5in", 
                    paddingTop: showSettings?.globalPageMargins?.top || globalSettings?.pageMargins?.top || "1in",
                    paddingBottom: showSettings?.globalPageMargins?.bottom || globalSettings?.pageMargins?.bottom || "1in",
                    paddingLeft: showSettings?.globalPageMargins?.left || globalSettings?.pageMargins?.left || "1in",
                    paddingRight: showSettings?.globalPageMargins?.right || globalSettings?.pageMargins?.right || "1in",
                    fontFamily: "Arial, sans-serif"
                  }}>
                    {/* Header - Inline Editable */}
                    <div 
                      className="text-center border-b"
                      style={{
                        lineHeight: globalSettings?.headerSpacing || '1.2',
                        marginBottom: `${(parseFloat(globalSettings?.headerSpacing || '1.2') * 1.5)}rem`,
                        paddingBottom: `${(parseFloat(globalSettings?.headerSpacing || '1.2') * 0.75)}rem`
                      }}
                    >
                      <EditableHeaderFooter
                        content={
                          (globalSettings?.defaultHeader || template.header)
                            .replace(/{{showName}}/g, project?.name || 'Show Name')
                            .replace(/{{reportType}}/g, template.name)
                            .replace(/{{date}}/g, new Date().toLocaleDateString())
                        }
                        onChange={(newHeader) => {
                          // All templates now update global settings
                          if (globalSettings) {
                            apiRequest("PUT", `/api/projects/${projectId}/global-template-settings`, {
                              ...globalSettings,
                              defaultHeader: newHeader
                            });
                            // Note: No cache invalidation here to prevent reload conflicts
                          }
                        }}
                        className="text-lg font-semibold text-center"
                        projectId={projectId}
                        type="header"
                        effectiveEditMode={editModes[selectedPhase]}
                      />
                    </div>

                    {/* Fields Preview - All templates now use FlexibleLayoutEditor */}
                    <FlexibleLayoutEditor
                      ref={flexibleLayoutRef}
                      projectId={parseInt(params.id)}
                      reportType={selectedPhase as any}
                      externalEditMode={editModes[selectedPhase]}
                      template={activeTemplate}
                      showSettings={showSettings}
                      onTemplateUpdate={(updatedTemplate) => {
                        // Local state update only - no database save until global save
                        setTemplates(prev => ({
                          ...prev,
                          [phase]: updatedTemplate
                        }));
                      }}
                      onConfigurationChange={(config) => {
                        console.log('📝 DRAG-DROP: Layout configuration changed!');
                        console.log('🔍 New config items:', config.items?.map(item => ({ 
                          id: item.id, 
                          type: item.type, 
                          x: item.x, 
                          y: item.y 
                        })));
                        
                        // Update local template state only - no database save
                        const updatedTemplate = {
                          ...template,
                          layoutConfiguration: config
                        };
                        setTemplates(prev => ({
                          ...prev,
                          [selectedPhase]: updatedTemplate
                        }));
                        
                        // Track layout configuration changes for global save
                        setPendingChanges(prev => ({
                          ...prev,
                          layoutConfiguration: config,
                          hasChanges: true
                        }));
                        
                        console.log('✅ DRAG-DROP: Layout changes tracked in pendingChanges');
                      }}
                      onDepartmentNameChange={updateDepartmentName}
                      onDepartmentFormattingChange={updateDepartmentFormatting}
                      onFieldHeaderFormattingChange={updateFieldHeaderFormatting}
                    />

                    {/* Footer - Inline Editable */}
                    <div 
                      className="border-t text-center text-sm text-gray-600"
                      style={{
                        lineHeight: globalSettings?.footerSpacing || '1.2',
                        marginTop: `${(parseFloat(globalSettings?.footerSpacing || '1.2') * 1.5)}rem`,
                        paddingTop: `${(parseFloat(globalSettings?.footerSpacing || '1.2') * 0.75)}rem`
                      }}
                    >
                      <EditableHeaderFooter
                        content={
                          (globalSettings?.defaultFooter || template.footer)
                            .replace(/{{showName}}/g, project?.name || 'Show Name')
                            .replace(/{{reportType}}/g, template.name)
                            .replace(/{{date}}/g, new Date().toLocaleDateString())
                            .replace(/{{pageNumber}}/g, '1')
                            .replace(/{{totalPages}}/g, '1')
                        }
                        onChange={(newFooter) => {
                          // All templates now update global settings
                          if (globalSettings) {
                            apiRequest("PUT", `/api/projects/${projectId}/global-template-settings`, {
                              ...globalSettings,
                              defaultFooter: newFooter
                            });
                            // Note: No cache invalidation here to prevent reload conflicts
                          }
                        }}
                        className="text-sm text-gray-600 text-center"
                        projectId={projectId}
                        type="footer"
                        effectiveEditMode={editModes[selectedPhase]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              

            </TabsContent>
          ))}
        </Tabs>

        {/* Reset Layout Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Template Layout</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the template layout to the default configuration. All custom positioning and department arrangements will be lost. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  // Trigger reset in FlexibleLayoutEditor
                  console.log('Reset confirmed');
                  setShowResetDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset Layout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}