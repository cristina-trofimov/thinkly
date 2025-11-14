// helper component to display user initials as avatar in the manage accounts table and when you click edit user
interface AvatarInitialsProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-30 w-30 text-4xl",
};

function getInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName?.[0]?.toUpperCase() ?? "";
  const lastInitial = lastName?.[0]?.toUpperCase() ?? "";

  return `${firstInitial}${lastInitial}`;
}

export function AvatarInitials({
  firstName,
  lastName,
  size = "md",
  className = "",
}: Readonly<AvatarInitialsProps>) {
  const initials = getInitials(firstName, lastName);

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-muted text-primary font-semibold ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </span>
  );
}
