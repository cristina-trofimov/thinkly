import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IconChevronRight } from "@tabler/icons-react";

export type ManageItem = {
  name: string;
  info: string;
  href?: string;
  avatarUrl?: string;
  color?: string;
};

export interface ManageCardProps {
  title: string;
  items: ManageItem[];
  className?: string;
}

export const ManageCard = ({ title, items, className }: ManageCardProps) => (
  <Card className={`flex flex-col ${className || ""}`}>
    <CardHeader>
      <CardTitle className="flex justify-between items-center text-left">
        <span className="text-lg font-semibold text-[var(--color-foreground)]">{title}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <IconChevronRight className="h-5 w-5 text-[var(--color-foreground)]" />
        </Button>
      </CardTitle>
    </CardHeader>

    <CardContent className="px-0 overflow-hidden text-left">
      <div className="flex flex-col ml-6">
        {items.map((item) => (
          <div key={item.name} className="px-6">
            <div className="flex items-center gap-4 py-3">
              {item.avatarUrl ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={item.avatarUrl} alt={item.name} className="object-cover" />
                  <AvatarFallback className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-sm font-medium">
                    {item.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : item.color && (
                <div className="h-8 w-8 rounded-full" style={{ backgroundColor: item.color }} />
              )}

              <div className="min-w-0">
                {item.href ? (
                  <a href={item.href} className="block text-sm font-medium text-[var(--color-primary)] truncate">
                    {item.name}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-[var(--color-primary)] truncate">{item.name}</p>
                )}
                <p className="text-sm text-muted-foreground truncate">{item.info}</p>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)] -mx-6" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);