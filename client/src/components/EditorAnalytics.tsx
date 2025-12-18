import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface EditorProduction {
  projectId: number;
  projectName: string;
  role: string;
  accessLevel: string;
  status: string;
  invitedAt: string | null;
  invitedBy: string;
}

interface EditorInviter {
  id: number;
  name: string;
  email: string;
}

interface UserAnalytics {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileType: string | null;
  betaAccess: boolean;
  betaFeatures: string[] | null;
  isAdmin: boolean;
  isActive: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  grandfatheredFree: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  paymentMethodRequired: boolean | null;
  createdAt: Date;
  lastSeen: Date | null;
  activityLevel: 'high' | 'medium' | 'low' | 'inactive';
  dailyCost: number;
  monthlyCost: number;
  topFeatures: Array<{ feature: string; usage: number; percentage: number }>;
  sessionStats: {
    averageSession: number;
    totalSessions: number;
    lastSession: Date | null;
  };
  costBreakdown: Array<{ service: string; cost: number; requests: number }>;
  searchMetrics: {
    totalSearches: number;
    dailySearches: number;
    naturalLanguageSearches: number;
    advancedSearches: number;
    averageResponseTime: number;
    searchCost: number;
  };
  invitedBy?: string;
  inviters?: EditorInviter[];
  productions?: EditorProduction[];
}

interface UserAnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalMonthlyCost: number;
  averageSessionTime: number;
  topFeature: string;
}

export default function EditorAnalytics() {
  const { toast } = useToast();
  const [editingEditor, setEditingEditor] = useState<UserAnalytics | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isActive: true,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: editorAnalytics, isLoading: isLoadingAnalytics } = useQuery<UserAnalytics[]>({
    queryKey: ['/api/admin/editor-analytics'],
  });

  const { data: analyticsStats, isLoading: isLoadingStats } = useQuery<UserAnalyticsStats>({
    queryKey: ['/api/admin/editor-analytics-stats'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { userId: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/users/${data.userId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/editor-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/editor-analytics-stats"] });
      toast({
        title: "Editor updated successfully",
        description: "Editor settings have been saved.",
      });
      setEditingEditor(null);
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update editor settings.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/editor-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/editor-analytics-stats"] });
      toast({
        title: "Editor deleted",
        description: "Editor has been permanently deleted.",
      });
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setEditingEditor(null);
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete editor.",
        variant: "destructive",
      });
    },
  });

  const handleRowClick = (editor: UserAnalytics) => {
    setEditingEditor(editor);
    setEditData({
      firstName: editor.firstName || '',
      lastName: editor.lastName || '',
      email: editor.email || '',
      isActive: editor.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingEditor) return;
    updateMutation.mutate({
      userId: editingEditor.id,
      updates: editData
    });
  };

  const handleCancel = () => {
    setEditingEditor(null);
    setIsEditDialogOpen(false);
    setEditData({
      firstName: '',
      lastName: '',
      email: '',
      isActive: true,
    });
  };

  const getActivityBadge = (level: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      low: 'bg-orange-100 text-orange-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[level as keyof typeof colors]}>{level}</Badge>;
  };

  if (isLoadingAnalytics || isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const filteredEditors = editorAnalytics || [];

  return (
    <div className="space-y-6">
      {analyticsStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Editors</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{filteredEditors.filter(e => e.isActive).length}</div>
              <p className="text-xs text-gray-500">of {filteredEditors.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  filteredEditors.reduce((sum, editor) => sum + editor.monthlyCost, 0)
                )}
              </div>
              <p className="text-xs text-gray-500">total API spend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Top Feature</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{analyticsStats.topFeature}</div>
              <p className="text-xs text-gray-500">most used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Session Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{analyticsStats.averageSessionTime} min</div>
              <p className="text-xs text-gray-500">per session</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invited Editors</span>
            <div className="text-sm font-normal text-gray-600">
              {filteredEditors.length} editors
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Editor</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Productions</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEditors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 p-4">
                      No editors found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredEditors.map((editor) => (
                  <TableRow 
                    key={editor.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(editor)}
                    data-testid={`row-editor-${editor.id}`}
                  >
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                            <div className="font-medium hover:underline cursor-pointer">
                              {editor.firstName && editor.lastName 
                                ? `${editor.firstName} ${editor.lastName}` 
                                : editor.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {editor.email}
                            </div>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <div className="font-medium">{editor.email}</div>
                            <div className="text-sm space-y-1">
                              <div>Profile: {editor.profileType || 'Not set'}</div>
                              <div>Joined: {format(new Date(editor.createdAt), 'MMM d, yyyy')}</div>
                              <div>Sessions: {editor.sessionStats.totalSessions}</div>
                              <div>Avg Session: {editor.sessionStats.averageSession} min</div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="text-sm">
                        {editor.invitedBy || 'Unknown'}
                      </div>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer">
                            {editor.productions && editor.productions.length > 0 ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-xs">
                                  {editor.productions.length} production{editor.productions.length !== 1 ? 's' : ''}
                                </Badge>
                                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {editor.productions[0]?.projectName}
                                  {editor.productions.length > 1 && ` +${editor.productions.length - 1} more`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">None</span>
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <div className="font-medium">Productions</div>
                            {editor.productions && editor.productions.length > 0 ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {editor.productions.map((production, idx) => (
                                  <div key={idx} className="p-2 border rounded-lg text-sm">
                                    <div className="font-medium">{production.projectName}</div>
                                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                                      <div className="flex justify-between">
                                        <span>Role:</span>
                                        <span>{production.role}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Access:</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {production.accessLevel}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Status:</span>
                                        <Badge 
                                          variant={production.status === 'accepted' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {production.status}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Invited by:</span>
                                        <span>{production.invitedBy}</span>
                                      </div>
                                      {production.invitedAt && (
                                        <div className="flex justify-between">
                                          <span>Invited:</span>
                                          <span>{format(new Date(production.invitedAt), 'MMM d, yyyy')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No productions found</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    <TableCell>
                      <Badge 
                        variant={editor.isActive ? "outline" : "destructive"}
                        className={editor.isActive ? "border-green-500 text-green-700" : ""}
                      >
                        {editor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {getActivityBadge(editor.activityLevel)}
                    </TableCell>

                    <TableCell className="text-sm text-gray-500">
                      {editor.lastSeen 
                        ? format(new Date(editor.lastSeen), 'MMM d, h:mm a')
                        : 'Never'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Editor</DialogTitle>
            <DialogDescription>
              Make changes to the editor's account settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                First Name
              </Label>
              <Input
                id="firstName"
                value={editData.firstName}
                onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={editData.lastName}
                onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <Switch
                id="isActive"
                checked={editData.isActive}
                onCheckedChange={(checked) => setEditData({ ...editData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-delete-editor">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Editor</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete "{editingEditor?.firstName && editingEditor?.lastName ? `${editingEditor.firstName} ${editingEditor.lastName}` : editingEditor?.email}"? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => editingEditor && deleteMutation.mutate(editingEditor.id)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
