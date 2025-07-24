import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Calendar, UserCheck, UserX, Clock } from "lucide-react";
import AdminGuard from "@/components/admin-guard";
import { formatDistanceToNow } from "date-fns";

interface Editor {
  id: number;
  projectId: number;
  projectName: string;
  userId?: number;
  email: string;
  name: string;
  role: string;
  status: 'invited' | 'accepted' | 'declined';
  isActive: boolean;
  lastActiveAt?: string;
  totalLogins: number;
  totalMinutesActive?: number;
  featuresUsed?: string;
  invitedBy: number;
  invitedAt: string;
  joinedAt?: string;
  inviterName?: string;
  inviterLastName?: string;
  inviterEmail?: string;
}

function AdminEditorsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("invitedAt");

  const { data: editors, isLoading } = useQuery<Editor[]>({
    queryKey: ['/api/admin/editors']
  });

  const filteredAndSortedEditors = editors
    ?.filter(editor => {
      const matchesSearch = 
        editor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.role?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || editor.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case "invitedAt":
          return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
        case "lastActive":
          if (!a.lastActiveAt && !b.lastActiveAt) return 0;
          if (!a.lastActiveAt) return 1;
          if (!b.lastActiveAt) return -1;
          return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        case "project":
          return a.projectName.localeCompare(b.projectName);
        case "email":
          return a.email.localeCompare(b.email);
        default:
          return 0;
      }
    }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'invited':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Invited</Badge>;
      case 'declined':
        return <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInviterName = (editor: Editor) => {
    if (editor.inviterName && editor.inviterLastName) {
      return `${editor.inviterName} ${editor.inviterLastName}`;
    }
    return editor.inviterEmail || 'Unknown';
  };

  const formatLastActive = (lastActiveAt?: string) => {
    if (!lastActiveAt) return 'Never';
    return formatDistanceToNow(new Date(lastActiveAt), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading editors...</div>
        </div>
      </div>
    );
  }

  // Group editors by email to show editor limits tracking
  const editorsByEmail = filteredAndSortedEditors.reduce((acc, editor) => {
    if (!acc[editor.email]) {
      acc[editor.email] = [];
    }
    acc[editor.email].push(editor);
    return acc;
  }, {} as Record<string, Editor[]>);

  // Get editors with multiple shows (limit tracking)
  const editorsWithMultipleShows = Object.entries(editorsByEmail)
    .filter(([_, editorList]) => editorList.length > 1)
    .map(([email, editorList]) => ({ email, count: editorList.length, editors: editorList }));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Global Editors Management</h1>
        <p className="text-muted-foreground">
          View all editors across shows with invitation tracking and analytics
        </p>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{filteredAndSortedEditors.length}</div>
                <div className="text-sm text-muted-foreground">Total Editors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredAndSortedEditors.filter(e => e.status === 'accepted').length}
                </div>
                <div className="text-sm text-muted-foreground">Active Editors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredAndSortedEditors.filter(e => e.status === 'invited').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Invites</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{editorsWithMultipleShows.length}</div>
                <div className="text-sm text-muted-foreground">Multi-Show Editors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search editors, projects, or roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invitedAt">Invitation Date</SelectItem>
            <SelectItem value="lastActive">Last Active</SelectItem>
            <SelectItem value="project">Project Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Editor Limit Warnings */}
      {editorsWithMultipleShows.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Editor Limit Tracking</CardTitle>
            <CardDescription className="text-orange-700">
              Editors assigned to multiple shows (limit: 2 active shows per editor)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {editorsWithMultipleShows.map(({ email, count, editors }) => (
                <div key={email} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium">{editors[0].name || email}</div>
                    <div className="text-sm text-muted-foreground">{email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={count >= 2 ? "destructive" : "secondary"}>
                      {count} shows
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {editors.map(e => e.projectName).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editors List */}
      <div className="grid gap-4">
        {filteredAndSortedEditors.map((editor) => (
          <Card key={`${editor.projectId}-${editor.email}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {editor.name || editor.email}
                  </CardTitle>
                  <CardDescription>
                    {editor.email} • {editor.projectName}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(editor.status)}
                  <Badge variant="outline">{editor.role}</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Invited By</div>
                  <div>{getInviterName(editor)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(editor.invitedAt), { addSuffix: true })}
                  </div>
                </div>
                
                {editor.status === 'accepted' && (
                  <>
                    <div>
                      <div className="font-medium text-muted-foreground">Activity</div>
                      <div>{editor.totalLogins || 0} logins</div>
                      <div className="text-xs text-muted-foreground">
                        Last active: {formatLastActive(editor.lastActiveAt)}
                      </div>
                    </div>
                    
                    {editor.featuresUsed && (
                      <div>
                        <div className="font-medium text-muted-foreground">Features Used</div>
                        <div className="text-xs">
                          {JSON.parse(editor.featuresUsed).slice(0, 3).join(', ')}
                          {JSON.parse(editor.featuresUsed).length > 3 && '...'}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {editor.status === 'invited' && (
                  <div>
                    <div className="font-medium text-muted-foreground">Status</div>
                    <div>Invitation pending</div>
                    <div className="text-xs text-muted-foreground">
                      Invited {formatDistanceToNow(new Date(editor.invitedAt), { addSuffix: true })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedEditors.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No editors found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search criteria or filters."
                : "No editors have been invited to any shows yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminEditors() {
  return (
    <AdminGuard>
      <AdminEditorsContent />
    </AdminGuard>
  );
}