import { Button } from "@/components/ui/button";
import { IconCirclePlusFilled } from "@tabler/icons-react";
import { StatsCard } from "./StatsCard";
import { ManageCard } from "./ManageCard";
import { TechnicalIssuesChart } from "./TechnicalIssuesChart";

export function AdminDashboard() {
  return (
    <div className="flex flex-col w-full">
      <div className="w-[calc(100vw-var(--sidebar-width))] relative left-[calc(-1rem)] border-b border-[#E5E5E5] bg-white">
        <div className="flex justify-between items-center py-4 px-10">
          <h1 className="text-base font-semibold text-[#8065CD]">Overview</h1>
          <Button className="bg-[#8065CD] hover:bg-[#6a51b8] text-white flex items-center gap-2 rounded-lg w-[177px] h-[32px]">
            <IconCirclePlusFilled className="h-4 w-4 text-white" />
            <span className="text-sm font-medium">Create Competition</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-6 mt-6 px-6">
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

      <div className="flex gap-4 mt-6 px-6">
        <ManageCard
          title="Manage Accounts"
          items={[
            { avatarUrl: "../public/assets/user_avatar.jpg", name: "shadcn", info: "shadcn@vercel.com" },
            { avatarUrl: "../public/assets/user_avatar.jpg", name: "maxleiter", info: "maxleiter@vercel.com" },
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

      <TechnicalIssuesChart />
    </div>
  );
}

export default AdminDashboard;