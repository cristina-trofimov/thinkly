import { Editor } from "@monaco-editor/react";
import { getQuestionByID, updateQuestion } from "@/api/QuestionsAPI";
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

class QuestionPayloadValidationError extends Error {}

const QuestionJSONEditor: FC = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();

  const getMonacoThemeFromDocument = () => {
    const root = document.documentElement;
    const dataTheme = root.dataset.theme;
    const isDark = root.classList.contains("dark") || dataTheme === "dark";
    return isDark ? "vs-dark" : "light";
  };

  const [state, setState] = useState<QuestionJSONEditorState>({
    value: "{}",
    initialValue: null,
    isLoading: true,
    isSubmitting: false,
    isBackWarningOpen: false,
  });
  const [editorTheme, setEditorTheme] = useState<string>(getMonacoThemeFromDocument());

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
      const parsedPayload = JSON.parse(value);
      const normalizedPayload = normalizeEditableQuestionFields(parsedPayload);

      setState((prev) => ({ ...prev, isSubmitting: true }));
      await updateQuestion(parsedQuestionId, normalizedPayload);
      setState((prev) => ({ ...prev, initialValue: prev.value }));
      toast.success(`Question ${parsedQuestionId} updated successfully!`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else if (error instanceof QuestionPayloadValidationError) {
        toast.error(error.message);
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

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [canSubmit, handleSubmit]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setEditorTheme(getMonacoThemeFromDocument());

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

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
        theme={editorTheme}
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

function normalizeEditableQuestionFields(payload: unknown): EditableQuestionFields {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new QuestionPayloadValidationError("Question payload must be a JSON object");
  }

  const data = payload as {
    question_name: unknown;
    question_description: unknown;
    media: unknown;
    difficulty: unknown;
    language_specific_properties: unknown;
    tags: unknown;
    testcases: unknown;
  };
  const hasValidDifficulty =
    data.difficulty === "easy" ||
    data.difficulty === "medium" ||
    data.difficulty === "hard";

  if (typeof data.question_name !== "string") {
    throw new QuestionPayloadValidationError("question_name must be a string");
  }

  if (typeof data.question_description !== "string") {
    throw new QuestionPayloadValidationError("question_description must be a string");
  }

  if (!hasValidDifficulty) {
    throw new QuestionPayloadValidationError("difficulty must be one of: easy, medium, hard");
  }

  if (!Array.isArray(data.language_specific_properties)) {
    throw new QuestionPayloadValidationError("language_specific_properties must be an array");
  }

  if (!Array.isArray(data.tags)) {
    throw new QuestionPayloadValidationError("tags must be an array");
  }

  if (!Array.isArray(data.testcases)) {
    throw new QuestionPayloadValidationError("testcases must be an array");
  }

  if (!(typeof data.media === "string" || data.media === null)) {
    throw new QuestionPayloadValidationError("media must be a string or null");
  }

  if (data.tags.some((tag: unknown) => typeof tag !== "string")) {
    throw new QuestionPayloadValidationError("all tags must be strings");
  }

  const languageSpecificProperties: Array<EditableQuestionFields["language_specific_properties"][number] | null> =
    data.language_specific_properties.map((prop: unknown) => {
    if (!prop || typeof prop !== "object" || Array.isArray(prop)) {
      return null;
    }

    const record = prop as {
      language_name: unknown;
      preset_code: unknown;
      template_solution: unknown;
      from_json_function: unknown;
      to_json_function: unknown;
    };
    if (
      typeof record.language_name !== "string" ||
      typeof record.preset_code !== "string" ||
      typeof record.template_solution !== "string" ||
      typeof record.from_json_function !== "string" ||
      typeof record.to_json_function !== "string"
    ) {
      return null;
    }

    return {
      language_name: record.language_name,
      preset_code: record.preset_code,
      template_solution: record.template_solution,
      from_json_function: record.from_json_function,
      to_json_function: record.to_json_function,
    };
  });

  if (languageSpecificProperties.includes(null)) {
    throw new QuestionPayloadValidationError(
      "each language_specific_properties entry must include language_name, preset_code, template_solution, from_json_function, and to_json_function as strings"
    );
  }

  const testcases: Array<EditableQuestionFields["testcases"][number] | null> = data.testcases.map((testcase: unknown) => {
    if (!testcase || typeof testcase !== "object") {
      return null;
    }

    const record = testcase as {
      input_data: unknown;
      expected_output: unknown;
    };
    
    if (
      !Object.hasOwn(record, "input_data") ||
      !Object.hasOwn(record, "expected_output")
    ) {
      return null;
    }

    return {
      input_data: record.input_data,
      expected_output: record.expected_output,
    };
  });

  if (testcases.includes(null)) {
    throw new QuestionPayloadValidationError(
      "Each testcase must include input_data and expected_output"
    );
  }

  return {
    question_name: data.question_name,
    question_description: data.question_description,
    media: data.media,
    difficulty: data.difficulty as "easy" | "medium" | "hard",
    language_specific_properties: languageSpecificProperties as EditableQuestionFields["language_specific_properties"],
    tags: data.tags,
    testcases: testcases as EditableQuestionFields["testcases"],
  };
}

export default QuestionJSONEditor;