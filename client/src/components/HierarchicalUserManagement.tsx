import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Users, Calendar, Mail, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  projectId: number;
  projectName: string;
  accessLevel: string;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
}

interface InvitedEditor {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  projects: Project[];
}

interface UserWithEditors {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
  profileType: string;
  isActive: boolean;
  totalLogins: number;
  lastActiveAt: string | null;
  createdAt: string;
  invitedEditors: InvitedEditor[];
  editorCount: number;
}

export default function HierarchicalUserManagement() {
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  const { data: usersWithEditors = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/users-with-editors'],
    enabled: true,
  });

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'invited': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-500">Error loading users: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  if (usersWithEditors.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div className="text-lg font-medium">No Users Found</div>
            <div className="text-sm text-gray-400">No users with "user" role exist in the system</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {usersWithEditors.map((user: UserWithEditors) => (
        <Card key={user.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Main User Row */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Expansion Button - Only show if user has invited editors */}
                  {user.editorCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUserExpansion(user.id)}
                      className="p-1 h-6 w-6"
                    >
                      {expandedUsers.has(user.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* User Icon and Basic Info */}
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-2">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Stats and Badges */}
                <div className="flex items-center space-x-3">
                  <div className="text-right text-sm">
                    <div className="text-gray-900 font-medium">
                      {user.editorCount} Editor{user.editorCount !== 1 ? 's' : ''}
                    </div>
                    <div className="text-gray-500">
                      {user.totalLogins} login{user.totalLogins !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <Badge 
                    variant={user.isActive ? "default" : "secondary"}
                    className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {user.profileType}
                  </Badge>
                </div>
              </div>

              {/* Last Active Info */}
              {user.lastActiveAt && (
                <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Last active: {format(new Date(user.lastActiveAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Expanded Section - Invited Editors */}
            {expandedUsers.has(user.id) && user.invitedEditors.length > 0 && (
              <div className="bg-gray-50 border-l-4 border-blue-200">
                <div className="p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Invited Editors ({user.invitedEditors.length})</span>
                  </div>
                  
                  <div className="space-y-3">
                    {user.invitedEditors.map((editor: InvitedEditor) => (
                      <div key={editor.id} className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">
                            {editor.firstName && editor.lastName 
                              ? `${editor.firstName} ${editor.lastName}` 
                              : editor.email}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {editor.projects.length} Project{editor.projects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-500 mb-2">{editor.email}</div>
                        
                        {/* Editor's Projects */}
                        <div className="space-y-1">
                          {editor.projects.map((project: Project) => (
                            <div key={project.projectId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">{project.projectName}</span>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getStatusBadgeColor(project.status)}`}
                                >
                                  {project.status}
                                </Badge>
                                <span className="text-gray-500">
                                  {format(new Date(project.invitedAt), 'MMM d')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}