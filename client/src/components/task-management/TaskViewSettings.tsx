import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  LayoutGrid,
  Eye,
  Filter,
  ArrowUpDown,
  Group,
  Link,
  Database,
  Lock,
  Settings,
  Zap,
  MoreHorizontal,
  ChevronRight,
  Table,
  Calendar,
} from 'lucide-react';

interface TaskViewSettingsProps {
  children: React.ReactNode;
  currentView: 'table' | 'kanban' | 'calendar';
  onViewChange: (view: 'table' | 'kanban' | 'calendar') => void;
}

export function TaskViewSettings({ 
  children,
  currentView, 
  onViewChange 
}: TaskViewSettingsProps) {
  const [visibleProperties] = useState(6); // Mock count for now

  const handleViewSelect = (view: 'table' | 'kanban' | 'calendar') => {
    onViewChange(view);
  };

  const getViewIcon = (view: string) => {
    switch (view) {
      case 'table':
        return <Table className="w-4 h-4" />;
      case 'kanban':
        return <LayoutGrid className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Table className="w-4 h-4" />;
    }
  };

  const getViewLabel = (view: string) => {
    switch (view) {
      case 'table':
        return 'Table';
      case 'kanban':
        return 'Board';
      case 'calendar':
        return 'Calendar';
      default:
        return 'Table';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="left" className="w-80 p-0">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">View settings</h3>
          </div>
        </div>

        <div className="flex flex-col h-full">
          {/* View Settings Section */}
          <div className="px-6 py-4 space-y-3">
            {/* All Views */}
            <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-gray-600" />
                <span className="text-sm">All</span>
              </div>
              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                3
              </Badge>
            </div>

            {/* Layout */}
            <div 
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Open layout selector
                console.log('Opening layout selector');
              }}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Layout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{getViewLabel(currentView)}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Property visibility */}
            <div 
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Open property visibility panel
                console.log('Opening property visibility');
              }}
            >
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Property visibility</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{visibleProperties}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Filter */}
            <div 
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Open filter panel
                console.log('Opening filter panel');
              }}
            >
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Filter</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            {/* Sort */}
            <div 
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Open sort panel
                console.log('Opening sort panel');
              }}
            >
              <div className="flex items-center gap-3">
                <ArrowUpDown className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Sort</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Application Date</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Group */}
            <div 
              className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Open group panel
                console.log('Opening group panel');
              }}
            >
              <div className="flex items-center gap-3">
                <Group className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Group</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            {/* Copy link to view */}
            <div 
              className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => {
                // TODO: Copy view link to clipboard
                console.log('Copying view link');
              }}
            >
              <Link className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Copy link to view</span>
            </div>
          </div>

          {/* Database Settings Section */}
          <div className="border-t">
            <div className="px-6 py-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Database settings
              </h3>
            </div>
            
            <div className="px-6 pb-4 space-y-3">
              {/* Source */}
              <div 
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
                onClick={() => {
                  // TODO: Open source settings
                  console.log('Opening source settings');
                }}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Source</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Job Apps</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Lock database */}
              <div 
                className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
                onClick={() => {
                  // TODO: Toggle database lock
                  console.log('Toggling database lock');
                }}
              >
                <Lock className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Lock database</span>
              </div>

              {/* Edit properties */}
              <div 
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
                onClick={() => {
                  // TODO: Open properties editor
                  console.log('Opening properties editor');
                }}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Edit properties</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              {/* Automations */}
              <div 
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
                onClick={() => {
                  // TODO: Open automations panel
                  console.log('Opening automations');
                }}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Automations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              {/* More settings */}
              <div 
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 cursor-pointer"
                onClick={() => {
                  // TODO: Open more settings
                  console.log('Opening more settings');
                }}
              >
                <div className="flex items-center gap-3">
                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">More settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}