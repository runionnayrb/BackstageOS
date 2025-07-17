import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Calendar, User, Flag, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskProperty } from "@shared/schema";

interface TaskKanbanViewProps {
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskDelete: (id: number) => void;
  onTaskSelect: (task: Task) => void;
}

const STATUS_COLUMNS = [
  { id: "not_started", title: "Not Started", color: "#6B7280" },
  { id: "in_progress", title: "In Progress", color: "#3B82F6" },
  { id: "completed", title: "Completed", color: "#10B981" },
  { id: "blocked", title: "Blocked", color: "#EF4444" },
];

const PRIORITY_CONFIG = {
  low: { label: "Low", icon: ArrowDown, color: "#6B7280" },
  medium: { label: "Medium", icon: ArrowRight, color: "#F59E0B" },
  high: { label: "High", icon: ArrowUp, color: "#EF4444" },
  urgent: { label: "Urgent", icon: Flag, color: "#DC2626" },
};

interface TaskCardProps {
  task: Task;
  properties: TaskProperty[];
  onTaskSelect: (task: Task) => void;
  onTaskDelete: (id: number) => void;
}

function TaskCard({ task, properties, onTaskSelect, onTaskDelete }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
  const PriorityIcon = priorityConfig?.icon || ArrowRight;

  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <Card 
      ref={drag}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onTaskSelect(task)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm leading-5 line-clamp-2">{task.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onTaskSelect(task);
              }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(task.title);
                }}
              >
                Copy title
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskDelete(task.id);
                }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Description preview */}
        {task.content && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.content.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* Custom properties */}
        {properties.length > 0 && (
          <div className="space-y-1">
            {properties.slice(0, 2).map((property) => {
              const value = task.properties?.[property.name];
              if (!value) return null;

              return (
                <div key={property.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{property.name}:</span>
                  <span className="font-medium">
                    {property.type === 'date' && value 
                      ? format(new Date(value), 'MMM d')
                      : String(value)
                    }
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Priority */}
            <div className="flex items-center space-x-1">
              <PriorityIcon 
                className="h-3 w-3" 
                style={{ color: priorityConfig?.color || '#6B7280' }} 
              />
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
              </div>
            )}
          </div>

          {/* Assignee */}
          {task.properties?.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {String(task.properties.assignee).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  column: { id: string; title: string; color: string };
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskDelete: (id: number) => void;
  onTaskSelect: (task: Task) => void;
}

function KanbanColumn({ 
  column, 
  tasks, 
  properties, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskSelect 
}: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'task',
    drop: (item: { id: number; status: string }) => {
      if (item.status !== column.id) {
        onTaskUpdate(item.id, { 
          status: column.id,
          completedAt: column.id === 'completed' ? new Date().toISOString() : null
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const columnTasks = tasks.filter(task => task.status === column.id);

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-medium">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {columnTasks.length}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div 
        ref={drop}
        className={`flex-1 p-4 space-y-3 overflow-y-auto ${
          isOver ? 'bg-muted/50' : ''
        }`}
      >
        {columnTasks.map((task) => (
          <div key={task.id} className="group">
            <TaskCard 
              task={task}
              properties={properties}
              onTaskSelect={onTaskSelect}
              onTaskDelete={onTaskDelete}
            />
          </div>
        ))}
        
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No {column.title.toLowerCase()} tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskKanbanView({ 
  tasks, 
  properties, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskSelect 
}: TaskKanbanViewProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full grid grid-cols-4 gap-1 bg-muted/20">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="bg-background border-r last:border-r-0">
            <KanbanColumn
              column={column}
              tasks={tasks}
              properties={properties}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onTaskSelect={onTaskSelect}
            />
          </div>
        ))}
      </div>
    </DndProvider>
  );
}