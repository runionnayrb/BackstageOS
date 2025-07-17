import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Calendar, User, Tag, Clock } from "lucide-react";
import { TaskTableView } from "./views/TaskTableView";
import { TaskKanbanView } from "./views/TaskKanbanView";
import { TaskCalendarView } from "./views/TaskCalendarView";
import { TaskDialog } from "./TaskDialog";
import { apiRequest } from "@/lib/queryClient";
import type { TaskDatabase, TaskView, Task, TaskProperty } from "@shared/schema";

interface TaskBoardProps {
  database: TaskDatabase;
  view?: TaskView;
}

export function TaskBoard({ database, view }: TaskBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  // Fetch tasks for this database
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/task-databases', database.id, 'tasks'],
    queryFn: () => apiRequest(`/api/task-databases/${database.id}/tasks`)
  });

  // Fetch properties for this database
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['/api/task-databases', database.id, 'properties'],
    queryFn: () => apiRequest(`/api/task-databases/${database.id}/properties`)
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/task-databases/${database.id}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
      setIsCreateTaskOpen(false);
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-databases', database.id, 'tasks'] });
    }
  });

  // Filter tasks based on search query
  const filteredTasks = tasks.filter((task: Task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.content && task.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateTask = (data: any) => {
    createTaskMutation.mutate(data);
  };

  const handleUpdateTask = (id: number, data: any) => {
    updateTaskMutation.mutate({ id, data });
  };

  const handleDeleteTask = (id: number) => {
    deleteTaskMutation.mutate(id);
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  // Render the appropriate view based on view type
  const renderView = () => {
    const viewType = view?.type || 'table';

    switch (viewType) {
      case 'kanban':
        return (
          <TaskKanbanView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onTaskSelect={handleTaskSelect}
          />
        );
      case 'calendar':
        return (
          <TaskCalendarView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskSelect={handleTaskSelect}
          />
        );
      case 'table':
      default:
        return (
          <TaskTableView
            tasks={filteredTasks}
            properties={properties}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onTaskSelect={handleTaskSelect}
          />
        );
    }
  };

  if (loadingTasks || loadingProperties) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {/* Task count */}
            <div className="text-sm text-muted-foreground">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {filteredTasks.length === 0 && !searchQuery ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first task to get started
              </p>
              <Button onClick={() => setIsCreateTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        ) : filteredTasks.length === 0 && searchQuery ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search query
              </p>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </div>

      {/* Create Task Dialog */}
      <TaskDialog
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
        properties={properties}
        isLoading={createTaskMutation.isPending}
      />

      {/* Edit Task Dialog */}
      {selectedTask && (
        <TaskDialog
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmit={(data) => {
            handleUpdateTask(selectedTask.id, data);
            setSelectedTask(null);
          }}
          task={selectedTask}
          properties={properties}
          isLoading={updateTaskMutation.isPending}
          onDelete={() => {
            handleDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}