import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  GripVertical
} from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import InlineFormattingToolbar from "./inline-formatting-toolbar";

interface EditableDepartmentHeaderProps {
  projectId: number;
  department: string;
  displayName: string;
  onNameChange?: (department: string, newName: string) => void;
  onFormattingChange?: (department: string, formatting: HeaderFormatting) => void;
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
    if (showSettings && showSettings.departmentFormatting?.[department]) {
      const savedFormatting = showSettings.departmentFormatting[department];
      console.log(`🎨 Loading saved formatting for ${department}:`, savedFormatting);
      setFormatting(savedFormatting);
    }
  }, [showSettings?.departmentFormatting, department]);

  // Log when displayName prop changes to debug
  useEffect(() => {
    console.log(`📝 Department ${department} displayName prop updated to:`, displayName);
  }, [displayName, department]);

  // No individual mutations - global save will handle all template changes

  const handleAutoSave = () => {
    // Don't auto-save - wait for global lock button save
  };

  const handleApplyToAll = () => {
    // Don't auto-save - wait for global lock button save
  };

  // Simple rendering matching field headers approach
  console.log(`🔧 DEPARTMENT HEADER RENDER: ${department}`, {
    isEditing,
    displayName,
    hasDragHandle: isEditing
  });
  
  return (
    <div className="relative group flex items-center">
      {/* Move handle - visible when editing */}
      {isEditing && (
        <div 
          className="drag-handle opacity-60 hover:opacity-100 transition-opacity mr-2 cursor-move flex-shrink-0 flex items-center bg-gray-100 rounded px-1"
          onMouseDown={() => console.log(`🖱️ DRAG HANDLE CLICKED for ${department}`)}
          onDragStart={() => console.log(`🚀 DRAG START for ${department}`)}
        >
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>
      )}
      
      <div 
        className={`${isEditing ? 'cursor-text' : 'cursor-default'} transition-all p-1 rounded min-h-[24px] outline-none flex-1`}
        contentEditable={isEditing}
        suppressContentEditableWarning
        data-department-header="true"
        onFocus={isEditing ? (e) => {
          console.log(`📝 Department header focused for "${department}" - showing toolbar`);
          setEditingElement(e.currentTarget);
          setShowToolbar(true);
        } : undefined}
        onBlur={isEditing ? (e) => {
          console.log('🚨 DEPARTMENT HEADER onBlur triggered for:', department);
          // Call the callback with the new name but don't save to database
          const newName = e.currentTarget.textContent || displayName;
          if (newName !== displayName && onNameChange) {
            console.log(`🚨 DEPARTMENT HEADER calling onNameChange: ${department} -> "${newName}"`);
            onNameChange(department, newName);
          }
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
          __html: (displayName || '').replace(/\n/g, '<br>')
        }}
      />

      {/* Inline Formatting Toolbar */}
      {isEditing && (() => {
        console.log(`🔧 Rendering toolbar for ${department}: editingElement=${!!editingElement}, showToolbar=${showToolbar}, isEditing=${isEditing}`);
        return (
          <InlineFormattingToolbar
            targetElement={editingElement}
            isVisible={showToolbar}
            onAutoSave={() => {
              // Don't auto-save anything - wait for global lock button save
            }}
            onApplyToAll={handleApplyToAll}
            showVariables={false}
            onClose={() => {
              setShowToolbar(false);
              setEditingElement(null);
            }}
            onFormatChange={(newFormatting: any) => {
              console.log(`🎨 Department ${department} format changing:`, newFormatting);
              setFormatting(newFormatting);
              // Call the callback to accumulate changes for global save
              if (onFormattingChange) {
                onFormattingChange(department, newFormatting);
              }
            }}
          />
        );
      })()}
    </div>
  );
};

export default EditableDepartmentHeader;