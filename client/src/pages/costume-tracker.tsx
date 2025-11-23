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
  act: string;
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
  { field: 'act', label: 'Act' },
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
  const [actFilter, setActFilter] = useState<string>("all");
  const [sceneFilter, setSceneFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const [formData, setFormData] = useState({
    character: "",
    piece: "",
    act: "",
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
          onClick: () => {},
          title: 'Filter costumes',
          popover: {
            content: (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium leading-none">Filter by</h4>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setActFilter("all");
                      setSceneFilter("all");
                    }}
                  >
                    Reset
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search costumes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-sm">
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
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Act</label>
                  <Select value={actFilter} onValueChange={setActFilter}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Filter by act" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Acts</SelectItem>
                      {uniqueActs.map((act) => (
                        <SelectItem key={act} value={act}>
                          {act.toLowerCase().startsWith('act') ? act : `Act ${act}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Scene</label>
                  <Select value={sceneFilter} onValueChange={setSceneFilter}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Filter by scene" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scenes</SelectItem>
                      {uniqueScenes.map((scene) => (
                        <SelectItem key={scene} value={scene}>
                          {scene.toLowerCase().startsWith('scene') ? scene : `Scene ${scene}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          }
        },
        {
          icon: ArrowUpDown,
          onClick: () => {},
          title: 'Sort costumes',
          popover: {
            content: (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium leading-none">Sort by</h4>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                    onClick={() => setSortField("")}
                  >
                    Reset
                  </button>
                </div>
                {sortOptions.map((option) => (
                  <button
                    key={option.field}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                    onClick={() => handleSort(option.field)}
                  >
                    {option.label}
                    {sortField === option.field && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                ))}
              </div>
            )
          }
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
  }, [isMobile, sortField, sortDirection]);

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
      act: "",
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
      act: costume.act,
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
                         costume.scene.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (costume.act && costume.act.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || costume.status === statusFilter;
    const matchesAct = actFilter === "all" || costume.act === actFilter;
    const matchesScene = sceneFilter === "all" || costume.scene === sceneFilter;
    
    return matchesSearch && matchesStatus && matchesAct && matchesScene;
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
      case "act":
        aValue = a.act || "";
        bValue = b.act || "";
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

  const uniqueActs = Array.isArray(costumes) ? [...new Set(costumes.map((costume: Costume) => costume.act).filter(Boolean))].sort((a, b) => {
    // Extract numbers from act strings for numerical sorting
    const aNum = parseFloat(a.replace(/[^0-9.]/g, '') || '0');
    const bNum = parseFloat(b.replace(/[^0-9.]/g, '') || '0');
    return aNum - bNum;
  }) : [];

  const uniqueScenes = Array.isArray(costumes) ? [...new Set(costumes.map((costume: Costume) => costume.scene).filter(Boolean))].sort((a, b) => {
    // Extract numbers from scene strings for numerical sorting
    const aNum = parseFloat(a.replace(/[^0-9.]/g, '') || '0');
    const bNum = parseFloat(b.replace(/[^0-9.]/g, '') || '0');
    return aNum - bNum;
  }) : [];

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
            <h1 className="text-3xl font-bold text-gray-900">Costumes</h1>
            
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium leading-none">Filter by</h4>
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setActFilter("all");
                          setSceneFilter("all");
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Search</label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                        <Input
                          placeholder="Search costumes..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="text-sm">
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Act</label>
                      <Select value={actFilter} onValueChange={setActFilter}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Filter by act" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Acts</SelectItem>
                          {uniqueActs.map((act) => (
                            <SelectItem key={act} value={act}>
                              {act.toLowerCase().startsWith('act') ? act : `Act ${act}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Scene</label>
                      <Select value={sceneFilter} onValueChange={setSceneFilter}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Filter by scene" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Scenes</SelectItem>
                          {uniqueScenes.map((scene) => (
                            <SelectItem key={scene} value={scene}>
                              {scene.toLowerCase().startsWith('scene') ? scene : `Scene ${scene}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium leading-none">Sort by</h4>
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                        onClick={() => setSortField("")}
                      >
                        Reset
                      </button>
                    </div>
                    <button
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => handleSort('character')}
                    >
                      Character
                      {sortField === 'character' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                    <button
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => handleSort('piece')}
                    >
                      Costume
                      {sortField === 'piece' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                    <button
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => handleSort('scene')}
                    >
                      Scene
                      {sortField === 'scene' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                    <button
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                onClick={() => setIsAddingCostume(true)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8">


        {/* Desktop Costumes Table */}
        <Card className="mb-6 hidden md:block">
          <CardContent className="p-0">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-1/4"
                    onClick={() => handleSort('piece')}
                  >
                    <div className="flex items-center gap-1">
                      Costume
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'piece' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-1/7"
                    onClick={() => handleSort('character')}
                  >
                    <div className="flex items-center gap-1">
                      Character
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'character' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-20"
                    onClick={() => handleSort('act')}
                  >
                    <div className="flex items-center gap-1">
                      Act
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'act' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-24"
                    onClick={() => handleSort('scene')}
                  >
                    <div className="flex items-center gap-1">
                      Scene
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'scene' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-1/6"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'status' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-1/6">Quick Change</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCostumes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
                      <TableRow 
                        key={costume.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleEdit(costume)}
                      >
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
                            <div className="font-medium">{costume.character || '—'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {costume.act ? (costume.act.toLowerCase().startsWith('act') ? costume.act : `Act ${costume.act}`) : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {costume.scene ? (costume.scene.toLowerCase().startsWith('scene') ? costume.scene : `Scene ${costume.scene}`) : '—'}
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(costume.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                <Card 
                  key={costume.id}
                  className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleEdit(costume)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-base">{costume.piece}</div>
                        <div className="text-sm text-muted-foreground">
                          {[costume.act, costume.scene, costume.character].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(costume.id);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                <label className="text-sm font-medium">Act</label>
                <Input
                  value={formData.act}
                  onChange={(e) => setFormData({...formData, act: e.target.value})}
                  placeholder="e.g., 1 or Act 1"
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

    </div>
  );
}