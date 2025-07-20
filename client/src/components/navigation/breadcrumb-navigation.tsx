import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function BreadcrumbNavigation({ items, className = "" }: BreadcrumbNavigationProps) {
  // On mobile, show only the previous page (second to last item, or first if only one item)
  const mobileItems = items.length > 1 ? items.slice(-2, -1) : items.slice(0, 1);
  
  return (
    <>
      {/* Mobile: Show only previous page */}
      <nav className={`sm:hidden flex items-center text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
        {mobileItems.map((item, index) => (
          <div key={index} className="flex items-center">
            {item.href && !item.isCurrentPage ? (
              <Link href={item.href}>
                <span className="text-gray-600 hover:text-blue-600 cursor-pointer transition-colors duration-200 px-1">
                  {item.label}
                </span>
              </Link>
            ) : (
              <span className={`px-1 text-sm ${
                item.isCurrentPage 
                  ? 'text-gray-900 font-medium' 
                  : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
      
      {/* Desktop: Show full breadcrumb */}
      <nav className={`hidden sm:flex items-center space-x-0.5 text-sm text-gray-600 overflow-hidden ${className}`} aria-label="Breadcrumb">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-0.5 flex-shrink-0">
            {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400 mx-1 flex-shrink-0" />}
            {item.href && !item.isCurrentPage ? (
              <Link href={item.href}>
                <span className="text-gray-600 hover:text-blue-600 cursor-pointer transition-colors duration-200 px-1">
                  {item.label}
                </span>
              </Link>
            ) : (
              <span className={`px-1 text-sm ${
                item.isCurrentPage 
                  ? 'text-gray-900 font-medium' 
                  : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}