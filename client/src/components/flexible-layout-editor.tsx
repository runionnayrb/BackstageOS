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

const COLS = 6; // keep consistent with your visual design

type CanonItem = {
  id: string;
  x: number; y: number; w: number; h: number;
  type?: string;
  // include any extra domain fields you attach to each block
  [key: string]: any;
};

// Canonical config -> RGL layout array
function toRglLayout(items: CanonItem[]) {
  return items.map(it => ({
    i: it.id,
    x: Number(it.x), y: Number(it.y),
    w: Number(it.w), h: Number(it.h),
    static: false
  }));
}

// RGL layout + item meta -> canonical config
function fromRglLayout(layout: any[], metaById: Record<string, Partial<CanonItem>> = {}) {
  const items: CanonItem[] = layout.map((n: any, idx: number) => {
    const meta = metaById[n.i] || {};
    return {
      id: String(n.i),
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : idx,
      w: Number.isFinite(n.w) ? n.w : 6,
      h: Number.isFinite(n.h) ? n.h : 1,
      type: meta.type as string | undefined,
      ...meta
    };
  });
  // stable order by y then x
  items.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return { items };
}

// Layout normalization helper (duplicated from template-settings.tsx)
function normalizeLayout(config: any) {
  if (!config || !Array.isArray(config.items)) return config;
  const items = config.items.map((it: any, idx: number) => {
    const x = typeof it.x === "string" ? parseInt(it.x, 10) : Number.isFinite(it.x) ? it.x : 0;
    const y = typeof it.y === "string" ? parseInt(it.y, 10) : Number.isFinite(it.y) ? it.y : idx;
    const w = typeof it.w === "string" ? parseInt(it.w, 10) : Number.isFinite(it.w) ? it.w : 6;
    const h = typeof it.h === "string" ? parseInt(it.h, 10) : Number.isFinite(it.h) ? it.h : 1;
    const stableId =
      it.id ||
      it.i ||
      `${it.type || "item"}:${it.key || it.fieldId || it.department || idx}`;
    return { ...it, id: stableId, x, y, w, h };
  });
  items.sort((a: any, b: any) => (a.y - b.y) || (a.x - b.x));
  return { ...config, items };
}

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
            
            // Update the configuration and save immediately
            const newConfig = {
              ...configuration,
              items: updatedItems
            };
            
            console.log(`🔗 Updated field relationship: "${currentFieldId}" → "${newFieldId}"`);
            setConfiguration(newConfig);
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
  externalEditMode,
  showSettings,
  onDepartmentNameChange,
  onDepartmentFormattingChange,
  onFieldHeaderFormattingChange
}, ref) => {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  
  // Use external edit mode if provided, otherwise use internal state
  const effectiveEditMode = externalEditMode !== undefined ? externalEditMode : isEditMode;
  
  // Track previous edit mode state to detect transitions
  const prevEditModeRef = useRef(effectiveEditMode);
  
  // Controlled layout state and meta tracking
  const metaByIdRef = useRef<Record<string, any>>({});
  
  const [layout, setLayout] = useState<any[]>(
    toRglLayout((template?.layoutConfiguration?.items || []).map((it: any) => ({
      id: it.id || it.i,
      x: +it.x, y: +it.y, w: +it.w, h: +it.h, type: it.type
    })))
  );
  
  // keep in sync with props
  useEffect(() => {
    const items = (template?.layoutConfiguration?.items || []).map((it: any) => ({
      id: it.id || it.i,
      x: +it.x, y: +it.y, w: +it.w, h: +it.h, type: it.type,
      ...it // preserve other fields like department, fieldId, etc
    }));
    const next = toRglLayout(items);
    setLayout(next);
    // store meta for round trip
    metaByIdRef.current = items.reduce((acc: any, it: any) => {
      acc[it.id] = { type: it.type, ...it };
      return acc;
    }, {});
  }, [template?.layoutConfiguration]);

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

  // Configuration state - start with empty and let useEffect handle initialization
  const [configuration, setConfiguration] = useState<FlexibleLayoutConfiguration>({
    items: [],
    gridCols: 12,
    gridRows: 20,
    gridGap: 4
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Component lifecycle logging
  useEffect(() => {
    console.log('🚀 FlexibleLayoutEditor MOUNTED');
    console.log('📊 Initial template:', template ? 'Has template' : 'No template');
    console.log('📊 Initial layoutConfiguration:', template?.layoutConfiguration ? 
      `Has ${template.layoutConfiguration.items?.length} items` : 'None');
    
    return () => {
      console.log('🛑 FlexibleLayoutEditor UNMOUNTING');
    };
  }, []);
  
  // Initialize layout from template or showSettings
  useEffect(() => {
    console.log('🔄 Initialization effect triggered');
    console.log('Template:', template ? 'exists' : 'null');
    console.log('ShowSettings:', showSettings ? 'exists' : 'null');
    console.log('Has initialized:', hasInitialized);
    
    // Look for layout configuration in showSettings first (for tech templates), then template
    const savedLayout = showSettings?.layoutConfiguration || template?.layoutConfiguration;
    console.log('Saved layout config:', savedLayout?.items?.length || 0, 'items');
    
    if (!template) {
      console.log('⏳ Waiting for template...');
      return;
    }
    
    if (hasInitialized) {
      console.log('✅ Already initialized, skipping');
      return;
    }
    
    // If we have a saved layout, use it
    if (savedLayout?.items?.length > 0) {
      console.log('🎯 Using saved layout:', savedLayout.items.length, 'items');
      console.log('First item:', savedLayout.items[0]);
      setConfiguration(savedLayout);
      setHasInitialized(true);
    } 
    // Otherwise generate new layout
    else {
      console.log('🎯 Generating new layout from template');
      const newItems = generateLayoutFromTemplate();
      console.log('Generated items:', newItems.length);
      const config = {
        items: newItems,
        gridCols: 12,
        gridRows: 20,
        gridGap: 8
      };
      setConfiguration(config);
      setHasInitialized(true);
    }
  }, [template, showSettings, hasInitialized]); // Added showSettings to dependencies

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
  }, [effectiveEditMode]);

  // Update layouts when configuration changes
  useEffect(() => {
    console.log('✅ Updating layouts from configuration');
    const newLayouts = convertToGridLayouts(configuration.items);
    setLayouts(newLayouts);
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
      firstFewItems: layout.slice(0, 3).map(l => ({ id: l.i, x: l.x, y: l.y }))
    });
    
    if (!effectiveEditMode) {
      console.log('🚨 BLOCKING layout change - NOT in edit mode');
      console.log('🔍 View mode layout data:', layout.map(l => ({ id: l.i, x: l.x, y: l.y })));
      return;
    }
    
    console.log('✅ PROCESSING layout change - in edit mode');

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

    // UPDATE STATE AND SAVE IMMEDIATELY
    setConfiguration(newConfig);
    
    // IMMEDIATELY save to database via callback
    if (onConfigurationChange) {
      console.log('💾 SAVING CHANGES IMMEDIATELY TO DATABASE');
      onConfigurationChange(newConfig);
    }
    
    // Update layouts to prevent snap-back
    const newLayouts = convertToGridLayouts(newConfig.items);
    setLayouts(newLayouts);
    
    console.log('✅ CONFIGURATION UPDATED AND SAVED');
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
      onConfigurationChange?.(newConfig);
      
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
      onConfigurationChange?.(newConfig);
      
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

  // expose freshest configuration to parent
  useImperativeHandle(ref, () => ({
    getCurrentConfiguration: () => {
      return fromRglLayout(layout, metaByIdRef.current);
    },
    addNewItem: (type: string) => {
      const id = `${type}:${Date.now()}`;
      const newNode = { i: id, x: 0, y: layout.length ? Math.max(...layout.map(n => n.y + n.h)) : 0, w: 6, h: 1, static: false };
      metaByIdRef.current[id] = { type };
      const next = [...layout, newNode];
      setLayout(next);
      onConfigurationChange?.(fromRglLayout(next, metaByIdRef.current));
    },
    removeItem: (id: string) => {
      const next = layout.filter(n => n.i !== id);
      delete metaByIdRef.current[id];
      setLayout(next);
      onConfigurationChange?.(fromRglLayout(next, metaByIdRef.current));
    },
    resetLayout: () => {
      const next: any[] = [];
      metaByIdRef.current = {};
      setLayout(next);
      onConfigurationChange?.({ items: [] });
    }
  }), [layout, onConfigurationChange]);

  // build a single canonical layout for all breakpoints
  const layouts = {
    lg: layout,
    md: layout,
    sm: layout,
    xs: layout,
    xxs: layout
  };

  // Helper function to render grid items by ID and meta
  const renderGridItemById = useCallback((id: string, meta: any) => {
    const item = {
      id,
      type: meta?.type || 'empty-space',
      content: meta || {},
      x: 0, y: 0, w: 6, h: 1
    };
    
    return renderItemByType(item, {
      effectiveEditMode,
      onDepartmentNameChange,
      onDepartmentFormattingChange,
      onFieldHeaderFormattingChange,
      projectId,
      showSettings
    });
  }, [effectiveEditMode, onDepartmentNameChange, onDepartmentFormattingChange, onFieldHeaderFormattingChange, projectId, showSettings]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">

        {/* Controlled Grid Layout */}
        <div className={cn(
          "bg-white",
          effectiveEditMode && "bg-gray-50/50"
        )}>
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            cols={{ lg: COLS, md: COLS, sm: COLS, xs: COLS, xxs: COLS }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={30}
            compactType={null}
            preventCollision={true}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            isDraggable={!!effectiveEditMode}
            isResizable={!!effectiveEditMode}
            onLayoutChange={(curLayout /*, allLayouts */) => {
              setLayout(curLayout);
              const cfg = fromRglLayout(curLayout, metaByIdRef.current);
              onConfigurationChange?.(cfg);
            }}
          >
            {layout.map(node => {
              const id = node.i;
              return (
                <div key={id} data-grid={node}>
                  {/* The inner component for department header, field header, etc */}
                  {renderGridItemById(id, metaByIdRef.current[id])}
                </div>
              );
            })}
          </ResponsiveGridLayout>
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