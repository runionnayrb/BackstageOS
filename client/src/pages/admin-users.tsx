import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Save, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import AdminGuard from "@/components/admin-guard";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  betaAccess: string;
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
  const [editForm, setEditForm] = useState<{
    profileType: string;
    betaAccess: string;
    betaFeatures: string[];
  }>({ profileType: '', betaAccess: '', betaFeatures: [] });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
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
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
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
      betaAccess: user.betaAccess || 'none',
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
    setEditForm({ profileType: '', betaAccess: '', betaFeatures: [] });
  };

  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    setEditForm(prev => ({
      ...prev,
      betaFeatures: checked 
        ? [...prev.betaFeatures, featureId]
        : prev.betaFeatures.filter(f => f !== featureId)
    }));
  };

  const getBetaAccessBadge = (access: string) => {
    switch (access) {
      case 'full': return <Badge className="bg-green-100 text-green-800">Full Access</Badge>;
      case 'limited': return <Badge className="bg-yellow-100 text-yellow-800">Limited Beta</Badge>;
      default: return <Badge variant="secondary">No Access</Badge>;
    }
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shows
        </Button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, permissions, and beta access</p>
      </div>

      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email
                    }
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getBetaAccessBadge(user.betaAccess)}
                  <Badge variant="outline">
                    {user.profileType === 'fulltime' ? 'Full-time' : 'Freelance'}
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
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="fulltime">Full-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Beta Access</Label>
                      <Select
                        value={editForm.betaAccess}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, betaAccess: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Access</SelectItem>
                          <SelectItem value="limited">Limited Beta</SelectItem>
                          <SelectItem value="full">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editForm.betaAccess === 'limited' && (
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