import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EditableDepartmentHeaderProps {
  projectId: number;
  department: string;
  displayName: string;
  onNameChange?: (newName: string) => void;
}

const EditableDepartmentHeader: React.FC<EditableDepartmentHeaderProps> = ({
  projectId,
  department,
  displayName,
  onNameChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDepartmentNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch(`/api/projects/${projectId}/settings/department-names`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department,
          name: newName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update department name');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Department name updated",
        description: "The department name has been successfully updated.",
      });
      setIsEditing(false);
      onNameChange?.(editValue);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating department name",
        description: "Failed to update the department name. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update department name:', error);
    }
  });

  const handleSave = () => {
    if (editValue.trim() === '') {
      toast({
        title: "Invalid name",
        description: "Department name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateDepartmentNameMutation.mutate(editValue.trim());
  };

  const handleCancel = () => {
    setEditValue(displayName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm font-semibold h-7 px-2"
          autoFocus
          disabled={updateDepartmentNameMutation.isPending}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={updateDepartmentNameMutation.isPending}
          className="h-7 w-7 p-0"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={updateDepartmentNameMutation.isPending}
          className="h-7 w-7 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-2 group">
      <div className="text-sm font-semibold text-gray-700">
        {displayName}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default EditableDepartmentHeader;