import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Settings, Users, BarChart3, Link, Unlink, Mail, Clock, Palette, Plus, GitCompare } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SchedulePhase5SettingsProps {
  projectId: number;
  projectName: string;
}

interface GoogleCalendarIntegration {
  id: number;
  calendarId: string;
  calendarName: string;
  isActive: boolean;
  syncSettings: {
    syncPersonalSchedules: boolean;
    syncEventTypes: string[];
    defaultReminders: { method: string; minutes: number }[];
  };
  createdAt: string;
}

interface NotificationPreferences {
  id: number;
  contactId: number;
  scheduleUpdates: boolean;
  majorVersionsOnly: boolean;
  emailEnabled: boolean;
  calendarSync: boolean;
  reminderSettings: {
    scheduleChanges: number;
    newVersions: number;
    personalScheduleUpdates: boolean;
  };
}

interface ScheduleComparison {
  id: number;
  fromVersionId: number;
  toVersionId: number;
  comparisonData: {
    summary: {
      totalChanges: number;
      eventsAdded: number;
      eventsModified: number;
      eventsRemoved: number;
    };
  };
  createdAt: string;
}

export function SchedulePhase5Settings({ projectId, projectName }: SchedulePhase5SettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Queries
  const { data: calendarIntegrations = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/calendar/integrations`],
  });

  const { data: notificationPreferences = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/notification-preferences`],
  });

  const { data: scheduleComparisons = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule/comparisons`],
  });

  const { data: changeStats } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule/change-stats`],
  });

  const { data: emailTemplateCategories = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/email-template-categories`],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Mutations
  const connectGoogleCalendar = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${projectId}/calendar/auth-url`);
      window.open(response.authUrl, '_blank', 'width=500,height=600');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Google Calendar",
        description: "Please complete the authorization in the popup window.",
      });
    },
  });

  const updateSyncSettings = useMutation({
    mutationFn: async ({ integrationId, syncSettings }: { integrationId: number; syncSettings: any }) => {
      return apiRequest('PUT', `/api/projects/${projectId}/calendar/integrations/${integrationId}`, { syncSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/calendar/integrations`] });
      toast({
        title: "Settings updated",
        description: "Google Calendar sync settings have been updated.",
      });
    },
  });

  const disconnectCalendar = useMutation({
    mutationFn: async (integrationId: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/calendar/integrations/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/calendar/integrations`] });
      toast({
        title: "Calendar disconnected",
        description: "Google Calendar integration has been removed.",
      });
    },
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: async ({ contactId, preferences }: { contactId: number; preferences: any }) => {
      return apiRequest('PUT', `/api/projects/${projectId}/contacts/${contactId}/notification-preferences`, preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notification-preferences`] });
      toast({
        title: "Preferences updated",
        description: "Notification preferences have been saved.",
      });
    },
  });

  const createEmailTemplateCategory = useMutation({
    mutationFn: async (categoryData: any) => {
      return apiRequest('POST', `/api/projects/${projectId}/email-template-categories`, categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/email-template-categories`] });
      toast({
        title: "Category created",
        description: "Email template category has been created.",
      });
    },
  });

  const activeIntegration = calendarIntegrations.find((int: GoogleCalendarIntegration) => int.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Advanced Schedule Features</h2>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar Sync
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="comparisons" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Comparisons
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Google Calendar Integration */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                Sync personal schedules to team members' Google Calendars automatically when versions are published.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeIntegration ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Connect Google Calendar</h3>
                  <p className="text-gray-600 mb-4">
                    Enable one-way sync from BackstageOS to Google Calendar for seamless schedule management.
                  </p>
                  <Button onClick={() => connectGoogleCalendar.mutate()} disabled={connectGoogleCalendar.isPending}>
                    <Link className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{activeIntegration.calendarName}</p>
                        <p className="text-sm text-gray-600">Connected and syncing</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnectCalendar.mutate(activeIntegration.id)}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Sync Settings</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Sync Personal Schedules</Label>
                        <p className="text-sm text-gray-600">Automatically sync published schedules to team members' calendars</p>
                      </div>
                      <Switch
                        checked={activeIntegration.syncSettings.syncPersonalSchedules}
                        onCheckedChange={(checked) => {
                          updateSyncSettings.mutate({
                            integrationId: activeIntegration.id,
                            syncSettings: {
                              ...activeIntegration.syncSettings,
                              syncPersonalSchedules: checked
                            }
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default Reminders</Label>
                      <Select
                        value={activeIntegration.syncSettings.defaultReminders[0]?.minutes.toString()}
                        onValueChange={(value) => {
                          updateSyncSettings.mutate({
                            integrationId: activeIntegration.id,
                            syncSettings: {
                              ...activeIntegration.syncSettings,
                              defaultReminders: [{ method: 'email', minutes: parseInt(value) }]
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="120">2 hours before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how team members receive schedule update notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">
                    No team members found. Add contacts to configure notification preferences.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact: any) => {
                      const preferences = notificationPreferences.find((pref: NotificationPreferences) => pref.contactId === contact.id);
                      
                      return (
                        <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-gray-600">{contact.email}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={preferences?.emailEnabled ?? true}
                                onCheckedChange={(checked) => {
                                  updateNotificationPreferences.mutate({
                                    contactId: contact.id,
                                    preferences: {
                                      emailEnabled: checked,
                                      scheduleUpdates: preferences?.scheduleUpdates ?? true,
                                      majorVersionsOnly: preferences?.majorVersionsOnly ?? false,
                                      calendarSync: preferences?.calendarSync ?? false,
                                    }
                                  });
                                }}
                              />
                              <Label className="text-sm">Email</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={preferences?.calendarSync ?? false}
                                onCheckedChange={(checked) => {
                                  updateNotificationPreferences.mutate({
                                    contactId: contact.id,
                                    preferences: {
                                      calendarSync: checked,
                                      emailEnabled: preferences?.emailEnabled ?? true,
                                      scheduleUpdates: preferences?.scheduleUpdates ?? true,
                                      majorVersionsOnly: preferences?.majorVersionsOnly ?? false,
                                    }
                                  });
                                }}
                              />
                              <Label className="text-sm">Calendar</Label>
                            </div>
                            <Badge variant={preferences?.majorVersionsOnly ? "secondary" : "outline"}>
                              {preferences?.majorVersionsOnly ? "Major only" : "All versions"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Comparisons */}
        <TabsContent value="comparisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Schedule Change Analytics
              </CardTitle>
              <CardDescription>
                Track and analyze changes between schedule versions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {changeStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{changeStats.totalComparisons}</div>
                    <div className="text-sm text-gray-600">Version Comparisons</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{changeStats.totalChanges}</div>
                    <div className="text-sm text-gray-600">Total Changes Tracked</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {changeStats.mostActiveVersion?.version || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Most Active Version</div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium">Recent Comparisons</h4>
                {scheduleComparisons.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">
                    No schedule comparisons yet. Comparisons are automatically created when versions are published.
                  </p>
                ) : (
                  scheduleComparisons.slice(0, 5).map((comparison: ScheduleComparison) => (
                    <div key={comparison.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          Version {comparison.fromVersionId} → {comparison.toVersionId}
                        </p>
                        <p className="text-sm text-gray-600">
                          {comparison.comparisonData.summary.totalChanges} changes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          +{comparison.comparisonData.summary.eventsAdded}
                        </Badge>
                        <Badge variant="outline">
                          ~{comparison.comparisonData.summary.eventsModified}
                        </Badge>
                        <Badge variant="outline">
                          -{comparison.comparisonData.summary.eventsRemoved}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Template Categories */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Email Template Categories
              </CardTitle>
              <CardDescription>
                Organize and categorize your schedule notification email templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Create categories to organize your email templates by purpose, audience, or event type.
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Email Template Category</DialogTitle>
                      <DialogDescription>
                        Add a new category to organize your email templates.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createEmailTemplateCategory.mutate({
                          name: formData.get('name'),
                          description: formData.get('description'),
                          color: formData.get('color'),
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="name">Category Name</Label>
                        <Input name="name" placeholder="e.g., Rehearsal Updates" required />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Input name="description" placeholder="Templates for rehearsal schedule changes" />
                      </div>
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input name="color" type="color" defaultValue="#3b82f6" />
                      </div>
                      <Button type="submit" disabled={createEmailTemplateCategory.isPending}>
                        Create Category
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {emailTemplateCategories.map((category: any) => (
                  <div key={category.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}