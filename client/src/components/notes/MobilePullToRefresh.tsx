import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function MobilePullToRefresh({ onRefresh, children }: MobilePullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pullThreshold = 80;

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, pullThreshold * 1.5));
      
      if (distance > 10) {
        e.preventDefault(); // Prevent scroll when pulling
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const pullProgress = Math.min(pullDistance / pullThreshold, 1);
  const shouldTrigger = pullDistance > pullThreshold;

  return (
    <div className="relative">
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-white border-b border-gray-100 transition-all duration-200"
          style={{
            height: `${Math.max(pullDistance * 0.8, 0)}px`,
            opacity: pullProgress,
          }}
        >
          <div className="flex items-center gap-2 text-gray-600">
            <RefreshCw 
              className={`w-5 h-5 ${(isRefreshing || shouldTrigger) ? 'animate-spin' : ''}`}
              style={{
                transform: `rotate(${pullProgress * 180}deg)`,
              }}
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div 
        style={{
          transform: `translateY(${isPulling || isRefreshing ? pullDistance * 0.3 : 0}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}