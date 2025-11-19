import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface StatsCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  description?: string;
  trend?: string;
  className?: string;
  children?: ReactNode;
  dateSubtitle?: string;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  description,
  trend,
  className,
  children,
  dateSubtitle,
}: StatsCardProps) => {
  const isPositive = !trend || !trend.trim().startsWith("-");

  // Chart card mode (when children is provided)
  if (children) {
    return (
      <Card className={`flex-1 border-[var(--color-border)] bg-[var(--color-card)] ${className || ""}`}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg font-medium text-[var(--color-muted-foreground)] text-center`}>
            {title}
          </CardTitle>
          {dateSubtitle && (
            <p className={`text-xs text-[var(--color-ring] text-center mt-1`}>{dateSubtitle}</p>
          )}
        </CardHeader>
        <CardContent className={ "flex items-center justify-center"}>
          {children}
        </CardContent>
      </Card>
    );
  }

  // Metric card mode 
  return (
    <Card className={`flex-1 ${className || ""}`}>
      <CardHeader className="pb-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium text-[var(--color-muted-foreground)] text-center">
            {title}
          </CardTitle>

          {trend && (
            <div className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1 bg-[var(--color-card)]">
              {isPositive ? (
                <IconTrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
              ) : (
                <IconTrendingDown className="h-4 w-4 text-[var(--color-destructive)]" />
              )}
              <span className={`text-sm font-medium ${isPositive ? "text-[var(--color-primary)]" : "text-[var(--color-destructive)]"}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="text-left pt-0">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-5xl font-semibold text-[var(--color-foreground)]">{value}</h2>
        </div>

        {subtitle && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-sm font-normal text-[var(--color-foreground)]">{subtitle}</span>
            {isPositive ? (
              <IconTrendingUp className="h-4 w-4 text-[var(--color-foreground)]" />
            ) : (
              <IconTrendingDown className="h-4 w-4 text-[var(--color-foreground)]" />
            )}
          </div>
        )}

        {description && (
          <p className="text-ml font-normal text-[var(--color-muted-foreground)] leading-5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};