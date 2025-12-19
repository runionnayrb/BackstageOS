import { Calendar, User, FileText, Package, Shirt, FileImage, Mail, StickyNote, Folder, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { SearchResult, useSearch } from './SearchContext';

interface SearchResultsProps {
  onResultClick?: () => void;
}

const getResultIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'event':
      return Calendar;
    case 'contact':
      return User;
    case 'report':
      return FileText;
    case 'prop':
      return Package;
    case 'costume':
      return Shirt;
    case 'script':
      return FileImage;
    case 'email':
      return Mail;
    case 'note':
      return StickyNote;
    case 'document':
      return Folder;
    default:
      return FileText;
  }
};

const getResultColor = (type: SearchResult['type']) => {
  switch (type) {
    case 'event':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'contact':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'report':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'prop':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'costume':
      return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
    case 'script':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    case 'email':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
    case 'note':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'document':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

const formatResultType = (type: SearchResult['type']) => {
  switch (type) {
    case 'event':
      return 'Event';
    case 'contact':
      return 'Contact';
    case 'report':
      return 'Report';
    case 'prop':
      return 'Prop';
    case 'costume':
      return 'Costume';
    case 'script':
      return 'Script';
    case 'email':
      return 'Email';
    case 'note':
      return 'Note';
    case 'document':
      return 'Document';
    default:
      return 'Item';
  }
};

export default function SearchResults({ onResultClick }: SearchResultsProps) {
  const [, setLocation] = useLocation();
  const { results, isSearching, searchError } = useSearch();

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick();
    }
    setLocation(result.url);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResult['type'], SearchResult[]>);

  if (isSearching) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Searching with AI...</p>
        </div>
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 text-sm">{searchError}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm">No results found. Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {Object.entries(groupedResults).map(([type, typeResults]) => {
        const Icon = getResultIcon(type as SearchResult['type']);
        
        return (
          <div key={type} className="space-y-2">
            {/* Type header */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Icon className="h-4 w-4" />
              <span>{formatResultType(type as SearchResult['type'])}s</span>
              <Badge variant="secondary" className="text-xs">
                {typeResults.length}
              </Badge>
            </div>
            
            {/* Results for this type */}
            <div className="space-y-1">
              {typeResults.map((result) => {
                const IconComponent = getResultIcon(result.type);
                
                return (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-none shadow-none"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                {result.description}
                              </p>
                            </div>
                            
                            <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {result.projectName && (
                              <Badge variant="outline" className="text-xs">
                                {result.projectName}
                              </Badge>
                            )}
                            
                            {result.date && (
                              <span>
                                {new Date(result.date).toLocaleDateString()}
                              </span>
                            )}
                            
                            {result.metadata.status && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  result.metadata.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  result.metadata.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  result.metadata.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {result.metadata.status}
                              </Badge>
                            )}
                            
                            {result.metadata.priority && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  result.metadata.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  result.metadata.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {result.metadata.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}