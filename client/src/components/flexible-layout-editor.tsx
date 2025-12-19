import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  showSettings?: any; // Added to access department names

  // External edit mode control
  externalEditMode?: boolean;

  // Global save system callbacks
  onDepartmentNameChange?: (department: string, newName: string) => void;
  onDepartmentFormattingChange?: (department: string, formatting: any) => void;
  onFieldHeaderFormattingChange?: (formatting: any) => void;
}

export interface FlexibleLayoutEditorRef {
  addNewItem: (type: string) => void;
  removeItem: (id: string) => void;
  resetLayout: () => void;
  getCurrentConfiguration: () => FlexibleLayoutConfiguration | null;
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
  selectedDate?: string;
  dayOfWeek?: string;
  onDateChange?: (date: string) => void;
  configuration?: FlexibleLayoutConfiguration;
  setConfiguration?: React.Dispatch<React.SetStateAction<FlexibleLayoutConfiguration>>;
  onConfigurationChange?: (config: FlexibleLayoutConfiguration) => void;
  showSettings?: any; // Added to access department names
  onDepartmentNameChange?: (department: string, newName: string) => void;
  onDepartmentFormattingChange?: (department: string, formatting: any) => void;
  onFieldHeaderFormattingChange?: (formatting: any) => void;
}> = ({ 
  item, 
  projectId, 
  reportId, 
  reportType, 
  effectiveEditMode, 
  template, 
  selectedDate, 
  dayOfWeek, 
  onDateChange,
  configuration,
  setConfiguration,
  onConfigurationChange,
  showSettings,
  onDepartmentNameChange,
  onDepartmentFormattingChange,
  onFieldHeaderFormattingChange
}) => {
  switch (item.type) {
    case 'grouped-section':
      return (
        <div className="w-full h-full p-2 space-y-2" style={{ width: '100%', minWidth: '100%' }}>
          {item.children?.map((child, index) => (
            <div key={child.id} style={{ width: '100%' }}>
              <LayoutItemRenderer
                item={child}
                projectId={projectId}
                reportId={reportId}
                reportType={reportType}
                effectiveEditMode={effectiveEditMode}
                template={template}
                selectedDate={selectedDate}
                dayOfWeek={dayOfWeek}
                onDateChange={onDateChange}
                configuration={configuration}
                setConfiguration={setConfiguration}
                onConfigurationChange={onConfigurationChange}
                showSettings={showSettings}
                onDepartmentNameChange={onDepartmentNameChange}
                onDepartmentFormattingChange={onDepartmentFormattingChange}
                onFieldHeaderFormattingChange={onFieldHeaderFormattingChange}
              />
            </div>
          ))}
        </div>
      );

    case 'department-header':
      // Use saved department name from showSettings if available, otherwise fall back to displayName
      const department = item.content?.department || 'scenic';
      const savedDepartmentName = showSettings?.departmentNames?.[department];
      const effectiveDisplayName = savedDepartmentName || item.content?.displayName || 'Department';
      
      return (
        <EditableDepartmentHeader
          projectId={projectId}
          department={department}
          displayName={effectiveDisplayName}
          isEditing={effectiveEditMode}
          onNameChange={onDepartmentNameChange}
          onFormattingChange={onDepartmentFormattingChange}
        />
      );
    
    case 'field-header':
      return (
        <EditableFieldHeading
          content={item.content?.label || 'Field Header'}
          isEditing={effectiveEditMode}
          onChange={(newContent) => {
            // Handle field header content changes
            console.log('Field header changed:', newContent);
            
            // Update both the header label and generate new fieldId for relationship tracking
            const newFieldId = newContent.toLowerCase().replace(/[^a-z0-9]/g, '');
            const currentFieldId = item.content?.fieldId;
            
            // Find all items that need to be updated (header and its corresponding notes)
            const updatedItems = configuration.items.map(configItem => {
              if (configItem.type === 'grouped-section' && configItem.children) {
                // Update grouped section with field header and notes
                const updatedChildren = configItem.children.map(child => {
                  if (child.type === 'field-header' && child.content?.fieldId === currentFieldId) {
                    // Update the header
                    return {
                      ...child,
                      content: {
                        ...child.content,
                        label: newContent,
                        fieldId: newFieldId
                      }
                    };
                  } else if (child.type === 'notes' && child.content?.fieldId === currentFieldId) {
                    // Update the corresponding notes field
                    return {
                      ...child,
                      content: {
                        ...child.content,
                        fieldId: newFieldId
                      }
                    };
                  }
                  return child;
                });
                
                // Also update the parent grouped-section if it matches
                if (configItem.content?.fieldId === currentFieldId) {
                  return {
                    ...configItem,
                    content: {
                      ...configItem.content,
                      label: newContent,
                      fieldId: newFieldId
                    },
                    children: updatedChildren
                  };
                }
                
                return {
                  ...configItem,
                  children: updatedChildren
                };
              }
              
              return configItem;
            });
            
            // Update the configuration locally - NO DATABASE SAVE
            const newConfig = {
              ...configuration,
              items: updatedItems
            };
            
            console.log(`🔗 Updated field relationship: "${currentFieldId}" → "${newFieldId}"`);
            setConfiguration(newConfig);
            // REMOVED: onConfigurationChange call that was triggering auto-save corruption
            console.log('🚨 FIELD HEADER CHANGE: Configuration updated locally, NO onConfigurationChange callback called');
          }}
          projectId={String(projectId)}
        />
      );
    
    case 'notes':
      // All fields now use auto-numbering since day/date fields have been removed from templates
      return (
        <AutoNumberingTextarea
          projectId={projectId}
          reportId={reportId || undefined}
          department={item.content?.department || item.content?.fieldId}
          placeholder="1. No notes. Thank you."
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
          effectiveEditMode={effectiveEditMode}
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

export const FlexibleLayoutEditor = forwardRef<FlexibleLayoutEditorRef, FlexibleLayoutEditorProps>(({
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
  externalEditMode,
  showSettings,
  onDepartmentNameChange,
  onDepartmentFormattingChange,
  onFieldHeaderFormattingChange
}, ref) => {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  
  // Use external edit mode if provided, otherwise use internal state
  const effectiveEditMode = externalEditMode !== undefined ? externalEditMode : isEditMode;
  
  // Track previous edit mode state to detect transitions
  const prevEditModeRef = useRef(effectiveEditMode);

  // Helper function to convert date to day of week
  const formatDayOfWeek = useCallback((dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  // Handle date changes and auto-populate day
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    const day = formatDayOfWeek(newDate);
    setDayOfWeek(day);
  }, [formatDayOfWeek]);
  
  // Generate layout from template data with grouped sections
  const generateLayoutFromTemplate = useCallback(() => {
    if (!template) {
      // Use saved department names for fallback layout
      const departmentNames = showSettings?.departmentNames || {
        scenic: 'Scenic',
        lighting: 'Lighting',
        audio: 'Audio',
        props: 'Props',
        costumes: 'Costumes',
        video: 'Video'
      };

      console.log('🎯 Generating fallback layout with saved departments:', departmentNames);

      // Generate layout items from saved department names
      const departmentKeys = Object.keys(departmentNames);
      const items: LayoutItem[] = [];
      
      // Create sections in 2-column layout
      departmentKeys.forEach((deptKey, index) => {
        const displayName = departmentNames[deptKey];
        const isLeftColumn = index % 2 === 0;
        const rowIndex = Math.floor(index / 2);
        
        items.push({
          id: `${deptKey}-section`,
          type: 'grouped-section' as const,
          content: { department: deptKey, displayName: displayName },
          x: isLeftColumn ? 0 : 6,
          y: rowIndex * 3,
          w: 6,
          h: 3,
          minW: 4,
          minH: 3,
          children: [
            {
              id: `${deptKey}-header`,
              type: 'department-header' as const,
              content: { department: deptKey, displayName: displayName },
              x: 0, y: 0, w: 6, h: 1,
              minW: 2, minH: 1
            },
            {
              id: `${deptKey}-notes`,
              type: 'notes' as const,
              content: { department: deptKey },
              x: 0, y: 1, w: 6, h: 2,
              minW: 3, minH: 2
            }
          ]
        });
      });

      console.log('📋 Generated fallback layout items:', items.length);
      return items;
    }
    
    const items: LayoutItem[] = [];
    let currentY = 0;
    
    // Add all template fields as grouped sections (full width) - EXCLUDE date and day fields permanently
    const templateFields = template.fields
      .filter((field: any) => {
        const fieldId = field.id.toLowerCase();
        // Exclude date and day fields permanently
        if (fieldId === 'date' || fieldId === 'day' || fieldId.includes('date') || fieldId.includes('day')) {
          console.log(`🗑️ Skipping ${field.id} field during layout generation - permanently excluded`);
          return false;
        }
        // Include regular fields
        return !field.id.includes('Notes') || field.id === 'notes';
      })
      .sort((a: any, b: any) => a.order - b.order);
    
    templateFields.forEach((field: any, index: number) => {
      // All fields now use the same grouped section structure since date/day fields have been removed
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
    
    return items;
  }, [template, showSettings?.departmentNames]);

  // Simple configuration state
  const [configuration, setConfiguration] = useState<FlexibleLayoutConfiguration>(() => ({
    items: [],
    gridCols: 12,
    gridRows: 20,
    gridGap: 8
  }));
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Simple initialization from template
  useEffect(() => {
    if (!template) return;
    
    console.log('🔄 LAYOUT INIT: Template changed, checking for saved layout data');
    console.log('🔍 Template has layoutConfiguration:', !!template.layoutConfiguration);
    console.log('🔍 Layout items count:', template.layoutConfiguration?.items?.length || 0);
    
    if (template.layoutConfiguration?.items?.length > 0) {
      console.log('✅ LAYOUT INIT: Applying saved layout from database');
      setConfiguration(template.layoutConfiguration);
    } else {
      console.log('🔄 LAYOUT INIT: Generating new layout from template defaults');
      setConfiguration({
        items: generateLayoutFromTemplate(),
        gridCols: 12,
        gridRows: 20,
        gridGap: 8
      });
    }
    
    setIsLayoutMounted(true);
  }, [template, generateLayoutFromTemplate]);

  // NO MORE COMPLEX TRACKING - Keep it simple

  // Helper function to snap width to quarters (25%, 50%, 75%, 100%)
  const snapToQuarters = useCallback((width: number) => {
    const quarterSnapPoints = [3, 6, 9, 12]; // 25%, 50%, 75%, 100% of 12-column grid
    return quarterSnapPoints.reduce((closest, snap) => 
      Math.abs(width - snap) < Math.abs(width - closest) ? snap : closest
    );
  }, []);

  // Removed intelligent width calculation - users now have full manual control via resize handles

  // Convert configuration items to react-grid-layout format
  const convertToGridLayouts = useCallback((items: LayoutItem[]) => {
    // Filter out footer items at render time since footers are handled by template-settings.tsx
    const finalItems = items.filter(item => item.type !== 'footer' && item.id !== 'template-footer');
    
    console.log('🔍 Converting to grid layouts:', { 
      effectiveEditMode, 
      itemCount: finalItems.length, 
      gridCols: configuration.gridCols,
      items: finalItems.map(item => ({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h, actualWidthPercent: `${(item.w / configuration.gridCols) * 100}%` }))
    });
    
    const layout = finalItems.map(item => {
      const isFullWidth = item.w === configuration.gridCols;
      return {
        i: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        // Apply width constraints from item configuration
        minW: item.minW || (isFullWidth ? configuration.gridCols : 1),
        minH: item.minH || 1,
        maxW: item.maxW || (isFullWidth ? configuration.gridCols : undefined),
        maxH: item.maxH,
        // For full-width items, make them static to prevent resizing
        static: isFullWidth && item.minW === configuration.gridCols,
        // Disable resizing for full-width items
        isResizable: isFullWidth ? false : undefined
      };
    });
    
    console.log('🔍 Layout items created:', layout.map(l => ({ id: l.i, x: l.x, y: l.y, static: l.static })));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    };
  }, [effectiveEditMode, configuration.gridCols]);

  // Update layouts when configuration changes
  useEffect(() => {
    console.log('✅ Updating layouts from configuration');
    console.log('🔍 TIMING CHECK: configuration.items.length:', configuration.items?.length || 0);
    console.log('🔍 TIMING CHECK: configuration.items preview:', configuration.items?.slice(0, 3).map(item => ({ id: item.id, x: item.x, y: item.y })));
    
    if (configuration.items && configuration.items.length > 0) {
      const newLayouts = convertToGridLayouts(configuration.items);
      setLayouts(newLayouts);
      console.log('🎯 LAYOUTS UPDATED: Successfully converted', configuration.items.length, 'items to grid layouts');
    } else {
      console.log('⚠️ LAYOUTS SKIPPED: No items in configuration yet');
    }
  }, [configuration, convertToGridLayouts]);

  // Handle layout changes from react-grid-layout


  // Track if we're in the middle of a drag operation to prevent constant recalculation
  const [isDragging, setIsDragging] = useState(false);
  const lastLayoutRef = useRef<{[key: string]: {x: number, y: number, w: number, h: number}}>({});

  const handleLayoutChange = (layout: Layout[], allLayouts: Layouts) => {
    console.log('🔄 LAYOUT CHANGE:', {
      effectiveEditMode,
      externalEditMode,
      layoutItemCount: layout.length,
      firstFewItems: layout.slice(0, 3).map(l => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
    });
    
    // Only process layout changes when in edit mode OR if dragging is enabled
    const isDragEnabled = externalEditMode || effectiveEditMode;
    if (!isDragEnabled) {
      console.log('🚨 BLOCKING layout change - NOT in edit mode (effectiveEditMode:', effectiveEditMode, 'externalEditMode:', externalEditMode, ')');
      return;
    }
    
    console.log('✅ PROCESSING layout change - in edit mode');

    // CRITICAL: Preserve all original item properties and only update position/size
    let updatedItems = configuration.items.map(item => {
      const layoutItem = layout.find(l => l.i === item.id);
      if (layoutItem) {
        console.log(`📦 Updating ${item.id}:`, {
          oldPosition: { x: item.x, y: item.y, w: item.w, h: item.h },
          newPosition: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h }
        });
        
        // PRESERVE ALL ORIGINAL PROPERTIES - only update grid position/size
        return {
          ...item, // Keep all original properties (type, content, children, etc.)
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return item;
    });

    const newConfig = {
      ...configuration,
      items: updatedItems
    };

    console.log('🔧 Layout updated - updating local state and notifying parent');
    
    // Update local state
    setConfiguration(newConfig);
    
    // CRITICAL FIX: Always notify parent of layout changes so they can be saved on Lock
    if (onConfigurationChange) {
      console.log('📤 DRAG-DROP: Notifying parent of layout changes');
      onConfigurationChange(newConfig);
    } else {
      console.log('⚠️ DRAG-DROP: No onConfigurationChange callback available');
    }
    
    console.log('📝 Layout change tracked locally AND sent to parent - will be saved when user clicks Lock');
    
    console.log('✅ CONFIGURATION UPDATED AND SAVED');
  };

  const handleDragStart = (layout: any, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    console.log('🎯 DRAG START HANDLER: Drag operation started', { oldItem, newItem });
    setIsDragging(true);
  };

  const handleDragStop = (layout: any, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    console.log('🎯 DRAG STOP HANDLER: Drag operation completed', { oldItem, newItem });
    setIsDragging(false);
    
    // CRITICAL: Manually trigger layout change after drag completes
    console.log('🔄 FORCING layout change after drag stop');
    // Get current layout from ResponsiveGridLayout
    const currentLayout = layouts.lg || [];
    if (currentLayout.length > 0) {
      console.log('📋 Current layout has', currentLayout.length, 'items - processing layout change');
      handleLayoutChange(currentLayout, layouts);
    } else {
      console.log('⚠️ No current layout available to process');
    }
  };

  // Add new item to layout (creates grouped sections)
  const addNewItem = (type: LayoutItem['type']) => {
    console.log('🆕 Adding new item:', type);
    console.log('🔍 Current configuration before adding:', {
      itemCount: configuration.items.length,
      items: configuration.items.map(item => ({ id: item.id, type: item.type, w: item.w, x: item.x }))
    });
    
    if (type === 'department-header') {
      // Create a new department section at the bottom with full width
      const allItems = configuration.items;
      const lastItemY = allItems.length > 0 ? Math.max(...allItems.map(i => i.y + i.h)) : 0;
      const insertY = lastItemY + 1; // Place at bottom with 1 row spacing
      
      // Generate a unique department key that will be used in departmentNames
      const timestamp = Date.now();
      const deptName = `new-dept-${timestamp}`;
      console.log('📍 Department positioning:', {
        lastItemY,
        insertY,
        allItemsCount: allItems.length,
        gridCols: configuration.gridCols
      });
      
      const newItem: LayoutItem = {
        id: `dept-section-${deptName}-${Date.now()}`,
        type: 'grouped-section',
        content: { department: deptName, displayName: 'New Department' },
        x: 0,
        y: insertY,
        w: 6, // Start with 6 columns like existing departments
        h: 4,
        minW: 3, // Allow resizing with same constraints as existing departments
        minH: 4,
        isResizable: true, // Allow resizing like existing departments
        isDraggable: true, // Allow dragging
        children: [
          {
            id: `dept-header-${deptName}-${Date.now()}`,
            type: 'department-header' as const,
            content: { department: deptName, displayName: 'New Department' },
            x: 0, y: 0, w: 6, h: 1,
            minW: 2, minH: 1, // Allow resizing like existing department headers
            isResizable: true,
            isDraggable: true
          },
          {
            id: `dept-notes-${deptName}-${Date.now()}`,
            type: 'notes' as const,
            content: { department: deptName },
            x: 0, y: 1, w: 6, h: 3,
            minW: 3, minH: 2, // Allow resizing like existing department notes
            isResizable: true,
            isDraggable: true
          }
        ]
      };
      
      const newConfig = {
        ...configuration,
        items: [...configuration.items, newItem]
      };
      
      console.log('🚀 New configuration after adding:', {
        itemCount: newConfig.items.length,
        items: newConfig.items.map(item => ({ id: item.id, type: item.type, w: item.w, x: item.x }))
      });
      console.log('🔍 New item details:', {
        id: newItem.id,
        x: newItem.x, 
        y: newItem.y, 
        w: newItem.w, 
        h: newItem.h,
        minW: newItem.minW,
        maxW: newItem.maxW,
        gridCols: configuration.gridCols,
        isFullWidth: newItem.w === configuration.gridCols,
        percentageWidth: `${(newItem.w / configuration.gridCols) * 100}%`
      });

      setConfiguration(newConfig);
      // DO NOT auto-save - only save when Lock button is clicked
      
      // Update layouts immediately without unmounting
      const newLayouts = convertToGridLayouts(newConfig.items);
      setLayouts(newLayouts);
      console.log('🔄 IMMEDIATE LAYOUT UPDATE after adding department');
      console.log('🔍 Layout for new item:', newLayouts.lg?.find(l => l.i === newItem.id));
      console.log('🔍 All layout items:', newLayouts.lg?.map(l => ({ i: l.i, w: l.w, x: l.x })));
    } else if (type === 'field-header') {
      // Create a new property as grouped section above departments
      const fieldId = 'new-property';
      const newItem: LayoutItem = {
        id: `field-group-${Date.now()}`,
        type: 'grouped-section',
        content: { fieldId: fieldId, label: 'New Property' },
        x: 0,
        y: 0, // Will be positioned correctly by insertion logic
        w: 12, // Explicitly set to 12 instead of using configuration.gridCols
        h: 4,  // Match existing template field height
        // Force full width with no constraints
        minW: undefined,
        maxW: undefined,
        children: [
          {
            id: `field-header-${Date.now()}`,
            type: 'field-header' as const,
            content: { fieldId: fieldId, label: 'New Property' },
            x: 0, y: 0, w: 12, h: 1
          },
          {
            id: `field-notes-${Date.now()}`,
            type: 'notes' as const,
            content: { fieldId: fieldId, placeholder: "Sample content..." },
            x: 0, y: 1, w: 12, h: 3
          }
        ]
      };

      // Find first department section to insert above
      const firstDepartmentIndex = configuration.items.findIndex(
        (item) => item.type === 'grouped-section' && item.content?.department
      );

      const insertIndex = firstDepartmentIndex !== -1
        ? firstDepartmentIndex
        : configuration.items.length;

      console.log('📍 Property positioning:', {
        firstDepartmentIndex,
        insertIndex,
        totalItems: configuration.items.length
      });

      // Insert the new item in the array
      const newItems = [
        ...configuration.items.slice(0, insertIndex),
        newItem,
        ...configuration.items.slice(insertIndex)
      ];

      // Recalculate Y positions to prevent overlapping
      let currentY = 0;
      const spacedItems = newItems.map(item => {
        const adjustedItem = {
          ...item,
          y: currentY
        };
        currentY += item.h + 1; // Add height plus 1 row spacing
        return adjustedItem;
      });

      const newConfig = {
        ...configuration,
        items: spacedItems
      };

      console.log('🚀 Added new property above departments:', {
        newItem: { 
          id: newItem.id, 
          w: newItem.w, 
          h: newItem.h,
          x: newItem.x,
          y: newItem.y,
          minW: newItem.minW,
          maxW: newItem.maxW,
          type: newItem.type
        },
        insertedAt: insertIndex,
        fullWidth: newItem.w === 12,
        gridCols: configuration.gridCols,
        shouldBe100Percent: `${(newItem.w / 12) * 100}%`,
        spacingAdjustment: spacedItems.map(item => ({ id: item.id, y: item.y, h: item.h }))
      });

      setConfiguration(newConfig);
      // DO NOT auto-save - only save when Lock button is clicked
      
      // Force layout recalculation to ensure React Grid Layout processes the new item
      setTimeout(() => {
        const refreshedLayouts = convertToGridLayouts(newConfig.items);
        setLayouts(refreshedLayouts);
        console.log('🔄 Forced layout refresh for new property');
      }, 100);
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
      // DO NOT auto-save - only save when Lock button is clicked
    }
  };

  // Remove item from layout
  const removeItem = (itemId: string) => {
    const newConfig = {
      ...configuration,
      items: configuration.items.filter(item => item.id !== itemId)
    };

    setConfiguration(newConfig);
    // DO NOT auto-save - only save when Lock button is clicked
  };

  // Show reset confirmation dialog
  const handleResetClick = () => {
    setShowResetDialog(true);
  };

  // Reset to default layout with grouped sections using saved department names
  const resetLayout = () => {
    console.log('🔄 Resetting layout with user departments:', showSettings?.departmentNames);
    
    // Use saved department names or fallback to defaults
    const departmentNames = showSettings?.departmentNames || {
      scenic: 'Scenic',
      lighting: 'Lighting',
      audio: 'Audio',
      props: 'Props',
      costumes: 'Costumes',
      video: 'Video'
    };

    // Generate layout items from saved department names
    const departmentKeys = Object.keys(departmentNames);
    const items: LayoutItem[] = [];
    
    // Create sections in 2-column layout
    departmentKeys.forEach((deptKey, index) => {
      const displayName = departmentNames[deptKey];
      const isLeftColumn = index % 2 === 0;
      const rowIndex = Math.floor(index / 2);
      
      items.push({
        id: `${deptKey}-section`,
        type: 'grouped-section',
        content: { department: deptKey, displayName: displayName },
        x: isLeftColumn ? 0 : 6,
        y: rowIndex * 3,
        w: 6,
        h: 3,
        minW: 4,
        minH: 3,
        children: [
          {
            id: `${deptKey}-header`,
            type: 'department-header',
            content: { department: deptKey, displayName: displayName },
            x: 0, y: 0, w: 6, h: 1,
            minW: 2, minH: 1
          },
          {
            id: `${deptKey}-notes`,
            type: 'notes',
            content: { department: deptKey },
            x: 0, y: 1, w: 6, h: 2,
            minW: 3, minH: 2
          }
        ]
      });
    });

    const defaultConfig: FlexibleLayoutConfiguration = {
      items,
      gridCols: 12,
      gridRows: 20,
      gridGap: 4
    };

    console.log('🎯 Generated layout with user departments:', {
      departmentCount: departmentKeys.length,
      departments: departmentKeys,
      itemsGenerated: items.length
    });

    setConfiguration(defaultConfig);
    // DO NOT auto-save - only save when Lock button is clicked
    setShowResetDialog(false); // Close the dialog
  };

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    addNewItem,
    removeItem,
    resetLayout,
    getCurrentConfiguration: () => {
      console.log('🔍 getCurrentConfiguration called');
      console.log('📊 Current configuration positions:', configuration.items.map(item => ({ 
        id: item.id, 
        x: item.x, 
        y: item.y 
      })));
      return configuration;
    }
  }), [addNewItem, removeItem, resetLayout, configuration]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">

        {/* Grid Layout */}
        <div className={cn(
          "bg-white",
          effectiveEditMode && "bg-gray-50/50"
        )}>
          {isLayoutMounted && (
            <div className="w-full" style={{ width: '1200px', maxWidth: '100%' }}>
              <ResponsiveGridLayout
                className="layout react-grid-layout-container layout-editor"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 1200, sm: 1200, xs: 1200, xxs: 1200 }}
                cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                rowHeight={18}
                width={1200}
                margin={[2, 2]}
                containerPadding={[0, 0]}
                isDraggable={effectiveEditMode}
                isResizable={effectiveEditMode}
                onLayoutChange={(layout, allLayouts) => {
                  console.log('🔄 LAYOUT CHANGE: ResponsiveGridLayout detected layout change', { 
                    layoutItemCount: layout.length, 
                    effectiveEditMode,
                    firstItem: layout[0] 
                  });
                  if (effectiveEditMode) {
                    handleLayoutChange(layout, allLayouts);
                  } else {
                    console.log('⚠️ Layout change ignored - not in edit mode');
                  }
                }}
                onResizeStop={(layout, allLayouts) => {
                  console.log('🔄 RESIZE STOP: ResponsiveGridLayout detected resize', { 
                    layoutItemCount: layout.length, 
                    effectiveEditMode 
                  });
                  if (effectiveEditMode) {
                    handleLayoutChange(layout, allLayouts);
                  }
                }}
                onDragStart={(layout, oldItem, newItem, placeholder, e, element) => {
                  console.log('🔥 ResponsiveGridLayout onDragStart fired!', { oldItem, effectiveEditMode });
                  if (effectiveEditMode) handleDragStart(layout, oldItem, newItem, placeholder, e, element);
                }}
                onDragStop={(layout, oldItem, newItem, placeholder, e, element) => {
                  console.log('🔥 ResponsiveGridLayout onDragStop fired!', { newItem, effectiveEditMode });
                  if (effectiveEditMode) handleDragStop(layout, oldItem, newItem, placeholder, e, element);
                }}
                draggableHandle={effectiveEditMode ? undefined : ".drag-handle"}
                useCSSTransforms={false}
                compactType={null}
                preventCollision={false}
                allowOverlap={true}
                resizeHandles={effectiveEditMode ? ['se'] : []}
                style={{ minHeight: '800px', width: '100%' }}
              >
                {configuration.items.map((item) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "group", 
                      item.w === configuration.gridCols ? "full-width" : "",
                      item.type === 'grouped-section' && item.content?.department ? "department-section" : "",
                      item.id.includes('dept-section') ? "dept-section-item" : ""
                    )} 
                    style={{ 
                      width: item.w === configuration.gridCols ? '100%' : `${(item.w / configuration.gridCols) * 100}%`,
                      position: 'relative',
                      left: item.w === configuration.gridCols ? '0px' : undefined
                    }}
                    data-width={item.w}
                    data-grid-cols={configuration.gridCols}
                    data-is-full-width={item.w === configuration.gridCols}
                  >
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
                        selectedDate={selectedDate}
                        dayOfWeek={dayOfWeek}
                        onDateChange={handleDateChange}
                        configuration={configuration}
                        setConfiguration={setConfiguration}
                        onConfigurationChange={onConfigurationChange}
                        showSettings={showSettings}
                        onDepartmentNameChange={onDepartmentNameChange}
                        onDepartmentFormattingChange={onDepartmentFormattingChange}
                        onFieldHeaderFormattingChange={onFieldHeaderFormattingChange}
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
});

export default FlexibleLayoutEditor;