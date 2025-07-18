import { useState, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Resizable } from "react-resizable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { 
  MoreHorizontal, 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  Calendar, 
  User, 
  Flag, 
  GripVertical,
  Type,

  Filter,
  ArrowUpDown,
  Group,

  Lock,
  EyeOff,
  WrapText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskProperty } from "@shared/schema";
import "react-resizable/css/styles.css";

interface Column {
  id: string;
  key: string;
  title: string;
  width: number;
  minWidth: number;
  type: 'checkbox' | 'task' | 'status' | 'priority' | 'date' | 'property' | 'actions';
  property?: TaskProperty;
  isSystemField?: boolean;
}

interface PropertyVisibility {
  id: number;
  name: string;
  type: string;
  icon: any;
  visible: boolean;
  required: boolean;
}

interface TaskTableViewProps {
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskDelete: (id: number) => void;
  onTaskSelect: (task: Task) => void;
  propertyVisibility?: PropertyVisibility[];
  onPropertyReorder?: (properties: PropertyVisibility[]) => void;
}

interface DraggableColumnHeaderProps {
  column: Column;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  resizeColumn: (columnId: string, width: number) => void;
  onColumnAction: (action: string, columnId: string) => void;
  children: React.ReactNode;
}

// Column Context Menu Component
function ColumnContextMenu({ 
  column, 
  onAction, 
  children 
}: { 
  column: Column; 
  onAction: (action: string, columnId: string) => void; 
  children: React.ReactNode; 
}) {
  const canDelete = !column.isSystemField && column.type === 'property';
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => onAction('change-type', column.id)} className="flex items-center gap-2">
          <Type className="w-4 h-4" />
          Change type
          <ChevronRight className="w-4 h-4 ml-auto" />
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={() => onAction('filter', column.id)} className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('sort', column.id)} className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Sort
          <ChevronRight className="w-4 h-4 ml-auto" />
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('group', column.id)} className="flex items-center gap-2">
          <Group className="w-4 h-4" />
          Group
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={() => onAction('freeze', column.id)} className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Freeze
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('hide', column.id)} className="flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          Hide
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('wrap-text', column.id)} className="flex items-center gap-2">
          <WrapText className="w-4 h-4" />
          Wrap text
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={() => onAction('insert-left', column.id)} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Insert left
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('insert-right', column.id)} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          Insert right
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => onAction('duplicate', column.id)} className="flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Duplicate property
        </ContextMenuItem>
        
        {canDelete && (
          <ContextMenuItem 
            onClick={() => onAction('delete', column.id)} 
            className="flex items-center gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete property
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "#6B7280", bgColor: "#F3F4F6" },
  in_progress: { label: "In Progress", color: "#3B82F6", bgColor: "#DBEAFE" },
  completed: { label: "Completed", color: "#10B981", bgColor: "#D1FAE5" },
  blocked: { label: "Blocked", color: "#EF4444", bgColor: "#FEE2E2" },
  cancelled: { label: "Cancelled", color: "#8B5CF6", bgColor: "#EDE9FE" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", icon: ArrowDown, color: "#6B7280" },
  medium: { label: "Medium", icon: ArrowRight, color: "#F59E0B" },
  high: { label: "High", icon: ArrowUp, color: "#EF4444" },
  urgent: { label: "Urgent", icon: Flag, color: "#DC2626" },
};

// Draggable Column Header Component
function DraggableColumnHeader({ 
  column, 
  index, 
  moveColumn, 
  resizeColumn, 
  onColumnAction,
  children 
}: DraggableColumnHeaderProps) {
  const ref = useRef<HTMLTableCellElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'column',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = (clientOffset?.x ?? 0) - hoverBoundingRect.left;
      
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;
      
      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'column',
    item: () => ({ id: column.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  
  drag(drop(ref));



  return (
    <TableHead
      ref={ref}
      style={{ width: column.width, opacity }}
      className="relative group select-none px-2"
      data-handler-id={handlerId}
    >
      <ColumnContextMenu column={column} onAction={onColumnAction}>
        <div 
          className="flex items-center justify-between w-full h-full cursor-move"
          onMouseDown={(e) => {
            // Only trigger drag if not on resize handle
            if ((e.target as HTMLElement).classList.contains('resize-handle')) {
              return;
            }
          }}
        >
          <span>{column.title}</span>
        </div>
      </ColumnContextMenu>
      <div 
        className="resize-handle absolute right-0 top-0 w-2 h-full cursor-col-resize opacity-0 hover:opacity-100 bg-blue-500 hover:bg-blue-600 z-10"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startWidth = column.width;
          
          const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(startWidth + deltaX, column.minWidth);
            resizeColumn(column.id, newWidth);
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
    </TableHead>
  );
}

export function TaskTableView({ 
  tasks, 
  properties, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskSelect,
  propertyVisibility = [],
  onPropertyReorder
}: TaskTableViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [selectAllClicked, setSelectAllClicked] = useState(false);
  
  // Function to calculate minimum width based on text length
  const getMinWidthForText = (text: string) => {
    if (!text) return 48; // For empty headers like checkbox and actions
    // Estimate roughly 8px per character + 32px padding
    return Math.max(text.length * 8 + 32, 48);
  };

  // Initialize columns with default layout and reorder based on property visibility
  const [columns, setColumns] = useState<Column[]>(() => {
    const allColumns: Column[] = [
      { id: 'checkbox', key: 'checkbox', title: '', width: 48, minWidth: 48, type: 'checkbox' },
      { id: 'task', key: 'task', title: 'Task', width: 300, minWidth: getMinWidthForText('Task'), type: 'task', isSystemField: true },
      { id: 'status', key: 'status', title: 'Status', width: 128, minWidth: getMinWidthForText('Status'), type: 'status' },
      { id: 'priority', key: 'priority', title: 'Priority', width: 100, minWidth: getMinWidthForText('Priority'), type: 'priority' },
      { id: 'dueDate', key: 'dueDate', title: 'Due Date', width: 128, minWidth: getMinWidthForText('Due Date'), type: 'date' },
      { id: 'created', key: 'created', title: 'Created', width: 160, minWidth: getMinWidthForText('Created'), type: 'date', isSystemField: true },
      { id: 'updated', key: 'updated', title: 'Updated', width: 160, minWidth: getMinWidthForText('Updated'), type: 'date', isSystemField: true },
    ];
    
    // Add custom property columns
    properties.forEach((property) => {
      allColumns.push({
        id: `property-${property.id}`,
        key: property.name,
        title: property.name,
        width: 128,
        minWidth: getMinWidthForText(property.name),
        type: 'property',
        property
      });
    });
    
    // Add actions column at the end
    allColumns.push({ id: 'actions', key: 'actions', title: '', width: 48, minWidth: 48, type: 'actions' });
    
    // If property visibility is set, reorder columns based on it
    if (propertyVisibility.length > 0) {
      const orderedColumns: Column[] = [
        allColumns.find(col => col.type === 'checkbox')!
      ];
      
      // Add columns in the order of property visibility
      propertyVisibility.forEach(prop => {
        const column = allColumns.find(col => {
          switch (col.type) {
            case 'task': return prop.name === 'Task Name';
            case 'status': return prop.name === 'Status';
            case 'priority': return prop.name === 'Priority';
            case 'date':
              if (col.id === 'dueDate') return prop.name === 'Due Date';
              if (col.id === 'created') return prop.name === 'Created';
              if (col.id === 'updated') return prop.name === 'Updated';
              return false;
            default: return false;
          }
        });
        if (column && !orderedColumns.includes(column)) {
          orderedColumns.push(column);
        }
      });
      
      // Add any remaining columns that weren't in property visibility
      allColumns.forEach(col => {
        if (!orderedColumns.includes(col)) {
          orderedColumns.push(col);
        }
      });
      
      return orderedColumns;
    }
    
    return allColumns;
  });

  // Filter columns based on property visibility
  const visibleColumns = columns.filter(column => {
    // Always show checkbox and actions columns
    if (column.type === 'checkbox' || column.type === 'actions') {
      return true;
    }
    
    // If no property visibility is set, show all columns (backwards compatibility)
    if (propertyVisibility.length === 0) {
      return true;
    }
    
    // For system fields, find corresponding property in visibility settings
    const correspondingProperty = propertyVisibility.find(prop => {
      switch (column.type) {
        case 'task':
          return prop.name === 'Task Name';
        case 'status':
          return prop.name === 'Status';
        case 'priority':
          return prop.name === 'Priority';
        case 'date':
          if (column.id === 'dueDate') return prop.name === 'Due Date';
          if (column.id === 'created') return prop.name === 'Created';
          if (column.id === 'updated') return prop.name === 'Updated';
          return false;
        default:
          return false;
      }
    });
    
    // If we found a corresponding property, use its visibility setting
    if (correspondingProperty) {
      return correspondingProperty.visible;
    }
    
    // For property columns, show if visible (default to true if not found)
    return true;
  });

  const moveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    setColumns((prevColumns) => {
      const dragColumn = prevColumns[dragIndex];
      const newColumns = [...prevColumns];
      newColumns.splice(dragIndex, 1);
      newColumns.splice(hoverIndex, 0, dragColumn);
      
      // Update property visibility order to match column reordering
      if (onPropertyReorder && propertyVisibility.length > 0) {
        // Map column IDs to property names
        const getPropertyNameFromColumn = (column: Column) => {
          switch (column.type) {
            case 'task': return 'Task Name';
            case 'status': return 'Status';
            case 'priority': return 'Priority';
            case 'date':
              if (column.id === 'dueDate') return 'Due Date';
              if (column.id === 'created') return 'Created';
              if (column.id === 'updated') return 'Updated';
              return null;
            default: return null;
          }
        };
        
        // Get the property names for the reordered columns (excluding checkbox and actions)
        const reorderedPropertyNames = newColumns
          .filter(col => col.type !== 'checkbox' && col.type !== 'actions')
          .map(getPropertyNameFromColumn)
          .filter(name => name !== null);
        
        // Reorder the property visibility array to match
        const reorderedProperties = reorderedPropertyNames.map(name => 
          propertyVisibility.find(prop => prop.name === name)
        ).filter(prop => prop !== undefined) as PropertyVisibility[];
        
        // Add any properties that weren't in the column list
        const remainingProperties = propertyVisibility.filter(prop => 
          !reorderedPropertyNames.includes(prop.name)
        );
        
        onPropertyReorder([...reorderedProperties, ...remainingProperties]);
      }
      
      return newColumns;
    });
  }, [propertyVisibility, onPropertyReorder]);

  const resizeColumn = useCallback((columnId: string, width: number) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId ? { ...col, width: Math.max(width, col.minWidth) } : col
      )
    );
  }, []);

  const handleSelectTask = (taskId: number, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
      // If unchecking a task, reset selectAllClicked if it was previously true
      if (selectAllClicked) {
        setSelectAllClicked(false);
      }
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAllClicked(checked);
    if (checked) {
      setSelectedTasks(new Set(tasks.map(task => task.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedProperties = { 
      ...(task?.properties || {}), 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    };
    onTaskUpdate(taskId, { properties: updatedProperties });
  };

  const handlePriorityChange = (taskId: number, newPriority: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedProperties = { 
      ...(task?.properties || {}), 
      priority: newPriority 
    };
    onTaskUpdate(taskId, { properties: updatedProperties });
  };

  const handleColumnAction = (action: string, columnId: string) => {
    console.log(`Column action: ${action} for column: ${columnId}`);
    
    switch (action) {
      case 'change-type':
        // TODO: Implement change type dialog
        console.log('Opening change type dialog for column:', columnId);
        break;

      case 'filter':
        // TODO: Implement column filtering
        console.log('Opening filter for column:', columnId);
        break;
      case 'sort':
        // TODO: Implement column sorting
        console.log('Opening sort options for column:', columnId);
        break;
      case 'group':
        // TODO: Implement column grouping
        console.log('Grouping by column:', columnId);
        break;

      case 'freeze':
        // TODO: Implement column freezing
        console.log('Freezing column:', columnId);
        break;
      case 'hide':
        // TODO: Implement column hiding
        console.log('Hiding column:', columnId);
        break;
      case 'wrap-text':
        // TODO: Implement text wrapping
        console.log('Toggling text wrap for column:', columnId);
        break;
      case 'insert-left':
        // TODO: Implement insert column left
        console.log('Inserting column left of:', columnId);
        break;
      case 'insert-right':
        // TODO: Implement insert column right
        console.log('Inserting column right of:', columnId);
        break;
      case 'duplicate':
        // TODO: Implement duplicate property
        console.log('Duplicating column:', columnId);
        break;
      case 'delete':
        // TODO: Implement delete property
        console.log('Deleting column:', columnId);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const renderCellContent = (task: Task, column: Column) => {
    switch (column.type) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedTasks.has(task.id)}
            onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className={`transition-opacity ${
              selectedTasks.has(task.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
        );

      case 'task':
        return (
          <div className="space-y-1">
            <input
              className="font-medium bg-transparent border-0 outline-none focus:bg-white px-1 -mx-1 min-w-0"
              value={task.title}
              onChange={(e) => onTaskUpdate(task.id, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: `${Math.max(task.title.length * 8 + 16, 100)}px` }}
            />
            {task.content && (
              <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                {String(task.content).replace(/<[^>]*>/g, '')}
              </div>
            )}
          </div>
        );

      case 'status':
        const taskStatus = task.properties?.status || 'not_started';
        const statusConfig = STATUS_CONFIG[taskStatus as keyof typeof STATUS_CONFIG];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-full justify-start hover:bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: statusConfig?.color || '#6B7280' }}
                    />
                    <span className="text-xs">{statusConfig?.label || 'Not Started'}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(task.id, status)}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: config.color }}
                    />
                    <span>{config.label}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );

      case 'priority':
        const taskPriority = task.properties?.priority || 'medium';
        const priorityConfig = PRIORITY_CONFIG[taskPriority as keyof typeof PRIORITY_CONFIG];
        const PriorityIcon = priorityConfig?.icon || ArrowRight;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-full justify-start hover:bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <PriorityIcon 
                      className="h-3 w-3" 
                      style={{ color: priorityConfig?.color || '#6B7280' }} 
                    />
                    <span className="text-xs">{priorityConfig?.label || 'Medium'}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={priority}
                    onClick={() => handlePriorityChange(task.id, priority)}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon 
                        className="h-3 w-3" 
                        style={{ color: config.color }}
                      />
                      <span>{config.label}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );

      case 'date':
        if (column.key === 'dueDate') {
          const dueDate = task.properties?.dueDate;
          return (
            <div onClick={(e) => e.stopPropagation()} className="w-full">
              <input
                type="date"
                value={dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  let date = null;
                  if (e.target.value) {
                    // Create date at noon UTC to avoid timezone issues
                    const selectedDate = new Date(e.target.value + 'T12:00:00.000Z');
                    date = selectedDate.toISOString();
                  }
                  const updatedProperties = { ...(task.properties || {}), dueDate: date };
                  onTaskUpdate(task.id, { properties: updatedProperties });
                }}
                className="w-full h-8 px-2 bg-transparent border-0 outline-none text-sm focus:bg-white focus:border focus:border-blue-200 focus:rounded"
                placeholder="Set due date"
              />
            </div>
          );
        } else if (column.key === 'created') {
          return (
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.createdAt), 'yyyy/MM/dd')} at {format(new Date(task.createdAt), 'h:mm a')}
            </span>
          );
        } else if (column.key === 'updated') {
          return (
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.updatedAt), 'yyyy/MM/dd')} at {format(new Date(task.updatedAt), 'h:mm a')}
            </span>
          );
        } else {
          return (
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.createdAt), 'MMM d')}
            </span>
          );
        }

      case 'property':
        if (!column.property) return <span className="text-muted-foreground">—</span>;
        const value = task.properties?.[column.property.name];
        
        if (!value) return <span className="text-muted-foreground">—</span>;

        switch (column.property.type) {
          case 'date':
            return value ? format(new Date(value), 'MMM d, yyyy') : '—';
          case 'checkbox':
            return <Checkbox checked={!!value} disabled />;
          case 'select':
            const options = column.property.options as any[];
            const option = options?.find((opt: any) => opt.value === value);
            return option ? (
              <Badge variant="outline" style={{ borderColor: option.color, color: option.color }}>
                {option.label}
              </Badge>
            ) : value;
          case 'number':
            return typeof value === 'number' ? value.toLocaleString() : value;
          default:
            return String(value);
        }

      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskSelect(task)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.title)}>
                Copy title
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onTaskDelete(task.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );

      default:
        return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full overflow-auto">
        <div className="overflow-x-auto">
          <Table style={{ minWidth: 'max-content', tableLayout: 'fixed', width: visibleColumns.reduce((sum, col) => sum + col.width, 0) }}>
            <TableHeader className="sticky top-0 bg-background z-10 [&_tr]:border-b-0">
              <TableRow className="group !border-b-0">
                {visibleColumns.map((column, index) => {
                  if (column.type === 'checkbox') {
                    return (
                      <TableHead key={column.id} style={{ width: column.width }} className="w-12 px-2">
                        <Checkbox
                          checked={selectAllClicked && selectedTasks.size === tasks.length && tasks.length > 0}
                          onCheckedChange={handleSelectAll}
                          className={`transition-opacity ${
                            selectedTasks.size > 0 || selectAllClicked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </TableHead>
                    );
                  }
                  
                  return (
                    <DraggableColumnHeader
                      key={column.id}
                      column={column}
                      index={index}
                      moveColumn={moveColumn}
                      resizeColumn={resizeColumn}
                      onColumnAction={handleColumnAction}
                    />
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors duration-150"
                  onClick={() => onTaskSelect(task)}
                >
                  {visibleColumns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      style={{ width: column.width }}
                      className="px-2 py-1"
                    >
                      {renderCellContent(task, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {selectedTasks.size > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">
                {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  selectedTasks.forEach(taskId => {
                    onTaskUpdate(taskId, { status: 'completed', completedAt: new Date().toISOString() });
                  });
                  setSelectedTasks(new Set());
                }}
              >
                Mark Complete
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  selectedTasks.forEach(taskId => onTaskDelete(taskId));
                  setSelectedTasks(new Set());
                }}
              >
                Delete
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedTasks(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}