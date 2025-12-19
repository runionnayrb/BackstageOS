import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Crown, Edit3, Eye, Settings } from "lucide-react";
import SimpleUserList from "@/components/SimpleUserList";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  userRole: string;
  profileType?: string;
  isActive: boolean;
  currentActiveShows: number;
  maxActiveShows: number;
  lastActiveAt?: string;
  totalLogins: number;
  betaAccess: boolean;
  createdAt: string;
  projectAssignments?: Array<{
    projectId: number;
    projectName: string;
    role: string;
    accessLevel: string;
    status: string;
    invitedAt: string;
    joinedAt?: string;
  }>;
}

const roleIcons = {
  admin: Crown,
  user: Users,
  editor: Edit3,
  viewer: Eye,
};

const roleColors = {
  admin: "bg-red-100 text-red-800 border-red-200",
  user: "bg-blue-100 text-blue-800 border-blue-200", 
  editor: "bg-green-100 text-green-800 border-green-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function AdminUserRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("admin");

  // Fetch users by role (for non-editor tabs)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users-by-role", selectedRole],
    enabled: !!selectedRole && selectedRole !== "editor",
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, userRole }: { userId: number; userRole: string }) => {
      return apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ userRole }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-by-role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/editors-with-projects"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: number, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, userRole: newRole });
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const UserCard = ({ user }: { user: User }) => {
    const IconComponent = roleIcons[user.userRole as keyof typeof roleIcons] || Users;
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IconComponent className="h-5 w-5 text-gray-500" />
              <div>
                <CardTitle className="text-lg">{getUserDisplayName(user)}</CardTitle>
                <CardDescription className="text-sm">{user.email}</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={roleColors[user.userRole as keyof typeof roleColors]}>
                {user.userRole}
              </Badge>
              {user.betaAccess && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Beta
                </Badge>
              )}
              {!user.isActive && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">Profile Type</p>
              <p className="capitalize">{user.profileType || 'Not set'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Total Logins</p>
              <p>{user.totalLogins || 0}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Active Shows</p>
              <p>{user.currentActiveShows || 0} / {user.maxActiveShows || 2}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Created</p>
              <p>{formatDate(user.createdAt)}</p>
            </div>
          </div>
          
          {/* Show project assignments for editors */}
          {user.projectAssignments && user.projectAssignments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium text-gray-700 mb-2">Project Assignments</p>
              <div className="space-y-2">
                {user.projectAssignments.map((assignment) => (
                  <div key={assignment.projectId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium">{assignment.projectName}</p>
                      <p className="text-sm text-gray-600">{assignment.role}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.accessLevel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Change Role</p>
              <Select
                value={user.userRole}
                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                disabled={updateUserRoleMutation.isPending}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Role Management</h1>
        <p className="text-gray-600">Manage user roles and permissions across the platform</p>
      </div>

      <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="admin" className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span>Admins</span>
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4" />
            <span>Editors</span>
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Viewers</span>
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab with SimpleUserList */}
        <TabsContent value="editor" className="mt-6">
          <SimpleUserList 
            role="editor" 
            title="Editors" 
            description="Users with editor role who can edit productions"
          />
        </TabsContent>

        {/* Other role tabs */}
        {["admin", "user", "viewer"].map((role) => {
          const isLoading = usersLoading;
          const userData = users;
          
          return (
            <TabsContent key={role} value={role} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading {role}s...</p>
                </div>
              ) : userData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No {role}s found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.map((user: User) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}