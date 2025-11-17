import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { ManageCard } from "./ManageCard";
import { TechnicalIssuesChart } from "./TechnicalIssuesChart";
import CreateCompetitionDialog from "./CreateCompetitionDialog";

export function AdminDashboard() {
  const location = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isRootDashboard =
    location.pathname === "/app/dashboard" ||
    location.pathname === "/app/dashboard/";

  return (
    <div className="flex flex-col w-full">
      {isRootDashboard ? (
        <>
          <div className="border-b border-[#E5E5E5] bg-white">
            <div className="flex justify-between items-center py-4 px-10">
              <h1 className="text-base font-semibold text-[#8065CD]">
                Overview
              </h1>
            </div>
          </div>
           <div className="flex gap-4 mt-6 px-6">
            <Link
              to="/app/dashboard/manageAccounts"
              className="cursor-pointer block"
            >
              <ManageCard
                title="Manage Accounts"
                items={[
                  {
                    avatarUrl: "../public/assets/user_avatar.jpg",
                    name: "shadcn",
                    info: "shadcn@vercel.com",
                  },
                  {
                    avatarUrl: "../public/assets/user_avatar.jpg",
                    name: "maxleiter",
                    info: "maxleiter@vercel.com",
                  },
                ]}
              />
            </Link>
            <Link
              to="/app/dashboard/competitions"
              className="cursor-pointer block"
            >
              <ManageCard
                title="Manage Competitions"
                items={[
                  { color: "#A52A56", name: "Comp1", info: "08/11/25" },
                  { color: "#F2D340", name: "Comp2", info: "06/12/25" },
                ]}
              />
            </Link>
            <ManageCard
              title="Manage Questions"
              items={[
                { name: "Q1", info: "Date added: 08/11/25" },
                { name: "Q2", info: "Date added: 06/12/25" },
              ]}
            />
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
          <TechnicalIssuesChart />
        </>
      ) : (
        <div className="px-6 mt-6">
          <Outlet />
        </div>
      )}
      <CreateCompetitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        key={dialogOpen ? "open" : "closed"}
      />
    </div>
  );
}

export default AdminDashboard;
