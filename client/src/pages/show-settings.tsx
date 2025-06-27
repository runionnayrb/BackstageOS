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

  const isFullTime = user?.profileType === "fulltime";
  const showLabel = isFullTime ? "Show" : "Project";

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", id],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/projects", id, "settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ShowSettings>) => {
      return await apiRequest(`/api/projects/${id}/settings`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
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

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/projects/${id}/share-link`, {
        method: "POST",
      });
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
    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings?.[section],
        ...updates,
      },
    };
    updateSettingsMutation.mutate(updatedSettings);
  };

  const copyShareLink = () => {
    if (settings?.sharingSettings?.shareableLink) {
      navigator.clipboard.writeText(settings.sharingSettings.shareableLink);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard.",
      });
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
            {project?.name ? `Back to ${project.name}` : 'Back to Show'}
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Show Settings</h1>
          </div>
          <p className="text-muted-foreground">{project?.name} • Configure settings and permissions</p>
        </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
                  checked={settings?.teamMemberSettings?.allowInvitations || false}
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
                  checked={settings?.teamMemberSettings?.requireApproval || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("teamMemberSettings", { requireApproval: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultRole">Default Role</Label>
                  <Select
                    value={settings?.teamMemberSettings?.defaultRole || "member"}
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
                    value={settings?.teamMemberSettings?.maxMembers || 20}
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
                  checked={settings?.sharingSettings?.isPublic || false}
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
                  checked={settings?.sharingSettings?.allowGuestView || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("sharingSettings", { allowGuestView: checked })
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings?.sharingSettings?.shareableLink || "No link generated"}
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
                  value={settings?.sharingSettings?.password || ""}
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
                  checked={settings?.templateSettings?.useDefaultTemplates !== false}
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
                  checked={settings?.templateSettings?.allowCustomTemplates !== false}
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
                  checked={settings?.templateSettings?.templateApprovalRequired || false}
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
                  checked={settings?.templateSettings?.sharedTemplateLibrary || false}
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
                  value={settings?.reportSettings?.defaultReportType || "rehearsal"}
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
                    <SelectItem value="daily">Daily Report</SelectItem>
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
                  checked={settings?.reportSettings?.requireReview || false}
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
                  checked={settings?.reportSettings?.autoArchive || false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("reportSettings", { autoArchive: checked })
                  }
                />
              </div>

              {settings?.reportSettings?.autoArchive && (
                <div className="space-y-2">
                  <Label htmlFor="archiveDays">Archive After (Days)</Label>
                  <Input
                    id="archiveDays"
                    type="number"
                    min="1"
                    max="365"
                    value={settings?.reportSettings?.archiveDays || 30}
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
                  checked={settings?.reportSettings?.notificationsEnabled !== false}
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
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select
                  value={settings?.scheduleSettings?.timeZone || "America/New_York"}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workStart">Working Hours Start</Label>
                  <Input
                    id="workStart"
                    type="time"
                    value={settings?.scheduleSettings?.workingHours?.start || "09:00"}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...settings?.scheduleSettings?.workingHours,
                          start: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workEnd">Working Hours End</Label>
                  <Input
                    id="workEnd"
                    type="time"
                    value={settings?.scheduleSettings?.workingHours?.end || "18:00"}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        workingHours: {
                          ...settings?.scheduleSettings?.workingHours,
                          end: e.target.value,
                        },
                      })
                    }
                  />
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
                  checked={settings?.scheduleSettings?.allowConflicts || false}
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
                  checked={settings?.scheduleSettings?.reminderSettings?.enabled !== false}
                  onCheckedChange={(checked) =>
                    handleSettingsUpdate("scheduleSettings", {
                      reminderSettings: {
                        ...settings?.scheduleSettings?.reminderSettings,
                        enabled: checked,
                      },
                    })
                  }
                />
              </div>

              {settings?.scheduleSettings?.reminderSettings?.enabled !== false && (
                <div className="space-y-2">
                  <Label htmlFor="reminderMinutes">Reminder Time (Minutes Before)</Label>
                  <Input
                    id="reminderMinutes"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings?.scheduleSettings?.reminderSettings?.minutesBefore || 30}
                    onChange={(e) =>
                      handleSettingsUpdate("scheduleSettings", {
                        reminderSettings: {
                          ...settings?.scheduleSettings?.reminderSettings,
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
      </Tabs>
      </div>
    </div>
  );
}