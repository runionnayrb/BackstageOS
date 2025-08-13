import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit2, 
  Check, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type,
  Palette,
  Square,
  Minus,
  Copy,
  GripVertical
} from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EditableDepartmentHeaderProps {
  projectId: number;
  department: string;
  displayName: string;
  onNameChange?: (newName: string) => void;
  onFormattingChange?: (formatting: HeaderFormatting) => void;
  isEditing?: boolean;
  disableEditing?: boolean; // Disable editing when in grouped sections
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
  const [isEditingText, setIsEditingText] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const [showToolbar, setShowToolbar] = useState(false);
  const [actualDisplayName, setActualDisplayName] = useState(displayName);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editableRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Default formatting state - matching preview mode appearance
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
  const { data: showSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId,
    staleTime: 0 // Always fetch fresh data
  });

  // Apply saved formatting and department name when loaded
  useEffect(() => {
    console.log(`🎨 ShowSettings for ${department}:`, showSettings);
    console.log(`🎨 DepartmentFormatting object:`, (showSettings as any)?.departmentFormatting);
    
    // Load saved formatting
    if (showSettings && (showSettings as any).departmentFormatting?.[department]) {
      const savedFormatting = (showSettings as any).departmentFormatting[department];
      console.log(`🎨 Loading saved formatting for ${department}:`, savedFormatting);
      setFormatting(savedFormatting);
    } else {
      console.log(`🎨 No saved formatting found for ${department}, using defaults`);
    }
    
    // Load saved department name from departmentNames
    if (showSettings && (showSettings as any).departmentNames?.[department]) {
      const savedName = (showSettings as any).departmentNames[department];
      console.log(`📝 Loading saved department name for ${department}:`, savedName);
      setActualDisplayName(savedName);
      setEditValue(savedName);
    } else {
      console.log(`📝 No saved name found for ${department}, using displayName:`, displayName);
      setActualDisplayName(displayName);
      setEditValue(displayName);
    }
  }, [showSettings, department, displayName]);

  // Apply styles to the editable element
  const applyFormatting = (element: HTMLElement) => {
    const style = element.style;
    style.fontWeight = formatting.bold ? 'bold' : 'normal';
    style.fontStyle = formatting.italic ? 'italic' : 'normal';
    style.textDecoration = formatting.underline ? 'underline' : 'none';
    style.textAlign = formatting.textAlign;
    style.fontFamily = formatting.fontFamily;
    style.fontSize = formatting.fontSize;
    style.color = formatting.textColor;
    style.backgroundColor = formatting.backgroundColor;
    
    // Apply borders
    style.borderTop = formatting.borderTop ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none';
    style.borderRight = formatting.borderRight ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none';
    style.borderBottom = formatting.borderBottom ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none';
    style.borderLeft = formatting.borderLeft ? `${formatting.borderWeight} solid ${formatting.borderColor}` : 'none';
    
    // Full width styling with consistent height
    style.padding = '4px 8px';
    style.minHeight = '24px';
    style.height = '24px'; // Fixed height to prevent expansion
    style.lineHeight = '16px'; // Consistent line height
    style.display = 'block';
    style.width = '100%';
    style.boxSizing = 'border-box';
    style.overflow = 'hidden'; // Prevent content overflow from changing height
  };

  const updateFormatting = (key: keyof HeaderFormatting, value: any) => {
    const newFormatting = { ...formatting, [key]: value };
    setFormatting(newFormatting);
    handleAutoSave();
  };

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
      setIsEditingText(false);
      setShowToolbar(false);
      setActualDisplayName(editValue);
      onNameChange?.(editValue);
      // Delayed cache invalidation to prevent overwriting user changes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
      }, 500);
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
      // Delayed cache invalidation to prevent overwriting user changes
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

  // Apply formatting when formatting state changes
  useEffect(() => {
    if (editableRef.current && isEditingText) {
      applyFormatting(editableRef.current);
    }
  }, [formatting, isEditingText]);

  // Click outside to close toolbar (with auto-save)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showToolbar &&
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node) &&
        editableRef.current &&
        !editableRef.current.contains(event.target as Node)
      ) {
        setShowToolbar(false);
        setIsEditingText(false);
      }
    };

    if (showToolbar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showToolbar]);

  const handleAutoSave = () => {
    if (editableRef.current) {
      const newText = editableRef.current.textContent?.trim() || '';
      console.log(`🔍 Auto-save triggered for department ${department}:`, {
        newText,
        currentDisplayName: displayName,
        actualDisplayName,
        needsNameUpdate: newText && newText !== actualDisplayName
      });
      
      if (newText && newText !== actualDisplayName) {
        console.log(`📝 Updating department name: ${department} -> "${newText}"`);
        setEditValue(newText);
        updateDepartmentNameMutation.mutate({ newName: newText });
      }
      updateFormattingMutation.mutate({ formatting, applyToAll: false });
    }
  };

  const handleApplyToAll = async () => {
    try {
      // Apply formatting to all department headers
      await updateFormattingMutation.mutateAsync({ formatting, applyToAll: true });
      
      // Also apply formatting to field headers
      const fieldFormatting = {
        fontWeight: formatting.bold ? 'bold' : 'normal',
        fontStyle: formatting.italic ? 'italic' : 'normal',
        textDecoration: formatting.underline ? 'underline' : 'none',
        textAlign: formatting.textAlign,
        fontFamily: formatting.fontFamily,
        fontSize: formatting.fontSize,
        color: formatting.textColor,
        backgroundColor: formatting.backgroundColor,
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

      // Invalidate the query cache so field headers reload with the new formatting
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });

      // Apply formatting immediately to all headers on the page
      const allHeaders = document.querySelectorAll('[data-field-heading], [data-department-header]');
      allHeaders.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.fontWeight = formatting.bold ? 'bold' : 'normal';
        htmlElement.style.fontStyle = formatting.italic ? 'italic' : 'normal';
        htmlElement.style.textDecoration = formatting.underline ? 'underline' : 'none';
        htmlElement.style.textAlign = formatting.textAlign;
        htmlElement.style.fontFamily = formatting.fontFamily;
        htmlElement.style.fontSize = formatting.fontSize;
        htmlElement.style.color = formatting.textColor;
        htmlElement.style.backgroundColor = formatting.backgroundColor;
      });

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
    // Keep the toolbar open so user can continue making changes
  };

  const handleHeaderClick = () => {
    if (!isEditing) return; // Only allow editing when in edit mode
    setIsEditingText(true);
    setShowToolbar(true);
    setEditValue(displayName);
    
    // Focus the editable element after a short delay
    setTimeout(() => {
      if (editableRef.current) {
        editableRef.current.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(editableRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 50);
  };

  if (isEditingText && isEditing) {
    return (
      <div className="relative mb-2">
        {/* Formatting Toolbar */}
        {showToolbar && (
          <div ref={toolbarRef} className="absolute -top-16 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap items-center gap-1 min-w-max">
            {/* Text Style Controls */}
            <Button
              size="sm"
              variant={formatting.bold ? "default" : "ghost"}
              onClick={() => updateFormatting('bold', !formatting.bold)}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={formatting.italic ? "default" : "ghost"}
              onClick={() => updateFormatting('italic', !formatting.italic)}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={formatting.underline ? "default" : "ghost"}
              onClick={() => updateFormatting('underline', !formatting.underline)}
              className="h-8 w-8 p-0"
            >
              <Underline className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Text Alignment */}
            <Button
              size="sm"
              variant={formatting.textAlign === 'left' ? "default" : "ghost"}
              onClick={() => updateFormatting('textAlign', 'left')}
              className="h-8 w-8 p-0"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={formatting.textAlign === 'center' ? "default" : "ghost"}
              onClick={() => updateFormatting('textAlign', 'center')}
              className="h-8 w-8 p-0"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={formatting.textAlign === 'right' ? "default" : "ghost"}
              onClick={() => updateFormatting('textAlign', 'right')}
              className="h-8 w-8 p-0"
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Font Family */}
            <Select value={formatting.fontFamily} onValueChange={(value) => updateFormatting('fontFamily', value)}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Courier New">Courier</SelectItem>
              </SelectContent>
            </Select>

            {/* Font Size */}
            <Select value={formatting.fontSize} onValueChange={(value) => updateFormatting('fontSize', value)}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10px">10</SelectItem>
                <SelectItem value="12px">12</SelectItem>
                <SelectItem value="14px">14</SelectItem>
                <SelectItem value="16px">16</SelectItem>
                <SelectItem value="18px">18</SelectItem>
                <SelectItem value="20px">20</SelectItem>
                <SelectItem value="24px">24</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Text Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Type className="h-4 w-4" style={{ color: formatting.textColor }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="text-sm font-medium mb-2">Text Color</div>
                <input
                  type="color"
                  value={formatting.textColor}
                  onChange={(e) => updateFormatting('textColor', e.target.value)}
                  className="w-full h-8 rounded border"
                />
              </PopoverContent>
            </Popover>

            {/* Background Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Palette className="h-4 w-4" style={{ color: formatting.backgroundColor }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="text-sm font-medium mb-2">Background Color</div>
                <input
                  type="color"
                  value={formatting.backgroundColor === 'transparent' ? '#ffffff' : formatting.backgroundColor}
                  onChange={(e) => updateFormatting('backgroundColor', e.target.value)}
                  className="w-full h-8 rounded border"
                />
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => updateFormatting('backgroundColor', 'transparent')}
                  className="w-full mt-2"
                >
                  Transparent
                </Button>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Border Controls */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Square className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="text-sm font-medium mb-3">Borders</div>
                
                {/* Individual Border Toggles */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formatting.borderTop}
                      onChange={(e) => updateFormatting('borderTop', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs">Top</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formatting.borderRight}
                      onChange={(e) => updateFormatting('borderRight', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs">Right</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formatting.borderBottom}
                      onChange={(e) => updateFormatting('borderBottom', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs">Bottom</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formatting.borderLeft}
                      onChange={(e) => updateFormatting('borderLeft', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs">Left</span>
                  </label>
                </div>

                {/* Border Weight */}
                <div className="mb-3">
                  <div className="text-xs mb-1">Border Weight</div>
                  <Select value={formatting.borderWeight} onValueChange={(value) => updateFormatting('borderWeight', value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1px">1px</SelectItem>
                      <SelectItem value="2px">2px</SelectItem>
                      <SelectItem value="3px">3px</SelectItem>
                      <SelectItem value="4px">4px</SelectItem>
                      <SelectItem value="5px">5px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Border Color */}
                <div>
                  <div className="text-xs mb-1">Border Color</div>
                  <input
                    type="color"
                    value={formatting.borderColor}
                    onChange={(e) => updateFormatting('borderColor', e.target.value)}
                    className="w-full h-8 rounded border"
                  />
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Apply to All */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyToAll}
              disabled={updateFormattingMutation.isPending}
              className="h-8 px-3"
            >
              <Copy className="h-4 w-4 mr-1" />
              Apply to All
            </Button>
          </div>
        )}

        {/* Editable Header */}
        <div
          ref={editableRef}
          contentEditable={!disableEditing}
          suppressContentEditableWarning
          className="outline-none cursor-text w-full editable-department-header"
          data-department-header="true"
          onMouseDown={(e) => {
            console.log(`🐭 Mouse down on department header ${department}`);
            e.stopPropagation(); // Prevent grid layout drag interference
          }}
          onMouseUp={(e) => {
            console.log(`🐭 Mouse up on department header ${department}`);
            e.stopPropagation(); // Prevent grid layout drag interference
          }}
          style={{
            border: 'none',
            borderRadius: '4px',
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
            padding: '4px',
            minHeight: '24px',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            console.log(`🖱️ Department header clicked for ${department}:`, {
              contentEditable: !disableEditing,
              disableEditing,
              isEditing,
              currentText: editableRef.current?.textContent
            });
            e.stopPropagation(); // Prevent grid layout from handling this
            if (!disableEditing && isEditing) {
              setIsEditingText(true);
              setShowToolbar(true);
              setEditValue(actualDisplayName);
              
              // Focus the editable element after a short delay
              setTimeout(() => {
                if (editableRef.current) {
                  editableRef.current.focus();
                  // Select all text
                  const range = document.createRange();
                  range.selectNodeContents(editableRef.current);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }, 50);
            }
          }}
          onFocus={() => {
            console.log(`🎯 Department header focused for ${department}`);
          }}
          onBlur={(e) => {
            console.log(`🔍 Department header onBlur triggered for ${department}`);
            const newText = e.currentTarget.textContent?.trim() || '';
            setEditValue(newText);
            
            console.log(`🔍 Blur comparison for department ${department}:`, {
              newText,
              actualDisplayName,
              displayName,
              needsUpdate: newText && newText !== actualDisplayName
            });
            
            // Auto-save the name change if it's different from actualDisplayName
            if (newText && newText !== actualDisplayName) {
              console.log(`📝 Triggering department name update: ${department} -> "${newText}"`);
              updateDepartmentNameMutation.mutate({ newName: newText });
            }
          }}
          onInput={(e) => {
            console.log(`⌨️ Department header input for ${department}:`, {
              newText: e.currentTarget.textContent,
              isContentEditable: e.currentTarget.contentEditable
            });
          }}
        >
          {editValue}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 group relative flex items-center">
      {/* Move handle - only visible on hover when editing */}
      {isEditing && (
        <div className="drag-handle opacity-0 group-hover:opacity-100 transition-opacity mr-2 cursor-move flex-shrink-0 flex items-center">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}
      
      <div 
        className={`w-full transition-opacity ${isEditing ? 'cursor-text' : 'cursor-default'}`}
        onClick={isEditing ? () => {
          setIsEditingText(true);
          setShowToolbar(true);
          setEditValue(actualDisplayName);
          
          // Focus the editable element after a short delay
          setTimeout(() => {
            if (editableRef.current) {
              editableRef.current.focus();
              // Select all text
              const range = document.createRange();
              range.selectNodeContents(editableRef.current);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }, 50);
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
          padding: '4px',
          minHeight: '24px',
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: '4px'
        }}
      >
        {actualDisplayName}
      </div>

    </div>
  );
};

export default EditableDepartmentHeader;