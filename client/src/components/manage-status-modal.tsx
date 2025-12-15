import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, GripVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { NoteStatus } from '@shared/schema';

interface ManageStatusModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1f2937'
];

export function ManageStatusModal({ projectId, isOpen, onClose }: ManageStatusModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#6b7280');
  const [editingIsCompleted, setEditingIsCompleted] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [newIsCompleted, setNewIsCompleted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const { data: statuses = [], isLoading } = useQuery<NoteStatus[]>({
    queryKey: ['/api/projects', projectId, 'note-statuses'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/note-statuses`);
      if (!response.ok) throw new Error('Failed to fetch statuses');
      return response.json();
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; isCompleted: boolean }) => {
      return apiRequest('POST', `/api/projects/${projectId}/note-statuses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'note-statuses'] });
      setNewName('');
      setNewColor('#6b7280');
      setNewIsCompleted(false);
      setShowAddForm(false);
      toast({ title: 'Status created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create status', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NoteStatus> }) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/note-statuses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'note-statuses'] });
      setEditingId(null);
      toast({ title: 'Status updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/note-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'note-statuses'] });
      toast({ title: 'Status deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete status', variant: 'destructive' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (statusIds: number[]) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/note-statuses/reorder`, { statusIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'note-statuses'] });
    },
  });

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;
    
    const draggedIndex = statuses.findIndex(s => s.id === draggedId);
    const targetIndex = statuses.findIndex(s => s.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...statuses];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const startEditing = (status: NoteStatus) => {
    setEditingId(status.id);
    setEditingName(status.name);
    setEditingColor(status.color);
    setEditingIsCompleted(status.isCompleted || false);
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { name: editingName, color: editingColor, isCompleted: editingIsCompleted },
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName, color: newColor, isCompleted: newIsCompleted });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Note Statuses</DialogTitle>
          <DialogDescription>
            Create, edit, and reorder statuses to track note progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : statuses.length === 0 && !showAddForm ? (
            <div className="text-center py-4 text-muted-foreground">
              No custom statuses yet. Add one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  draggable={editingId !== status.id}
                  onDragStart={() => handleDragStart(status.id)}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    draggedId === status.id ? 'opacity-50' : ''
                  } ${editingId === status.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                  data-testid={`status-item-${status.id}`}
                >
                  {editingId === status.id ? (
                    <>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Status name"
                          className="h-8"
                          data-testid="input-edit-status-name"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditingColor(color)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                editingColor === color ? 'border-primary' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              data-testid={`color-${color}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`edit-completed-${status.id}`}
                            checked={editingIsCompleted}
                            onCheckedChange={(checked) => setEditingIsCompleted(!!checked)}
                          />
                          <Label htmlFor={`edit-completed-${status.id}`} className="text-sm">
                            Marks note as completed
                          </Label>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={saveEdit} data-testid="button-save-edit">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} data-testid="button-cancel-edit">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="flex-1 text-sm">{status.name}</span>
                      {status.isCompleted && (
                        <span className="text-xs text-muted-foreground">(completed)</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(status)}
                        className="h-7 w-7"
                        data-testid={`button-edit-status-${status.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(status.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        data-testid={`button-delete-status-${status.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Status name (e.g., In Progress)"
                data-testid="input-new-status-name"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm text-muted-foreground">Color:</Label>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      newColor === color ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    data-testid={`new-color-${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-completed"
                  checked={newIsCompleted}
                  onCheckedChange={(checked) => setNewIsCompleted(!!checked)}
                />
                <Label htmlFor="new-completed" className="text-sm">
                  Marks note as completed
                </Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!newName.trim()} data-testid="button-save-new-status">
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-new-status">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
              data-testid="button-add-status"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
