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
}

// Draggable component wrapper for grid items
const DraggableGridItem: React.FC<{
  item: LayoutItem;
  children: React.ReactNode;
  isEditMode: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ item, children, isEditMode, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit controls overlay */}
      {isEditMode && isHovered && (
        <div className="absolute -top-8 left-0 z-50 flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs bg-white border-blue-300"
            onClick={onEdit}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs bg-white border-red-300 text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {/* Drag handle */}
      {isEditMode && (
        <div className="absolute -top-6 right-0 z-40">
          <div className="drag-handle cursor-move p-1 bg-blue-500 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Move className="h-3 w-3" />
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

// Component for rendering different item types
const LayoutItemRenderer: React.FC<{
  item: LayoutItem;
  projectId: number;
  reportId?: number;
  reportType?: string;
  isEditMode: boolean;
}> = ({ item, projectId, reportId, reportType, isEditMode }) => {
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
                isEditMode={isEditMode}
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
          isEditing={isEditMode}
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
      return reportId ? (
        <ReportNotesManager
          reportId={reportId}
          projectId={projectId}
          reportType={reportType || 'tech'}
          department={item.content?.department}
          isEditing={isEditMode}
        />
      ) : (
        <div className="p-4 border border-gray-200 rounded bg-gray-50">
          <div className="text-sm text-gray-600 italic">
            Save report to add notes...
          </div>
        </div>
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
          "w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center",
          isEditMode ? "bg-gray-50" : "bg-transparent border-transparent"
        )}>
          {isEditMode && (
            <div className="text-gray-500 text-sm">Empty Space</div>
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
  onTemplateUpdate
}) => {
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [layouts, setLayouts] = useState<Layouts>({});
  
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
        minW: 8, minH: 4,
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
        minW: 5, minH: 4,
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
    gridGap: 8
  }));
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved layout configuration
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Save layout configuration mutation (declared early to avoid dependency issues)
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
    onSuccess: () => {
      toast({
        title: "Layout saved",
        description: "Your layout configuration has been saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving layout",
        description: "Failed to save the layout configuration",
        variant: "destructive"
      });
      console.error('Failed to save layout:', error);
    }
  });

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

  // Convert configuration items to react-grid-layout format
  const convertToGridLayouts = useCallback((items: LayoutItem[]) => {
    const layout = items.map(item => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: Math.min(item.minW || 1, item.w), // Ensure minW doesn't exceed actual width
      minH: Math.min(item.minH || 1, item.h), // Ensure minH doesn't exceed actual height
      maxW: item.maxW && item.maxW > item.w ? item.maxW : undefined, // Only set maxW if it's larger than current width
      maxH: item.maxH && item.maxH > item.h ? item.maxH : undefined, // Only set maxH if it's larger than current height
      isResizable: item.isResizable !== false,
      isDraggable: item.isDraggable !== false,
      static: !isEditMode
    }));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    };
  }, [isEditMode]);

  // Update layouts when configuration changes
  useEffect(() => {
    setLayouts(convertToGridLayouts(configuration.items));
  }, [configuration, convertToGridLayouts]);

  // Handle layout changes from react-grid-layout (simplified for grouped sections)
  const handleLayoutChange = (layout: Layout[], allLayouts: Layouts) => {
    if (!isEditMode) return;

    const updatedItems = configuration.items.map(item => {
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

    const newConfig = {
      ...configuration,
      items: updatedItems
    };

    setConfiguration(newConfig);
    onConfigurationChange?.(newConfig);
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
      gridGap: 8
    };

    setConfiguration(defaultConfig);
    onConfigurationChange?.(defaultConfig);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Toolbar */}
        {isEditing && (
          <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                {isEditMode ? 'Lock Layout' : 'Edit Layout'}
              </Button>
              
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNewItem('department-header')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Header
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNewItem('notes')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Notes
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addNewItem('empty-space')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Space
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetLayout}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => saveLayoutMutation.mutate(configuration)}
                    disabled={saveLayoutMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveLayoutMutation.isPending ? 'Saving...' : 'Save Layout'}
                  </Button>
                </>
              )}
              
              <Badge variant="outline" className="text-xs">
                <Grid3x3 className="h-3 w-3 mr-1" />
                {configuration.items.length} items
              </Badge>
            </div>
          </div>
        )}

        {/* Grid Layout */}
        <div className={cn(
          "border rounded-lg p-4 bg-white",
          isEditMode && "bg-gray-50/50"
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
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                width={1200}
                margin={[8, 8]}
                containerPadding={[0, 0]}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".drag-handle"
                useCSSTransforms={false}
                compactType="vertical"
                preventCollision={false}
                style={{ minHeight: '400px', width: '100%' }}
              >
                {configuration.items.map((item) => (
                  <div key={item.id} className="group" style={{ width: '100%' }}>
                    <DraggableGridItem
                      item={item}
                      isEditMode={isEditMode}
                      onEdit={() => {
                        // Handle edit action
                        console.log('Edit item:', item.id);
                      }}
                      onDelete={() => removeItem(item.id)}
                    >
                      <LayoutItemRenderer
                        item={item}
                        projectId={projectId}
                        reportId={reportId}
                        reportType={reportType}
                        isEditMode={isEditMode}
                      />
                    </DraggableGridItem>
                  </div>
                ))}
              </ResponsiveGridLayout>
            </div>
          )}
        </div>

        {/* Layout Info */}
        {isEditMode && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            <div className="flex justify-between">
              <span>Grid: {configuration.gridCols} columns × {configuration.gridRows} rows</span>
              <span>Gap: {configuration.gridGap}px</span>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default FlexibleLayoutEditor;