import { Editor } from "@monaco-editor/react";
import { getQuestionByID, getQuestions, updateQuestion } from "@/api/QuestionsAPI";
import { useCallback, useEffect, useState, type FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuestionFields, type EditableQuestionFields } from "@/types/questions/Question.type";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseAxiosErrorMessage } from "@/lib/axiosClient";
import { toast } from "sonner";
import { IconArrowBack } from "@tabler/icons-react";

interface QuestionJSONEditorState {
  value: string;
  initialValue: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isBackWarningOpen: boolean;
}

const QuestionJSONEditor: FC = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState<QuestionJSONEditorState>({
    value: "{}",
    initialValue: null,
    isLoading: true,
    isSubmitting: false,
    isBackWarningOpen: false,
  });

  const { value, initialValue, isLoading, isSubmitting, isBackWarningOpen } = state;
  const parsedQuestionId = Number(questionId);

  useEffect(() => {
    const loadQuestion = async () => {
      if (!Number.isFinite(parsedQuestionId)) {
        const errorValue = JSON.stringify({ error: "Invalid question id" }, null, 2);
        setState((prev) => ({
          ...prev,
          value: errorValue,
          initialValue: errorValue,
          isLoading: false,
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const question = await getQuestionByID(parsedQuestionId);

        if (!question) {
          const errorValue = JSON.stringify({ error: `Question ${parsedQuestionId} not found` }, null, 2);
          setState((prev) => ({
            ...prev,
            value: errorValue,
            initialValue: errorValue,
          }));
          return;
        }

        const fields = getQuestionFields(question);
        const loadedValue = JSON.stringify(fields, null, 2);
        setState((prev) => ({
          ...prev,
          value: loadedValue,
          initialValue: loadedValue,
        }));
      } catch {
        const errorValue = JSON.stringify({ error: "Failed to fetch question" }, null, 2);
        setState((prev) => ({
          ...prev,
          value: errorValue,
          initialValue: errorValue,
        }));
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadQuestion();
  }, [parsedQuestionId]);

  const handleSubmit = useCallback(async () => {
    if (!Number.isFinite(parsedQuestionId)) {
      toast.error("Invalid question id");
      return;
    }

    try {
      const parsedPayload = JSON.parse(value) as unknown;

      if (!validateEditableQuestionFields(parsedPayload)) {
        toast.error("Invalid question JSON shape");
        return;
      }

      setState((prev) => ({ ...prev, isSubmitting: true }));
      await updateQuestion(parsedQuestionId, parsedPayload);
      setState((prev) => ({ ...prev, initialValue: prev.value }));
      toast.success(`Question ${parsedQuestionId} updated successfully!`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        const message = parseAxiosErrorMessage(error);
        toast.error(`Failed to update question ${parsedQuestionId}: ${message}`);
      }
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [parsedQuestionId, value]);

  const canSubmit =
    !isLoading &&
    !isSubmitting &&
    Number.isFinite(parsedQuestionId) &&
    initialValue !== null &&
    value !== initialValue;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();
      if (canSubmit) {
        void handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSubmit, handleSubmit]);

  const handleBackClick = () => {
    if (canSubmit) {
      setState((prev) => ({ ...prev, isBackWarningOpen: true }));
      return;
    }

    navigate("/app/dashboard/manageQuestions");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Edit Question (id: {questionId ?? "-"})</h1>
        <div className="flex gap-2">
        <Button variant="outline" onClick={handleBackClick}><IconArrowBack/>Back</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
        </div>
      </div>
      <Editor
        height="90vh"
        language="json"
        value={value}
        onChange={(nextValue) =>
          setState((prev) => ({
            ...prev,
            value: nextValue ?? "",
          }))
        }
      />

      <AlertDialog
        open={isBackWarningOpen}
        onOpenChange={(open) => setState((prev) => ({ ...prev, isBackWarningOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsubmitted edits. If you go back now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/app/dashboard/manageQuestions")}>
              Discard and go back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function validateEditableQuestionFields(payload: unknown): payload is EditableQuestionFields {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const data = payload as Record<string, unknown>;
  const hasValidDifficulty =
    data.difficulty === "easy" ||
    data.difficulty === "medium" ||
    data.difficulty === "hard";

  return (
    typeof data.question_name === "string" &&
    typeof data.question_description === "string" &&
    (typeof data.media === "string" || data.media === null) &&
    hasValidDifficulty &&
    typeof data.preset_code === "string" &&
    typeof data.from_string_function === "string" &&
    typeof data.to_string_function === "string" &&
    typeof data.template_solution === "string" &&
    Array.isArray(data.tags) &&
    data.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(data.testcases) &&
    data.testcases.every(
      (testcase) =>
        Array.isArray(testcase) &&
        testcase.length === 2 &&
        typeof testcase[0] === "string" &&
        typeof testcase[1] === "string"
    )
  );
}

export default QuestionJSONEditor;