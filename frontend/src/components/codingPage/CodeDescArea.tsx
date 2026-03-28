import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  FileText,
  History,
  Trophy,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EventLeaderboard } from "@/components/leaderboards/CodingPageLeaderboard";
import type {
  Question,
  TestCase,
} from "@/types/questions/QuestionPagination.type";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getAllSubmissions } from "@/api/SubmissionAPI";

import RiddleUserForm from "../forms/RiddleForm";
import { getRiddleById } from "@/api/RiddlesAPI";
import type { Riddle } from "@/types/riddle/Riddle.type";
import { toast } from "sonner";

import { TimeAgoFormat } from "../helpers/TimeAgoFormat";
import { logFrontend } from "@/api/LoggerAPI";
import { getAllLanguages } from "@/api/LanguageAPI";
import type { Language } from "@/types/questions/Language.type";
import SubmissionDetail from "./SubmissionDetail";
import type { QuestionInstance } from "@/types/questions/QuestionInstance.type";
import type { UserQuestionInstance } from "@/types/submissions/UserQuestionInstance.type";
import type { SubmissionType } from "../../types/submissions/SubmissionType.type";
import { SubmissionResult, SubmissionResultSkeleton } from "./SubmissionResult";
import { getDiffColor } from "@/utils/difficultyBadge";

