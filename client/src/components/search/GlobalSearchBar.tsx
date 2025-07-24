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
  const {
    query,
    setQuery,
    isAdvancedMode,
    setIsAdvancedMode,
    activeFilters,
    performSearch,
    clearSearch,
    isSearching,
    results,
    suggestions,
    getSuggestions,
  } = useSearch();

  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 1) {
      getSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (query.length > 1) {
      setShowSuggestions(true);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    performSearch(searchQuery);
    setShowSuggestions(false);
    setIsOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };

  const handleClear = () => {
    clearSearch();
    setIsOpen(false);
    setShowSuggestions(false);
  };

  const toggleAdvancedMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
    if (!isAdvancedMode) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="pl-10 pr-20 h-10 w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
        />
        
        {/* Right side controls */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {/* AI indicator */}
          {!isAdvancedMode && (
            <Sparkles className="h-3 w-3 text-blue-500" title="AI-powered search" />
          )}
          
          {/* Advanced filter toggle */}
          <Button
            variant={isAdvancedMode ? "default" : "ghost"}
            size="sm"
            onClick={toggleAdvancedMode}
            className="h-6 w-6 p-0"
            title="Advanced filters"
          >
            <Filter className="h-3 w-3" />
          </Button>
          
          {/* Clear button */}
          {(query || activeFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Keyboard shortcut hint */}
        <div className="absolute right-2 -bottom-5 text-xs text-gray-400 hidden sm:block">
          <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">⌘K</kbd>
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="text-xs">
              {filter.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Advanced Filters */}
          {isAdvancedMode && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <SearchFilters />
            </div>
          )}
          
          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && !results.length && (
            <div className="p-2">
              <SearchSuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
              />
            </div>
          )}
          
          {/* Search Results */}
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <SearchResults 
                results={results}
                onResultClick={() => setIsOpen(false)}
              />
            </div>
          )}
          
          {/* No results message */}
          {!isSearching && !showSuggestions && results.length === 0 && (query || activeFilters.length > 0) && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No results found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
          
          {/* Empty state */}
          {!query && activeFilters.length === 0 && !showSuggestions && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Command className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium mb-1">Search your production</p>
              <p className="text-sm">Ask questions like "When is our next rehearsal?" or "Who plays Hamlet?"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}