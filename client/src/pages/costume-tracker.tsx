import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { setPageHeaderIcons, clearPageHeaderIcons } from "@/hooks/useHeaderIcons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Image as ImageIcon,
  User,
  FileText
} from "lucide-react";

interface CostumeTrackerParams {
  id: string;
}

interface Costume {
  id: number;
  character: string;
  piece: string;
  scene: string;
  notes: string;
  status: 'needed' | 'fitted' | 'ready' | 'in_use' | 'repair';
  isQuickChange: boolean;
  quickChangeTime: number; // seconds
  quickChangeNotes: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: 'needed', label: 'Needed', color: 'bg-red-100 text-red-800' },
  { value: 'fitted', label: 'Fitted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800' },
  { value: 'in_use', label: 'In Use', color: 'bg-blue-100 text-blue-800' },
  { value: 'repair', label: 'Needs Repair', color: 'bg-orange-100 text-orange-800' },
];

const sortOptions = [
  { field: 'character', label: 'Character' },
  { field: 'piece', label: 'Costume' },
  { field: 'scene', label: 'Scene' },
  { field: 'status', label: 'Status' },
];

export default function CostumeTracker() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<CostumeTrackerParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [isAddingCostume, setIsAddingCostume] = useState(false);
  const [editingCostume, setEditingCostume] = useState<Costume | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sceneFilter, setSceneFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showSortPopover, setShowSortPopover] = useState(false);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
    setShowSortPopover(false);
  };

  const [formData, setFormData] = useState({
    character: "",
    piece: "",
    scene: "",
    notes: "",
    status: "needed" as const,
    isQuickChange: false,
    quickChangeTime: 60,
    quickChangeNotes: "",
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Set header icons for mobile header - filter, sort, and plus (left to right)
  useEffect(() => {
    if (isMobile) {
      setPageHeaderIcons([
        {
          icon: Filter,
          onClick: () => setShowFilters(!showFilters),
          title: 'Filter costumes'
        },
        {
          icon: ArrowUpDown,
          onClick: () => setShowSortPopover(true),
          title: 'Sort costumes'
        },
        {
          icon: Plus,
          onClick: () => setIsAddingCostume(true),
          title: 'Add costume'
        }
      ]);
    } else {
      clearPageHeaderIcons();
    }
    
    return () => {
      clearPageHeaderIcons();
    };
  }, [isMobile, showFilters, sortField, sortDirection]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  const { data: costumes = [], isLoading: costumesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "costumes"],
    enabled: !!projectId && isAuthenticated,
  });

  const createCostumeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", `/api/projects/${projectId}/costumes`, data);
    },
    onSuccess: () => {
      toast({
        title: "Costume added",
        description: "The costume has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "costumes"] });
      resetForm();
      setIsAddingCostume(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add costume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCostumeMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<typeof formData> }) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/costumes/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Costume updated",
        description: "The costume has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "costumes"] });
      setEditingCostume(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update costume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCostumeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/costumes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Costume deleted",
        description: "The costume has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "costumes"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete costume. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      character: "",
      piece: "",
      scene: "",
      notes: "",
      status: "needed",
      isQuickChange: false,
      quickChangeTime: 60,
      quickChangeNotes: "",
    });
  };

  const handleSubmit = () => {
    if (editingCostume) {
      updateCostumeMutation.mutate({ id: editingCostume.id, updates: formData });
    } else {
      createCostumeMutation.mutate(formData);
    }
  };

  const handleEdit = (costume: Costume) => {
    setFormData({
      character: costume.character,
      piece: costume.piece,
      scene: costume.scene,
      notes: costume.notes,
      status: costume.status,
      isQuickChange: costume.isQuickChange,
      quickChangeTime: costume.quickChangeTime,
      quickChangeNotes: costume.quickChangeNotes,
    });
    setEditingCostume(costume);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this costume?")) {
      deleteCostumeMutation.mutate(id);
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get filtered and sorted costumes
  const filteredCostumes = Array.isArray(costumes) ? costumes.filter((costume: Costume) => {
    const matchesSearch = costume.character.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         costume.piece.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         costume.scene.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || costume.status === statusFilter;
    const matchesScene = sceneFilter === "all" || costume.scene === sceneFilter;
    
    return matchesSearch && matchesStatus && matchesScene;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = "";
    let bValue = "";
    
    switch (sortField) {
      case "character":
        aValue = a.character || "";
        bValue = b.character || "";
        break;
      case "piece":
        aValue = a.piece || "";
        bValue = b.piece || "";
        break;
      case "scene":
        aValue = a.scene || "";
        bValue = b.scene || "";
        break;
      case "status":
        aValue = a.status || "";
        bValue = b.status || "";
        break;
      default:
        return 0;
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === "asc" ? comparison : -comparison;
  }) : [];

  const uniqueScenes = Array.isArray(costumes) ? [...new Set(costumes.map((costume: Costume) => costume.scene).filter(Boolean))] : [];

  if (isLoading || projectsLoading || costumesLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">Show not found</div>;
  }

  const isFreelance = user?.profileType === 'freelance';

  return (
    <div className="w-full">
      <div className={`px-4 sm:px-6 lg:px-8 ${isMobile ? 'pb-4' : 'py-4'}`}>
        {!isMobile && (
          <div className="flex items-center justify-between mb-4">
            <div></div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Popover open={showSortPopover} onOpenChange={setShowSortPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="grid gap-1">
                    <div className="text-sm font-medium text-gray-900 px-3 py-2 border-b border-gray-100">
                      Sort by
                    </div>
                    {sortOptions.map((option) => (
                      <Button
                        key={option.field}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-9 px-3 hover:bg-gray-100 text-gray-900"
                        onClick={() => handleSort(option.field)}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {sortField === option.field && (
                          <span className="ml-auto text-sm text-gray-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button onClick={() => setIsAddingCostume(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Costume
              </Button>
            </div>
          </div>
        )}
        
        {!isMobile && (
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Costumes</h1>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8">

        {/* Filters */}
        {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search costumes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sceneFilter} onValueChange={setSceneFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by scene" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scenes</SelectItem>
                  {uniqueScenes.map((scene) => (
                    <SelectItem key={scene} value={scene}>
                      {scene}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setSceneFilter("all");
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Desktop Costumes Table */}
        <Card className="mb-6 hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Costume</TableHead>
                  <TableHead>Scene/Character</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quick Change</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCostumes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No costumes found</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setIsAddingCostume(true)}
                      >
                        Add your first costume
                      </Button>
                    </TableCell>
                  </TableRow>
                    ) : (
                  filteredCostumes.map((costume: Costume) => {
                    const statusInfo = getStatusInfo(costume.status);
                    
                    return (
                      <TableRow key={costume.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{costume.piece}</div>
                            {costume.notes && (
                              <div className="text-sm text-muted-foreground">{costume.notes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{costume.scene}</div>
                            <div className="text-sm text-muted-foreground">{costume.character}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {costume.isQuickChange ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">{formatTime(costume.quickChangeTime)}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(costume)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(costume.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Costumes List */}
        <div className="space-y-3 md:hidden">
          {filteredCostumes.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No costumes found</p>
              <Button
                variant="outline"
                onClick={() => setIsAddingCostume(true)}
              >
                Add your first costume
              </Button>
            </Card>
          ) : (
            filteredCostumes.map((costume: Costume) => {
              const statusInfo = getStatusInfo(costume.status);
              
              return (
                <Card key={costume.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-base">{costume.piece}</div>
                        <div className="text-sm text-muted-foreground">
                          {costume.scene} • {costume.character}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(costume)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(costume.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      
                      {costume.isQuickChange && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {formatTime(costume.quickChangeTime)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {costume.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {costume.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Costume Dialog */}
      <Dialog open={isAddingCostume || !!editingCostume} onOpenChange={(open) => {
          if (!open) {
            setIsAddingCostume(false);
            setEditingCostume(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCostume ? "Edit Costume" : "Add New Costume"}
              </DialogTitle>
              <DialogDescription>
                {editingCostume ? "Update the costume information." : "Add a new costume to your costume list."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Character *</label>
                <Input
                  value={formData.character}
                  onChange={(e) => setFormData({...formData, character: e.target.value})}
                  placeholder="e.g., Hamlet"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Costume Piece *</label>
                <Input
                  value={formData.piece}
                  onChange={(e) => setFormData({...formData, piece: e.target.value})}
                  placeholder="e.g., Royal Cloak"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scene</label>
                <Input
                  value={formData.scene}
                  onChange={(e) => setFormData({...formData, scene: e.target.value})}
                  placeholder="e.g., Act 2 Scene 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="quickChange"
                    checked={formData.isQuickChange}
                    onChange={(e) => setFormData({...formData, isQuickChange: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="quickChange" className="text-sm font-medium">
                    This is a quick change
                  </label>
                </div>
              </div>
              {formData.isQuickChange && (
                <>
                  <div>
                    <label className="text-sm font-medium">Target Time (seconds)</label>
                    <Input
                      type="number"
                      min="10"
                      value={formData.quickChangeTime}
                      onChange={(e) => setFormData({...formData, quickChangeTime: parseInt(e.target.value) || 60})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quick Change Notes</label>
                    <Textarea
                      value={formData.quickChangeNotes}
                      onChange={(e) => setFormData({...formData, quickChangeNotes: e.target.value})}
                      placeholder="Special instructions for quick change..."
                      rows={2}
                    />
                  </div>
                </>
              )}
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about this costume..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsAddingCostume(false);
                setEditingCostume(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.character || !formData.piece || createCostumeMutation.isPending || updateCostumeMutation.isPending}
              >
                {editingCostume ? "Update Costume" : "Add Costume"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* Mobile Sort Popover */}
      {isMobile && (
        <Popover open={showSortPopover} onOpenChange={setShowSortPopover}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" side="top" align="center">
            <div className="grid gap-1">
              <div className="text-sm font-medium text-gray-900 px-3 py-2 border-b border-gray-100">
                Sort by
              </div>
              {sortOptions.map((option) => (
                <Button
                  key={option.field}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-9 px-3 hover:bg-gray-100 text-gray-900"
                  onClick={() => handleSort(option.field)}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  {sortField === option.field && (
                    <span className="ml-auto text-sm text-gray-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}