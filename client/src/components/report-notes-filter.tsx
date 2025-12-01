import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, X } from "lucide-react";

interface ReportNotesFilterProps {
  selectedPriorities: string[];
  onPriorityFilterChange: (priorities: string[]) => void;
  selectedStatuses: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  selectedAssignees: number[];
  onAssigneeFilterChange: (assignees: number[]) => void;
  teamMembers: Array<{ id: number; firstName: string; lastName: string }>;
}

export default function ReportNotesFilter({
  selectedPriorities,
  onPriorityFilterChange,
  selectedStatuses,
  onStatusFilterChange,
  selectedAssignees,
  onAssigneeFilterChange,
  teamMembers,
}: ReportNotesFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const priorities = ["high", "medium", "low"];
  const statuses = ["completed", "incomplete"];

  const handlePriorityToggle = (priority: string) => {
    const newSelection = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority];
    onPriorityFilterChange(newSelection);
  };

  const handleStatusToggle = (status: string) => {
    const newSelection = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onStatusFilterChange(newSelection);
  };

  const handleAssigneeToggle = (assigneeId: number) => {
    const newSelection = selectedAssignees.includes(assigneeId)
      ? selectedAssignees.filter(id => id !== assigneeId)
      : [...selectedAssignees, assigneeId];
    onAssigneeFilterChange(newSelection);
  };

  const handleSelectAllPriorities = () => {
    onPriorityFilterChange(priorities);
  };

  const handleClearAllPriorities = () => {
    onPriorityFilterChange([]);
  };

  const handleSelectAllStatuses = () => {
    onStatusFilterChange(statuses);
  };

  const handleClearAllStatuses = () => {
    onStatusFilterChange([]);
  };

  const handleSelectAllAssignees = () => {
    onAssigneeFilterChange(teamMembers.map(m => m.id));
  };

  const handleClearAllAssignees = () => {
    onAssigneeFilterChange([]);
  };

  const hasActiveFilters =
    selectedPriorities.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedAssignees.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 bg-transparent hover:bg-transparent border-none ${
            hasActiveFilters
              ? "text-blue-600 hover:text-blue-700"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Note Filters
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="priority" className="w-full">
          <div className="flex gap-2 mx-4 mt-4 mb-4">
            <TabsList className="grid grid-cols-3 h-9 flex-1">
              <TabsTrigger value="priority" className="h-8 text-sm">
                Priority
              </TabsTrigger>
              <TabsTrigger value="status" className="h-8 text-sm">
                Status
              </TabsTrigger>
              <TabsTrigger value="assignees" className="h-8 text-sm">
                Assignees
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="priority" className="m-0">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">PRIORITY</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllPriorities}
                    className="text-xs px-2 py-1 h-5"
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllPriorities}
                    className="text-xs px-2 py-1 h-5"
                  >
                    None
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {priorities.map((priority) => (
                <div
                  key={priority}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePriorityToggle(priority)}
                >
                  <Checkbox
                    checked={selectedPriorities.includes(priority)}
                    onChange={() => handlePriorityToggle(priority)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm capitalize">{priority}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="status" className="m-0">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">STATUS</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllStatuses}
                    className="text-xs px-2 py-1 h-5"
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllStatuses}
                    className="text-xs px-2 py-1 h-5"
                  >
                    None
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {statuses.map((status) => (
                <div
                  key={status}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleStatusToggle(status)}
                >
                  <Checkbox
                    checked={selectedStatuses.includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm capitalize">{status}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignees" className="m-0">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ASSIGNEES</span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllAssignees}
                    className="text-xs px-2 py-1 h-5"
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllAssignees}
                    className="text-xs px-2 py-1 h-5"
                  >
                    None
                  </Button>
                </div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {teamMembers.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No team members found
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAssigneeToggle(member.id)}
                  >
                    <Checkbox
                      checked={selectedAssignees.includes(member.id)}
                      onChange={() => handleAssigneeToggle(member.id)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
