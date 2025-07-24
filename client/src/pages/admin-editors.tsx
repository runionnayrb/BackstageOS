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
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
  profileType: string;
  isActive: boolean;
  currentActiveShows: number;
  maxActiveShows: number;
  lastActiveAt?: string;
  totalLogins: number;
  betaAccess: string;
  createdAt: string;
}

function AdminEditorsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");

  const { data: editors, isLoading } = useQuery<Editor[]>({
    queryKey: ['/api/admin/editors']
  });

  const filteredAndSortedEditors = editors
    ?.filter(editor => {
      const fullName = `${editor.firstName || ''} ${editor.lastName || ''}`.trim();
      const matchesSearch = 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
        editor.profileType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && editor.isActive) ||
        (statusFilter === "inactive" && !editor.isActive);
      
      return matchesSearch && matchesStatus;
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "lastActive":
          if (!a.lastActiveAt && !b.lastActiveAt) return 0;
          if (!a.lastActiveAt) return 1;
          if (!b.lastActiveAt) return -1;
          return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        case "name":
          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return aName.localeCompare(bName);
        case "email":
          return a.email.localeCompare(b.email);
        default:
          return 0;
      }
    }) || [];

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Active</Badge>;
    } else {
      return <Badge variant="secondary"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  const getEditorName = (editor: Editor) => {
    return `${editor.firstName || ''} ${editor.lastName || ''}`.trim() || editor.email;
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

  // Show editors approaching limits
  const editorsAtOrNearLimit = filteredAndSortedEditors.filter(e => e.currentActiveShows >= 1);

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
                  {filteredAndSortedEditors.filter(e => e.isActive).length}
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
                  {filteredAndSortedEditors.filter(e => e.currentActiveShows > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">Editors with Shows</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredAndSortedEditors.filter(e => e.currentActiveShows >= e.maxActiveShows).length}
                </div>
                <div className="text-sm text-muted-foreground">At Limit</div>
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
            placeholder="Search editors, names, or roles..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="lastActive">Last Active</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Editor Activity Summary */}
      {editorsAtOrNearLimit.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Active Editors</CardTitle>
            <CardDescription className="text-blue-700">
              Editors currently working on shows (limit: {editorsAtOrNearLimit[0]?.maxActiveShows || 2} active shows per editor)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {editorsAtOrNearLimit.map((editor) => (
                <div key={editor.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium">{getEditorName(editor)}</div>
                    <div className="text-sm text-muted-foreground">{editor.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={editor.currentActiveShows >= editor.maxActiveShows ? "destructive" : "secondary"}>
                      {editor.currentActiveShows}/{editor.maxActiveShows} shows
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {editor.profileType} • {editor.userRole}
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
          <Card key={editor.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {getEditorName(editor)}
                  </CardTitle>
                  <CardDescription>
                    {editor.email} • {editor.profileType}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(editor.isActive)}
                  <Badge variant="outline">{editor.userRole}</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Account Created</div>
                  <div>{formatDistanceToNow(new Date(editor.createdAt), { addSuffix: true })}</div>
                  <div className="text-xs text-muted-foreground">
                    Beta Access: {editor.betaAccess}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground">Activity</div>
                  <div>{editor.totalLogins || 0} logins</div>
                  <div className="text-xs text-muted-foreground">
                    Last active: {formatLastActive(editor.lastActiveAt)}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground">Show Limit</div>
                  <div>{editor.currentActiveShows}/{editor.maxActiveShows} active shows</div>
                  <div className="text-xs text-muted-foreground">
                    {editor.currentActiveShows >= editor.maxActiveShows ? 'At limit' : 
                     `${editor.maxActiveShows - editor.currentActiveShows} available`}
                  </div>
                </div>
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