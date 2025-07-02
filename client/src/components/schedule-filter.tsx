import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Users } from "lucide-react";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  category: string;
}

interface ScheduleFilterProps {
  projectId: number;
  selectedContactIds: number[];
  onFilterChange: (contactIds: number[]) => void;
}

export default function ScheduleFilter({ projectId, selectedContactIds, onFilterChange }: ScheduleFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Group contacts by category for better organization
  const contactsByCategory = contacts.reduce((acc, contact) => {
    const category = contact.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const handleContactToggle = (contactId: number) => {
    const newSelection = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter(id => id !== contactId)
      : [...selectedContactIds, contactId];
    
    onFilterChange(newSelection);
  };

  const handleSelectAll = () => {
    const allContactIds = contacts.map(contact => contact.id);
    onFilterChange(allContactIds);
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const getFilterStatusText = () => {
    if (selectedContactIds.length === 0) {
      return "Show Schedule";
    } else if (selectedContactIds.length === 1) {
      const contact = contacts.find(c => c.id === selectedContactIds[0]);
      return contact ? `${contact.firstName} ${contact.lastName}` : "1 Person";
    } else {
      return `${selectedContactIds.length} People`;
    }
  };

  const getFilterStatusColor = () => {
    if (selectedContactIds.length === 0) {
      return "bg-gray-100 text-gray-600 hover:bg-gray-200";
    } else if (selectedContactIds.length === 1) {
      return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    } else {
      return "bg-green-100 text-green-700 hover:bg-green-200";
    }
  };

  // Sort categories with Cast first, then alphabetically
  const sortedCategories = Object.keys(contactsByCategory).sort((a, b) => {
    if (a === 'Cast' && b !== 'Cast') return -1;
    if (a !== 'Cast' && b === 'Cast') return 1;
    return a.localeCompare(b);
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center ${getFilterStatusColor()}`}
        >
          <Filter className="h-4 w-4" />
          {selectedContactIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
              {selectedContactIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Filter by Team Member
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
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1"
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members found</p>
              <p className="text-sm">Add contacts to filter by assignments</p>
            </div>
          ) : (
            <div className="p-2">
              {sortedCategories.map((category) => (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1 text-sm font-medium text-gray-600 border-b">
                    {category}
                  </div>
                  <div className="space-y-1 mt-2">
                    {contactsByCategory[category].map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleContactToggle(contact.id)}
                      >
                        <Checkbox
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => handleContactToggle(contact.id)}
                          className="pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.role && (
                            <p className="text-xs text-gray-500 truncate">
                              {contact.role}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {selectedContactIds.length === 0 
                ? "Showing show schedule (production events only)"
                : `Filtering by ${selectedContactIds.length} ${selectedContactIds.length === 1 ? 'person' : 'people'}`
              }
            </span>
            {selectedContactIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}