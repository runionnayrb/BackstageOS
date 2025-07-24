import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Save, X, ArrowLeft, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import AdminGuard from "@/components/admin-guard";
import { apiRequest } from "@/lib/queryClient";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  betaAccess: boolean;
  betaFeatures?: string;
  createdAt: string;
  updatedAt: string;
}

const BETA_FEATURES = [
  { id: 'script-editor', label: 'Script Editor' },
  { id: 'props-tracker', label: 'Props Tracker' },
  { id: 'costume-tracker', label: 'Costume Tracker' },
  { id: 'advanced-templates', label: 'Advanced Templates' },
  { id: 'team-collaboration', label: 'Team Collaboration' },
  { id: 'calendar-management', label: 'Calendar Management' },
  { id: 'cast-management', label: 'Cast Management' },
  { id: 'task-boards', label: 'Task Boards' }
];

function AdminUsersContent() {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editForm, setEditForm] = useState<{
    profileType: string;
    betaAccess: boolean;
    betaFeatures: string[];
  }>({ profileType: '', betaAccess: false, betaFeatures: [] });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  const { data: profileTypes = [] } = useQuery({
    queryKey: ['/api/admin/account-types'],
    select: (data: any[]) => {
      console.log('Profile types data received:', data);
      return data || [];
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      profileType: user.profileType || 'freelance',
      betaAccess: user.betaAccess || false,
      betaFeatures: user.betaFeatures ? JSON.parse(user.betaFeatures) : []
    });
  };

  const saveEdit = () => {
    if (!editingUser) return;
    
    updateUserMutation.mutate({
      userId: editingUser,
      updates: editForm
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ profileType: '', betaAccess: false, betaFeatures: [] });
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    setEditForm(prev => ({
      ...prev,
      betaFeatures: checked 
        ? [...prev.betaFeatures, featureId]
        : prev.betaFeatures.filter(f => f !== featureId)
    }));
  };

  const getBetaAccessBadge = (betaAccess: boolean) => {
    return betaAccess 
      ? <Badge className="bg-green-100 text-green-800">Beta Access</Badge>
      : <Badge variant="secondary">No Beta Access</Badge>;
  };

  // Component to show invited editors for a user
  const InvitedEditorsExpansion = ({ userId }: { userId: string }) => {
    const { data: invitedEditors, isLoading } = useQuery({
      queryKey: ['/api/admin/users', userId, 'invited-editors'],
      enabled: expandedUsers.has(userId)
    });

    if (isLoading) {
      return <div className="text-sm text-muted-foreground">Loading invited editors...</div>;
    }

    if (!invitedEditors || invitedEditors.length === 0) {
      return <div className="text-sm text-muted-foreground">No editors invited by this user</div>;
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Invited Editors ({invitedEditors.length})</h4>
        <div className="grid gap-2">
          {invitedEditors.map((editor: any) => (
            <div key={editor.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">{editor.name || editor.email}</div>
                <div className="text-xs text-muted-foreground">{editor.email}</div>
                <div className="text-xs text-muted-foreground">
                  {editor.projectName} • {editor.role}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <Badge variant={editor.status === 'accepted' ? 'default' : 
                               editor.status === 'pending' ? 'secondary' : 'destructive'}>
                  {editor.status}
                </Badge>
                {editor.status === 'accepted' && editor.totalLogins > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {editor.totalLogins} logins
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6"></div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, permissions, and beta access</p>
      </div>

      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleUserExpansion(user.id)}
                    className="p-1 h-8 w-8"
                  >
                    {expandedUsers.has(user.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                  <div>
                    <CardTitle className="text-lg">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.email
                      }
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getBetaAccessBadge(user.betaAccess)}
                  <Badge variant="outline">
                    {profileTypes.find((pt: any) => pt.name === user.profileType)?.name || user.profileType || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {editingUser === user.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Profile Type</Label>
                      <Select
                        value={editForm.profileType}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, profileType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {profileTypes.map((profileType: any) => {
                            console.log('Rendering profile type option:', profileType);
                            return (
                              <SelectItem key={profileType.id} value={profileType.name}>
                                {profileType.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Beta Access</Label>
                      <Select
                        value={editForm.betaAccess.toString()}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, betaAccess: value === 'true' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No Beta Access</SelectItem>
                          <SelectItem value="true">Beta Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editForm.betaAccess && (
                    <div className="space-y-2">
                      <Label>Beta Features</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {BETA_FEATURES.map((feature) => (
                          <div key={feature.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={feature.id}
                              checked={editForm.betaFeatures.includes(feature.id)}
                              onCheckedChange={(checked) => 
                                handleFeatureToggle(feature.id, checked as boolean)
                              }
                            />
                            <Label htmlFor={feature.id} className="text-sm">
                              {feature.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={updateUserMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <div>User ID: {user.id}</div>
                    <div>Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                    {user.betaFeatures && JSON.parse(user.betaFeatures).length > 0 && (
                      <div>Features: {JSON.parse(user.betaFeatures).join(', ')}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(user)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {user.id !== '44106967' && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Expanded content showing invited editors */}
              {expandedUsers.has(user.id) && !editingUser && (
                <div className="border-t pt-4 mt-4">
                  <InvitedEditorsExpansion userId={user.id} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <AdminGuard>
      <AdminUsersContent />
    </AdminGuard>
  );
}