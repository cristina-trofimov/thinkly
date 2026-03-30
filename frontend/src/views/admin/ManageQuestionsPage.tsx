import { useEffect, useRef, useState } from "react";
import { columns } from "../../components/manageQuestions/ManageQuestionsColumns";
import { logFrontend } from '../../api/LoggerAPI';
import { getQuestionsPage } from "@/api/QuestionsAPI";
import type { Question } from "@/types/questions/QuestionPagination.type";
import { ManageQuestionsDataTable } from "@/components/manageQuestions/ManageQuestionsDataTable";

export default function ManageQuestionsPage() {
  const [data, setData] = useState<Question[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const latestRequestId = useRef(0);

  const getAllQuestions = async () => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    logFrontend({
      level: 'INFO',
      message: `Attempting to fetch questions page=${page}, pageSize=${pageSize}, search=${search || "none"}, difficulty=${difficultyFilter}.`,
      component: 'ManageQuestionsPage',
      url: globalThis.location.href,
    });

    try {
      const result = await getQuestionsPage({
        page,
        pageSize,
        search,
        difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
      });
      if (requestId !== latestRequestId.current) {
        return;
      }
      setData(result.items);
      setTotal(result.total);

      if (result.items.length === 0 && result.total > 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      logFrontend({
        level: 'INFO',
        message: `Successfully loaded ${result.items.length} questions (total=${result.total}).`,
        component: 'ManageQuestionsPage',
        url: globalThis.location.href,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred during question fetch.";

      // Log fetch failure to the backend
      logFrontend({
        level: 'ERROR',
        message: `Data fetch failure: ${errorMessage}`,
        component: 'ManageQuestionsPage',
        url: globalThis.location.href,
        stack: error instanceof Error ? error.stack : undefined,
      });

      setError(errorMessage);
    } finally {
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    getAllQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, difficultyFilter, refreshToken]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleToggleFrontpage = (questionId: number, shouldShow: boolean) => {
    setData((prevData) =>
      prevData.map((question) =>
        question.question_id === questionId
          ? { ...question, show_on_frontpage: shouldShow }
          : question
      )
    );
  };

  return (
    <div className="container mx-auto p-6">
      <ManageQuestionsDataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        difficultyFilter={difficultyFilter}
        loading={loading}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onDifficultyFilterChange={(value) => {
          setPage(1);
          setDifficultyFilter(value);
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPage(1);
          setPageSize(value);
        }}
        onToggleFrontpage={handleToggleFrontpage}
        refreshTable={() => setRefreshToken((prev) => prev + 1)}
      />
    </div>
  );
}