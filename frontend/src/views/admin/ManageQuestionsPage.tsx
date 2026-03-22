import { useEffect, useState } from "react";
import { columns } from "../../components/manageQuestions/ManageQuestionsColumns";
import { logFrontend } from '../../api/LoggerAPI';
import { getQuestions } from "@/api/QuestionsAPI";
import type { Question } from "@/types/questions/QuestionPagination.type";
import { ManageQuestionsDataTable } from "@/components/manageQuestions/ManageQuestionsDataTable";

export default function ManageQuestionsPage() {
  const [data, setData] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getAllQuestions = async () => {
    setLoading(true); // Ensure loading is reset on mount
    logFrontend({
      level: 'INFO',
      message: `Attempting to fetch all questions.`,
      component: 'ManageQuestionsPage',
      url: globalThis.location.href,
    });

    try {
      const questions = await getQuestions();
      setData(questions);

      // Log successful fetch
      logFrontend({
        level: 'INFO',
        message: `Successfully loaded ${questions.length} questions.`,
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
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllQuestions();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
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
        onToggleFrontpage={handleToggleFrontpage}
        refreshTable={getAllQuestions}
      />
    </div>
  );
}
