import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconStar,
  IconCirclePlusFilled,
} from "@tabler/icons-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description: string;
  trend?: string; // e.g. "+10%" or "-5%"
  showStar?: boolean;
  className?: string;
}

const StatsCard = ({
  title,
  value,
  subtitle,
  description,
  trend,
  showStar = false,
  className,
}: StatsCardProps) => {
  // Automatically detect trend direction
  const isPositive = !trend || !trend.trim().startsWith("-");

  return (
    <Card className={`border-[#E5E5E5] rounded-2xl ${className || ""}`}>
      {/* Header */}
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
              <span
                className={`text-xs font-medium ${
                  isPositive ? "text-[#8065CD]" : "text-red-500"
                }`}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="text-left">
        {/* Value */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-2xl font-semibold text-[#0A0A0A]">{value}</h2>
          {showStar && <IconStar className="h-5 w-5 text-[#8065CD]" />}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm font-normal text-[#0A0A0A]">
              {subtitle}
            </span>
            {isPositive ? (
              <IconTrendingUp className="h-4 w-4 text-[#0A0A0A]" />
            ) : (
              <IconTrendingDown className="h-4 w-4 text-[#0A0A0A]" />
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm font-normal text-[#737373] leading-5">{description}</p>
      </CardContent>
    </Card>
  );
};


interface ManageCardProps {
  title: string;
  items: Array<{ icon?: string; name: string; info: string }>;
}

const ManageCard = ({ title, items }: ManageCardProps) => (
  <Card className="border-[#E5E5E5]">
    <CardHeader>
      <CardTitle className="flex justify-between items-center text-left">
        {title}
        <Button variant="ghost" className="h-8 w-8 p-0">
          &gt;
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4 text-left">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-4">
            {item.icon && (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                {item.icon}
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.info}</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export function AdminDashboard() {
  return (
    <div className="pl-6">
      <div className="border-b border-[#E5E5E5] mt-6">
        <div className="flex justify-between items-center pb-4">
          <h1 className="text-base font-semibold text-[#8065CD]">Overview</h1>
          <Button className="bg-[#8065CD] hover:bg-[#6a51b8] text-white flex items-center gap-2 rounded-lg w-[177px] h-[32px]">
            <IconCirclePlusFilled className="h-4 w-4 text-white" />
            <span className="text-sm font-medium">Create Competition</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-6 mt-6 ml-6">
        <StatsCard
          title="New Accounts"
          value="25"
          subtitle="Up 10% this year"
          description="More users are joining Thinkly"
          trend="+10%"
          className="w-[245.5px] h-[198px]"
        />

        <StatsCard
          title="Completed Competitions to Date"
          value="3"
          subtitle="Up compared to last year"
          description="Engagement exceed targets"
          className="w-[245.5px] h-[198px]"
        />

        <StatsCard
          title="User satisfaction"
          value="4.5"
          subtitle="Consistent performance"
          description="Users are enjoying the competitions"
          trend="+0.3"
          showStar 
          className="w-[245.5px] h-[198px]"
        />
      </div>

      <div className="flex gap-4 mt-6 ml-6">
        <div className="w-[294px] h-[239px]">
          <ManageCard
            title="Manage Accounts"
            items={[
              {
                icon: "👤",
                name: "shadcn",
                info: "shadcn@vercel.com",
              },
              {
                icon: "👤",
                name: "maxleiter",
                info: "maxleiter@vercel.com",
              },
            ]}
          />
        </div>
        <div className="w-[294px] h-[239px]">
          <ManageCard
            title="Manage Competitions"
            items={[
              {
                name: "Comp1",
                info: "08/11/25",
              },
              {
                name: "Comp2",
                info: "06/12/25",
              },
            ]}
          />
        </div>
        <div className="w-[294px] h-[239px]">
          <ManageCard
            title="Manage Questions"
            items={[
              {
                name: "Q1",
                info: "Date added: 08/11/25",
              },
              {
                name: "Q2",
                info: "Date added: 06/12/25",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;