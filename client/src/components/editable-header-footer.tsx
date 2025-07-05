import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import InlineFormattingToolbar from "@/components/inline-formatting-toolbar";

interface EditableHeaderFooterProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
  projectId: string;
  type: 'header' | 'footer';
}

export default function EditableHeaderFooter({ 
  content, 
  onChange, 
  className = "text-sm font-medium text-gray-700 mb-1",
  projectId,
  type
}: EditableHeaderFooterProps) {
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const { toast } = useToast();

  // Query to fetch show settings including header/footer formatting
  const { data: showSettings } = useQuery<any>({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Query to fetch project data for variable replacement
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId
  });

  // Process content and replace variables with actual values for display
  const processRichContent = useCallback((content: string): string => {
    if (!content) return '';
    
    return content
      .replace(/\{\{showName\}\}/g, (project as any)?.name || 'Show Name')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{stageManager\}\}/g, 'Stage Manager')
      .replace(/\{\{techDay\}\}/g, '1')
      .replace(/\{\{nextTech\}\}/g, 'Next Tech Session')
      .replace(/\{\{technicalDirector\}\}/g, 'Technical Director')
      .replace(/\{\{pageNumber\}\}/g, '1')
      .replace(/\{\{totalPages\}\}/g, '1');
  }, [project]);

  // Function to apply formatting to element
  const applyFormattingToElement = useCallback((element: HTMLElement, formatting: any) => {
    Object.entries(formatting).forEach(([property, value]) => {
      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'none' && value !== 'start' && value !== 'normal') {
        const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        element.style.setProperty(cssProperty, value as string);
      }
    });
  }, []);

  // Apply saved header/footer formatting when component mounts or settings change
  useEffect(() => {
    const settingsKey = type === 'header' ? 'headerFormatting' : 'footerFormatting';
    const dataAttribute = type === 'header' ? 'data-template-header' : 'data-template-footer';
    
    if (showSettings?.[settingsKey]) {
      const formatting = showSettings[settingsKey];
      console.log(`Applying saved ${type} formatting:`, formatting);
      
      // Small delay to ensure content is rendered first
      setTimeout(() => {
        const elements = document.querySelectorAll(`[${dataAttribute}="true"]`);
        elements.forEach((element) => {
          applyFormattingToElement(element as HTMLElement, formatting);
        });
      }, 100);
    }
  }, [showSettings?.headerFormatting, showSettings?.footerFormatting, type, applyFormattingToElement]);

  // Click outside to close toolbar (similar to department headers)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showToolbar &&
        editingElement &&
        !editingElement.contains(event.target as Node)
      ) {
        // Check if click is on toolbar by looking for toolbar elements
        const target = event.target as Element;
        const isToolbarClick = target.closest('[role="toolbar"], .inline-formatting-toolbar, button[data-toolbar]');
        
        if (!isToolbarClick) {
          setShowToolbar(false);
          setEditingElement(null);
        }
      }
    };

    if (showToolbar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showToolbar, editingElement]);

  // Header/Footer formatting mutation
  const updateFormattingMutation = useMutation({
    mutationFn: async ({ formatting }: { formatting: any }) => {
      const endpoint = type === 'header' ? 'header-formatting' : 'footer-formatting';
      const response = await fetch(`/api/projects/${projectId}/settings/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formatting }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${type} formatting`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch the project settings
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} formatting updated successfully`
      });
    },
    onError: (error) => {
      console.error(`Error updating ${type} formatting:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${type} formatting`,
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

      // Auto-save the formatting
      updateFormattingMutation.mutate({ formatting });
    }
  };

  const applyFormatting = async () => {
    console.log(`🎨 ${type.toUpperCase()} FORMATTING APPLIED! 🎨`);
    
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

      console.log(`Applying formatting to ${type}:`, formatting);

      // Use the mutation to save formatting
      await updateFormattingMutation.mutateAsync({ formatting });

      // Immediately apply formatting to the current element
      Object.entries(formatting).forEach(([property, value]) => {
        if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'none' && value !== 'start' && value !== 'normal') {
          const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          editingElement.style.setProperty(cssProperty, value as string);
        }
      });

      // Close the toolbar after successful update
      setShowToolbar(false);
      setEditingElement(null);

    } catch (error) {
      console.error(`Error applying formatting to ${type}:`, error);
      toast({
        title: "Error", 
        description: `Failed to apply formatting to ${type}`,
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="relative group">
        <div 
          className={`${className} cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[24px] outline-none`}
          contentEditable
          suppressContentEditableWarning
          data-template-header={type === 'header' ? "true" : undefined}
          data-template-footer={type === 'footer' ? "true" : undefined}
          onFocus={(e) => {
            console.log(`🎯 ${type.toUpperCase()} FOCUSED - Setting up for editing`);
            setEditingElement(e.currentTarget);
            // Set raw content for editing (with variables)
            e.currentTarget.innerHTML = content.replace(/\n/g, '<br>');
          }}
          onMouseUp={(e) => {
            // Only show toolbar when user has actually selected text
            setTimeout(() => {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0) {
                console.log(`🎯 ${type.toUpperCase()} TEXT SELECTED - Setting up toolbar`);
                setShowToolbar(true);
              }
            }, 10);
          }}
          onBlur={(e) => {
            if (!showToolbar) {
              const newContent = e.currentTarget.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
              onChange(newContent);
              // After saving, show processed content again
              e.currentTarget.innerHTML = processRichContent(newContent).replace(/\n/g, '<br>');
              
              // Reapply formatting after content update
              const settingsKey = type === 'header' ? 'headerFormatting' : 'footerFormatting';
              if (showSettings?.[settingsKey]) {
                setTimeout(() => {
                  applyFormattingToElement(e.currentTarget, showSettings[settingsKey]);
                }, 50);
              }
            }
          }}
          dangerouslySetInnerHTML={{
            __html: processRichContent(content).replace(/\n/g, '<br>')
          }}
          ref={(el) => {
            if (el && !editingElement) {
              // Apply formatting after initial render
              const settingsKey = type === 'header' ? 'headerFormatting' : 'footerFormatting';
              if (showSettings?.[settingsKey]) {
                setTimeout(() => {
                  applyFormattingToElement(el, showSettings[settingsKey]);
                }, 100);
              }
            }
          }}
        />
      </div>

      {/* Inline Formatting Toolbar - Use same positioning approach as field headers */}
      <InlineFormattingToolbar
        targetElement={editingElement}
        isVisible={showToolbar}
        onAutoSave={() => {
          if (editingElement) {
            const content = editingElement.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            onChange(content);
            handleAutoSave(); // Auto-save formatting changes
            // Update display to show processed content
            editingElement.innerHTML = processRichContent(content).replace(/\n/g, '<br>');
            
            // Reapply formatting after content update
            const settingsKey = type === 'header' ? 'headerFormatting' : 'footerFormatting';
            if (showSettings?.[settingsKey]) {
              setTimeout(() => {
                applyFormattingToElement(editingElement, showSettings[settingsKey]);
              }, 50);
            }
          }
        }}
        onApplyToAll={applyFormatting}
        applyToAllText={`Apply to All ${type.charAt(0).toUpperCase() + type.slice(1)}s`}
        onClose={() => {
          if (editingElement) {
            // Get the current content and save it
            const currentContent = editingElement.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            onChange(currentContent);
            // Update display to show processed content
            editingElement.innerHTML = processRichContent(currentContent).replace(/\n/g, '<br>');
            
            // Reapply formatting after content update
            const settingsKey = type === 'header' ? 'headerFormatting' : 'footerFormatting';
            if (showSettings?.[settingsKey]) {
              setTimeout(() => {
                applyFormattingToElement(editingElement, showSettings[settingsKey]);
              }, 50);
            }
          }
          setShowToolbar(false);
          setEditingElement(null);
        }}
      />
    </>
  );
}