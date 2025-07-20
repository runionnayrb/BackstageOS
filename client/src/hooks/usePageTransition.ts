import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";

// Define the mobile navigation order for directional animations
const MOBILE_NAV_ORDER = [
  '/', // Shows/Projects (root)
  '/email', // Email
  '/chat', // Chat
];

// Get navigation index for a given path
function getNavigationIndex(path: string): number {
  // For show-specific paths (e.g., /shows/1, /shows/1/reports), treat them as the first item (shows)
  if (path.startsWith('/shows/')) {
    return 0;
  }
  
  // Check for exact matches first
  const exactIndex = MOBILE_NAV_ORDER.findIndex(navPath => path === navPath);
  if (exactIndex !== -1) {
    return exactIndex;
  }
  
  // For paths that start with navigation paths (e.g., /email/some-subpath)
  const partialIndex = MOBILE_NAV_ORDER.findIndex(navPath => 
    navPath !== '/' && path.startsWith(navPath)
  );
  if (partialIndex !== -1) {
    return partialIndex;
  }
  
  // For root path variations
  if (path === '/' || path === '/projects') {
    return 0;
  }
  
  // For paths not in navigation order, return -1 (no animation)
  return -1;
}

export function usePageTransition() {
  const [location] = useLocation();
  const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousLocationRef = useRef<string>(location);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const previousLocation = previousLocationRef.current;
    
    if (location !== previousLocation && isMobile) {
      const currentIndex = getNavigationIndex(location);
      const previousIndex = getNavigationIndex(previousLocation);
      
      // Only animate if both locations are in the navigation order
      if (currentIndex !== -1 && previousIndex !== -1) {
        setIsAnimating(true);
        
        if (currentIndex > previousIndex) {
          setDirection('left'); // Moving forward (slide left)
        } else if (currentIndex < previousIndex) {
          setDirection('right'); // Moving backward (slide right)
        } else {
          setDirection('none');
          setIsAnimating(false);
        }
      } else {
        setDirection('none');
        setIsAnimating(false);
      }
      
      previousLocationRef.current = location;
    } else if (!isMobile) {
      setDirection('none');
      setIsAnimating(false);
    }
  }, [location, isMobile]);

  const onAnimationComplete = () => {
    setIsAnimating(false);
  };

  return {
    direction,
    isAnimating,
    isMobile,
    shouldAnimate: isMobile && direction !== 'none',
    onAnimationComplete,
  };
}