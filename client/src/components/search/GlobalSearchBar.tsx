import React from 'react';

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function GlobalSearchBar({ 
  className = '', 
  placeholder = "Search productions, people, schedules..." 
}: GlobalSearchBarProps) {
  // Debug log to check if component renders
  console.log('🔍 GlobalSearchBar component is rendering!');
  
  // Simplified test version - no context dependencies
  return (
    <div className="bg-white border border-gray-300 rounded-md px-3 py-2 w-full" style={{ minHeight: '40px' }}>
      <input 
        type="text" 
        placeholder="Search your production..."
        className="w-full border-0 outline-none text-sm"
        style={{ background: 'transparent' }}
        onChange={(e) => console.log('🔍 Search input:', e.target.value)}
        onFocus={() => console.log('🔍 Search bar focused')}
      />
    </div>
  );
}