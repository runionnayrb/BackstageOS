import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ContextAwareBackButtonProps {
  customText?: string;
  customHref?: string;
  showName?: string;
  className?: string;
}

export default function ContextAwareBackButton({ 
  customText, 
  customHref, 
  showName, 
  className = "" 
}: ContextAwareBackButtonProps) {
  const [location, setLocation] = useLocation();

  // Smart back button logic based on current path
  const getBackDestination = () => {
    if (customHref) return customHref;

    // Parse current path to determine smart back destination
    const pathParts = location.split('/');
    
    if (location.includes('/shows/') && location.includes('/reports/')) {
      // From specific report back to reports list
      const showId = pathParts[2];
      return `/shows/${showId}/reports`;
    }
    
    if (location.includes('/shows/') && location.includes('/script')) {
      // From script back to show
      const showId = pathParts[2];
      return `/shows/${showId}`;
    }
    
    if (location.includes('/shows/') && location.includes('/calendar')) {
      // From calendar back to show
      const showId = pathParts[2];
      return `/shows/${showId}`;
    }
    
    if (location.includes('/shows/') && location.includes('/contacts')) {
      // From contacts back to show
      const showId = pathParts[2];
      return `/shows/${showId}`;
    }
    
    if (location.includes('/shows/') && location.includes('/props')) {
      // From props back to show
      const showId = pathParts[2];
      return `/shows/${showId}`;
    }
    
    if (location.includes('/shows/') && location.includes('/settings')) {
      // From settings back to show
      const showId = pathParts[2];
      return `/shows/${showId}`;
    }
    
    if (location.includes('/shows/') && pathParts.length === 3) {
      // From show detail back to shows list
      return '/';
    }
    
    // Default fallback
    return '/';
  };

  const getBackText = () => {
    if (customText) return customText;

    // Smart text based on current path
    if (location.includes('/shows/') && location.includes('/reports/')) {
      return 'Back to Reports';
    }
    
    if (location.includes('/shows/') && (
      location.includes('/script') || 
      location.includes('/calendar') || 
      location.includes('/contacts') || 
      location.includes('/props')
    )) {
      return showName ? `Back to ${showName}` : 'Back to Show';
    }
    
    if (location.includes('/shows/') && location.includes('/settings')) {
      return showName ? `Back to ${showName}` : 'Back to Show';
    }
    
    if (location.includes('/shows/') && location.match(/^\/shows\/\d+$/)) {
      return 'Back to Shows';
    }
    
    return 'Back';
  };

  const handleBack = () => {
    const destination = getBackDestination();
    setLocation(destination);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 p-0 h-auto ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{getBackText()}</span>
    </Button>
  );
}