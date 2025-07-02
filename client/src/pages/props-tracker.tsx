import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
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
  scene: string;
  character: string;
  location: string;
  status: 'needed' | 'pulled' | 'rehearsal' | 'performance' | 'returned';
  notes: string;
  quantity: number;
  sourcingNotes: string;
  imageUrl?: string;
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

export default function PropsTracker() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PropsTrackerParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();

  const [isAddingProp, setIsAddingProp] = useState(false);
  const [editingProp, setEditingProp] = useState<Prop | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sceneFilter, setSceneFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scene: "",
    character: "",
    location: "",
    status: "needed" as const,
    notes: "",
    quantity: 1,
    sourcingNotes: "",
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

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  const { data: props = [], isLoading: propsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "props"],
    enabled: !!projectId && isAuthenticated,
  });

  const createPropMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", `/api/projects/${projectId}/props`, data);
    },
    onSuccess: () => {
      toast({
        title: "Prop added",
        description: "The prop has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "props"] });
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

  const updatePropMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<typeof formData> }) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/props/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Prop updated",
        description: "The prop has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "props"] });
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

  const deletePropMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/props/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Prop deleted",
        description: "The prop has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "props"] });
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
      scene: "",
      character: "",
      location: "",
      status: "needed",
      notes: "",
      quantity: 1,
      sourcingNotes: "",
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
      scene: prop.scene,
      character: prop.character,
      location: prop.location,
      status: prop.status,
      notes: prop.notes,
      quantity: prop.quantity,
      sourcingNotes: prop.sourcingNotes,
    });
    setEditingProp(prop);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this prop?")) {
      deletePropMutation.mutate(id);
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
    const matchesScene = sceneFilter === "all" || prop.scene === sceneFilter;
    
    return matchesSearch && matchesStatus && matchesScene;
  }) : [];

  const uniqueScenes = Array.isArray(props) ? [...new Set(props.map((prop: Prop) => prop.scene).filter(Boolean))] : [];

  if (isLoading || projectsLoading || propsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">Show not found</div>;
  }

  const isFreelance = user?.profileType === 'freelance';

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {project.name}
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 bg-transparent hover:bg-transparent"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button onClick={() => setIsAddingProp(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Prop
            </Button>
          </div>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Props Tracker</h1>
        </div>
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
                  placeholder="Search props..."
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

        {/* Props Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Scene/Character</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
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
                      <TableRow key={prop.id}>
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
                            <div className="font-medium">{prop.scene}</div>
                            <div className="text-sm text-muted-foreground">{prop.character}</div>
                          </div>
                        </TableCell>
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
                        <TableCell>{prop.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(prop)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(prop.id)}
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

        {/* Add/Edit Prop Dialog */}
        <Dialog open={isAddingProp || !!editingProp} onOpenChange={(open) => {
          if (!open) {
            setIsAddingProp(false);
            setEditingProp(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProp ? "Edit Prop" : "Add New Prop"}
              </DialogTitle>
              <DialogDescription>
                {editingProp ? "Update the prop information." : "Add a new prop to your props list."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of the prop..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scene</label>
                <Input
                  value={formData.scene}
                  onChange={(e) => setFormData({...formData, scene: e.target.value})}
                  placeholder="e.g., Act 1 Scene 2"
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
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Sourcing Notes</label>
                <Textarea
                  value={formData.sourcingNotes}
                  onChange={(e) => setFormData({...formData, sourcingNotes: e.target.value})}
                  placeholder="Where to find/buy this prop, vendor info, etc."
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about this prop..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}