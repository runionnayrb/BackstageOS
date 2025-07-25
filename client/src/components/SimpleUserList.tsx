import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Mail, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface User {
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
}

interface SimpleUserListProps {
  role: 'user' | 'editor';
  title: string;
  description: string;
}

export default function SimpleUserList({ role, title, description }: SimpleUserListProps) {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: [`/api/admin/users-by-role/${role}`],
    enabled: true,
  });

  const getUserIcon = (userRole: string) => {
    return userRole === 'editor' ? UserCheck : Users;
  };

  const getUserIconColor = (userRole: string) => {
    return userRole === 'editor' ? 'text-green-600' : 'text-blue-600';
  };

  const getUserIconBg = (userRole: string) => {
    return userRole === 'editor' ? 'bg-green-100' : 'bg-blue-100';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading {role}s...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-500">Error loading {role}s: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    const IconComponent = getUserIcon(role);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <IconComponent className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div className="text-lg font-medium">No {title} Found</div>
            <div className="text-sm text-gray-400">No users with "{role}" role exist in the system</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      
      {users.map((user: User) => {
        const IconComponent = getUserIcon(user.userRole);
        return (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* User Icon and Basic Info */}
                    <div className="flex items-center space-x-3">
                      <div className={`${getUserIconBg(user.userRole)} p-2 rounded-full`}>
                        <IconComponent className={`h-4 w-4 ${getUserIconColor(user.userRole)}`} />
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
                        {user.totalLogins} login{user.totalLogins !== 1 ? 's' : ''}
                      </div>
                      <div className="text-gray-500">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    <Badge 
                      variant={user.isActive ? "default" : "secondary"}
                      className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    
                    <Badge variant="outline" className={
                      user.userRole === 'editor' 
                        ? "bg-green-50 text-green-700" 
                        : "bg-blue-50 text-blue-700"
                    }>
                      {user.profileType || user.userRole}
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}