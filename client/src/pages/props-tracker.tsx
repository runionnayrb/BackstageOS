import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useOptimisticMutation, useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from "@/hooks/useOptimisticMutation";
import { useIsMobile } from "@/hooks/use-mobile";
import { setPageHeaderIcons, clearPageHeaderIcons } from "@/hooks/useHeaderIcons";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";
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
  Image as ImageIcon,
  MapPin,
  FileText,
  Clock
} from "lucide-react";

interface PropsTrackerParams {
  id: string;
}

interface Prop {
  id: number;
  name: string;
  description: string;
  act: string;
  scene: string;
  character: string;
  location: string;
  status: 'needed' | 'pulled' | 'rehearsal' | 'performance' | 'returned';
  notes: string;
  quantity: number;
  sourcingNotes: string;
  imageUrl?: string;
  consumableType: 'not_consumable' | 'consumable';
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: 'needed', label: 'Needed', color: 'bg-red-100 text-red-800' },
  { value: 'pulled', label: 'Pulled', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rehearsal', label: 'In Rehearsal', color: 'bg-blue-100 text-blue-800' },
  { value: 'performance', label: 'In Performance', color: 'bg-green-100 text-green-800' },
  { value: 'returned', label: 'Returned', color: 'bg-gray-100 text-gray-800' },
];

const consumableOptions = [
  { value: 'not_consumable', label: 'Not Consumable' },
  { value: 'consumable', label: 'Consumable' },
];

const sortOptions = [
  { field: 'name', label: 'Item' },
  { field: 'character', label: 'Character' },
  { field: 'act', label: 'Act' },
  { field: 'scene', label: 'Scene' },
  { field: 'location', label: 'Location' },
  { field: 'status', label: 'Status' },
  { field: 'quantity', label: 'Quantity' },
];

