import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, Plus, Trash2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamRole {
  id: string;
  name: string;
  order: number;
}

interface ManageTeamRolesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: any;
}

export function ManageTeamRolesModal({ open, onOpenChange, settings }: ManageTeamRolesModalProps) {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRoleName, setNewRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [draggedRoleId, setDraggedRoleId] = useState<string | null>(null);
  const [dragOverRoleId, setDragOverRoleId] = useState<string | null>(null);

  // Get default roles if no custom roles exist
  const defaultRoles: TeamRole[] = [
    { id: "psmid", name: "Production Stage Manager", order: 0 },
    { id: "smid", name: "Stage Manager", order: 1 },
    { id: "asmid", name: "Assistant Stage Manager", order: 2 },
    { id: "paid", name: "Production Assistant", order: 3 },
  ];

  const roles = useMemo(() => {
    const customRoles = (settings?.teamRoles || []) as TeamRole[];
    return customRoles.length > 0 ? customRoles : defaultRoles;
  }, [settings?.teamRoles]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/settings`] });
    },
  });

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a role name.",
        variant: "destructive",
      });
      return;
    }

    const newRole: TeamRole = {
      id: `role-${Date.now()}`,
      name: newRoleName,
      order: roles.length,
    };

    const updatedRoles = [...roles, newRole];
    updateSettingsMutation.mutate({ teamRoles: updatedRoles });
    setNewRoleName("");
    toast({
      title: "Role added",
      description: `"${newRoleName}" has been added.`,
    });
  };

  const handleEditRole = (roleId: string) => {
    if (!editingRoleName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a role name.",
        variant: "destructive",
      });
      return;
    }

    const updatedRoles = roles.map((role) =>
      role.id === roleId ? { ...role, name: editingRoleName } : role
    );

    updateSettingsMutation.mutate({ teamRoles: updatedRoles });
    setEditingRoleId(null);
    setEditingRoleName("");
    toast({
      title: "Role updated",
      description: "Role has been updated successfully.",
    });
  };

  const handleDeleteRole = (roleId: string) => {
    const updatedRoles = roles.filter((role) => role.id !== roleId);
    updateSettingsMutation.mutate({ teamRoles: updatedRoles });
    toast({
      title: "Role deleted",
      description: "Role has been removed.",
    });
  };

  const handleReorder = (sourceId: string, targetId: string) => {
    const sourceIdx = roles.findIndex((r) => r.id === sourceId);
    const targetIdx = roles.findIndex((r) => r.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const newRoles = [...roles];
    const [removed] = newRoles.splice(sourceIdx, 1);
    newRoles.splice(targetIdx, 0, removed);

    // Update order numbers
    const reorderedRoles = newRoles.map((role, idx) => ({
      ...role,
      order: idx,
    }));

    updateSettingsMutation.mutate({ teamRoles: reorderedRoles });
    setDraggedRoleId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Team Roles</DialogTitle>
          <DialogDescription>
            Add, edit, delete, or reorder production roles. These will appear in the invite dropdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new role */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter new role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
              data-testid="input-new-role-name"
            />
            <Button onClick={handleAddRole} disabled={updateSettingsMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>

          {/* Roles list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {roles.map((role) => (
              <Card
                key={role.id}
                draggable
                onDragStart={() => setDraggedRoleId(role.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverRoleId(role.id);
                }}
                onDragLeave={() => setDragOverRoleId(null)}
                onDrop={() => {
                  if (draggedRoleId && draggedRoleId !== role.id) {
                    handleReorder(draggedRoleId, role.id);
                  }
                  setDragOverRoleId(null);
                }}
                className={`cursor-move transition-colors ${
                  dragOverRoleId === role.id ? "bg-primary/10 border-primary" : ""
                }`}
                data-testid={`card-role-${role.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {editingRoleId === role.id ? (
                      <Input
                        autoFocus
                        value={editingRoleName}
                        onChange={(e) => setEditingRoleName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditRole(role.id);
                          if (e.key === "Escape") setEditingRoleId(null);
                        }}
                        onBlur={() => setEditingRoleId(null)}
                        className="h-8"
                        data-testid="input-edit-role-name"
                      />
                    ) : (
                      <span className="text-sm font-medium flex-1">{role.name}</span>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setEditingRoleName(role.name);
                      }}
                      data-testid={`button-edit-role-${role.id}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-role-${role.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
