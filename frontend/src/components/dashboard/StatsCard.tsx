import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTrendingUp, IconTrendingDown, IconStar } from "@tabler/icons-react";

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description: string;
  trend?: string;
  showStar?: boolean;
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  description,
  trend,
  showStar = false,
  className,
}: StatsCardProps) => {
  const isPositive = !trend || !trend.trim().startsWith("-");

  return (
    <Card className={`border-[#E5E5E5] rounded-2xl w-[245.5px] h-[210px] ${className || ""}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-normal text-[#737373] text-left">
            {title}
          </CardTitle>

          {trend && (
            <div className="flex items-center gap-1 rounded-md border border-[#E5E5E5] px-2 py-[2px] bg-white">
              {isPositive ? (
                <IconTrendingUp className="h-4 w-4 text-[#8065CD]" />
              ) : (
                <IconTrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${isPositive ? "text-[#8065CD]" : "text-red-500"}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="text-left">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-semibold text-[#0A0A0A]">{value}</h2>
          {showStar && <IconStar className="h-5 w-5 text-[#8065CD]" />}
        </div>

        {subtitle && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-normal text-[#0A0A0A]">{subtitle}</span>
            {isPositive ? (
              <IconTrendingUp className="h-4 w-4 text-[#0A0A0A]" />
            ) : (
              <IconTrendingDown className="h-4 w-4 text-[#0A0A0A]" />
            )}
          </div>
        )}

        <p className="text-sm font-normal text-[#737373] leading-5">{description}</p>
      </CardContent>
    </Card>
  );
};