export default function PropsTracker() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PropsTrackerParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [isAddingProp, setIsAddingProp] = useState(false);
  const [editingProp, setEditingProp] = useState<Prop | null>(null);
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
    name: "",
    description: "",
    act: "",
    scene: "",
    character: "",
    location: "",
    status: "needed" as const,
    notes: "",
    quantity: 1,
    sourcingNotes: "",
    consumableType: "not_consumable" as const,
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

  // Set header icons for mobile header - filter, sort and plus (left to right)
  useEffect(() => {
    if (isMobile) {
      setPageHeaderIcons([
        {
          icon: Filter,
          onClick: () => {},
          title: 'Filter props',
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
                      placeholder="Search props..."
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
          title: 'Sort props',
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
                <button
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSort('name')}
                >
                  Item
                  {sortField === 'name' && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
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
                  onClick={() => handleSort('location')}
                >
                  Location
                  {sortField === 'location' && (
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
                <button
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSort('quantity')}
                >
                  Quantity
                  {sortField === 'quantity' && (
                    <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              </div>
            )
          }
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

  const { data: props = [], isLoading: propsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "props"],
    enabled: !!projectId && isAuthenticated,
  });

  const createPropMutation = useOptimisticCreate<Prop, typeof formData>({
    queryKey: ["/api/projects", projectId, "props"],
    mutationFn: async (data) => {
      return await apiRequest("POST", `/api/projects/${projectId}/props`, data);
    },
    onSuccess: () => {
      toast({
        title: "Prop added",
        description: "The prop has been added successfully.",
      });
      resetForm();
      setIsAddingProp(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add prop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePropMutation = useOptimisticMutation<Prop, { id: number; updates: Partial<typeof formData> }>({
    queryKey: ["/api/projects", projectId, "props"],
    mutationFn: async (data) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}/props/${data.id}`, data.updates);
    },
    updateFn: (oldData: Prop[] | undefined, variables) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item.id === variables.id ? { ...item, ...variables.updates } : item
      );
    },
    onSuccess: () => {
      toast({
        title: "Prop updated",
        description: "The prop has been updated successfully.",
      });
      setEditingProp(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update prop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePropMutation = useOptimisticDelete<{ id: number }>({
    queryKey: ["/api/projects", projectId, "props"],
    mutationFn: async ({ id }) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/props/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Prop deleted",
        description: "The prop has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete prop. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      act: "",
      scene: "",
      character: "",
      location: "",
      status: "needed",
      notes: "",
      quantity: 1,
      sourcingNotes: "",
      consumableType: "not_consumable",
    });
  };

  const handleSubmit = () => {
    if (editingProp) {
      updatePropMutation.mutate({ id: editingProp.id, updates: formData });
    } else {
      createPropMutation.mutate(formData);
    }
  };

  const handleEdit = (prop: Prop) => {
    setFormData({
      name: prop.name,
      description: prop.description,
      act: prop.act || "",
      scene: prop.scene || "",
      character: prop.character,
      location: prop.location,
      status: prop.status,
      notes: prop.notes,
      quantity: prop.quantity,
      sourcingNotes: prop.sourcingNotes,
      consumableType: prop.consumableType || "not_consumable",
    });
    setEditingProp(prop);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this prop?")) {
      deletePropMutation.mutate({ id });
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const filteredProps = Array.isArray(props) ? props.filter((prop: Prop) => {
    const matchesSearch = prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prop.character.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || prop.status === statusFilter;
    const matchesAct = actFilter === "all" || prop.act === actFilter;
    const matchesScene = sceneFilter === "all" || prop.scene === sceneFilter;
    
    return matchesSearch && matchesStatus && matchesAct && matchesScene;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField as keyof Prop];
    let bValue = b[sortField as keyof Prop];
    
    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }) : [];

  const uniqueActs = Array.isArray(props) ? [...new Set(props.map((prop: Prop) => prop.act).filter(Boolean))].sort((a, b) => {
    // Extract numbers from act strings for numerical sorting
    const aNum = parseFloat(a.replace(/[^0-9.]/g, '') || '0');
    const bNum = parseFloat(b.replace(/[^0-9.]/g, '') || '0');
    return aNum - bNum;
  }) : [];

  const uniqueScenes = Array.isArray(props) ? [...new Set(props.map((prop: Prop) => prop.scene).filter(Boolean))].sort((a, b) => {
    // Extract numbers from scene strings for numerical sorting
    const aNum = parseFloat(a.replace(/[^0-9.]/g, '') || '0');
    const bNum = parseFloat(b.replace(/[^0-9.]/g, '') || '0');
    return aNum - bNum;
  }) : [];

  if (isLoading || projectsLoading || propsLoading) {
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
            <h1 className="text-3xl font-bold text-gray-900">Props</h1>
            
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
                          placeholder="Search props..."
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
                      onClick={() => handleSort('name')}
                    >
                      Item
                      {sortField === 'name' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
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
                      onClick={() => handleSort('act')}
                    >
                      Act
                      {sortField === 'act' && (
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
                      onClick={() => handleSort('quantity')}
                    >
                      Quantity
                      {sortField === 'quantity' && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                    <button
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => handleSort('location')}
                    >
                      Location
                      {sortField === 'location' && (
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
                onClick={() => setIsAddingProp(true)}
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

        {/* Desktop Props Table */}
        <Card className="mb-6 hidden md:block">
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-1/4"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Item
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'name' && (
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
                    className="cursor-pointer hover:bg-gray-50 select-none w-20"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center gap-1">
                      Qty
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'quantity' && (
                        <span className="text-gray-600 text-xs ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none w-1/6"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      {sortField === 'location' && (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No props found</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setIsAddingProp(true)}
                      >
                        Add your first prop
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProps.map((prop: Prop) => {
                    const statusInfo = getStatusInfo(prop.status);
                    
                    return (
                      <TableRow 
                        key={prop.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleEdit(prop)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {prop.imageUrl && (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{prop.name}</div>
                              <div className="text-sm text-muted-foreground">{prop.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{prop.character || '—'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {prop.act ? (prop.act.toLowerCase().startsWith('act') ? prop.act : `Act ${prop.act}`) : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {prop.scene ? (prop.scene.toLowerCase().startsWith('scene') ? prop.scene : `Scene ${prop.scene}`) : '—'}
                          </div>
                        </TableCell>
                        <TableCell>{prop.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {prop.location || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Props List */}
        <div className="space-y-3 md:hidden">
          {filteredProps.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No props found</p>
              <Button
                variant="outline"
                onClick={() => setIsAddingProp(true)}
              >
                Add your first prop
              </Button>
            </Card>
          ) : (
            filteredProps.map((prop: Prop) => {
              const statusInfo = getStatusInfo(prop.status);
              
              return (
                <Card 
                  key={prop.id}
                  className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleEdit(prop)}
                >
                  <CardContent className="p-4">
                    <div className="mb-2">
                      <div className="font-medium text-base">{prop.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {[prop.act, prop.scene, prop.character].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      
                      {prop.quantity > 1 && (
                        <div className="text-sm font-medium text-gray-600">
                          Qty: {prop.quantity}
                        </div>
                      )}
                    </div>
                    
                    {prop.description && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {prop.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Prop Dialog */}
      <Dialog open={isAddingProp || !!editingProp} onOpenChange={(open) => {
          if (!open) {
            setIsAddingProp(false);
            setEditingProp(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-md md:max-w-2xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingProp ? "Edit Prop" : "Add New Prop"}
              </DialogTitle>
              <DialogDescription>
                {editingProp ? "Update the prop information." : "Add a new prop to your props list."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Item Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Red Umbrella"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of the prop..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Act</label>
                <Input
                  value={formData.act}
                  onChange={(e) => setFormData({...formData, act: e.target.value})}
                  placeholder="e.g., 1, I, Act 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scene</label>
                <Input
                  value={formData.scene}
                  onChange={(e) => setFormData({...formData, scene: e.target.value})}
                  placeholder="e.g., 1, 2, Scene 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Character</label>
                <Input
                  value={formData.character}
                  onChange={(e) => setFormData({...formData, character: e.target.value})}
                  placeholder="e.g., Mary Poppins"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Props Room A"
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
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={formData.consumableType} onValueChange={(value: any) => setFormData({...formData, consumableType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {consumableOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Sourcing Notes</label>
                <Textarea
                  value={formData.sourcingNotes}
                  onChange={(e) => setFormData({...formData, sourcingNotes: e.target.value})}
                  placeholder="Where to find/buy this prop, vendor info, etc."
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about this prop..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              {editingProp && (
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(editingProp.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => {
                  setIsAddingProp(false);
                  setEditingProp(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.name || createPropMutation.isPending || updatePropMutation.isPending}
                >
                  {editingProp ? "Update Prop" : "Add Prop"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {isMobile && (
          <FloatingActionButton
            onClick={() => setIsAddingProp(true)}
            title="Add prop"
          />
        )}
    </div>
  );
}