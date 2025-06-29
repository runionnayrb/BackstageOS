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
  Shield,
  Clock,
  Mail,
  ArrowLeft
} from "lucide-react";

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
  const { id } = useParams<ShowSettingsParams>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState<any>({});

  const isFullTime = user?.profileType === "fulltime";
  const showLabel = isFullTime ? "Show" : "Project";

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/projects/${id}/settings`],
    enabled: !!id,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ShowSettings>) => {
      return await apiRequest("PATCH", `/api/projects/${id}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "settings"] });
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
      return await apiRequest("PATCH", `/api/projects/${id}`, projectUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
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

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${id}/share-link`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "settings"] });
      toast({
        title: "Share Link Generated",
        description: "A new shareable link has been created.",
      });
    },
  });

  const handleSettingsUpdate = (section: string, updates: any) => {
    const settingsData = settings as any || {};
    
    // Handle scheduleSettings specially since it's stored as JSON string
    if (section === 'scheduleSettings') {
      const currentScheduleSettings = typeof settingsData.scheduleSettings === 'string' 
        ? JSON.parse(settingsData.scheduleSettings) 
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
            onClick={() => setLocation(`/shows/${id}`)}
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

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
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
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workStart">Work Start Time</Label>
                  <Input
                    id="workStart"
                    type="time"
                    value={(() => {
                      const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                        ? JSON.parse((settings as any).scheduleSettings) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.workingHours?.start || "09:00";
                    })()}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...(() => {
                            const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                              ? JSON.parse((settings as any).scheduleSettings) 
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
                        ? JSON.parse((settings as any).scheduleSettings) 
                        : ((settings as any)?.scheduleSettings || {});
                      return scheduleSettings?.workingHours?.end || "18:00";
                    })()}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...(() => {
                            const scheduleSettings = typeof (settings as any)?.scheduleSettings === 'string' 
                              ? JSON.parse((settings as any).scheduleSettings) 
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
                        ? JSON.parse((settings as any).scheduleSettings) 
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
                        ? JSON.parse((settings as any).scheduleSettings) 
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
                      ? JSON.parse((settings as any).scheduleSettings) 
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
      </div>
    </div>
  );
}