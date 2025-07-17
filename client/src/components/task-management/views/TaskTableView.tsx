import { useState } from "react";
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
import { MoreHorizontal, ArrowUp, ArrowDown, ArrowRight, Calendar, User, Flag } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskProperty } from "@shared/schema";

interface TaskTableViewProps {
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskDelete: (id: number) => void;
  onTaskSelect: (task: Task) => void;
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

export function TaskTableView({ 
  tasks, 
  properties, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskSelect 
}: TaskTableViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  const handleSelectTask = (taskId: number, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
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

  const renderPropertyValue = (task: Task, property: TaskProperty) => {
    const value = task.properties?.[property.name];
    
    if (!value) return <span className="text-muted-foreground">—</span>;

    switch (property.type) {
      case 'date':
        return value ? format(new Date(value), 'MMM d, yyyy') : '—';
      case 'checkbox':
        return <Checkbox checked={!!value} disabled />;
      case 'select':
        const option = property.config?.options?.find((opt: any) => opt.value === value);
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
  };

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 border-b">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedTasks.size === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="min-w-[300px]">Task</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24">Priority</TableHead>
            <TableHead className="w-32">Due Date</TableHead>
            
            {/* Custom property columns */}
            {properties.map((property) => (
              <TableHead key={property.id} className="w-32">
                {property.name}
              </TableHead>
            ))}
            
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
            const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
            const PriorityIcon = priorityConfig?.icon || ArrowRight;
            
            return (
              <TableRow 
                key={task.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => onTaskSelect(task)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    {task.content && (
                      <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                        {task.content.replace(/<[^>]*>/g, '')}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-full justify-start">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: statusConfig?.color || '#6B7280' }}
                          />
                          <span className="text-xs">{statusConfig?.label || task.status}</span>
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
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <PriorityIcon 
                      className="h-3 w-3" 
                      style={{ color: priorityConfig?.color || '#6B7280' }} 
                    />
                    <span className="text-xs">{priorityConfig?.label || task.priority}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {task.dueDate ? (
                    <div className="flex items-center space-x-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                
                {/* Custom property values */}
                {properties.map((property) => (
                  <TableCell key={property.id}>
                    {renderPropertyValue(task, property)}
                  </TableCell>
                ))}
                
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(task.createdAt), 'MMM d')}
                  </span>
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
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
  );
}