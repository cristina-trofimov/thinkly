import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { columns } from "../components/questionsTable/questionsColumns";
import type { Question } from "@/types/questions/QuestionPagination.type";
import {
  DataTable,
  type DifficultyFilter,
} from "../components/questionsTable/questionDataTable";
import { getCompetitions } from "@/api/CompetitionAPI";
import { getQuestionsPage } from "@/api/QuestionsAPI";
import { logFrontend } from "../api/LoggerAPI";
import type { Competition } from "@/types/competition/Competition.type";
import CompetitionItem from "@/components/helpers/CompetitionItem";
import HomePageBanner from "@/components/helpers/HomePageBanner";
import { useAnalytics } from "@/hooks/useAnalytics";

function HomePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [questionsPage, setQuestionsPage] = useState<number>(1);
  const [questionsPageSize, setQuestionsPageSize] = useState<number>(25);
  const [questionSearch, setQuestionSearch] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const {
    trackHomepageViewed,
    trackCalendarDateSelected,
    trackCompetitionItemClicked,
  } = useAnalytics();

  // Track page view once on mount
  useEffect(() => {
    trackHomepageViewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const getAllQuestions = async () => {
      try {
        const result = await getQuestionsPage({
          page: questionsPage,
          pageSize: questionsPageSize,
          search: questionSearch,
          difficulty:
            difficultyFilter === "all" ? undefined : difficultyFilter,
          sort: "asc",
        });
        setQuestions(result.items);
        setTotalQuestions(result.total);

        logFrontend({
          level: "DEBUG",
          message: `Finished question fetch successfully for page=${questionsPage}, pageSize=${questionsPageSize}, search=${questionSearch || "none"}, difficulty=${difficultyFilter}.`,
          component: "HomePage",
          url: globalThis.location.href,
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
          url: globalThis.location.href,
          stack: isError ? err.stack : undefined,
        });
      }
    };

    getAllQuestions();
  }, [difficultyFilter, questionSearch, questionsPage, questionsPageSize]);

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
          url: globalThis.location.href,
        });
      } catch (err: unknown) {
        const isError = err instanceof Error;
        const errorMessage = isError
          ? err.message
          : "Unknown error during competition fetch.";

        logFrontend({
          level: "ERROR",
          message: `API Error: Failed to fetch competitions. Reason: ${errorMessage}`,
          component: "HomePage",
          url: globalThis.location.href,
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

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      const competitionsOnDate = competitions.filter((c) => {
        const compDate = new Date(c.startDate);
        return compDate.toDateString() === newDate.toDateString();
      });
      trackCalendarDateSelected(
        newDate.toISOString().split("T")[0],
        competitionsOnDate.length
      );
    }
  };

  return (
    <div className="flex flex-col w-full px-4">
      <div className="flex w-full gap-6 items-start">
        <div className="flex flex-col flex-1 min-w-0 gap-4">
          <HomePageBanner competitions={competitions} />
          <div className="flex flex-col gap-4">
            <DataTable
              columns={columns}
              data={questions}
              total={totalQuestions}
              page={questionsPage}
              pageSize={questionsPageSize}
              search={questionSearch}
              difficultyFilter={difficultyFilter}
              onSearchChange={(value) => {
                setQuestionsPage(1);
                setQuestionSearch(value);
              }}
              onDifficultyFilterChange={(value) => {
                setQuestionsPage(1);
                setDifficultyFilter(value);
              }}
              onPageChange={setQuestionsPage}
              onPageSizeChange={(value) => {
                setQuestionsPage(1);
                setQuestionsPageSize(value);
              }}
            />
          </div>
        </div>

        <div className="flex flex-col w-[300px] shrink-0 gap-4 ml-auto">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
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
                <button
                  key={competition.id}
                  onClick={() =>
                    trackCompetitionItemClicked(
                      competition.competitionTitle,
                      competition.startDate.toISOString().split("T")[0]
                    )
                  }
                  className="w-full text-left"
                  type="button"
                >
                  <CompetitionItem
                    title={competition.competitionTitle}
                    date={competition.startDate.toLocaleDateString()}
                  />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
