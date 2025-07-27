import { Plus, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  icon?: LucideIcon;
}

export function FloatingActionButton({ onClick, className = "", icon: Icon = Plus }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={`md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 p-0 ${className}`}
    >
      <Icon className="h-6 w-6 text-white" />
    </Button>
  );
}