const CodeDescArea = ({
  question,
  question_instance,
  uqi,
  testcases,
  eventId,
  eventName,
  isCompetitionEvent,
  currentUserId,
  submissionState,
  latestSubmissionResult,
  onRiddleSolved,
}: {
  question: Question | undefined;
  question_instance: QuestionInstance | undefined | null;
  uqi: UserQuestionInstance | undefined | null;
  testcases: TestCase[] | undefined | null;
  /** The ID of the active competition/event, if the question was opened from one. */
  eventId: number | undefined;
  /** The display name of the active event. */
  eventName: string | undefined;
  /** True when the event is a Competition, false when AlgoTime. Ignored when eventId is undefined. */
  isCompetitionEvent: boolean;
  currentUserId?: number;
  /** Driven by the parent when the user hits Submit. */
  submissionState?: "idle" | "loading" | "done";
  /** The latest submission returned by the API once submissionState === 'done'. */
  latestSubmissionResult?: SubmissionType | null;
  /** Called by the parent (CodingView) when the user solves the riddle, so the real uqi state is updated. */
  onRiddleSolved?: () => void;
}) => {
  const hasEvent = eventId !== undefined;

  const baseTabs = [
    { id: "description", label: "Description", icon: <FileText /> },
    { id: "submissions", label: "Submissions", icon: <History /> },
    { id: "result", label: "Result", icon: <ClipboardCheck /> },
  ];

  // Only expose the Leaderboard tab when the question belongs to an event
  const tabs = hasEvent
    ? [
        ...baseTabs,
        { id: "leaderboard", label: "Leaderboard", icon: <Trophy /> },
      ]
    : baseTabs;

  const { trackCodingTabSwitched } = useAnalytics();

  const [activeTab, setActiveTab] = useState("description");
  const [allLanguages, setAllLanguages] = useState<Language[] | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionType | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionType[]>();

  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [isLoadingRiddle, setIsLoadingRiddle] = useState(true);

  // Auto-switch to the Result tab whenever a submission starts or finishes
  useEffect(() => {
    if (submissionState === "loading" || submissionState === "done") {
      setActiveTab("result");
    }
  }, [submissionState]);

  useEffect(() => {
    if (!hasEvent && activeTab === "leaderboard") {
      setActiveTab("description");
    }
  }, [hasEvent, activeTab]);

  useEffect(() => {
    if (!question_instance?.riddle_id) {
      setIsLoadingRiddle(false);
      return;
    }
    if (uqi?.riddle_complete) {
      setIsLoadingRiddle(false);
      return;
    }

    const fetchRiddle = async () => {
      try {
        await getRiddleById(question_instance.riddle_id).then((resp) =>
          setRiddle(resp),
        );
      } catch (error) {
        toast.error("Failed to load riddle...");
        logFrontend({
          level: "ERROR",
          message: `An error occurred when loading riddle. Reason: ${error}`,
          component: "CodeDescArea",
          url: globalThis.location.href,
          stack: (error as Error).stack,
        });
      } finally {
        setIsLoadingRiddle(false);
      }
    };
    fetchRiddle();
  }, [question_instance, uqi?.riddle_complete]);

  useEffect(() => {
    if (uqi?.user_question_instance_id) {
      const FetchSubmissions = async () => {
        const [subs, langs] = await Promise.all([
          getAllSubmissions(uqi?.user_question_instance_id),
          getAllLanguages(null),
        ]);

        setSubmissions(subs);
        setAllLanguages(langs);
      };
      FetchSubmissions();
    }
  }, [uqi]);

  if (!question || !question_instance || !uqi) return;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    trackCodingTabSwitched(
      question.question_id,
      tab as "description" | "submissions" | "leaderboard",
    );
  };

  //Riddle Rendering Start-----------------------------------------------
  if (question_instance?.riddle_id && !uqi?.riddle_complete) {
    // Needs to solve riddle
    if (isLoadingRiddle || !riddle) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading challenge lock...</p>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-center">
            {question.question_name}
          </h2>
          <RiddleUserForm riddle={riddle} onSolved={onRiddleSolved} />
        </div>
      </div>
    );
  }
  //Riddle Rendering End-------------------------------------------------
  return (
    <Tabs
      data-testid="tabs"
      defaultValue="description"
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full h-full"
    >
      <TabsList
        data-testid="tabs-list"
        variant="line"
        className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap border-border/75 dark:border-border/50"
      >
        {tabs.map((t) => {
          // Pulse the Result tab trigger while a submission is in flight
          const isResultLoading =
            t.id === "result" && submissionState === "loading";

          return (
            <TabsTrigger
              data-testid="tabs-trigger"
              key={t.id}
              value={t.id}
              className={`shrink-0 px-4 ${isResultLoading ? "animate-pulse" : ""}`}
            >
              {t.icon}
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Description */}
      <TabsContent value="description" data-testid="tabs-content-description">
        <div className="h-full p-6">
          <div>
            <h1 className="text-xl font-bold mb-3">{question.question_name}</h1>
            <div className="mb-4">
              <span
                className={`inline-flex w-fit items-center justify-center rounded-full px-2 py-1 text-[14px] leading-none ${getDiffColor(question.difficulty)}`}
              >
                {question.difficulty.replace(/^\w/, (c) => c.toUpperCase())}
              </span>
            </div>
          </div>
          <p className="text-left leading-6 break-words whitespace-pre-wrap overflow-y-auto max-h-96">
            {question.question_description}
          </p>
          {testcases?.map((t, idx) => {
            return (
              <div
                key={`example ${idx + 1}`}
                className="mt-3 flex flex-col gap-1"
              >
                <p className="font-bold">Example {idx + 1}:</p>
                <div className="ml-4 flex flex-col gap-1">
                  <p className="font-bold">
                    Inputs{" "}
                    <span className="font-normal">
                      {Object.entries(
                        t.input_data as Record<string, unknown>,
                      ).map(([key, val], idx) => {
                        const separator =
                          idx <
                          Object.keys(t.input_data as Record<string, unknown>)
                            .length -
                            1
                            ? `, `
                            : `\n`;
                        return `${key} = ${JSON.stringify(val)}${separator}`;
                      })}
                    </span>
                  </p>
                  <p className="font-bold">
                    Outputs:{" "}
                    <span className="font-normal">
                      {JSON.stringify(t.expected_output, undefined, 2)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      {/* Submissions */}
      <TabsContent value="submissions" data-testid="tabs-content-submissions">
        <div className="h-full p-6">
          {selectedSubmission && (
            <SubmissionDetail
              selectedSubmission={selectedSubmission}
              goBack={() => setSelectedSubmission(null)}
            />
          )}

          {!selectedSubmission && (!submissions || submissions?.length < 1) && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              You've yet to submit anything
            </div>
          )}

          {!selectedSubmission && submissions && submissions?.length > 0 && (
            <Table data-testid="table">
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                  <TableHead className="text-right">Runtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions?.map((s, idx) => {
                  const status_color =
                    s.status === "Accepted" ? "text-green-500" : "text-red-500";

                  return (
                    <TableRow
                      key={`submission ${idx + 1}`}
                      data-testid={`submission-${idx + 1}`}
                      onClick={() => setSelectedSubmission(s)}
                    >
                      <TableCell className="grid grid-rows-2">
                        <span className={`${status_color}`}>{s.status}</span>
                        <span className="text-card">
                          {TimeAgoFormat(
                            new Date(s.submitted_on).toISOString(),
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="">
                        {
                          allLanguages?.find(
                            (lang) => lang.lang_judge_id === s.lang_judge_id,
                          )?.display_name
                        }
                      </TableCell>
                      <TableCell className="text-right text-card">
                        {s?.memory}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="mt-3">
                <TableRow>
                  <TableCell colSpan={4} className="text-card">
                    {submissions?.length} attempt
                    {submissions?.length > 1 ? "s" : ""}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
      </TabsContent>

      <TabsContent value="result" data-testid="tabs-content-result">
        <div className="h-full p-6 overflow-y-auto">
          {submissionState === "loading" && <SubmissionResultSkeleton />}

          {submissionState === "done" && latestSubmissionResult && (
            <SubmissionResult result={latestSubmissionResult} />
          )}

          {(submissionState === "idle" || submissionState === undefined) && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-2">
              <ClipboardCheck className="w-8 h-8 opacity-30" />
              <p className="text-base">No submission yet</p>
              <p className="text-sm">
                Hit{" "}
                <span className="font-semibold text-foreground">Submit</span> to
                see your results here
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {eventId !== undefined && (
        <TabsContent value="leaderboard" data-testid="tabs-content-leaderboard">
          <div className="h-full p-6">
            <EventLeaderboard
              eventId={eventId}
              eventName={eventName ?? ""}
              isCompetitionEvent={isCompetitionEvent}
              currentUserId={currentUserId}
            />
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default CodeDescArea;
