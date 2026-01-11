import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { columns } from "../components/questionsTable/questionsColumns";
import type { Question } from "@/types/questions/Question.type";
import { DataTable } from "../components/questionsTable/questionDataTable";
import { getCompetitions } from "@/api/CompetitionAPI";
import { getQuestions } from "@/api/QuestionsAPI";
import { logFrontend } from "../api/LoggerAPI";
import type { Competition } from "@/types/competition/Competition.type";
import CompetitionItem from "@/components/helpers/CompetitionItem";
import HomePageBanner from "@/components/helpers/HomePageBanner";

function HomePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    const getAllQuestions = async () => {
      try {
        const data = await getQuestions();
        setQuestions(data);

        logFrontend({
          level: "DEBUG",
          message: `Finished initial data fetch for questions successfully.`,
          component: "HomePage",
          url: window.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during question fetch.";

        console.error("Error fetching questions:", err);

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch questions. Reason: ${errorMessage}`,
          component: "HomePage",
          url: window.location.href,
          stack: isError ? err.stack : undefined,
        });
      }
    };

    getAllQuestions();
  }, []);

  useEffect(() => {
    const getAllCompetitions = async () => {
      try {
        const data = await getCompetitions();
        const transformedData = data.map((c) => ({
          ...c,
          startDate: new Date(c.startDate),
          endDate: new Date(c.endDate),
        }));
        setCompetitions(transformedData);

        logFrontend({
          level: "DEBUG",
          message: `Competitions data loaded.`,
          component: "HomePage",
          url: window.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during competition fetch.";

        console.error("Error fetching competitions:", err);

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch competitions. Reason: ${errorMessage}`,
          component: "HomePage",
          url: window.location.href,
          stack: isError ? err.stack : undefined,
        });
      }
    };
    getAllCompetitions();
  }, []);

  const competitionsForSelectedDate = useMemo(() => {
    if (!date) return [];
    return competitions.filter((c) => {
      const compDate = new Date(c.startDate);
      return compDate.toDateString() === date.toDateString();
    });
  }, [date, competitions]);

  const competitionDates = competitions.map((c) => c.startDate);

  return (
    <>
      <div className="flex flex-col w-[calc(100vw-var(--sidebar-width)-3rem)] ml-4">
        <div className="flex w-full gap-4 items-start">
          <div className="flex flex-col w-full gap-4">
            <HomePageBanner competitions={competitions} />
            <div className="flex flex-col gap-4">
              <div className="container mx-auto">
                <DataTable columns={columns} data={questions} />
              </div>
            </div>
          </div>

          <div className="flex flex-col w-[300px] gap-4 ml-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm self-end w-full"
              captionLayout="dropdown"
              modifiers={{ competition: competitionDates }}
              modifiersClassNames={{
                competition:
                  "relative after:content-[''] after:absolute after:bottom-[4px] after:left-1/2 after:-translate-x-1/2 after:w-[6px] after:h-[6px] after:rounded-full after:bg-primary",
              }}
            />

            <div className="w-[300px] flex flex-col gap-2 rounded-lg p-4 bg-primary/10">
              <p className="text-left text-lg font-semibold mb-1">
                Competitions on {date?.toLocaleDateString() ?? "—"}
              </p>
              {competitionsForSelectedDate.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  No competitions on this date
                </p>
              ) : (
                competitionsForSelectedDate.map((competition) => (
                  <CompetitionItem
                    key={competition.id}
                    title={competition.competitionTitle}
                    date={competition.startDate.toLocaleDateString()}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;