import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SearchResult {
  id: string;
  type: 'event' | 'contact' | 'report' | 'prop' | 'costume' | 'script' | 'email' | 'note' | 'document';
  title: string;
  description: string;
  projectId?: number;
  projectName?: string;
  date?: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  url: string;
}

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function GlobalSearchBar({ 
  className = '', 
  placeholder = "Search productions, people, schedules..." 
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI Search mutation with cost controls
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      console.log('🔍 Performing search for:', searchQuery);
      return await apiRequest('POST', '/api/search/natural', {
        query: searchQuery,
        maxResults: 10
      });
    },
    onSuccess: (data) => {
      console.log('🔍 Search results received:', data);
      setResults(data.results || []);
      setIsOpen(true);
    },
    onError: (error: any) => {
      console.error('🔍 Search error:', error);
      setResults([]);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    console.log('🔍 Search input:', value);
    
    if (value.length === 0) {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && query.length >= 2) {
      console.log('🔍 Search submitted:', query);
      searchMutation.mutate(query);
    }
  };

  const handleSearchClick = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleClose = () => {
    setIsExpanded(false);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isExpanded) {
          handleSearchClick();
        } else {
          inputRef.current?.focus();
        }
      }
      
      if (e.key === 'Escape') {
        if (isExpanded) {
          handleClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        if (isExpanded && !query.trim()) {
          handleClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, query]);

  return (
    <>
      {/* Desktop Search with Popover */}
      <div className={`hidden md:block relative ${className}`}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearchClick}
              className="h-10 w-10 p-0 hover:bg-gray-100"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent 
            className="w-[600px] p-0 border-0 shadow-lg" 
            align="end"
            side="bottom"
            sideOffset={8}
          >
          <div className="bg-white rounded-lg border shadow-lg max-h-[60vh] sm:max-h-[80vh] overflow-hidden">
            {/* Results Content */}
            <div className="flex-1 overflow-y-auto">
              {searchMutation.isPending ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Searching...</p>
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="p-4 space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                      onClick={() => {
                        window.location.href = result.url;
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">
                            {result.type.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {result.title}
                          </h3>
                          <p className="text-gray-600 text-xs mt-1">
                            {result.description}
                          </p>
                          {result.projectName && (
                            <p className="text-blue-600 text-xs mt-1">
                              {result.projectName}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.round(result.relevanceScore * 100)}% match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.length >= 2 && !searchMutation.isPending ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm">No results found. Try a different search term.</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium">Smart Search</span>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Ask questions like "Who's playing Lady Macbeth?" or "What props do we need for Act 2?"
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer with search stats */}
            {(results.length > 0 || searchMutation.isPending) && (
              <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-500 flex justify-between items-center">
                <span>
                  {searchMutation.isPending ? (
                    "Searching..."
                  ) : (
                    `${results.length} result${results.length !== 1 ? 's' : ''} found`
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Smart search
                </span>
              </div>
            )}
          </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile Search with expandable bar and centered modal */}
      <div className={`md:hidden relative ${className}`}>
        {!isExpanded ? (
          // Search icon button
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchClick}
            className="h-10 w-10 p-0 hover:bg-gray-100"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-gray-600" />
          </Button>
        ) : (
          // Expanded search bar with results below - slides in from right
          <div className="fixed top-3 right-3 left-3 z-50 animate-in slide-in-from-right-4 duration-300">
            <form onSubmit={handleSubmit} className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={query}
                onChange={handleInputChange}
                className="w-full h-10 pl-3 pr-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 shadow-lg rounded-lg"
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 text-gray-400" />
                )}
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0 ml-1 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </form>

            {/* Search Results - Appear below search bar */}
            {(results.length > 0 || searchMutation.isPending || query.length >= 2) && (
              <div className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
                {searchMutation.isPending ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Searching...</p>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                        onClick={() => {
                          window.location.href = result.url;
                          setIsOpen(false);
                          setIsExpanded(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">
                              {result.type.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {result.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {result.snippet}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {result.type}
                              </span>
                              {result.relevanceScore && (
                                <span className="text-xs text-gray-400">
                                  {Math.round(result.relevanceScore * 100)}% match
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : query.length >= 2 && !searchMutation.isPending ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-sm">No results found. Try a different search term.</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-medium">Smart Search</span>
                    </div>
                    <p className="text-gray-500 text-sm">
                      Ask questions like "Who's playing Lady Macbeth?" or "What props do we need for Act 2?"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>


    </>
  );
}