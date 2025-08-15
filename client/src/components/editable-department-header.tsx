import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  GripVertical,
  Lock
} from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import InlineFormattingToolbar from "./inline-formatting-toolbar";

interface EditableDepartmentHeaderProps {
  projectId: number;
  department: string;
  displayName: string;
  onNameChange: (newName: string) => void;
  onFormattingChange?: (formatting: HeaderFormatting) => void;
  isEditing?: boolean;
  disableEditing?: boolean;
}

interface HeaderFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  fontSize: string;
  textColor: string;
  backgroundColor: string;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderWeight: string;
  borderColor: string;
}

const EditableDepartmentHeader: React.FC<EditableDepartmentHeaderProps> = ({
  projectId,
  department,
  displayName,
  onNameChange,
  onFormattingChange,
  isEditing = true,
  disableEditing = false
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default formatting state
  const [formatting, setFormatting] = useState<HeaderFormatting>({
    bold: true,
    italic: false,
    underline: false,
    textAlign: 'left',
    fontFamily: 'Arial',
    fontSize: '14px',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderWeight: '1px',
    borderColor: '#d1d5db'
  });

  // Load saved formatting from show settings
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId,
    staleTime: 0
  });

  // Apply saved formatting when loaded
  useEffect(() => {
    if (showSettings && (showSettings as any).departmentFormatting?.[department]) {
      const savedFormatting = (showSettings as any).departmentFormatting[department];
      console.log(`🎨 Loading saved formatting for ${department}:`, savedFormatting);
      setFormatting(savedFormatting);
    }
  }, [showSettings?.departmentFormatting, department]);

  // Log when displayName prop changes to debug
  useEffect(() => {
    console.log(`📝 Department ${department} displayName prop updated to:`, displayName);
  }, [displayName, department]);

  const updateDepartmentNameMutation = useMutation({
    mutationFn: async ({ newName }: { newName: string }) => {
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
      setShowToolbar(false);
      setEditingElement(null);
      // Immediate cache invalidation
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

  // Update formatting mutation
  const updateFormattingMutation = useMutation({
    mutationFn: async ({ formatting: newFormatting, applyToAll = false }: { formatting: HeaderFormatting; applyToAll?: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/settings/department-formatting`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department,
          formatting: newFormatting,
          applyToAll
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update department formatting');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      const { applyToAll } = variables;
      toast({
        title: "Formatting updated",
        description: applyToAll ? "Formatting applied to all departments" : "Department formatting updated successfully",
      });
      onFormattingChange?.(formatting);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Error updating formatting",
        description: "Failed to update the department formatting. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to update department formatting:', error);
    }
  });

  const handleAutoSave = () => {
    if (editingElement) {
      // Get all computed styles from the current element
      const computedStyle = window.getComputedStyle(editingElement);
      const newFormatting = {
        bold: computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700',
        italic: computedStyle.fontStyle === 'italic',
        underline: computedStyle.textDecoration.includes('underline'),
        textAlign: computedStyle.textAlign as 'left' | 'center' | 'right',
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        textColor: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        borderTop: false,
        borderRight: false,
        borderBottom: false,
        borderLeft: false,
        borderWeight: '1px',
        borderColor: '#d1d5db'
      };
      
      setFormatting(newFormatting);
      updateFormattingMutation.mutate({ formatting: newFormatting, applyToAll: false });
    }
  };

  const handleApplyToAll = async () => {
    try {
      if (!editingElement) return;
      
      // Get computed styles from the current element
      const computedStyle = window.getComputedStyle(editingElement);
      const newFormatting = {
        bold: computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700',
        italic: computedStyle.fontStyle === 'italic',
        underline: computedStyle.textDecoration.includes('underline'),
        textAlign: computedStyle.textAlign as 'left' | 'center' | 'right',
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        textColor: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,
        borderTop: false,
        borderRight: false,
        borderBottom: false,
        borderLeft: false,
        borderWeight: '1px',
        borderColor: '#d1d5db'
      };

      // Apply formatting to all department headers
      await updateFormattingMutation.mutateAsync({ formatting: newFormatting, applyToAll: true });
      
      // Also apply formatting to field headers
      const fieldFormatting = {
        fontWeight: newFormatting.bold ? 'bold' : 'normal',
        fontStyle: newFormatting.italic ? 'italic' : 'normal',
        textDecoration: newFormatting.underline ? 'underline' : 'none',
        textAlign: newFormatting.textAlign,
        fontFamily: newFormatting.fontFamily,
        fontSize: newFormatting.fontSize,
        color: newFormatting.textColor,
        backgroundColor: newFormatting.backgroundColor,
      };

      const fieldResponse = await fetch(`/api/projects/${projectId}/settings/field-header-formatting`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formatting: fieldFormatting,
          applyToAll: true
        }),
      });

      if (!fieldResponse.ok) {
        throw new Error(`Failed to update field header formatting: ${fieldResponse.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });

      toast({
        title: "Formatting applied",
        description: "Formatting applied to all headers (department and field headers)",
      });

    } catch (error) {
      console.error('Error applying formatting to all headers:', error);
      toast({
        title: "Error",
        description: "Failed to apply formatting to all headers",
        variant: "destructive"
      });
    }
  };

  // Simple rendering matching field headers approach
  return (
    <div className="relative group flex items-center">
      {/* Move handle - only visible on hover when editing */}
      {isEditing && (
        <div className="drag-handle opacity-0 group-hover:opacity-100 transition-opacity mr-2 cursor-move flex-shrink-0 flex items-center">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}
      
      <div 
        className={`${isEditing ? 'cursor-text' : 'cursor-default'} transition-all p-1 rounded min-h-[24px] outline-none flex-1`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        data-department-header="true"
        onFocus={isEditing ? (e) => {
          setEditingElement(e.currentTarget);
          setShowToolbar(true);
        } : undefined}
        onBlur={isEditing ? (e) => {
          // Only show toolbar on blur, don't save automatically
          // Save only happens when user clicks the lock button
        } : undefined}
        style={{
          fontWeight: formatting.bold ? 'bold' : 'normal',
          fontStyle: formatting.italic ? 'italic' : 'normal',
          textDecoration: formatting.underline ? 'underline' : 'none',
          textAlign: formatting.textAlign,
          fontFamily: formatting.fontFamily,
          fontSize: formatting.fontSize,
          color: formatting.textColor,
          backgroundColor: formatting.backgroundColor,
          borderTop: formatting.borderTop ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none',
          borderRight: formatting.borderRight ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none',
          borderBottom: formatting.borderBottom ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none',
          borderLeft: formatting.borderLeft ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none',
          padding: '4px 8px',
          minHeight: '24px',
          height: '24px',
          lineHeight: '16px',
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{
          __html: displayName.replace(/\n/g, '<br>')
        }}
      />

      {/* Inline Formatting Toolbar with Custom Save Button */}
      {isEditing && showToolbar && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center space-x-2"
          style={{
            top: `${editingElement?.getBoundingClientRect().top - 64}px`,
            left: `${editingElement?.getBoundingClientRect().left}px`
          }}
        >
          <InlineFormattingToolbar
            targetElement={editingElement}
            isVisible={showToolbar}
            onAutoSave={() => {
              // Only auto-save formatting changes, not department name changes
              handleAutoSave();
            }}
            onApplyToAll={handleApplyToAll}
            showVariables={false}
            onClose={() => {
              setShowToolbar(false);
              setEditingElement(null);
            }}
          />
          
          {/* Custom Save Button for Department Name */}
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            size="sm"
            onClick={() => {
              if (editingElement) {
                const newContent = editingElement.textContent?.trim() || '';
                if (newContent !== displayName) {
                  console.log(`💾 Saving department name: ${department} -> "${newContent}"`);
                  updateDepartmentNameMutation.mutate({ newName: newContent });
                }
                setShowToolbar(false);
                setEditingElement(null);
              }
            }}
            className="h-8 px-3"
            disabled={updateDepartmentNameMutation.isPending}
          >
            <Lock className="h-4 w-4 mr-1" />
            {updateDepartmentNameMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditableDepartmentHeader;