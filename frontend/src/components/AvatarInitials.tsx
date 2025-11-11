// helper component to display user initials as avatar in the manage accounts table and when you click edit user
interface AvatarInitialsProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-30 w-30 text-4xl",
};

export function getInitials(name: string): string {
  const nameSeparated = name.trim().split(" ").filter(Boolean);
  
  const firstInitial = nameSeparated[0]?.[0].toUpperCase() ?? "";
  const lastInitial =
    nameSeparated[nameSeparated.length - 1]?.[0].toUpperCase() ?? "";
  
  return `${firstInitial}${lastInitial}`;
}

export function AvatarInitials({
  name,
  size = "md",
  className = "",
}: AvatarInitialsProps) {
  const initials = getInitials(name);
  
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-muted text-primary font-semibold ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </span>
  );
}