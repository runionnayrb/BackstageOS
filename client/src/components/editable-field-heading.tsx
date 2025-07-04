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
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
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
          if (value) {
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

  const applyFormattingToAllHeaders = () => {
    console.log('🔥🔥🔥 FIELD HEADING APPLY TO ALL CLICKED!!! 🔥🔥🔥');
    console.error('🔥🔥🔥 FIELD HEADING APPLY TO ALL CLICKED!!! 🔥🔥🔥');
    console.warn('🔥🔥🔥 FIELD HEADING APPLY TO ALL CLICKED!!! 🔥🔥🔥');
    alert('🔥 FIELD HEADING Apply to All function called! 🔥');
    
    if (!editingElement) {
      console.log('❌ No editing element');
      alert('❌ No editing element found');
      return;
    }

    console.log('Apply to All: Starting with element:', editingElement);

    // Get all computed styles from the current element
    const computedStyle = window.getComputedStyle(editingElement);
    const formatting = {
      fontWeight: computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      textDecoration: computedStyle.textDecoration,
      textAlign: computedStyle.textAlign,
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
    };

    console.log('Apply to All: Extracted formatting:', formatting);

    // Use the database-backed mutation to apply formatting to all field headers
    updateFieldHeaderFormattingMutation.mutate({ 
      formatting, 
      applyToAll: true 
    });
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
            setEditingElement(e.currentTarget);
            setShowToolbar(true);
            // Set content for editing
            e.currentTarget.innerHTML = content.replace(/\n/g, '<br>');
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
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="secondary" className="text-xs">Click to edit</Badge>
        </div>
      </div>

      {/* Inline Formatting Toolbar */}
      <InlineFormattingToolbar
        targetElement={editingElement}
        isVisible={showToolbar}
        onSave={() => {
          if (editingElement) {
            const content = editingElement.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            onChange(content);
          }
          setShowToolbar(false);
          setEditingElement(null);
        }}
        onCancel={() => {
          setShowToolbar(false);
          setEditingElement(null);
          if (editingElement) {
            editingElement.blur();
          }
        }}
        onApplyToAll={onApplyToAll || applyFormattingToAllHeaders}
      />
    </>
  );
}