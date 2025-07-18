import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Copy, Download, ExternalLink, Plus, Settings, Share2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface PublicCalendarShare {
  id: number;
  projectId: number;
  contactId: number;
  token: string;
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

interface PublicCalendarShareProps {
  projectId: number;
}

export function PublicCalendarShare({ projectId }: PublicCalendarShareProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedShareContact, setSelectedShareContact] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch public calendar shares
  const { data: sharesData = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/public-calendar-shares`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/public-calendar-shares`)
  });

  // Ensure shares is always an array
  const shares = Array.isArray(sharesData) ? sharesData : [];

  // Fetch contacts
  const { data: contactsData = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/contacts`)
  });

  // Ensure contacts is always an array
  const contacts = Array.isArray(contactsData) ? contactsData : [];

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: (data: { contactId: number; expiresAt?: string }) =>
      apiRequest('POST', `/api/projects/${projectId}/public-calendar-shares`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/public-calendar-shares`] });
      setIsCreateDialogOpen(false);
      setSelectedContact('');
      setExpiresAt('');
      setIsActive(true);
      toast({
        title: "Public Calendar Share Created",
        description: "The public calendar share has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Share",
        description: error.message || "Failed to create public calendar share",
        variant: "destructive"
      });
    }
  });

  // Update share mutation
  const updateShareMutation = useMutation({
    mutationFn: ({ shareId, data }: { shareId: number; data: Partial<PublicCalendarShare> }) =>
      apiRequest('PUT', `/api/projects/${projectId}/public-calendar-shares/${shareId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/public-calendar-shares`] });
      toast({
        title: "Share Updated",
        description: "The public calendar share has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Share",
        description: error.message || "Failed to update public calendar share",
        variant: "destructive"
      });
    }
  });

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: (shareId: number) =>
      apiRequest('DELETE', `/api/projects/${projectId}/public-calendar-shares/${shareId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/public-calendar-shares`] });
      toast({
        title: "Share Deleted",
        description: "The public calendar share has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Share",
        description: error.message || "Failed to delete public calendar share",
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
    
    const link = `${window.location.origin}/public-calendar/${share.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "The public calendar link has been copied to your clipboard."
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
    
    const link = `${window.location.origin}/api/public-calendar/${share.token}/ics`;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.download = `calendar-${contact.firstName}-${contact.lastName}.ics`;
    anchor.click();
    toast({
      title: "Download Started",
      description: "The ICS calendar file download has started."
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

  // Filter contacts that don't already have shares
  const availableContacts = contacts.filter((contact: Contact) => 
    !shares.some((share: PublicCalendarShare) => share.contactId === contact.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Public Calendar Sharing</h3>
          <p className="text-sm text-muted-foreground">
            Share individual calendars with external collaborators without requiring login
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Public Calendar Share</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact: Contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {getContactDisplayName(contact)} - {contact.email}
                      </SelectItem>
                    ))}
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
                  disabled={createShareMutation.isPending}
                >
                  {createShareMutation.isPending ? 'Creating...' : 'Create Share'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <div className="space-y-4">
        {shares.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Public Shares</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create public calendar shares to allow external collaborators to access individual schedules
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Share
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Contact Selection and Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Individual Schedule</CardTitle>
                <CardDescription>
                  Choose a contact to copy their public calendar link or download their ICS file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="shareContact">Contact</Label>
                    <Select value={selectedShareContact} onValueChange={setSelectedShareContact}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact to share" />
                      </SelectTrigger>
                      <SelectContent>
                        {shares.map((share: PublicCalendarShare) => {
                          const contact = getContactById(share.contactId);
                          if (!contact) return null;
                          
                          const expired = isExpired(share.expiresAt);
                          const isActive = share.isActive;
                          
                          return (
                            <SelectItem 
                              key={share.id} 
                              value={share.contactId.toString()}
                              disabled={!isActive || expired}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{getContactDisplayName(contact)}</span>
                                <div className="flex items-center space-x-1 ml-2">
                                  {expired && (
                                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                                  )}
                                  {!isActive && (
                                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      disabled={!selectedShareContact}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadICS}
                      disabled={!selectedShareContact}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download ICS
                    </Button>
                  </div>
                </div>
                
                {selectedShareContact && (
                  <div className="pt-4 border-t">
                    {(() => {
                      const share = shares.find((s: PublicCalendarShare) => s.contactId === parseInt(selectedShareContact));
                      const contact = getContactById(parseInt(selectedShareContact));
                      if (!share || !contact) return null;
                      
                      const expired = isExpired(share.expiresAt);
                      const publicLink = `${window.location.origin}/public-calendar/${share.token}`;
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{getContactDisplayName(contact)}</h4>
                            <div className="flex items-center space-x-2">
                              {expired && (
                                <Badge variant="destructive">Expired</Badge>
                              )}
                              {!share.isActive && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              <Switch
                                checked={share.isActive}
                                onCheckedChange={(checked) => handleToggleActive(share.id, checked)}
                                disabled={updateShareMutation.isPending}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Created</p>
                              <p className="text-muted-foreground">{formatDate(share.createdAt)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Expires</p>
                              <p className="text-muted-foreground">
                                {share.expiresAt ? formatDate(share.expiresAt) : 'Never'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Access Count</p>
                              <p className="text-muted-foreground">{share.accessCount}</p>
                            </div>
                            <div>
                              <p className="font-medium">Last Accessed</p>
                              <p className="text-muted-foreground">
                                {share.lastAccessed ? formatDate(share.lastAccessed) : 'Never'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm flex-1 pr-4">
                              <p className="font-medium">Public Link</p>
                              <p className="text-muted-foreground break-all">{publicLink}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(publicLink, '_blank')}
                                className="gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteShareMutation.mutate(share.id)}
                                disabled={deleteShareMutation.isPending}
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}