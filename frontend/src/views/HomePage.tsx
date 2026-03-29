import { useState, useEffect, useMemo, useRef } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

export function BannerSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* The main banner area */}
      <Skeleton className="h-[225px] w-full rounded-xl" />
    </div>
  );
}

function HomePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [questionsPage, setQuestionsPage] = useState<number>(1);
  const [questionsPageSize, setQuestionsPageSize] = useState<number>(25);
  const [questionSearchInput, setQuestionSearchInput] = useState<string>("");
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCompLoading, setIsCompLoading] = useState<boolean>(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(false);
  const latestQuestionRequestId = useRef(0);

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
    const timeout = globalThis.setTimeout(() => {
      setQuestionSearchQuery(questionSearchInput.trim());
    }, 250);

    return () => globalThis.clearTimeout(timeout);
  }, [questionSearchInput]);

  useEffect(() => {
    const getAllQuestions = async () => {
      const requestId = ++latestQuestionRequestId.current;
      setIsLoading(true);
      try {
        const result = await getQuestionsPage({
          page: questionsPage,
          pageSize: questionsPageSize,
          search: questionSearchQuery,
          difficulty:
            difficultyFilter === "all" ? undefined : difficultyFilter,
          sort: "asc",
        });
        if (requestId !== latestQuestionRequestId.current) {
          return;
        }
        setQuestions(result.items);
        setTotalQuestions(result.total);

        logFrontend({
          level: "DEBUG",
          message: `Finished question fetch successfully for page=${questionsPage}, pageSize=${questionsPageSize}, search=${questionSearchQuery || "none"}, difficulty=${difficultyFilter}.`,
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
      } finally {
        if (requestId === latestQuestionRequestId.current) {
          setIsLoading(false);
        }
      }
    };

    getAllQuestions();
  }, [difficultyFilter, questionSearchQuery, questionsPage, questionsPageSize]);

  useEffect(() => {
    const getAllCompetitions = async () => {
      setIsCompLoading(true);
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
      } finally {
        setIsCompLoading(false);
      }
    };
    getAllCompetitions();
  }, []);

  useEffect(() => {
    if (isCompLoading) {
      setBannerVisible(false);
      return;
    }

    const frame = globalThis.requestAnimationFrame(() => {
      setBannerVisible(true);
    });

    return () => globalThis.cancelAnimationFrame(frame);
  }, [isCompLoading]);

  useEffect(() => {
    if (isCompLoading || isLoading || !bannerVisible) {
      setQuestionsVisible(false);
      return;
    }

    const frame = globalThis.requestAnimationFrame(() => {
      setQuestionsVisible(true);
    });

    return () => globalThis.cancelAnimationFrame(frame);
  }, [bannerVisible, isCompLoading, isLoading]);

  const shouldShowQuestionSkeleton =
    isLoading || isCompLoading || !bannerVisible || !questionsVisible;

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
          {isCompLoading ? (
            <BannerSkeleton />
          ) : (
            <div
              className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${bannerVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
            >
              <HomePageBanner competitions={competitions} />
            </div>
          )}
          <div className="flex flex-col gap-4">
            <DataTable
              columns={columns}
              data={questions}
              total={totalQuestions}
              page={questionsPage}
              pageSize={questionsPageSize}
              search={questionSearchInput}
              difficultyFilter={difficultyFilter}
              loading={shouldShowQuestionSkeleton}
              contentVisible={questionsVisible}
              onSearchChange={(value) => {
                setQuestionsPage(1);
                setQuestionSearchInput(value);
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

        <div className="flex flex-col w-75 shrink-0 gap-4 ml-auto">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-md border shadow-sm self-end w-full [&_.rdp-day]:aspect-auto [&_.rdp-day]:h-9"
            captionLayout="dropdown"
            modifiers={{ competition: competitionDates }}
            modifiersClassNames={{
              competition:
                "relative after:content-[''] after:absolute after:bottom-[4px] after:left-1/2 after:-translate-x-1/2 after:w-[6px] after:h-[6px] after:rounded-full after:bg-primary",
            }}
          />

          <div className="w-75 flex flex-col gap-2 rounded-lg p-4 bg-background border shadow-md">
            <p className="text-left text-lg font-semibold mb-1">
              Events starting on {date?.toLocaleDateString() ?? "—"}
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
                    location={competition.competitionLocation}
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
