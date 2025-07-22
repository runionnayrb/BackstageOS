import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import { Resizable } from 'react-resizable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Move, 
  RotateCcw, 
  Save, 
  Grid3x3, 
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import EditableDepartmentHeader from './editable-department-header';
import EditableFieldHeading from './editable-field-heading';
import ReportNotesManager from './report-notes-manager';
import AutoNumberingTextarea from './auto-numbering-textarea';
import EditableHeaderFooter from './editable-header-footer';
import { cn } from '@/lib/utils';

// Make ResponsiveGridLayout responsive to container width changes
const ResponsiveGridLayout = WidthProvider(Responsive);

// Type definitions for layout items
export interface LayoutItem {
  id: string;
  type: 'department-header' | 'field-header' | 'notes' | 'empty-space' | 'grouped-section' | 'footer';
  content?: any;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  groupId?: string; // For items that should move together
  children?: LayoutItem[]; // For grouped sections
}

export interface FlexibleLayoutConfiguration {
  items: LayoutItem[];
  gridCols: number;
  gridRows: number;
  gridGap: number;
  containerWidth?: number;
  containerHeight?: number;
}

interface FlexibleLayoutEditorProps {
  projectId: number;
  reportId?: number;
  reportType?: string;
  initialConfiguration?: FlexibleLayoutConfiguration;
  isEditing?: boolean;
  onConfigurationChange?: (config: FlexibleLayoutConfiguration) => void;
  template?: any;
  onTemplateUpdate?: (template: any) => void;
  // Auto-save state from parent
  setIsSaving?: (saving: boolean) => void;
  setLastSaved?: (date: Date) => void;
  // External edit mode control
  externalEditMode?: boolean;
}

