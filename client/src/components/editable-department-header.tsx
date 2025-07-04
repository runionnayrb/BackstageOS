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
  Copy
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
  isEditing = true
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const [showToolbar, setShowToolbar] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editableRef = useRef<HTMLDivElement>(null);

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
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId
  });

  // Apply saved formatting when loaded
  useEffect(() => {
    if (showSettings && (showSettings as any).departmentFormatting?.[department]) {
      const savedFormatting = (showSettings as any).departmentFormatting[department];
      setFormatting(savedFormatting);
    }
  }, [showSettings, department]);

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
    
    // Full width styling
    style.padding = '8px 12px';
    style.minHeight = '28px';
    style.display = 'block';
    style.width = '100%';
    style.boxSizing = 'border-box';
  };

  const updateFormatting = (key: keyof HeaderFormatting, value: any) => {
    setFormatting(prev => ({ ...prev, [key]: value }));
  };

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
      setIsEditingText(false);
      setShowToolbar(false);
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
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

  const handleSave = () => {
    if (editableRef.current) {
      const newText = editableRef.current.textContent?.trim() || '';
      if (newText === '') {
        toast({
          title: "Invalid name",
          description: "Department name cannot be empty.",
          variant: "destructive",
        });
        return;
      }
      setEditValue(newText);
      
      // Save both name and formatting
      updateDepartmentNameMutation.mutate(newText);
      updateFormattingMutation.mutate({ formatting, applyToAll: false });
    }
  };

  const handleApplyToAll = () => {
    updateFormattingMutation.mutate({ formatting, applyToAll: true });
    // Keep the toolbar open so user can continue making changes
    // setShowToolbar(false); // Removed this line
  };

  const handleCancel = () => {
    setEditValue(displayName);
    setIsEditingText(false);
    setShowToolbar(false);
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
          <div className="absolute -top-16 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap items-center gap-1 min-w-max">
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

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Save/Cancel */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateDepartmentNameMutation.isPending || updateFormattingMutation.isPending}
              className="h-8 px-3"
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={updateDepartmentNameMutation.isPending}
              className="h-8 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {/* Editable Header */}
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none cursor-text w-full editable-department-header"
          data-department-header="true"
          style={{
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            fontWeight: formatting.bold ? 'bold' : 'normal',
            fontStyle: formatting.italic ? 'italic' : 'normal',
            textDecoration: formatting.underline ? 'underline' : 'none',
            textAlign: formatting.textAlign,
            fontFamily: formatting.fontFamily,
            fontSize: formatting.fontSize,
            color: formatting.textColor,
            backgroundColor: formatting.backgroundColor,
            borderTop: formatting.borderTop ? `${formatting.borderWeight} solid ${formatting.borderColor}` : '2px solid #3b82f6',
            borderRight: formatting.borderRight ? `${formatting.borderWeight} solid ${formatting.borderColor}` : '2px solid #3b82f6',
            borderBottom: formatting.borderBottom ? `${formatting.borderWeight} solid ${formatting.borderColor}` : '2px solid #3b82f6',
            borderLeft: formatting.borderLeft ? `${formatting.borderWeight} solid ${formatting.borderColor}` : '2px solid #3b82f6',
            padding: '8px 12px',
            minHeight: '28px',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box'
          }}
          onBlur={(e) => {
            const newText = e.currentTarget.textContent?.trim() || '';
            setEditValue(newText);
          }}
        >
          {editValue}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 group relative">
      <div 
        className={`w-full transition-opacity ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        onClick={handleHeaderClick}
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
          padding: '8px 12px',
          minHeight: '28px',
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: '4px'
        }}
      >
        {displayName}
      </div>
      {isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleHeaderClick}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default EditableDepartmentHeader;