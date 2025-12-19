import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface SearchResult {
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

export interface SearchFilter {
  type: 'date' | 'project' | 'person' | 'category' | 'status';
  key: string;
  value: string | string[];
  label: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'contextual';
  category?: string;
}

interface SearchContextType {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (mode: boolean) => void;
  activeFilters: SearchFilter[];
  setActiveFilters: (filters: SearchFilter[]) => void;
  
  // Search results
  results: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Search functions
  performSearch: (naturalQuery?: string) => void;
  clearSearch: () => void;
  addFilter: (filter: SearchFilter) => void;
  removeFilter: (filterKey: string) => void;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  getSuggestions: (input: string) => void;
  
  // History
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const queryClient = useQueryClient();

  // Natural language search mutation
  const naturalSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest('/api/search/natural', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery, filters: activeFilters }),
      });
      return response;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setSearchError(null);
      if (query.trim()) {
        addToHistory(query.trim());
      }
    },
    onError: (error: any) => {
      setSearchError(error.message || 'Search failed');
      setResults([]);
    },
  });

  // Advanced search mutation
  const advancedSearchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/search/advanced', {
        method: 'POST',
        body: JSON.stringify({ filters: activeFilters }),
      });
      return response;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setSearchError(null);
    },
    onError: (error: any) => {
      setSearchError(error.message || 'Advanced search failed');
      setResults([]);
    },
  });

  // Suggestions query
  const { data: suggestionsData } = useQuery({
    queryKey: ['/api/search/suggestions', query],
    enabled: query.length > 1,
    staleTime: 30000, // 30 seconds
  });

  const performSearch = useCallback((naturalQuery?: string) => {
    const searchQuery = naturalQuery || query;
    
    if (!searchQuery.trim() && activeFilters.length === 0) {
      setResults([]);
      return;
    }

    if (isAdvancedMode || !searchQuery.trim()) {
      advancedSearchMutation.mutate();
    } else {
      naturalSearchMutation.mutate(searchQuery);
    }
  }, [query, isAdvancedMode, activeFilters, naturalSearchMutation, advancedSearchMutation]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearchError(null);
    setActiveFilters([]);
  }, []);

  const addFilter = useCallback((filter: SearchFilter) => {
    setActiveFilters(prev => {
      const existingIndex = prev.findIndex(f => f.key === filter.key);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = filter;
        return updated;
      }
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((filterKey: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== filterKey));
  }, []);

  const getSuggestions = useCallback((input: string) => {
    if (suggestionsData?.suggestions) {
      setSuggestions(suggestionsData.suggestions);
    }
  }, [suggestionsData]);

  const addToHistory = useCallback((searchQuery: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h !== searchQuery);
      return [searchQuery, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  const isSearching = naturalSearchMutation.isPending || advancedSearchMutation.isPending;

  const value: SearchContextType = {
    query,
    setQuery,
    isAdvancedMode,
    setIsAdvancedMode,
    activeFilters,
    setActiveFilters,
    results,
    isSearching,
    searchError,
    performSearch,
    clearSearch,
    addFilter,
    removeFilter,
    suggestions,
    getSuggestions,
    searchHistory,
    addToHistory,
    clearHistory,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}