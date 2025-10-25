import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconStar,
  IconCirclePlusFilled,
  IconChevronRight,
} from "@tabler/icons-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description: string;
  trend?: string; 
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
  const isPositive = !trend || !trend.trim().startsWith("-");

  return (
    <Card className={`border-[#E5E5E5] rounded-2xl w-[245.5px] h-[210px] ${className || ""}`}>
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

type ManageItem = {
  name: string;
  info: string;
  href?: string;
  avatarUrl?: string; 
  color?: string;     
};

interface ManageCardProps {
  title: string;
  items: ManageItem[];
  className?: string;
}

const ManageCard = ({ title, items, className }: ManageCardProps) => (
  <Card
    className={`border-[#E5E5E5] rounded-2xl w-[294px] h-[2434x] flex flex-col ${className || ""}`}
  >
    {/* Header */}
    <CardHeader className="pb-0">
      <CardTitle className="flex justify-between items-center text-left mb-0">
        <span className="text-lg font-semibold text-[#0A0A0A]">{title}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <IconChevronRight className="h-5 w-5 text-[#0A0A0A]" />
        </Button>
      </CardTitle>
    </CardHeader>

    {/* Content */}
    <CardContent className="px-0 overflow-hidden text-left">
      <div className="flex flex-col ml-6">
        {items.map((item, i) => (
          <div key={i} className="px-6">
            <div className="flex items-center gap-4 py-3">
              {/* Left icon */}
               {item.avatarUrl ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={item.avatarUrl} alt={item.name} />
                  <AvatarFallback className="bg-[#F3F3F3] text-[#0A0A0A] text-sm font-medium">
                    {item.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : item.color ? (
                <div
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              ) : null}

              {/* Text info */}
              <div className="min-w-0">
                {item.href ? (
                  <a
                    href={item.href}
                    className="block text-sm font-medium text-[#8065CD] truncate"
                  >
                    {item.name}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-[#8065CD] truncate">
                    {item.name}
                  </p>
                )}
                <p className="text-sm text-[#737373] truncate">{item.info}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E5E5] -mx-6" />
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
        <div className="flex justify-between items-center pb-4 mr-6 ml-6">
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
        />

        <StatsCard
          title="Completed Competitions to Date"
          value="3"
          subtitle="Up compared to last year"
          description="Engagement exceed targets"
        />

        <StatsCard
          title="User satisfaction"
          value="4.5"
          subtitle="Consistent performance"
          description="Users are enjoying the competitions"
          trend="+0.3"
          showStar 
        />
      </div>

      <div className="flex gap-4 mt-6 ml-6">
        <ManageCard
          title="Manage Accounts"
          items={[
            {
              avatarUrl: "../public/user-avatar.jpg",
              name: "shadcn",
              info: "shadcn@vercel.com",
            },
            {
              avatarUrl: "../public/user-avatar.jpg",
              name: "maxleiter",
              info: "maxleiter@vercel.com",
            },
          ]}
        />

        <ManageCard
          title="Manage Competitions"
          items={[
            { color: "#A52A56", name: "Comp1", info: "08/11/25" },
            { color: "#F2D340", name: "Comp2", info: "06/12/25" },
          ]}
        />

        <ManageCard
          title="Manage Questions"
          items={[
            { name: "Q1", info: "Date added: 08/11/25" },
            { name: "Q2", info: "Date added: 06/12/25" },
          ]}
        />

      </div>
    </div>
  );
}

export default AdminDashboard;