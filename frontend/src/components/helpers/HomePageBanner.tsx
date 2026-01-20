import { useState, useEffect, useMemo } from "react";
import { Circle, Hourglass } from "lucide-react";
import { Button } from "../ui/button";

interface Competition {
  id: number;
  competitionTitle: string;
  competitionLocation: string;
  startDate: Date;
  endDate: Date;
}

interface HomePageBannerProps {
  competitions: Competition[];
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function HomePageBanner({ competitions }: HomePageBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const competitionData = useMemo(() => {
    const now = currentTime;
    
    const activeCompetition = competitions.find(
      (c) => new Date(c.startDate) <= now && new Date(c.endDate) >= now
    );
    
    if (activeCompetition) {
      return { competition: activeCompetition, status: "active" as const };
    }
    
    const upcomingCompetitions = competitions
      .filter((c) => new Date(c.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    if (upcomingCompetitions.length > 0) {
      return { competition: upcomingCompetitions[0], status: "upcoming" as const };
    }
    
    return null;
  }, [competitions, currentTime]);

  useEffect(() => {
    if (competitionData?.status === "upcoming") {
      const startTime = new Date(competitionData.competition.startDate).getTime();
      const now = currentTime.getTime();
      const diff = startTime - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      } else {
        setTimeRemaining(null);
      }
    } else {
      setTimeRemaining(null);
    }
  }, [competitionData, currentTime]);

  // No competitions case
  if (!competitionData) {
    return (
      <div className="flex flex-col justify-center min-h-[232px] bg-linear-to-b from-primary to-purple-700 p-7 rounded-lg">
        <h1 className="text-5xl font-bold text-white mb-2">
          Welcome to Thinkly Competitions!
        </h1>
        <p className="text-white text-lg mb-3">
          There are no competitions at the moment, but new challenges are on the way. Check back soon!
        </p>
      </div>
    );
  }

  const { competition, status } = competitionData;

  // Active competition
  if (status === "active") {
    return (
      <div className="bg-linear-to-b from-primary to-purple-700 p-7 rounded-lg">
        <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
          <Circle className="mr-2 h-2 w-2 animate-pulse fill-green-400 text-green-400" />
          Active now
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">
          {competition.competitionTitle}
        </h1>
        <p className="text-white text-lg mb-3">
          Challenge yourself and join the competition now by clicking below!
        </p>
        <Button
          variant="outline"
          className="rounded-lg font-semibold cursor-pointer text-primary hover:text-primary"
        >
          Join Competition →
        </Button>
      </div>
    );
  }

  // Upcoming competition
  return (
    <div className="min-h-[232px] bg-linear-to-b from-primary to-purple-700 p-7 rounded-lg">
      <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
        <Hourglass className="mr-2 h-4 w-4 text-yellow-300" />
        {timeRemaining && (
          <span>
            {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
          </span>
        )}
      </div>
      <h1 className="text-5xl font-bold text-white mb-2">
        {competition.competitionTitle}
      </h1>
      <p className="text-white text-lg mb-3">
        Get ready! The competition starts on {new Date(competition.startDate).toLocaleDateString()} at {new Date(competition.startDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit',})}.
      </p>
    </div>
  );
}