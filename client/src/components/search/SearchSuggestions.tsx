import React from 'react';
import { Clock, Star, TrendingUp, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchSuggestion } from './SearchContext';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: string) => void;
}

const getSuggestionIcon = (type: SearchSuggestion['type'], category?: string) => {
  if (type === 'recent') return Clock;
  if (type === 'popular') return TrendingUp;
  
  // Contextual suggestions based on category
  switch (category) {
    case 'person':
      return User;
    case 'event':
      return Calendar;
    default:
      return Star;
  }
};

const getSuggestionColor = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'recent':
      return 'text-gray-500';
    case 'popular':
      return 'text-blue-500';
    case 'contextual':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export default function SearchSuggestions({ suggestions, onSelect }: SearchSuggestionsProps) {
  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<SearchSuggestion['type'], SearchSuggestion[]>);

  const renderSuggestionGroup = (type: SearchSuggestion['type'], suggestions: SearchSuggestion[]) => {
    const getGroupTitle = () => {
      switch (type) {
        case 'recent':
          return 'Recent Searches';
        case 'popular':
          return 'Popular Searches';
        case 'contextual':
          return 'Suggestions';
        default:
          return 'Suggestions';
      }
    };

    return (
      <div key={type} className="space-y-1">
        <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2">
          {getGroupTitle()}
        </h4>
        
        <div className="space-y-0">
          {suggestions.slice(0, 5).map((suggestion, index) => {
            const Icon = getSuggestionIcon(suggestion.type, suggestion.category);
            
            return (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => onSelect(suggestion.text)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={`h-3 w-3 ${getSuggestionColor(suggestion.type)}`} />
                  
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {suggestion.text}
                  </span>
                  
                  {suggestion.category && (
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {/* Quick action suggestions */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2">
          Try These Questions
        </h4>
        
        <div className="space-y-0">
          {[
            "When is our next rehearsal?",
            "Who plays the lead role?", 
            "What props do we need for Act 2?",
            "Show me this week's schedule",
            "Which costumes need alterations?",
            "How many tech rehearsals have we had?",
          ].map((question, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start h-auto p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onSelect(question)}
            >
              <div className="flex items-center gap-2 w-full">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {question}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Dynamic suggestions */}
      {Object.entries(groupedSuggestions).map(([type, suggestions]) =>
        renderSuggestionGroup(type as SearchSuggestion['type'], suggestions)
      )}
    </div>
  );
}