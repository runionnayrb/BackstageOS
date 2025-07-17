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
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUp, ArrowDown, ArrowRight, Calendar, User, Flag, GripVertical } from "lucide-react";
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
}

interface TaskTableViewProps {
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskDelete: (id: number) => void;
  onTaskSelect: (task: Task) => void;
}

interface DraggableColumnHeaderProps {
  column: Column;
  index: number;
  moveColumn: (dragIndex: number, hoverIndex: number) => void;
  resizeColumn: (columnId: string, width: number) => void;
  children: React.ReactNode;
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
      className="relative group select-none px-2 align-top"
      data-handler-id={handlerId}
    >
      <div 
        className="flex items-center justify-between w-full h-full cursor-move"
        onMouseDown={(e) => {
          // Only trigger drag if not on resize handle
          if ((e.target as HTMLElement).classList.contains('resize-handle')) {
            return;
          }
        }}
      >
        <span className="leading-none">{column.title}</span>
      </div>
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
  onTaskSelect 
}: TaskTableViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [selectAllClicked, setSelectAllClicked] = useState(false);
  
  // Function to calculate minimum width based on text length
  const getMinWidthForText = (text: string) => {
    if (!text) return 48; // For empty headers like checkbox and actions
    // Estimate roughly 8px per character + 32px padding
    return Math.max(text.length * 8 + 32, 48);
  };

  // Initialize columns with default layout
  const [columns, setColumns] = useState<Column[]>(() => {
    const defaultColumns: Column[] = [
      { id: 'checkbox', key: 'checkbox', title: '', width: 48, minWidth: 48, type: 'checkbox' },
      { id: 'task', key: 'task', title: 'Task', width: 300, minWidth: getMinWidthForText('Task'), type: 'task' },
      { id: 'status', key: 'status', title: 'Status', width: 128, minWidth: getMinWidthForText('Status'), type: 'status' },
      { id: 'priority', key: 'priority', title: 'Priority', width: 100, minWidth: getMinWidthForText('Priority'), type: 'priority' },
      { id: 'dueDate', key: 'dueDate', title: 'Due Date', width: 128, minWidth: getMinWidthForText('Due Date'), type: 'date' },
    ];
    
    // Add custom property columns
    properties.forEach((property) => {
      defaultColumns.push({
        id: `property-${property.id}`,
        key: property.name,
        title: property.name,
        width: 128,
        minWidth: getMinWidthForText(property.name),
        type: 'property',
        property
      });
    });
    
    // Add created date and actions columns
    defaultColumns.push(
      { id: 'created', key: 'created', title: 'Created', width: 128, minWidth: getMinWidthForText('Created'), type: 'date' },
      { id: 'actions', key: 'actions', title: '', width: 48, minWidth: 48, type: 'actions' }
    );
    
    return defaultColumns;
  });

  const moveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    setColumns((prevColumns) => {
      const dragColumn = prevColumns[dragIndex];
      const newColumns = [...prevColumns];
      newColumns.splice(dragIndex, 1);
      newColumns.splice(hoverIndex, 0, dragColumn);
      return newColumns;
    });
  }, []);

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
    onTaskUpdate(taskId, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    });
  };

  const handlePriorityChange = (taskId: number, newPriority: string) => {
    onTaskUpdate(taskId, { priority: newPriority });
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
            <div className="font-medium leading-none">{task.title}</div>
            {task.content && (
              <div className="text-sm text-muted-foreground truncate max-w-[250px] leading-none">
                {String(task.content).replace(/<[^>]*>/g, '')}
              </div>
            )}
          </div>
        );

      case 'status':
        const taskStatus = task.status || 'not_started';
        const statusConfig = STATUS_CONFIG[taskStatus as keyof typeof STATUS_CONFIG];
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-full justify-start" onClick={(e) => e.stopPropagation()}>
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
        );

      case 'priority':
        const taskPriority = task.priority || 'medium';
        const priorityConfig = PRIORITY_CONFIG[taskPriority as keyof typeof PRIORITY_CONFIG];
        const PriorityIcon = priorityConfig?.icon || ArrowRight;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-full justify-start" onClick={(e) => e.stopPropagation()}>
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
        );

      case 'date':
        if (column.key === 'dueDate') {
          return task.dueDate ? (
            <div className="flex items-center space-x-1 text-sm">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
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
          <Table style={{ minWidth: 'max-content', tableLayout: 'fixed', width: columns.reduce((sum, col) => sum + col.width, 0) }}>
            <TableHeader className="sticky top-0 bg-background z-10 [&_tr]:border-b-0">
              <TableRow className="group !border-b-0">
                {columns.map((column, index) => {
                  if (column.type === 'checkbox') {
                    return (
                      <TableHead key={column.id} style={{ width: column.width }} className="w-12 px-2 align-top">
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
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      style={{ width: column.width }}
                      className="px-2 py-1 align-top"
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