// Draggable component wrapper for grid items
const DraggableGridItem: React.FC<{
  item: LayoutItem;
  children: React.ReactNode;
  effectiveEditMode: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ item, children, effectiveEditMode, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div 
      className="relative transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete control overlay inside the element */}
      {effectiveEditMode && isHovered && (
        <div 
          className="absolute top-2 right-2 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-600 hover:text-red-500 hover:bg-red-50 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Drag handle */}
      {effectiveEditMode && (
        <div className="absolute -top-6 right-0 z-40">
          <div className="drag-handle cursor-move p-1 bg-blue-500 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Move className="h-3 w-3" />
          </div>
        </div>
      )}

      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Element</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this element? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Component for rendering different item types
const LayoutItemRenderer: React.FC<{
  item: LayoutItem;
  projectId: number;
  reportId?: number;
  reportType?: string;
  effectiveEditMode: boolean;
  template?: any;
}> = ({ item, projectId, reportId, reportType, effectiveEditMode, template }) => {
  switch (item.type) {
    case 'grouped-section':
      return (
        <div className="w-full h-full p-2 space-y-2">
          {item.children?.map((child, index) => (
            <div key={child.id}>
              <LayoutItemRenderer
                item={child}
                projectId={projectId}
                reportId={reportId}
                reportType={reportType}
                effectiveEditMode={effectiveEditMode}
                template={template}
              />
            </div>
          ))}
        </div>
      );

    case 'department-header':
      return (
        <EditableDepartmentHeader
          projectId={projectId}
          department={item.content?.department || 'scenic'}
          displayName={item.content?.displayName || 'Department'}
          isEditing={effectiveEditMode}
        />
      );
    
    case 'field-header':
      return (
        <EditableFieldHeading
          content={item.content?.label || 'Field Header'}
          onChange={(newContent) => {
            // Handle field header content changes
            console.log('Field header changed:', newContent);
          }}
          projectId={String(projectId)}
        />
      );
    
    case 'notes':
      // Check if this is a Day or Date field - these should not have auto-numbering
      const fieldId = item.content?.fieldId?.toLowerCase();
      const isDateField = fieldId === 'date' || fieldId?.includes('date');
      const isDayField = fieldId === 'day' || fieldId?.includes('day');
      
      if (isDateField || isDayField) {
        // For Date and Day fields, use regular input instead of auto-numbering
        return (
          <div className="w-full h-full">
            {isDateField ? (
              <input 
                type="date"
                className="w-full border-0 shadow-none focus:ring-0 focus:border-0 bg-transparent"
                placeholder="Select date"
              />
            ) : (
              <input 
                type="text"
                className="w-full border-0 shadow-none focus:ring-0 focus:border-0 bg-transparent"
                placeholder="Day will auto-populate"
                readOnly
              />
            )}
          </div>
        );
      }
      
      // For all other fields, use auto-numbering
      return (
        <AutoNumberingTextarea
          projectId={projectId}
          reportId={reportId || undefined}
          department={item.content?.department || item.content?.fieldId}
          placeholder={`1. No ${item.content?.department || item.content?.fieldId || 'department'} notes.`}
          className="w-full h-full resize-none border-0 shadow-none focus:ring-0"
          isEditing={effectiveEditMode}
          template={template}
        />
      );
    
    case 'footer':
      return (
        <EditableHeaderFooter
          content={item.content?.text || 'Click to edit footer'}
          onChange={(newContent: string) => {
            // Handle footer content changes
            console.log('🎯 FOOTER CONTENT CHANGED:', newContent);
          }}
          className="text-sm text-gray-600 text-center"
          projectId={String(projectId)}
          type="footer"
        />
      );

    case 'empty-space':
      return (
        <div className={cn(
          "w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center min-h-[20px] relative",
          effectiveEditMode ? "bg-gray-50" : "bg-transparent border-transparent"
        )}>
          {effectiveEditMode && (
            <div className="text-gray-500 text-sm">Empty Space</div>
          )}
          {/* Invisible clickable area to ensure hover detection works */}
          {effectiveEditMode && (
            <div className="absolute inset-0 bg-transparent" />
          )}
        </div>
      );
    
    default:
      return (
        <div className="p-4 border border-gray-200 rounded bg-gray-100">
          <div className="text-sm text-gray-600">Unknown item type: {item.type}</div>
        </div>
      );
  }
};

export const FlexibleLayoutEditor: React.FC<FlexibleLayoutEditorProps> = ({
  projectId,
  reportId,
  reportType = 'tech',
  initialConfiguration,
  isEditing = true,
  onConfigurationChange,
  template,
  onTemplateUpdate,
  setIsSaving,
  setLastSaved,
  externalEditMode
}) => {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Use external edit mode if provided, otherwise use internal state
  const effectiveEditMode = externalEditMode !== undefined ? externalEditMode : isEditMode;
  
  // Generate layout from template data with grouped sections
  const generateLayoutFromTemplate = useCallback(() => {
    if (!template) {
      // Fallback to basic layout with grouped sections
      return [
        {
          id: 'scenic-section',
          type: 'grouped-section' as const,
          content: { department: 'scenic', displayName: 'Scenic' },
          x: 0, y: 0, w: 6, h: 3,
          minW: 4, minH: 3,
          children: [
            {
              id: 'scenic-header',
              type: 'department-header' as const,
              content: { department: 'scenic', displayName: 'Scenic' },
              x: 0, y: 0, w: 6, h: 1,
              minW: 2, minH: 1
            },
            {
              id: 'scenic-notes',
              type: 'notes' as const,
              content: { department: 'scenic' },
              x: 0, y: 1, w: 6, h: 2,
              minW: 3, minH: 2
            }
          ]
        },
        {
          id: 'lighting-section',
          type: 'grouped-section' as const,
          content: { department: 'lighting', displayName: 'Lighting' },
          x: 6, y: 0, w: 6, h: 3,
          minW: 4, minH: 3,
          children: [
            {
              id: 'lighting-header',
              type: 'department-header' as const,
              content: { department: 'lighting', displayName: 'Lighting' },
              x: 0, y: 0, w: 6, h: 1,
              minW: 2, minH: 1
            },
            {
              id: 'lighting-notes',
              type: 'notes' as const,
              content: { department: 'lighting' },
              x: 0, y: 1, w: 6, h: 2,
              minW: 3, minH: 2
            }
          ]
        }
      ];
    }
    
    const items: LayoutItem[] = [];
    let currentY = 0;
    
    // Add all template fields as grouped sections (full width)
    const templateFields = template.fields
      .filter((field: any) => !field.id.includes('Notes') || field.id === 'notes')
      .sort((a: any, b: any) => a.order - b.order);
    
    templateFields.forEach((field: any, index: number) => {
      // Create grouped section containing field header and notes
      items.push({
        id: `field-section-${field.id}`,
        type: 'grouped-section' as const,
        content: { fieldId: field.id, label: field.label },
        x: 0, y: currentY, w: 12, h: 4,
        minW: 3, minH: 4,
        children: [
          {
            id: `field-header-${field.id}`,
            type: 'field-header' as const,
            content: { fieldId: field.id, label: field.label },
            x: 0, y: 0, w: 12, h: 1,
            minW: 3, minH: 1
          },
          {
            id: `field-notes-${field.id}`,
            type: 'notes' as const,
            content: { fieldId: field.id, placeholder: field.placeholder || "Sample content..." },
            x: 0, y: 1, w: 12, h: 3,
            minW: 3, minH: 2
          }
        ]
      });
      
      currentY += 5;
    });
    
    // Add department sections (wider for better visibility)
    const departments = ['scenic', 'lighting', 'audio', 'video', 'props'];
    departments.forEach((dept, index) => {
      const xPos = (index % 2) * 6; // Alternate between left (0) and right (6)
      const yPos = currentY + Math.floor(index / 2) * 5;
      
      // Create grouped section containing department header and notes
      items.push({
        id: `dept-section-${dept}`,
        type: 'grouped-section' as const,
        content: { department: dept, displayName: dept.charAt(0).toUpperCase() + dept.slice(1) },
        x: xPos, y: yPos, w: 6, h: 4,
        minW: 3, minH: 4,
        children: [
          {
            id: `dept-header-${dept}`,
            type: 'department-header' as const,
            content: { department: dept, displayName: dept.charAt(0).toUpperCase() + dept.slice(1) },
            x: 0, y: 0, w: 6, h: 1,
            minW: 2, minH: 1
          },
          {
            id: `dept-notes-${dept}`,
            type: 'notes' as const,
            content: { department: dept },
            x: 0, y: 1, w: 6, h: 3,
            minW: 3, minH: 2
          }
        ]
      });
    });
    
    // Add footer at the bottom (full width)
    const maxYPosition = Math.max(...items.map(item => item.y + item.h), 0);
    items.push({
      id: 'template-footer',
      type: 'footer' as const,
      content: { text: template.footer || 'Click to edit footer' },
      x: 0, y: maxYPosition + 1, w: 12, h: 2,
      minW: 6, minH: 1,
      isResizable: true
    });
    
    return items;
  }, [template]);

  const [configuration, setConfiguration] = useState<FlexibleLayoutConfiguration>(() => ({
    items: [],
    gridCols: 12,
    gridRows: 20,
    gridGap: 4
  }));
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);
  
  // Auto-save functionality
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved layout configuration
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Auto-save layout configuration mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async (newConfig: FlexibleLayoutConfiguration) => {
      const response = await fetch(`/api/projects/${projectId}/settings/layout-configuration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfiguration: newConfig })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save layout configuration');
      }
      
      return response.json();
    },
    onMutate: () => {
      if (setIsSaving) setIsSaving(true);
    },
    onSuccess: () => {
      if (setIsSaving) setIsSaving(false);
      if (setLastSaved) setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
    },
    onError: (error) => {
      if (setIsSaving) setIsSaving(false);
      toast({
        title: "Auto-save failed",
        description: "Failed to auto-save layout changes",
        variant: "destructive"
      });
      console.error('Failed to auto-save layout:', error);
    }
  });

  // Auto-save function with debouncing
  const autoSaveLayout = useCallback((newConfig: FlexibleLayoutConfiguration) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveLayoutMutation.mutate(newConfig);
    }, 2000);
  }, [saveLayoutMutation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize layout when template is available
  useEffect(() => {
    if (template && configuration.items.length === 0) {
      const initialConfig = {
        items: generateLayoutFromTemplate(),
        gridCols: 12,
        gridRows: 20,
        gridGap: 8
      };
      setConfiguration(initialConfig);
      // Delay showing layout until after dimensions are calculated
      setTimeout(() => setIsLayoutMounted(true), 150);
    }
  }, [template, generateLayoutFromTemplate, configuration.items.length]);

  // Load configuration from settings (with migration to grouped format)
  useEffect(() => {
    if ((showSettings as any)?.layoutConfiguration) {
      const savedConfig = (showSettings as any).layoutConfiguration;
      
      // Check if saved config uses old format (individual items) or new format (grouped sections)
      const hasGroupedSections = savedConfig.items?.some((item: any) => item.type === 'grouped-section');
      
      if (!hasGroupedSections && template) {
        // Migration needed: convert to grouped format
        console.log('Migrating layout to grouped format');
        const newLayoutItems = generateLayoutFromTemplate();
        const newConfig = {
          ...savedConfig,
          items: newLayoutItems
        };
        setConfiguration(newConfig);
        // Save the migrated configuration
        saveLayoutMutation.mutate(newConfig);
        setTimeout(() => setIsLayoutMounted(true), 150);
      } else {
        setConfiguration(savedConfig);
        setTimeout(() => setIsLayoutMounted(true), 150);
      }
    }
  }, [showSettings, template]);

  // Helper function to snap width to quarters (25%, 50%, 75%, 100%)
  const snapToQuarters = useCallback((width: number) => {
    const quarterSnapPoints = [3, 6, 9, 12]; // 25%, 50%, 75%, 100% of 12-column grid
    return quarterSnapPoints.reduce((closest, snap) => 
      Math.abs(width - snap) < Math.abs(width - closest) ? snap : closest
    );
  }, []);

  // Helper function to calculate intelligent widths based on side-by-side positioning
  const calculateIntelligentWidths = useCallback((items: LayoutItem[]) => {
    const processedItems = [...items];
    
    // Group items by Y position (same row)
    const rowGroups = new Map<number, LayoutItem[]>();
    
    processedItems.forEach(item => {
      // Group by Y position, allowing for slight variations in height
      let foundRow = false;
      for (const [rowY, rowItems] of rowGroups.entries()) {
        // Check if item overlaps with this row (Y position overlap)
        if (item.y < rowY + rowItems[0].h && rowY < item.y + item.h) {
          rowItems.push(item);
          foundRow = true;
          break;
        }
      }
      
      if (!foundRow) {
        rowGroups.set(item.y, [item]);
      }
    });
    
    // Process each row
    rowGroups.forEach(rowItems => {
      if (rowItems.length === 1) {
        // Single item in row - make it full width
        const item = rowItems[0];
        const itemIndex = processedItems.findIndex(p => p.id === item.id);
        if (itemIndex !== -1) {
          processedItems[itemIndex] = {
            ...processedItems[itemIndex],
            w: 12, // Full width
            x: 0,  // Start at left edge
            minW: 3,
            maxW: 12
          };
        }
      } else {
        // Multiple items in same row - distribute width equally
        const itemCount = Math.min(rowItems.length, 4); // Max 4 components
        const equalWidth = 12 / itemCount;
        
        // Sort by X position
        rowItems.sort((a, b) => a.x - b.x);
        
        rowItems.forEach((item, index) => {
          const itemIndex = processedItems.findIndex(p => p.id === item.id);
          if (itemIndex !== -1) {
            processedItems[itemIndex] = {
              ...processedItems[itemIndex],
              x: Math.floor(index * equalWidth),
              w: snapToQuarters(equalWidth),
              minW: 3,
              maxW: 12
            };
          }
        });
      }
    });
    
    return processedItems;
  }, [snapToQuarters]);

  // Convert configuration items to react-grid-layout format
  const convertToGridLayouts = useCallback((items: LayoutItem[]) => {
    // Apply intelligent width calculations only in view mode to maintain saved layout in edit mode
    const finalItems = !effectiveEditMode ? calculateIntelligentWidths(items) : items;
    
    const layout = finalItems.map(item => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW || 3, // Default minimum 25% width
      minH: item.minH || 1,
      maxW: item.maxW || 12, // Default maximum 100% width
      maxH: item.maxH,
      isResizable: item.isResizable !== false,
      isDraggable: item.isDraggable !== false,
      static: !effectiveEditMode
    }));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    };
  }, [effectiveEditMode, calculateIntelligentWidths]);

  // Update layouts when configuration changes
  useEffect(() => {
    setLayouts(convertToGridLayouts(configuration.items));
  }, [configuration, convertToGridLayouts]);

  // Handle layout changes from react-grid-layout with auto-save
  // Helper function to prevent overlaps and snap to grid
  const preventOverlaps = useCallback((items: LayoutItem[]) => {
    const processedItems = [...items];
    
    // Sort by Y position first, then X position for processing order
    processedItems.sort((a, b) => a.y - b.y || a.x - b.x);
    
    processedItems.forEach((currentItem, index) => {
      // Check for overlaps with items that come before it
      for (let i = 0; i < index; i++) {
        const otherItem = processedItems[i];
        
        // Check if items overlap
        const xOverlap = currentItem.x < otherItem.x + otherItem.w && 
                        otherItem.x < currentItem.x + currentItem.w;
        const yOverlap = currentItem.y < otherItem.y + otherItem.h && 
                        otherItem.y < currentItem.y + currentItem.h;
        
        if (xOverlap && yOverlap) {
          // Items overlap, move current item to avoid collision
          
          // Try to place it to the right of the other item first
          const rightPosition = otherItem.x + otherItem.w;
          if (rightPosition + currentItem.w <= 12) {
            currentItem.x = rightPosition;
          } else {
            // Not enough space to the right, move below
            currentItem.y = otherItem.y + otherItem.h;
            currentItem.x = 0; // Reset to left edge
          }
        }
      }
    });
    
    return processedItems;
  }, []);

  const handleLayoutChange = (layout: Layout[], allLayouts: Layouts) => {
    if (!effectiveEditMode) return;

    let updatedItems = configuration.items.map(item => {
      const layoutItem = layout.find(l => l.i === item.id);
      if (layoutItem) {
        return {
          ...item,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return item;
    });

    // Prevent overlaps first
    updatedItems = preventOverlaps(updatedItems);
    
    // Then apply intelligent width adjustments after drag/resize (only in edit mode)
    if (effectiveEditMode) {
      updatedItems = calculateIntelligentWidths(updatedItems);
    }

    const newConfig = {
      ...configuration,
      items: updatedItems
    };

    setConfiguration(newConfig);
    onConfigurationChange?.(newConfig);
    
    // Trigger auto-save
    autoSaveLayout(newConfig);
  };

  // Add new item to layout (creates grouped sections)
  const addNewItem = (type: LayoutItem['type']) => {
    if (type === 'department-header') {
      // Create a new department section with header and notes
      const deptName = 'new-dept';
      const newItem: LayoutItem = {
        id: `dept-section-${deptName}-${Date.now()}`,
        type: 'grouped-section',
        content: { department: deptName, displayName: 'New Department' },
        x: 0,
        y: Math.max(...configuration.items.map(i => i.y + i.h), 0),
        w: 6,
        h: 3,
        minW: 4,
        minH: 3,
        children: [
          {
            id: `dept-header-${deptName}-${Date.now()}`,
            type: 'department-header' as const,
            content: { department: deptName, displayName: 'New Department' },
            x: 0, y: 0, w: 6, h: 1,
            minW: 2, minH: 1
          },
          {
            id: `dept-notes-${deptName}-${Date.now()}`,
            type: 'notes' as const,
            content: { department: deptName },
            x: 0, y: 1, w: 6, h: 2,
            minW: 3, minH: 1
          }
        ]
      };
      
      const newConfig = {
        ...configuration,
        items: [...configuration.items, newItem]
      };

      setConfiguration(newConfig);
      onConfigurationChange?.(newConfig);
      
      // Trigger auto-save
      autoSaveLayout(newConfig);
    } else if (type === 'empty-space') {
      // Create a simple empty space item
      const newItem: LayoutItem = {
        id: `empty-space-${Date.now()}`,
        type: 'empty-space',
        content: {},
        x: 0,
        y: Math.max(...configuration.items.map(i => i.y + i.h), 0),
        w: 2,
        h: 2,
        minW: 1,
        minH: 1
      };

      const newConfig = {
        ...configuration,
        items: [...configuration.items, newItem]
      };

      setConfiguration(newConfig);
      onConfigurationChange?.(newConfig);
      
      // Trigger auto-save
      autoSaveLayout(newConfig);
    }
  };

  // Remove item from layout
  const removeItem = (itemId: string) => {
    const newConfig = {
      ...configuration,
      items: configuration.items.filter(item => item.id !== itemId)
    };

    setConfiguration(newConfig);
    onConfigurationChange?.(newConfig);
    
    // Trigger auto-save
    autoSaveLayout(newConfig);
  };

  // Show reset confirmation dialog
  const handleResetClick = () => {
    setShowResetDialog(true);
  };

  // Reset to default layout with grouped sections
  const resetLayout = () => {
    const defaultConfig: FlexibleLayoutConfiguration = {
      items: [
        {
          id: 'scenic-section',
          type: 'grouped-section',
          content: { department: 'scenic', displayName: 'Scenic' },
          x: 0, y: 0, w: 6, h: 3,
          minW: 4, minH: 3,
          children: [
            {
              id: 'scenic-header',
              type: 'department-header',
              content: { department: 'scenic', displayName: 'Scenic' },
              x: 0, y: 0, w: 6, h: 1,
              minW: 2, minH: 1
            },
            {
              id: 'scenic-notes',
              type: 'notes',
              content: { department: 'scenic' },
              x: 0, y: 1, w: 6, h: 2,
              minW: 3, minH: 2
            }
          ]
        },
        {
          id: 'lighting-section',
          type: 'grouped-section',
          content: { department: 'lighting', displayName: 'Lighting' },
          x: 6, y: 0, w: 6, h: 3,
          minW: 4, minH: 3,
          children: [
            {
              id: 'lighting-header',
              type: 'department-header', 
              content: { department: 'lighting', displayName: 'Lighting' },
              x: 0, y: 0, w: 6, h: 1,
              minW: 2, minH: 1
            },
            {
              id: 'lighting-notes',
              type: 'notes',
              content: { department: 'lighting' },
              x: 0, y: 1, w: 6, h: 2,
              minW: 3, minH: 2
            }
          ]
        }
      ],
      gridCols: 12,
      gridRows: 20,
      gridGap: 4
    };

    setConfiguration(defaultConfig);
    onConfigurationChange?.(defaultConfig);
    setShowResetDialog(false); // Close the dialog
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">

        {/* Grid Layout */}
        <div className={cn(
          "bg-white",
          effectiveEditMode && "bg-gray-50/50"
        )}>
          {!isLayoutMounted && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                Loading template...
              </div>
            </div>
          )}
          {isLayoutMounted && (
            <div className="w-full" style={{ width: '1200px', maxWidth: '100%' }}>
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                rowHeight={18}
                width={1200}
                margin={[4, 4]}
                containerPadding={[8, 8]}
                isDraggable={effectiveEditMode}
                isResizable={effectiveEditMode}
                onLayoutChange={handleLayoutChange}
                onResizeStop={handleLayoutChange}
                draggableHandle=".drag-handle"
                useCSSTransforms={true}
                compactType={null}
                preventCollision={true}
                allowOverlap={false}
                resizeHandles={['se']}
                style={{ minHeight: '400px', width: '100%' }}
              >
                {configuration.items.map((item) => (
                  <div key={item.id} className="group" style={{ width: '100%' }}>
                    <DraggableGridItem
                      item={item}
                      effectiveEditMode={effectiveEditMode}
                      onDelete={() => removeItem(item.id)}
                    >
                      <LayoutItemRenderer
                        item={item}
                        projectId={projectId}
                        reportId={reportId}
                        reportType={reportType}
                        effectiveEditMode={effectiveEditMode}
                        template={template}
                      />
                    </DraggableGridItem>
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          )}
        </div>


      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Layout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset to default settings? This will remove all your custom layout changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetLayout} className="bg-red-600 hover:bg-red-700">
              Reset Layout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
};

export default FlexibleLayoutEditor;