import React, { useState, useRef, useEffect } from 'react';
import { Search, Command, Filter, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSearch } from './SearchContext';
import SearchResults from './SearchResults';
import SearchFilters from './SearchFilters';
import SearchSuggestions from './SearchSuggestions';

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function GlobalSearchBar({ 
  className = '', 
  placeholder = "Search productions, people, schedules..." 
}: GlobalSearchBarProps) {
  // Debug log to check if component renders
  console.log('GlobalSearchBar rendering');
  
  // TEMPORARY: Simple placeholder for testing visibility - will restore full functionality after verification
  return (
    <div className="bg-white border border-gray-300 rounded-md px-3 py-2 w-full">
      <input 
        type="text" 
        placeholder="Search your production..."
        className="w-full border-0 outline-none text-sm"
        style={{ background: 'transparent' }}
        onChange={(e) => console.log('Search input:', e.target.value)}
      />
    </div>
  );
}