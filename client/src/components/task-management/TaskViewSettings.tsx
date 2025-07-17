import { useState, useRef } from 'react';
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
  EyeOff,
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
  List,
  BarChart3,
  Clock,
  FileText,
  ArrowLeft,
  GripVertical,
  Text,
  Hash,
  CalendarDays,
  MapPin,
  Building,
  User,
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
  // Mock property data
  const [properties, setProperties] = useState([
    { id: 1, name: 'Task Name', type: 'text', icon: Text, visible: true, required: true },
    { id: 2, name: 'Status', type: 'select', icon: Hash, visible: true, required: false },
    { id: 3, name: 'Priority', type: 'select', icon: ArrowUpDown, visible: true, required: false },
    { id: 4, name: 'Due Date', type: 'date', icon: CalendarDays, visible: true, required: false },
    { id: 5, name: 'Project', type: 'relation', icon: Building, visible: true, required: false },
    { id: 6, name: 'Assignee', type: 'person', icon: User, visible: false, required: false },
  ]);

  const visibleProperties = properties.filter(p => p.visible).length;
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState<'main' | 'layout' | 'properties'>('main');
  const triggerRef = useRef<HTMLDivElement>(null);

  const togglePropertyVisibility = (propertyId: number) => {
    setProperties(prev => prev.map(p => 
      p.id === propertyId ? { ...p, visible: !p.visible } : p
    ));
  };

  const hideAllProperties = () => {
    setProperties(prev => prev.map(p => 
      p.required ? p : { ...p, visible: false }
    ));
  };

  const handleTriggerClick = (event: React.MouseEvent) => {
    // Get the button element's position
    const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Position popover to the left of the button, aligned with top
    setPopoverPosition({
      x: buttonRect.left - 320, // 320px to the left (popover width + some spacing)
      y: buttonRect.top
    });
    setIsOpen(true);
    setCurrentPage('main'); // Reset to main page when opening
  };

  const handleLayoutSelect = (layout: 'table' | 'kanban' | 'calendar') => {
    onViewChange(layout);
    setCurrentPage('main'); // Return to main page after selection
  };

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
    <>
      <div ref={triggerRef} onClick={handleTriggerClick}>
        {children}
      </div>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover Content */}
          <div 
            className="fixed z-50 w-80 bg-white rounded-md border shadow-lg p-0"
            style={{
              left: `${popoverPosition.x}px`,
              top: `${popoverPosition.y}px`
            }}
          >
            {currentPage === 'main' ? (
              <>
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
              onClick={() => setCurrentPage('layout')}
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
              onClick={() => setCurrentPage('properties')}
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
              </>
            ) : currentPage === 'layout' ? (
              <>
                {/* Layout Selection Page */}
                <div className="px-6 py-4 border-b">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentPage('main')}
                      className="p-1 h-auto hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-base font-medium">Layout</h3>
                  </div>
                </div>

                <div className="p-6">
                  {/* Layout Options Grid */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {/* Table */}
                    <div 
                      className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        currentView === 'table' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleLayoutSelect('table')}
                    >
                      <Table className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Table</span>
                    </div>

                    {/* Board */}
                    <div 
                      className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        currentView === 'kanban' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleLayoutSelect('kanban')}
                    >
                      <LayoutGrid className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Board</span>
                    </div>

                    {/* Timeline */}
                    <div className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors opacity-50">
                      <Clock className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Timeline</span>
                    </div>

                    {/* Calendar */}
                    <div 
                      className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        currentView === 'calendar' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleLayoutSelect('calendar')}
                    >
                      <Calendar className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Calendar</span>
                    </div>

                    {/* List */}
                    <div className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors opacity-50">
                      <List className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">List</span>
                    </div>

                    {/* Gallery */}
                    <div className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors opacity-50">
                      <LayoutGrid className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Gallery</span>
                    </div>

                    {/* Chart */}
                    <div className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors opacity-50">
                      <BarChart3 className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Chart</span>
                    </div>

                    {/* Feed */}
                    <div className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-colors opacity-50">
                      <FileText className="w-6 h-6 mb-2" />
                      <span className="text-xs text-center">Feed</span>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show database title</span>
                      <div className="w-10 h-5 bg-blue-500 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show vertical lines</span>
                      <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show page icon</span>
                      <div className="w-10 h-5 bg-blue-500 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Wrap all columns</span>
                      <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">Open pages in</span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-sm">Side peek</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm">Load limit</span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-sm">50</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : currentPage === 'properties' ? (
              <>
                {/* Properties Page */}
                <div className="px-6 py-4 border-b">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentPage('main')}
                      className="p-1 h-auto hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-base font-medium">Properties</h3>
                  </div>
                </div>

                <div className="p-6">
                  {/* Search */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search for a property..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Shown in table header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Shown in table</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={hideAllProperties}
                      className="text-blue-600 hover:text-blue-700 text-sm h-auto p-0"
                    >
                      Hide all
                    </Button>
                  </div>

                  {/* Property List */}
                  <div className="space-y-1">
                    {properties.map((property) => {
                      const IconComponent = property.icon;
                      return (
                        <div
                          key={property.id}
                          className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded-md group"
                        >
                          {/* Drag Handle */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>

                          {/* Property Icon */}
                          <IconComponent className="w-4 h-4 text-gray-600" />

                          {/* Property Name */}
                          <span className="flex-1 text-sm">{property.name}</span>

                          {/* Visibility Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePropertyVisibility(property.id)}
                            disabled={property.required}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            {property.visible ? (
                              <Eye className="w-4 h-4 text-gray-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Note */}
                  <div className="mt-6 text-xs text-gray-500">
                    Drag properties to reorder columns in your table view. The Task Name property cannot be hidden.
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}