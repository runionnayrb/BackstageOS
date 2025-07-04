import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import InlineFormattingToolbar from "./inline-formatting-toolbar";

interface EditableFieldHeadingProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
  projectId: string;
  onApplyToAll?: () => void;
}

export default function EditableFieldHeading({ 
  content, 
  onChange, 
  className = "text-sm font-medium text-gray-700 mb-1",
  projectId,
  onApplyToAll
}: EditableFieldHeadingProps) {
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debug: Log when component mounts with onApplyToAll prop
  console.log('🔍 EditableFieldHeading mounted with onApplyToAll:', !!onApplyToAll);

  // Query to fetch show settings including field header formatting
  const { data: showSettings } = useQuery<any>({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Apply saved field header formatting when component mounts or settings change
  useEffect(() => {
    if (showSettings?.fieldHeaderFormatting) {
      const formatting = showSettings.fieldHeaderFormatting;
      console.log('Applying saved field header formatting:', formatting);
      
      // Apply formatting to all field headers
      const fieldHeaders = document.querySelectorAll('[data-field-heading]');
      fieldHeaders.forEach((element) => {
        const htmlElement = element as HTMLElement;
        Object.entries(formatting).forEach(([property, value]) => {
          if (value && value !== 'rgba(0, 0, 0, 0)') {
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            htmlElement.style.setProperty(cssProperty, value as string);
          }
        });
      });
    }
  }, [showSettings?.fieldHeaderFormatting]);

  // Field header formatting mutation
  const updateFieldHeaderFormattingMutation = useMutation({
    mutationFn: async ({ formatting, applyToAll = false }: { formatting: any; applyToAll?: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/settings/field-header-formatting`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formatting,
          applyToAll
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update field header formatting');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the project settings
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      toast({
        title: "Success",
        description: "Field header formatting updated successfully"
      });
    },
    onError: (error) => {
      console.error('Error updating field header formatting:', error);
      toast({
        title: "Error",
        description: "Failed to update field header formatting",
        variant: "destructive"
      });
    }
  });

  const handleAutoSave = () => {
    if (editingElement) {
      // Get all computed styles from the current element
      const computedStyle = window.getComputedStyle(editingElement);
      const formatting = {
        fontWeight: String(computedStyle.fontWeight),
        fontStyle: String(computedStyle.fontStyle),
        textDecoration: String(computedStyle.textDecoration),
        textAlign: String(computedStyle.textAlign),
        fontFamily: String(computedStyle.fontFamily),
        fontSize: String(computedStyle.fontSize),
        color: String(computedStyle.color),
        backgroundColor: String(computedStyle.backgroundColor),
      };

      // Auto-save the formatting for this specific field
      updateFieldHeaderFormattingMutation.mutate({
        formatting,
        applyToAll: false
      });
    }
  };

  const applyFormattingToAllHeaders = async () => {
    console.log('🔥🔥🔥 FIELD HEADING APPLY TO ALL CLICKED!!! 🔥🔥🔥');
    
    if (!projectId) {
      console.error('No project ID available');
      toast({
        title: "Error",
        description: "No project ID available",
        variant: "destructive"
      });
      return;
    }
    
    if (!editingElement) {
      console.error('No editing element found');
      toast({
        title: "Error",
        description: "No editing element found",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get all computed styles from the current element
      const computedStyle = window.getComputedStyle(editingElement);
      const fieldFormatting = {
        fontWeight: String(computedStyle.fontWeight),
        fontStyle: String(computedStyle.fontStyle),
        textDecoration: String(computedStyle.textDecoration),
        textAlign: String(computedStyle.textAlign),
        fontFamily: String(computedStyle.fontFamily),
        fontSize: String(computedStyle.fontSize),
        color: String(computedStyle.color),
        backgroundColor: String(computedStyle.backgroundColor),
      };

      console.log('Applying formatting to all headers:', fieldFormatting);

      // Apply to field headers
      await updateFieldHeaderFormattingMutation.mutateAsync({
        formatting: fieldFormatting,
        applyToAll: true
      });

      // Also apply formatting to department headers
      const departmentFormatting = {
        bold: fieldFormatting.fontWeight === 'bold' || fieldFormatting.fontWeight === '700',
        italic: fieldFormatting.fontStyle === 'italic',
        underline: fieldFormatting.textDecoration.includes('underline'),
        textAlign: fieldFormatting.textAlign as 'left' | 'center' | 'right',
        fontFamily: fieldFormatting.fontFamily,
        fontSize: fieldFormatting.fontSize,
        textColor: fieldFormatting.color,
        backgroundColor: fieldFormatting.backgroundColor,
        borderTop: false,
        borderRight: false,
        borderBottom: false,
        borderLeft: false,
        borderWeight: '1px',
        borderColor: '#d1d5db'
      };

      // Apply to all departments (scenic, lighting, audio, video, props)
      await fetch(`/api/projects/${projectId}/settings/department-formatting`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department: 'scenic', // Not used when applyToAll is true
          formatting: departmentFormatting,
          applyToAll: true
        }),
      });

      // Immediately apply formatting to all headers on the page
      const allHeaders = document.querySelectorAll('[data-field-heading], [data-department-header]');
      allHeaders.forEach((element) => {
        const htmlElement = element as HTMLElement;
        Object.entries(fieldFormatting).forEach(([property, value]) => {
          if (value && value !== 'rgba(0, 0, 0, 0)') {
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            htmlElement.style.setProperty(cssProperty, value as string);
          }
        });
      });

      toast({
        title: "Formatting applied",
        description: "Formatting applied to all headers (field and department headers)",
      });

      // Close the toolbar after successful update
      setShowToolbar(false);
      setEditingElement(null);
      
      // Trigger auto-save to ensure the formatting persists
      if (editingElement) {
        setTimeout(() => {
          handleAutoSave();
        }, 50);
      }

    } catch (error) {
      console.error('Error applying formatting to all headers:', error);
      toast({
        title: "Error", 
        description: "Failed to apply formatting to all headers",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="relative group">
        <div 
          className={`${className} cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[24px] outline-none editable-field-heading`}
          contentEditable
          suppressContentEditableWarning
          data-field-heading="true"
          onClick={(e) => {
            // Only handle click if no text is currently selected
            const selection = window.getSelection();
            if (!selection || selection.toString().length === 0) {
              setEditingElement(e.currentTarget);
              setShowToolbar(true);
              // Set content for editing
              e.currentTarget.innerHTML = content.replace(/\n/g, '<br>');
            }
          }}
          onDoubleClick={(e) => {
            // Handle double-click for text selection
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }}
          onBlur={(e) => {
            if (!showToolbar) {
              const newContent = e.currentTarget.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
              onChange(newContent);
            }
          }}
          dangerouslySetInnerHTML={{
            __html: content.replace(/\n/g, '<br>')
          }}
        />

      </div>

      {/* Inline Formatting Toolbar */}
      <InlineFormattingToolbar
        targetElement={editingElement}
        isVisible={showToolbar}
        onAutoSave={() => {
          if (editingElement) {
            const content = editingElement.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            onChange(content);
            handleAutoSave(); // Auto-save formatting changes
          }
        }}
        onApplyToAll={onApplyToAll || applyFormattingToAllHeaders}
        showVariables={false}
        onClose={() => {
          setShowToolbar(false);
          setEditingElement(null);
        }}
      />
    </>
  );
}