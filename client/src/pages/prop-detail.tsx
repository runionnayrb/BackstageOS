import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  MapPin, 
  FileText, 
  Clock,
  User,
  Calendar,
  Edit3
} from "lucide-react";

interface PropDetailParams {
  id: string;
  propId: string;
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

export default function PropDetail() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PropDetailParams>();
  const projectSlug = params.id;
  const propId = params.propId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    character: '',
    act: '',
    scene: '',
    quantity: 1,
    consumableType: 'not_consumable' as 'not_consumable' | 'consumable',
    description: '',
    notes: '',
    sourcingNotes: '',
    status: 'needed' as 'needed' | 'pulled' | 'rehearsal' | 'performance' | 'returned',
    location: ''
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: props = [], isLoading: propsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "props"],
    enabled: !!projectId && isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;
  const prop = Array.isArray(props) ? props.find((p: Prop) => p.id === parseInt(propId || '0')) : null;

  const editMutation = useMutation({
    mutationFn: async (propData: any) => {
      return apiRequest('PUT', `/api/projects/${projectId}/props/${propId}`, propData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "props"] });
      toast({
        title: "Success",
        description: "Prop updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update prop",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (prop) {
      setEditForm({
        name: prop.name || '',
        character: prop.character || '',
        act: prop.act || '',
        scene: prop.scene || '',
        quantity: prop.quantity || 1,
        consumableType: prop.consumableType || 'not_consumable',
        description: prop.description || '',
        notes: prop.notes || '',
        sourcingNotes: prop.sourcingNotes || '',
        status: prop.status || 'needed',
        location: prop.location || ''
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSave = () => {
    editMutation.mutate(editForm);
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  if (isLoading || projectsLoading || propsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project || !prop) {
    return <div className="min-h-screen flex items-center justify-center">Prop not found</div>;
  }

  const statusInfo = getStatusInfo(prop.status);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/props`)}
            className="text-gray-600 hover:text-gray-900 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-semibold text-gray-900 truncate mx-3">
            {prop.name}
          </h1>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-700 p-1"
          >
            <Edit3 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Main Info Card */}
        <Card>
          <CardContent className="space-y-4 pt-6">

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Character</span>
                <p className="font-medium">{prop.character || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Act</span>
                <p className="font-medium">{prop.act || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Scene</span>
                <p className="font-medium">{prop.scene || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Quantity</span>
                <p className="font-medium">{prop.quantity}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Type</span>
                <p className="font-medium">
                  {prop.consumableType === 'consumable' ? 'Consumable' : 'Not Consumable'}
                </p>
              </div>

              {prop.description && (
                <div className="space-y-1">
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="font-medium">{prop.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sourcing Notes */}
        {prop.sourcingNotes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sourcing Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{prop.sourcingNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {prop.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{prop.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Created: {new Date(prop.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Updated: {new Date(prop.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prop</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Prop name"
              />
            </div>

            {/* Character */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Character</label>
              <Input
                value={editForm.character}
                onChange={(e) => setEditForm(prev => ({ ...prev, character: e.target.value }))}
                placeholder="Character name"
              />
            </div>

            {/* Act */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Act</label>
              <Input
                value={editForm.act}
                onChange={(e) => setEditForm(prev => ({ ...prev, act: e.target.value }))}
                placeholder="Act number"
              />
            </div>

            {/* Scene */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Scene</label>
              <Input
                value={editForm.scene}
                onChange={(e) => setEditForm(prev => ({ ...prev, scene: e.target.value }))}
                placeholder="Scene number"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="1"
                value={editForm.quantity}
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={editForm.consumableType}
                onValueChange={(value: 'not_consumable' | 'consumable') => 
                  setEditForm(prev => ({ ...prev, consumableType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_consumable">Not Consumable</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                rows={3}
              />
            </div>

            {/* Sourcing Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sourcing Notes</label>
              <Textarea
                value={editForm.sourcingNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, sourcingNotes: e.target.value }))}
                placeholder="Sourcing notes"
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={editMutation.isPending}
                className="flex-1"
              >
                {editMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}