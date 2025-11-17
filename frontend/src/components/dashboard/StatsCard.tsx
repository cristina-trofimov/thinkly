import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

export interface StatsCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  description?: string;
  trend?: string;
  className?: string;
  children?: any;
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
      <Card className={`border-[#E5E5E5] rounded-2xl flex-1 ${className || ""}`}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg font-medium text-[#737373] text-center`}>
            {title}
          </CardTitle>
          {dateSubtitle && (
            <p className={`text-xs text-[#A3A3A3] text-center mt-1`}>{dateSubtitle}</p>
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
    <Card className={`border-[#E5E5E5] rounded-2xl flex-1 ${className || ""}`}>
      <CardHeader className="pb-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium text-[#737373] text-center">
            {title}
          </CardTitle>

          {trend && (
            <div className="flex items-center gap-1 rounded-md border border-[#E5E5E5] px-3 py-1 bg-white">
              {isPositive ? (
                <IconTrendingUp className="h-4 w-4 text-[#8065CD]" />
              ) : (
                <IconTrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isPositive ? "text-[#8065CD]" : "text-red-500"}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="text-left pt-0">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-5xl font-semibold text-[#0A0A0A]">{value}</h2>
        </div>

        {subtitle && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-sm font-normal text-[#0A0A0A]">{subtitle}</span>
            {isPositive ? (
              <IconTrendingUp className="h-4 w-4 text-[#0A0A0A]" />
            ) : (
              <IconTrendingDown className="h-4 w-4 text-[#0A0A0A]" />
            )}
          </div>
        )}

        {description && (
          <p className="text-ml font-normal text-[#737373] leading-5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};