import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Flag } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import type { Task, TaskProperty } from "@shared/schema";

interface TaskCalendarViewProps {
  tasks: Task[];
  properties: TaskProperty[];
  onTaskUpdate: (id: number, data: any) => void;
  onTaskSelect: (task: Task) => void;
}

const PRIORITY_COLORS = {
  low: "#6B7280",
  medium: "#F59E0B", 
  high: "#EF4444",
  urgent: "#DC2626",
};

interface CalendarDayProps {
  date: Date;
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  isCurrentMonth: boolean;
}

function CalendarDay({ date, tasks, onTaskSelect, isCurrentMonth }: CalendarDayProps) {
  const dayTasks = tasks.filter(task => 
    task.dueDate && isSameDay(new Date(task.dueDate), date)
  );

  return (
    <div className={`min-h-[120px] p-2 border-r border-b ${
      isCurrentMonth ? 'bg-background' : 'bg-muted/20'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${
          isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {format(date, 'd')}
        </span>
        {dayTasks.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            {dayTasks.length}
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        {dayTasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="cursor-pointer rounded px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
            style={{ 
              backgroundColor: `${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}15`,
              borderLeft: `3px solid ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`
            }}
            onClick={() => onTaskSelect(task)}
          >
            <div className="font-medium truncate">{task.title}</div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] }}
              />
              <span className="capitalize">{task.status.replace('_', ' ')}</span>
            </div>
          </div>
        ))}
        
        {dayTasks.length > 3 && (
          <div className="text-xs text-muted-foreground px-2">
            +{dayTasks.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskCalendarView({ tasks, properties, onTaskUpdate, onTaskSelect }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Get tasks with due dates for stats
  const tasksWithDueDates = tasks.filter(task => task.dueDate);
  const overdueTasks = tasksWithDueDates.filter(task => 
    new Date(task.dueDate!) < new Date() && task.status !== 'completed'
  );
  const todayTasks = tasksWithDueDates.filter(task =>
    isSameDay(new Date(task.dueDate!), new Date())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-blue-500" />
            <span>Today: {todayTasks.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-red-500" />
            <span>Overdue: {overdueTasks.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Flag className="h-4 w-4 text-green-500" />
            <span>Total with dates: {tasksWithDueDates.length}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {view === 'month' ? (
          <div className="h-full flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {calendarDays.map((date) => (
                <CalendarDay
                  key={date.toISOString()}
                  date={date}
                  tasks={tasks}
                  onTaskSelect={onTaskSelect}
                  isCurrentMonth={
                    date.getMonth() === currentDate.getMonth() &&
                    date.getFullYear() === currentDate.getFullYear()
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          /* Week view - simplified for now */
          <div className="p-4">
            <div className="text-center text-muted-foreground">
              Week view coming soon...
            </div>
          </div>
        )}
      </div>

      {/* Sidebar with task details */}
      <div className="border-l w-80 bg-muted/20 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Upcoming Tasks</h3>
        
        {/* Today's tasks */}
        {todayTasks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2 text-blue-600">Due Today</h4>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <Card key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onTaskSelect(task)}>
                  <CardContent className="p-3">
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          task.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2 text-red-600">Overdue</h4>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => (
                <Card key={task.id} className="cursor-pointer hover:bg-muted/50 border-red-200" onClick={() => onTaskSelect(task)}>
                  <CardContent className="p-3">
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-600">
                        {format(new Date(task.dueDate!), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {overdueTasks.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  +{overdueTasks.length - 5} more overdue
                </div>
              )}
            </div>
          </div>
        )}

        {/* No scheduled tasks */}
        {tasksWithDueDates.length === 0 && (
          <div className="text-center py-8">
            <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}