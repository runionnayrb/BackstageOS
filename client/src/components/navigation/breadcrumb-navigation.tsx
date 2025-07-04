import { ChevronRight, Home } from "lucide-react";
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
  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      <Link href="/">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-600 hover:text-gray-900">
          <Home className="h-3 w-3" />
        </Button>
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-3 w-3 text-gray-400" />
          {item.href && !item.isCurrentPage ? (
            <Link href={item.href}>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-gray-600 hover:text-gray-900">
                {item.label}
              </Button>
            </Link>
          ) : (
            <span className={`px-2 py-1 rounded text-sm ${
              item.isCurrentPage 
                ? 'text-gray-900 font-medium bg-gray-100' 
                : 'text-gray-600'
            }`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}