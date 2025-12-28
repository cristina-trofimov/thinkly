import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "../components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
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
          level: "DEBUG", // <--- Now using DEBUG level
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

        // Log the error to the backend
        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch questions. Reason: ${errorMessage}`,
          component: "HomePage",
          url: window.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
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
          date: new Date(c.date), // Convert string to Date
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

        // Log the error to the backend
        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch competitions. Reason: ${errorMessage}`,
          component: "HomePage",
          url: window.location.href,
          stack: isError ? err.stack : undefined, // Safely access stack
        });
      }
    };
    getAllCompetitions();
  }, []);

  const competitionsForSelectedDate = useMemo(() => {
    if (!date) return [];
    return competitions.filter((c) => {
      // Create a new Date object from the string before calling toDateString
      const compDate = new Date(c.date);
      return compDate.toDateString() === date.toDateString();
    });
  }, [date, competitions]);

  const competitionDates = competitions.map((c) => c.date);

  return (
    <>
      <div className="flex flex-col w-[calc(100vw-var(--sidebar-width)-3rem)] ml-4">
        {/* <Button className="relative h-[20vh] w-full text-base bg-primary hover:bg-border hover:text-black">
          <div className="absolute top-1 left-4">
            <h1 className="text-[clamp(1rem,3vw,2rem)] text-left font-semibold leading-tight">
              It's Competition Time!
            </h1>
            <p className="text-[clamp(0.5rem,2vw,1rem)] text-left mt-1">
              Click here to join in on the competition
            </p>
          </div>
        </Button> */}

        {/* This section of div is for calendar and search bar and table */}
        <div className="flex w-full  gap-6 items-start">
          <div className="flex flex-col w-full gap-4">
            <HomePageBanner date={date ?? new Date()} />
            {/* This div is for search and table */}
            <div className="flex flex-col gap-4">
              <div className="container mx-auto ">
                <DataTable columns={columns} data={questions} />
              </div>
            </div>
          </div>

          <div className="flex flex-col w-[300px] gap-4 ml-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className=" rounded-md border shadow-sm self-end w-full"
              captionLayout="dropdown"
              modifiers={{ competition: competitionDates }}
              modifiersClassNames={{
                competition:
                  "relative after:content-[''] after:absolute after:bottom-[4px] after:left-1/2 after:-translate-x-1/2 after:w-[6px] after:h-[6px] after:rounded-full after:bg-primary",
              }}
            />

            {/* <h2 className="text-left text-xl font-semibold mb-2">
              Competitions on {date?.toLocaleDateString() ?? "—"}
            </h2> */}

            <div className="w-[300px] flex flex-col gap-2 rounded-lg p-4 bg-secondary">
              <p className="text-left text-lg font-semibold mb-2">
              Competitions on {date?.toLocaleDateString() ?? "—"}
            </p>
              {competitionsForSelectedDate.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  No competitions on this date
                </p>
              ) : (
                competitionsForSelectedDate.map((competition) => (
                  // <Item
                  //   key={competition.competitionTitle}
                  //   variant="outline"
                  //   className="w-[300px] h-[100px] flex items-center justify-between overflow-hidden"
                  // >
                  //   <ItemContent className="w-[70%] overflow-hidden justify-center items-center">
                  //     <ItemTitle className="truncate font-semibold text-center">
                  //       {competition.competitionTitle}-
                  //       {competition.date.toLocaleDateString()}
                  //     </ItemTitle>
                  //   </ItemContent>
                  // </Item>
                  <CompetitionItem 
                  title={competition.competitionTitle}
                  date={competition.date.toLocaleDateString()}/>
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
