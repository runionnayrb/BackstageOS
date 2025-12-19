import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Calendar, Copy, Download, ExternalLink, Mail, Plus, Settings, Share2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface PublicCalendarShare {
  id: number;
  projectId: number;
  contactId: number;
  accessToken: string;
  expiresAt: string | null;
  isActive: boolean;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  contactType: string;
}

interface EventTypeCalendarShare {
  id: number;
  projectId: number;
  eventTypeName: string;
  eventTypeCategory: string;
  token: string;
  isActive: boolean;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicCalendarShareProps {
  projectId: number;
}

export function PersonalScheduleShare({ projectId }: PublicCalendarShareProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateEventTypeDialogOpen, setIsCreateEventTypeDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedShareContact, setSelectedShareContact] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedEventTypeCategory, setSelectedEventTypeCategory] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project settings to determine enabled event types for Show Schedule
  const { data: projectSettingsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/settings`)
  });

  // Dynamic event type options based on project settings
  const getEventTypeOptions = () => {
    const enabledEventTypes = projectSettingsData?.enabledEventTypes || [];
    
    // Create dynamic description for Show Schedule based on enabled event types
    const enabledTypeNames = enabledEventTypes.map((type: string) => {
      switch(type) {
        case 'rehearsal': return 'rehearsals';
        case 'tech_rehearsal': return 'tech rehearsals';
        case 'performance': return 'performances';
        case 'preview': return 'previews';
        case 'meeting': return 'meetings';
        case 'dark': return 'dark days';
        case 'breaks': return 'breaks';
        default: return type.replace(/_/g, ' ');
      }
    });
    
    const showScheduleDescription = enabledTypeNames.length > 0 
      ? `All ${enabledTypeNames.join(', ')}` 
      : 'All enabled show schedule events';

    return [
      { category: 'show_schedule', name: 'Show Schedule', description: showScheduleDescription },
      { category: 'individual', name: 'Meetings', description: 'All meeting events' },
      { category: 'individual', name: 'Costume Fittings', description: 'All costume fitting events' },
      { category: 'individual', name: 'Wig Fittings', description: 'All wig fitting events' },
      { category: 'individual', name: 'Hair and Make-Up', description: 'All hair and make-up events' },
      { category: 'individual', name: 'Vocal Coaching', description: 'All vocal coaching events' }
    ];
  };

  const eventTypeOptions = getEventTypeOptions();

  // Fetch personal schedules
  const { data: sharesData = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/personal-schedules`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/personal-schedules`)
  });

  // Ensure shares is always an array
  const shares = Array.isArray(sharesData) ? sharesData : [];

  // Fetch contacts
  const { data: contactsData = [], isLoading: contactsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/contacts`)
  });

  // Ensure contacts is always an array
  const contacts = Array.isArray(contactsData) ? contactsData : [];

  // Fetch event type calendar shares
  const { data: eventTypeSharesData = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-type-calendar-shares`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/event-type-calendar-shares`)
  });

  // Ensure event type shares is always an array
  const eventTypeShares = Array.isArray(eventTypeSharesData) ? eventTypeSharesData : [];

  // Fetch notification preferences for unified interface
  const { data: notificationPreferences = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/notification-preferences`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/notification-preferences`)
  });

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: (data: { contactId: number; expiresAt?: string }) =>
      apiRequest('POST', `/api/projects/${projectId}/personal-schedules/activate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/personal-schedules`] });
      setIsCreateDialogOpen(false);
      setSelectedContact('');
      setExpiresAt('');
      setIsActive(true);
      toast({
        title: "Personal Schedule Share Activated",
        description: "The personal schedule share has been activated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Share",
        description: error.message || "Failed to create personal schedule share",
        variant: "destructive"
      });
    }
  });

  // Update share mutation
  const updateShareMutation = useMutation({
    mutationFn: ({ shareId, data }: { shareId: number; data: any }) =>
      apiRequest('PUT', `/api/projects/${projectId}/personal-schedules/${shareId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/personal-schedules`] });
      toast({
        title: "Share Updated",
        description: "The personal schedule share has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Share",
        description: error.message || "Failed to update personal schedule share",
        variant: "destructive"
      });
    }
  });

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: (shareId: number) =>
      apiRequest('PUT', `/api/projects/${projectId}/personal-schedules/${shareId}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/personal-schedules`] });
      toast({
        title: "Share Deactivated",
        description: "The personal schedule share has been deactivated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Share",
        description: error.message || "Failed to delete personal schedule share",
        variant: "destructive"
      });
    }
  });

  // Create event type share mutation
  const createEventTypeShareMutation = useMutation({
    mutationFn: (data: { eventTypeName: string; eventTypeCategory: string }) =>
      apiRequest('POST', `/api/projects/${projectId}/event-type-calendar-shares`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/event-type-calendar-shares`] });
      setIsCreateEventTypeDialogOpen(false);
      setSelectedEventType('');
      setSelectedEventTypeCategory('');
      toast({
        title: "Event Type Share Created",
        description: "Your event type calendar share has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Event Type Share",
        description: error.message || "Failed to create event type calendar share",
        variant: "destructive"
      });
    }
  });

  // Delete event type share mutation
  const deleteEventTypeShareMutation = useMutation({
    mutationFn: (shareId: number) =>
      apiRequest('DELETE', `/api/projects/${projectId}/event-type-calendar-shares/${shareId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/event-type-calendar-shares`] });
      toast({
        title: "Share Deleted",
        description: "The event type calendar share has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Share",
        description: error.message || "Failed to delete event type calendar share",
        variant: "destructive"
      });
    }
  });

  // Update notification preferences mutation
  const updateNotificationPreferences = useMutation({
    mutationFn: ({ contactId, preferences }: { contactId: number; preferences: any }) =>
      apiRequest('PUT', `/api/projects/${projectId}/contacts/${contactId}/notification-preferences`, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notification-preferences`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Preferences",
        description: error.message || "Failed to update notification preferences",
        variant: "destructive"
      });
    }
  });

  const handleCreateShare = () => {
    if (!selectedContact) {
      toast({
        title: "Contact Required",
        description: "Please select a contact to create a share for.",
        variant: "destructive"
      });
      return;
    }

    createShareMutation.mutate({
      contactId: parseInt(selectedContact),
      expiresAt: expiresAt || undefined
    });
  };

  const handleToggleActive = (shareId: number, isActive: boolean) => {
    updateShareMutation.mutate({
      shareId,
      data: { isActive }
    });
  };

  const handleCopyLink = () => {
    if (!selectedShareContact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact from the dropdown first.",
        variant: "destructive"
      });
      return;
    }
    
    const share = shares.find((s: PublicCalendarShare) => s.contactId === parseInt(selectedShareContact));
    if (!share) return;
    
    const link = `${window.location.origin}/personal-schedule/${share.accessToken}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "The personal schedule link has been copied to your clipboard."
    });
  };

  const handleDownloadICS = () => {
    if (!selectedShareContact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact from the dropdown first.",
        variant: "destructive"
      });
      return;
    }
    
    const share = shares.find((s: PublicCalendarShare) => s.contactId === parseInt(selectedShareContact));
    const contact = getContactById(parseInt(selectedShareContact));
    if (!share || !contact) return;
    
    const link = `${window.location.origin}/api/schedule/${share.accessToken}/subscribe.ics`;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.download = `personal-schedule-${contact.firstName}-${contact.lastName}.ics`;
    anchor.click();
    toast({
      title: "Personal Schedule Downloaded",
      description: "The auto-updating personal schedule file has been downloaded. Import this into Google Calendar or Apple Calendar for automatic updates."
    });
  };

  const handleCopySubscriptionLink = () => {
    if (!selectedShareContact) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact from the dropdown first.",
        variant: "destructive"
      });
      return;
    }
    
    const share = shares.find((s: PublicCalendarShare) => s.contactId === parseInt(selectedShareContact));
    if (!share) return;
    
    const subscriptionLink = `${window.location.origin}/api/schedule/${share.accessToken}/subscribe.ics`;
    navigator.clipboard.writeText(subscriptionLink);
    toast({
      title: "Subscription Link Copied",
      description: "The personal schedule subscription link has been copied. Add this to Google Calendar or Apple Calendar for automatic updates."
    });
  };

  const getContactById = (contactId: number): Contact | undefined => {
    return contacts.find((c: Contact) => c.id === contactId);
  };

  const getContactDisplayName = (contact: Contact): string => {
    return `${contact.firstName} ${contact.lastName}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  // Event type helper functions
  const handleCreateEventTypeShare = () => {
    if (!selectedEventType) {
      toast({
        title: "No Event Type Selected",
        description: "Please select an event type to share.",
        variant: "destructive"
      });
      return;
    }

    const eventType = eventTypeOptions.find(opt => opt.name === selectedEventType);
    if (!eventType) return;

    createEventTypeShareMutation.mutate({
      eventTypeName: eventType.name,
      eventTypeCategory: eventType.category
    });
  };

  const handleCopyEventTypeLink = (token: string, eventTypeName: string) => {
    const subscriptionLink = `${window.location.origin}/api/public-calendar/event-type/${token}/subscribe.ics`;
    navigator.clipboard.writeText(subscriptionLink);
    toast({
      title: "Subscription Link Copied",
      description: `The ${eventTypeName} dynamic calendar subscription link has been copied. Add this to Google Calendar or Apple Calendar for automatic updates.`
    });
  };

  const handleCopyLinkForContact = (contactId: number) => {
    const share = shares.find((s: any) => s.contactId === contactId);
    if (!share) return;
    
    const subscriptionLink = `${window.location.origin}/api/schedule/${share.accessToken}/subscribe.ics`;
    navigator.clipboard.writeText(subscriptionLink);
    
    const contact = getContactById(contactId);
    const contactName = contact ? getContactDisplayName(contact) : 'Contact';
    
    toast({
      title: "Subscription Link Copied",
      description: `The ${contactName} personal schedule subscription link has been copied. Add this to Google Calendar or Apple Calendar for automatic updates.`
    });
  };

  const handleDownloadICSForContact = (contactId: number) => {
    const share = shares.find((s: any) => s.contactId === contactId);
    if (!share) return;
    
    const contact = getContactById(contactId);
    const contactName = contact ? getContactDisplayName(contact) : 'Contact';
    
    const subscriptionLink = `${window.location.origin}/api/schedule/${share.accessToken}/subscribe.ics`;
    const filename = `${contactName.replace(/\s+/g, '_')}_personal_schedule.ics`;
    
    // Create a temporary link to download the ICS file
    const link = document.createElement('a');
    link.href = subscriptionLink;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Personal Schedule Downloaded",
      description: `The ${contactName} personal schedule has been downloaded as ${filename}.`
    });
  };

  const handleDownloadEventTypeICS = (token: string, eventTypeName: string) => {
    const link = `${window.location.origin}/api/public-calendar/event-type/${token}/subscribe.ics`;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.download = `schedule-${eventTypeName.toLowerCase().replace(/\s+/g, '-')}.ics`;
    anchor.click();
    toast({
      title: "Event Type Schedule Downloaded",
      description: `The auto-updating ${eventTypeName} schedule file has been downloaded. Import this into Google Calendar or Apple Calendar for automatic updates.`
    });
  };

  // Filter event types that don't already have shares
  const availableEventTypes = eventTypeOptions.filter(eventType =>
    !eventTypeShares.some((share: EventTypeCalendarShare) => share.eventTypeName === eventType.name)
  );

  // Filter contacts that don't already have shares and have a contact group assigned
  const availableContacts = contacts.filter((contact: any) => 
    !shares.some((share: PublicCalendarShare) => share.contactId === contact.id) &&
    contact.contactGroup?.name // Only include contacts with a group assigned
  );

  return (
    <div className="space-y-6">
      {/* Event Type Calendar Shares Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Show Wide Schedules</h3>
            <p className="text-sm text-muted-foreground">Share the show schedule and individual event types with external calendar applications that automatically update when published</p>
          </div>
          <Dialog open={isCreateEventTypeDialogOpen} onOpenChange={setIsCreateEventTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="outline">
                <Calendar className="h-4 w-4" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Event Type Calendar Share</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event type to share" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEventTypes.map((eventType) => (
                        <SelectItem key={eventType.name} value={eventType.name}>
                          <div>
                            <div className="font-medium">{eventType.name}</div>
                            <div className="text-sm text-muted-foreground">{eventType.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => setIsCreateEventTypeDialogOpen(false)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateEventTypeShare} 
                    className="flex-1 gap-2"
                    disabled={createEventTypeShareMutation.isPending}
                  >
                    {createEventTypeShareMutation.isPending ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Create Share
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Event Type Shares List */}
        {eventTypeShares.length > 0 ? (
          <div className="space-y-2">
            {eventTypeShares.map((share: EventTypeCalendarShare) => (
              <div key={share.id} className="py-3 px-4 rounded-lg bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{share.eventTypeName}</h4>
                    <div className="text-xs text-muted-foreground mt-1">
                      {share.accessCount} access{share.accessCount !== 1 ? 'es' : ''} • Created {formatDate(share.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-8"
                      onClick={() => handleCopyEventTypeLink(share.token, share.eventTypeName)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-8"
                      onClick={() => handleDownloadEventTypeICS(share.token, share.eventTypeName)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteEventTypeShareMutation.isPending}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Calendar Share</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the "{share.eventTypeName}" calendar share? This will permanently remove access for all users with this link and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteEventTypeShareMutation.mutate(share.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-none">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-sm font-medium mb-1">No Event Type Shares</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create calendar shares for specific event types to automatically sync with external calendars
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateEventTypeDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Event Type Share
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Separator />
      {/* Contact Schedule Sharing Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contact Schedule Sharing</h3>
          <p className="text-sm text-muted-foreground">
            Manage how individual contacts receive schedule information through calendar subscriptions and email notifications
          </p>
        </div>
      </div>
      {/* Unified Contact Schedule Sharing Interface */}
      <div className="space-y-4">
        {contacts.length === 0 ? (
          <Card className="border-0 shadow-none">
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-sm font-medium mb-1">No Contacts Found</h4>
              <p className="text-sm text-muted-foreground">
                Add contacts to your show to configure their schedule sharing preferences
              </p>
            </CardContent>
          </Card>
        ) : shares.length === 0 ? (
          <Card className="border-0 shadow-none">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-sm font-medium mb-1">No Schedule Published Yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                You need to publish a schedule version first to enable personal schedule sharing for your team members.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {/* Navigate to schedule version publishing */}}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Publish First Schedule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact: any) => {
              const preferences = notificationPreferences.find((p: any) => p.contactId === contact.id) || {};
              const existingShare = shares.find((s: any) => s.contactId === contact.id);
              
              return (
                <div key={contact.id} className="p-4 rounded-lg bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="font-medium">{getContactDisplayName(contact)}</h4>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                      {/* Notification Settings */}
                      <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-left hover:text-blue-600 transition-colors text-sm font-medium flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Notification Settings
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 sm:w-80 max-w-[calc(100vw-2rem)]" align="start">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Email Notifications</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-normal">Schedule Updates</Label>
                                <Switch
                                  checked={preferences.scheduleUpdates !== false}
                                  onCheckedChange={(checked) =>
                                    updateNotificationPreferences.mutate({
                                      contactId: contact.id,
                                      preferences: { ...preferences, scheduleUpdates: checked },
                                    })
                                  }
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-normal">Email Enabled</Label>
                                <Switch
                                  checked={preferences.emailEnabled !== false}
                                  onCheckedChange={(checked) =>
                                    updateNotificationPreferences.mutate({
                                      contactId: contact.id,
                                      preferences: { ...preferences, emailEnabled: checked },
                                    })
                                  }
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-normal">Major Versions Only</Label>
                                <Switch
                                  checked={preferences.majorVersionsOnly || false}
                                  onCheckedChange={(checked) =>
                                    updateNotificationPreferences.mutate({
                                      contactId: contact.id,
                                      preferences: { ...preferences, majorVersionsOnly: checked },
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Calendar Sharing */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-left hover:text-blue-600 transition-colors text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Calendar Sharing
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 sm:w-80 max-w-[calc(100vw-2rem)]" align="start">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Calendar Sharing</h4>
                            {existingShare ? (
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">
                                  {existingShare.accessCount} access{existingShare.accessCount !== 1 ? 'es' : ''} • Created {formatDate(existingShare.createdAt)}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    onClick={() => handleCopyLinkForContact(contact.id)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1 text-xs sm:text-sm"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy Link
                                  </Button>
                                  <Button
                                    onClick={() => handleDownloadICSForContact(contact.id)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1 text-xs sm:text-sm"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download
                                  </Button>
                                </div>
                                <Button
                                  onClick={() => window.open(`${window.location.origin}/personal-schedule/${existingShare.accessToken}`, '_blank')}
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Personal Schedule
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setSelectedContact(contact.id.toString());
                                  setIsCreateDialogOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Create Personal Schedule Share
                              </Button>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Create Share Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Calendar Share</DialogTitle>
            <DialogDescription>
              Create a personal schedule share for this contact to access their assigned events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-select">Contact</Label>
              <Select value={selectedContact} onValueChange={setSelectedContact} disabled={contactsLoading}>
                <SelectTrigger id="contact-select">
                  <SelectValue placeholder={contactsLoading ? "Loading contacts..." : "Select a contact"} />
                </SelectTrigger>
                <SelectContent>
                  {contactsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading contacts...</div>
                  ) : availableContacts.length > 0 ? (
                    availableContacts.map((contact: Contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {getContactDisplayName(contact)}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">No available contacts</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expires">Expires (Optional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateShare}
                disabled={createShareMutation.isPending || contactsLoading}
              >
                {createShareMutation.isPending ? 'Creating...' : 'Create Share'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}