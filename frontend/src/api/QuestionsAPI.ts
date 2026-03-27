import axiosClient from "@/lib/axiosClient";
import type {
  EditableQuestionFields,
  Question, TagResponse,
  QuestionsPageParams,
  QuestionsPageResult,
  QuestionsResponse,
  TestCase,
  LanguageSpecificProperties
} from "@/types/questions/QuestionPagination.type";
import { logFrontend } from "./LoggerAPI";


const DEFAULT_PAGE_SIZE = 100;

function normalizeDifficulty(
  difficulty: Question["difficulty"],
): Question["difficulty"] {
  const lowered = difficulty.toLowerCase();
  if (lowered === "easy") return "Easy";
  if (lowered === "medium") return "Medium";
  return "Hard";
}

function mapQuestion(
  question: Question,
  options: { includeCollections?: boolean } = {},
): Question {
  const createdAt = question.created_at ?? question.last_modified_at;
  const baseQuestion: Question = {
    question_id: question.question_id,
    question_name: question.question_name,
    question_description: question.question_description,
    media: question.media ?? null,
    difficulty: normalizeDifficulty(question.difficulty),
    created_at: new Date(createdAt),
    last_modified_at: new Date(question.last_modified_at),
    show_on_frontpage: Boolean(question.show_on_frontpage),
    tags: [] as TagResponse[],
    test_cases: [] as Array<TestCase>,
    language_specific_properties: [] as Array<LanguageSpecificProperties>,
  };

  if (options.includeCollections) {
    baseQuestion.tags = (question.tags ?? [] as TagResponse[]).map((tag) => ({
      tag_id: tag.tag_id,
      tag_name: tag.tag_name
    }));
    baseQuestion.test_cases = (question.test_cases ?? [] as Array<TestCase>).map((testcase) => ({
      test_case_id: testcase.test_case_id,
      question_id: testcase.question_id,
      input_data: testcase.input_data,
      expected_output: testcase.expected_output,
    }));

    baseQuestion.language_specific_properties = (question.language_specific_properties ?? [] as Array<LanguageSpecificProperties>)
      .map((prop) => ({
      language_id: prop.language_id,
      question_id: prop.question_id,
      language_display_name: prop.language_display_name,
      imports: prop.imports,
      preset_classes: prop.preset_classes,
      preset_functions: prop.preset_functions,
      main_function: prop.main_function,
      template_code: prop.template_code,
    }));
  }

  return baseQuestion;
}

export async function getQuestionsPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search,
  difficulty,
  sort = "asc",
}: QuestionsPageParams = {}): Promise<QuestionsPageResult> {
  const response = await axiosClient.get<QuestionsResponse>(
    "/questions/get-all-questions",
    {
      params: {
        page,
        page_size: pageSize,
        search: search?.trim() || undefined,
        difficulty,
        sort,
      },
    },
  );
  
  return {
    total: response.data.total,
    page: response.data.page,
    pageSize: response.data.page_size,
    items: response.data.items.map((question) => mapQuestion(question)),
  };
}

export async function getQuestions(): Promise<Question[]> {
  try {
    const firstPage = await getQuestionsPage({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "asc",
    });

    let questionItems = [...firstPage.items];
    const totalPages = Math.ceil(firstPage.total / firstPage.pageSize);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await getQuestionsPage({
        page,
        pageSize: firstPage.pageSize,
        sort: "asc",
      });
      questionItems = [...questionItems, ...nextPage.items];
    }

    return questionItems;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}

export async function getQuestionByID(questionId: number): Promise<Question> {
  try {
    const response = await axiosClient.get<Question>(
      `/questions/get-question-by-id/${questionId}`,
    );
    return mapQuestion(response.data, { includeCollections: true });
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching questions. Reason: ${err}`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
    throw err;
  }
}

export async function deleteQuestions(questionIds: number[]): Promise<{
  status_code: number;
  deleted_count: number;
  deleted_questions: Array<{ question_id: number }>;
  total_requested: number;
  errors?: Array<{ question_id: number; error: string }>;
}> {
  try {
    const response = await axiosClient.delete("/questions/batch-delete", {
      data: { question_ids: questionIds },
    });
    return response.data;
  } catch (err) {
    console.error("Error deleting questions:", err);
    throw err;
  }
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await deleteQuestions([questionId]);
}

export async function ShowQuestionOnFrontpageByID(
  questionId: number,
  shouldShow: boolean,
): Promise<{ question_id: number; show_on_frontpage: boolean }> {
  const response = await axiosClient.put(
    `/questions/show-question-on-frontpage-by-id/${questionId}`,
    { should_show: shouldShow },
  );
  return response.data;
}

export async function deleteCompetition(competitionId: string): Promise<void> {
  try {
    await axiosClient.delete(`/competitions/delete-competition/${competitionId}`);
    void logFrontend({
      level: "INFO",
      message: `Competition ${competitionId} deleted successfully`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
    });
  } catch (err) {
    console.error("Error deleting competition:", err);
    throw err;
  }
}

export async function uploadQuestions(questions: Question[]): Promise<void> {
  try {
    await axiosClient.post("/questions/upload-question-batch", questions);
  } catch (err) {
    console.error("Error uploading questions:", err);
    throw err;
  }
}

export async function updateQuestion(
  questionId: number,
  updatedFields: EditableQuestionFields,
): Promise<void> {
  try {
    await axiosClient.put(`/questions/update-question/${questionId}`, updatedFields);
  } catch (err) {
    console.error(`Error updating question ${questionId}:`, err);
    throw err;
  }
}

export async function getTestCasesByQuestionId(questionId: number | undefined): Promise<TestCase[]> {
  try {
    if (questionId === undefined) {
      throw new Error("Question ID is undefined");
    }
    const question = await getQuestionByID(questionId);
    return question.test_cases;
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching test cases for question ${questionId}. Reason: ${err}`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    });
    throw err;
  }
}

export async function findCodeBefore(questionId: number | undefined, languageId: number): Promise<String> {
  try {
    if (questionId === undefined) {
      throw new Error("Question ID is undefined");
    }
    const question = await getQuestionByID(questionId);
    const properties = question.language_specific_properties.find((prop) => prop.language_id === languageId);
    return properties ? `${properties.imports}\n\n${properties.preset_classes}\n\n${properties.preset_functions}` : "";
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching backend code for question ${questionId} and language ${languageId}. Reason: ${err}`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    });
    throw err;
  }
}

export async function findCodeAfter(questionId: number | undefined, languageId: number): Promise<String> {
  try {
    if (questionId === undefined) {
      throw new Error("Question ID is undefined");
    }
    const question = await getQuestionByID(questionId);
    const properties = question.language_specific_properties.find((prop) => prop.language_id === languageId);
    return properties ? `${properties.main_function}` : "";
  } catch (err) {
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching backend code for question ${questionId} and language ${languageId}. Reason: ${err}`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    });
    throw err;
  }
}