// components/ui/NumberCircle.tsx
import { cn } from "@/lib/utils";

interface NumberCircleProps {
  readonly number: number;
  readonly className?: string;
}

export function NumberCircle({ number, className }: NumberCircleProps) {

    const getColor = (num: number) => {
    switch (num) {
      case 1:
        return "bg-yellow-400"; // gold
      case 2:
        return "bg-gray-400"; // silver
      case 3:
        return "bg-orange-400"; // bronze
      default:
        return "bg-primary"; // purple
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-semibold",
        getColor(number),
        className
      )}
    >
      {number}
    </div>
  );
}