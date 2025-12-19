import React from 'react';
import { Calendar, Users, Tag, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDatePicker } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSearch, SearchFilter } from './SearchContext';
import { useQuery } from '@tanstack/react-query';

export default function SearchFilters() {
  const { activeFilters, addFilter, removeFilter, performSearch } = useSearch();

  // Get available projects for filter
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Get available contacts for person filter
  const { data: contacts } = useQuery({
    queryKey: ['/api/contacts'],
  });

  const handleDateRangeFilter = (startDate: Date | undefined, endDate: Date | undefined) => {
    if (startDate || endDate) {
      const filter: SearchFilter = {
        type: 'date',
        key: 'dateRange',
        value: {
          start: startDate?.toISOString(),
          end: endDate?.toISOString(),
        },
        label: `${startDate ? startDate.toLocaleDateString() : 'Any'} - ${endDate ? endDate.toLocaleDateString() : 'Any'}`,
      };
      addFilter(filter);
    }
  };

  const handleProjectFilter = (projectIds: string[]) => {
    if (projectIds.length > 0) {
      const selectedProjects = projects?.filter((p: any) => projectIds.includes(p.id.toString()));
      const filter: SearchFilter = {
        type: 'project',
        key: 'projects',
        value: projectIds,
        label: selectedProjects?.map((p: any) => p.name).join(', ') || 'Projects',
      };
      addFilter(filter);
    }
  };

  const handlePersonFilter = (personIds: string[]) => {
    if (personIds.length > 0) {
      const selectedContacts = contacts?.filter((c: any) => personIds.includes(c.id.toString()));
      const filter: SearchFilter = {
        type: 'person',
        key: 'people',
        value: personIds,
        label: selectedContacts?.map((c: any) => `${c.firstName} ${c.lastName}`).join(', ') || 'People',
      };
      addFilter(filter);
    }
  };

  const handleCategoryFilter = (categories: string[]) => {
    if (categories.length > 0) {
      const filter: SearchFilter = {
        type: 'category',
        key: 'categories',
        value: categories,
        label: categories.join(', '),
      };
      addFilter(filter);
    }
  };

  const handleStatusFilter = (statuses: string[]) => {
    if (statuses.length > 0) {
      const filter: SearchFilter = {
        type: 'status',
        key: 'statuses',
        value: statuses,
        label: statuses.join(', '),
      };
      addFilter(filter);
    }
  };

  const handleApplyFilters = () => {
    performSearch();
  };

  const handleClearFilters = () => {
    activeFilters.forEach(filter => removeFilter(filter.key));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">Advanced Filters</span>
        </div>
        
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Active Filters</Label>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter) => (
              <Badge key={filter.key} variant="secondary" className="text-xs">
                {filter.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(filter.key)}
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <Calendar className="mr-2 h-4 w-4" />
                Select date range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarDatePicker
                onDateSelect={(startDate, endDate) => handleDateRangeFilter(startDate, endDate)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Project Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Shows/Projects</Label>
          <Select onValueChange={(value) => handleProjectFilter([value])}>
            <SelectTrigger>
              <SelectValue placeholder="Select shows..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project: any) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Person Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">People</Label>
          <Select onValueChange={(value) => handlePersonFilter([value])}>
            <SelectTrigger>
              <SelectValue placeholder="Select people..." />
            </SelectTrigger>
            <SelectContent>
              {contacts?.map((contact: any) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.firstName} {contact.lastName} ({contact.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select onValueChange={(value) => handleCategoryFilter([value])}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="event">Events & Schedule</SelectItem>
              <SelectItem value="contact">People & Contacts</SelectItem>
              <SelectItem value="report">Reports & Notes</SelectItem>
              <SelectItem value="prop">Props</SelectItem>
              <SelectItem value="costume">Costumes</SelectItem>
              <SelectItem value="script">Scripts & Cues</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Filters */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
            { value: 'in_progress', label: 'In Progress' },
          ].map((status) => (
            <Button
              key={status.value}
              variant="outline"
              size="sm"
              onClick={() => handleStatusFilter([status.value])}
              className="text-xs"
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Apply Button */}
      <div className="flex justify-end">
        <Button onClick={handleApplyFilters} className="w-full md:w-auto">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}