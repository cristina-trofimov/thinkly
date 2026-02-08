import { useEffect, useState } from "react";
import { columns } from "../../components/manageQuestions/manageQuestionsColumns";
import { logFrontend } from '../../api/LoggerAPI';
import { getQuestions } from "@/api/QuestionsAPI";
import type { Question } from "@/types/questions/Question.type";
import { ManageQuestionsDataTable } from "@/components/manageQuestions/manageQuestionsDataTable";

export default function ManageQuestionsPage() {
  const [data, setData] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    getAllQuestions();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleDeleteQuestions = (deletedQuestionIds: number[]) => {
    // Log the successful update of the UI state after deletion
    logFrontend({
      level: 'INFO',
      message: `UI state updated after batch deletion of ${deletedQuestionIds.length} questions.`,
      component: 'ManageQuestionsPage',
      url: globalThis.location.href,
    });

    setData((prevData) =>
      prevData.filter((question) => !deletedQuestionIds.includes(question.id))
    );
  };

  return (
    <div className="container mx-auto p-6">
      <ManageQuestionsDataTable
        columns={columns}
        data={data}
        onDeleteQuestions={handleDeleteQuestions}
      />
    </div>
  );
}
