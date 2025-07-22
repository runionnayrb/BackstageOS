import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
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

  // External edit mode control
  externalEditMode?: boolean;
}

export interface FlexibleLayoutEditorRef {
  addNewItem: (type: string) => void;
  removeItem: (id: string) => void;
  resetLayout: () => void;
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
  setUserHasEditedLayout?: React.Dispatch<React.SetStateAction<boolean>>;
  onConfigurationChange?: (config: FlexibleLayoutConfiguration) => void;
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
  setUserHasEditedLayout,
  onConfigurationChange
}) => {
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
                selectedDate={selectedDate}
                dayOfWeek={dayOfWeek}
                onDateChange={onDateChange}
                configuration={configuration}
                setConfiguration={setConfiguration}
                setUserHasEditedLayout={setUserHasEditedLayout}
                onConfigurationChange={onConfigurationChange}
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
            
            // Update the configuration and save immediately
            const newConfig = {
              ...configuration,
              items: updatedItems
            };
            
            console.log(`🔗 Updated field relationship: "${currentFieldId}" → "${newFieldId}"`);
            setConfiguration(newConfig);
            setUserHasEditedLayout(true); // Mark that user has made layout changes
            onConfigurationChange?.(newConfig);
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
  externalEditMode
}, ref) => {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  
  // Use external edit mode if provided, otherwise use internal state
  const effectiveEditMode = externalEditMode !== undefined ? externalEditMode : isEditMode;

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
  }, [template]);

  const [configuration, setConfiguration] = useState<FlexibleLayoutConfiguration>(() => ({
    items: [],
    gridCols: 12,
    gridRows: 20,
    gridGap: 4
  }));
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [userHasEditedLayout, setUserHasEditedLayout] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved layout configuration
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Initialize layout when template is available (only on first load)
  useEffect(() => {
    if (template && configuration.items.length === 0 && !initialLoadComplete && !showSettings?.layoutConfiguration) {
      const initialConfig = {
        items: generateLayoutFromTemplate(),
        gridCols: 12,
        gridRows: 20,
        gridGap: 8
      };
      setConfiguration(initialConfig);
      setIsLayoutMounted(true);
    }
  }, [template, generateLayoutFromTemplate, configuration.items.length, initialLoadComplete, showSettings]);

  // Load configuration from settings ONLY on the very first load, never again
  useEffect(() => {
    // Once user has edited layout, NEVER load from database again
    if (userHasEditedLayout) {
      console.log('🛡️ User has edited layout - NEVER loading from database again');
      return;
    }
    
    // Only load if we haven't completed initial load and user hasn't made changes
    if ((showSettings as any)?.layoutConfiguration && !initialLoadComplete) {
      const savedConfig = (showSettings as any).layoutConfiguration;
      console.log('🔄 First-time loading saved layout configuration:', savedConfig);
      
      // Check if saved config uses old format (individual items) or new format (grouped sections)
      const hasGroupedSections = savedConfig.items?.some((item: any) => item.type === 'grouped-section');
      
      if (!hasGroupedSections && template) {
        // Migration needed: convert to grouped format
        console.log('🔄 Migrating layout to grouped format');
        const newLayoutItems = generateLayoutFromTemplate();
        const newConfig = {
          ...savedConfig,
          items: newLayoutItems
        };
        setConfiguration(newConfig);
        setIsLayoutMounted(true);
      } else {
        // Check if saved configuration has fields that no longer exist in template - if so, regenerate
        const templateFieldIds = template.fields.map((f: any) => f.id.toLowerCase());
        const savedFieldIds = savedConfig.items
          ?.filter((item: any) => item.type === 'grouped-section' && item.content?.fieldId)
          ?.map((item: any) => item.content.fieldId.toLowerCase()) || [];
        
        const hasObsoleteFields = savedFieldIds.some(fieldId => !templateFieldIds.includes(fieldId));
        const hasMissingFields = templateFieldIds.some(fieldId => !savedFieldIds.includes(fieldId));
        
        if (hasObsoleteFields || hasMissingFields) {
          console.log('🔄 Template structure mismatch - regenerating layout from template');
          console.log('Template fields:', templateFieldIds);
          console.log('Saved fields:', savedFieldIds);
          const newLayoutItems = generateLayoutFromTemplate();
          const newConfig = {
            ...savedConfig,
            items: newLayoutItems
          };
          setConfiguration(newConfig);
          setUserHasEditedLayout(false); // Allow this regeneration save
          onConfigurationChange?.(newConfig);
          setIsLayoutMounted(true);
        } else {
          console.log('🔄 Using saved configuration directly');
          // Filter out footer items AND date/day fields permanently
          const filteredConfig = {
            ...savedConfig,
            items: savedConfig.items.filter((item: any) => {
              // Remove footer items
              if (item.type === 'footer' || item.id === 'template-footer') {
                return false;
              }
              
              // Remove date and day field sections permanently
              if (item.type === 'grouped-section' && item.content?.fieldId) {
                const fieldId = item.content.fieldId.toLowerCase();
                if (fieldId === 'date' || fieldId === 'day' || fieldId.includes('date') || fieldId.includes('day')) {
                  console.log(`🗑️ Permanently removing ${fieldId} field from layout`);
                  return false;
                }
              }
              
              return true;
            })
          };
          
          // Check if we actually filtered out any items
          const hadFilteredItems = savedConfig.items.length !== filteredConfig.items.length;
          if (hadFilteredItems) {
            console.log('🧹 Filtered out unwanted items from saved configuration - forcing save');
            // Reset user edit flag to allow this cleanup save
            setUserHasEditedLayout(false);
            // Save the filtered configuration to permanently remove unwanted items
            onConfigurationChange?.(filteredConfig);
          }
          
          setConfiguration(filteredConfig);
          setIsLayoutMounted(true);
        }
      }
      setInitialLoadComplete(true);
    } else if (initialLoadComplete || userHasEditedLayout) {
      console.log('🚫 Skipping configuration reload - user changes are protected');
    }
  }, [showSettings, template, initialLoadComplete, userHasEditedLayout, generateLayoutFromTemplate]);

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
      items: finalItems.map(item => ({ id: item.id, x: item.x, y: item.y, w: item.w, h: item.h }))
    });
    
    const layout = finalItems.map(item => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW || 3, // Default minimum 25% width
      minH: item.minH || 1,
      maxW: item.maxW || 12, // Default maximum 100% width
      maxH: item.maxH
      // No isResizable, isDraggable, or static properties - let the grid handle this via global props
    }));
    
    console.log('🔍 Layout items created:', layout.map(l => ({ id: l.i, x: l.x, y: l.y, static: l.static })));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    };
  }, [effectiveEditMode]);

  // Update layouts when configuration changes
  useEffect(() => {
    const newLayouts = convertToGridLayouts(configuration.items);
    setLayouts(newLayouts);
  }, [configuration, convertToGridLayouts]);

  // No need to save on mode exit since we save immediately with every layout change
  // Every change becomes the new permanent template configuration automatically

  // Force layout refresh when switching between edit/view modes - but preserve user changes
  useEffect(() => {
    console.log(`🔄 MODE SWITCH DETECTED - Edit Mode: ${effectiveEditMode}, User Has Edited: ${userHasEditedLayout}`);
    
    // Only refresh layout if user hasn't made any changes - preserve user edits completely
    if (userHasEditedLayout) {
      console.log('🛡️ Preserving user layout changes - no refresh on mode switch');
      console.log('🔍 Current Y positions before mode switch:', configuration.items.map(item => ({ id: item.id, y: item.y })));
      return;
    }
    
    const timer = setTimeout(() => {
      console.log('🔄 Refreshing layout due to mode switch');
      const newLayouts = convertToGridLayouts(configuration.items);
      setLayouts(newLayouts);
    }, 100);
    return () => clearTimeout(timer);
  }, [effectiveEditMode, configuration.items, userHasEditedLayout, convertToGridLayouts]);

  // Handle layout changes from react-grid-layout


  // Track if we're in the middle of a drag operation to prevent constant recalculation
  const [isDragging, setIsDragging] = useState(false);
  const lastLayoutRef = useRef<{[key: string]: {x: number, y: number, w: number, h: number}}>({});

  const handleLayoutChange = (layout: Layout[], allLayouts: Layouts) => {
    if (!effectiveEditMode) {
      console.log('🚨 Layout change triggered in VIEW mode - this may be causing position reversion!');
      console.log('🔍 View mode layout data:', layout.map(l => ({ id: l.i, x: l.x, y: l.y })));
      return;
    }

    let updatedItems = configuration.items.map(item => {
      const layoutItem = layout.find(l => l.i === item.id);
      if (layoutItem) {
        // Log position changes, especially Y changes
        const yChanged = item.y !== layoutItem.y;
        if (yChanged) {
          console.log(`🔥 Y POSITION CHANGE DETECTED for ${item.id}:`, {
            oldY: item.y,
            newY: layoutItem.y,
            oldX: item.x,
            newX: layoutItem.x
          });
        }
        
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

    // No intelligent width calculation needed - users have manual resize controls
    console.log('💡 All layout changes preserved - no automatic recalculation');

    // Update position tracking
    updatedItems.forEach(item => {
      lastLayoutRef.current[item.id] = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      };
    });

    const newConfig = {
      ...configuration,
      items: updatedItems
    };

    console.log('🔧 Layout changed, updating configuration and saving:', { 
      editMode: effectiveEditMode, 
      hasChanges: true,
      itemCount: updatedItems.length
    });

    setConfiguration(newConfig);
    setUserHasEditedLayout(true); // Mark that user has made layout changes
    console.log('👤 User has edited layout - this becomes the new template version');
    
    // Immediately save to database - every change becomes the new truth
    onConfigurationChange?.(newConfig);
    console.log('💾 Layout change saved immediately - this is now the permanent template configuration');
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
    // Apply intelligent width calculation after drag completes, but not after resize
    // The handleLayoutChange will have already handled this appropriately
  };

  // Add new item to layout (creates grouped sections)
  const addNewItem = (type: LayoutItem['type']) => {
    console.log('🆕 Adding new item:', type);
    console.log('🔍 Current configuration before adding:', {
      itemCount: configuration.items.length,
      items: configuration.items.map(item => ({ id: item.id, type: item.type }))
    });
    
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
      
      console.log('🚀 New configuration after adding:', {
        itemCount: newConfig.items.length,
        items: newConfig.items.map(item => ({ id: item.id, type: item.type }))
      });

      setConfiguration(newConfig);
      onConfigurationChange?.(newConfig);
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

  // Expose functions to parent component via ref
  useImperativeHandle(ref, () => ({
    addNewItem,
    removeItem,
    resetLayout
  }), [addNewItem, removeItem, resetLayout]);

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
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                rowHeight={18}
                width={1200}
                margin={[2, 2]}
                containerPadding={[0, 0]}
                isDraggable={effectiveEditMode}
                isResizable={effectiveEditMode}
                onLayoutChange={effectiveEditMode ? handleLayoutChange : undefined}
                onResizeStop={effectiveEditMode ? handleLayoutChange : undefined}
                onDragStart={effectiveEditMode ? handleDragStart : undefined}
                onDragStop={effectiveEditMode ? handleDragStop : undefined}
                draggableHandle=".drag-handle"
                useCSSTransforms={true}
                compactType={null}
                preventCollision={false}
                allowOverlap={true}
                resizeHandles={effectiveEditMode ? ['se'] : []}
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
                        selectedDate={selectedDate}
                        dayOfWeek={dayOfWeek}
                        onDateChange={handleDateChange}
                        configuration={configuration}
                        setConfiguration={setConfiguration}
                        setUserHasEditedLayout={setUserHasEditedLayout}
                        onConfigurationChange={onConfigurationChange}
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