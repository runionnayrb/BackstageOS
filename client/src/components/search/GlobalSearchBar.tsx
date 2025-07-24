import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function GlobalSearchBar({ 
  className = '', 
  placeholder = "Search productions, people, schedules..." 
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    console.log('🔍 Search input:', value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search submitted:', query);
    // TODO: Implement AI search functionality
  };

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            className="pl-10 pr-10 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Sparkles className="h-4 w-4 text-blue-500" title="AI-powered search" />
          </div>
        </div>
      </form>
    </div>
  );
}