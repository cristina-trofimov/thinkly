import axiosClient from "@/lib/axiosClient";
import type {
  EditableQuestionFields,
  Question,
} from "@/types/questions/Question.type";
import type { QuestionListItemResponse, QuestionsPageParams, QuestionsPageResult, QuestionsResponse, RiddlesResponse } from "@/types/questions/QuestionPagination.type";
import type { TestcaseType } from "@/types/questions/Testcases.type";
import type { Riddle } from "@/types/riddle/Riddle.type";
import { logFrontend } from "./LoggerAPI";

const DEFAULT_PAGE_SIZE = 100;

function normalizeDifficulty(
  difficulty: QuestionListItemResponse["difficulty"],
): Question["difficulty"] {
  const lowered = difficulty.toLowerCase();
  if (lowered === "easy") return "Easy";
  if (lowered === "medium") return "Medium";
  return "Hard";
}

function mapQuestion(
  question: QuestionListItemResponse,
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
    tags: [],
    testcases: [],
    language_specific_properties: [],
  };

  if (options.includeCollections) {
    baseQuestion.tags = (question.tags ?? []).map((tag) => tag.tag_name);
    baseQuestion.testcases = (question.test_cases ?? []).map((testcase) => ({
      test_case_id: testcase.test_case_id,
      question_id: testcase.question_id,
      input_data: testcase.input_data,
      expected_output: testcase.expected_output,
    }));

    baseQuestion.language_specific_properties = (question.language_specific_properties ?? []).map((prop) => ({
      language_id: prop.language_id,
      question_id: prop.question_id,
      language_name: prop.language_display_name,
      preset_code: prop.preset_code,
      template_solution: prop.template_solution,
      from_json_function: prop.from_json_function,
      to_json_function: prop.to_json_function,
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
    const response = await axiosClient.get<QuestionListItemResponse>(
      `/questions/get-question-by-id/${questionId}`,
    );
    
    return mapQuestion(response.data, { includeCollections: true });
  } catch (err) {
    console.error("Error fetching question:", err);
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

export async function getRiddles(): Promise<Riddle[]> {
  try {
    const firstPage = await axiosClient.get<RiddlesResponse>(
      "/questions/get-all-riddles",
      { params: { page: 1, page_size: DEFAULT_PAGE_SIZE } },
    );

    let riddleItems = [...firstPage.data.items];
    const totalPages = Math.ceil(firstPage.data.total / firstPage.data.page_size);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await axiosClient.get<RiddlesResponse>(
        "/questions/get-all-riddles",
        { params: { page, page_size: firstPage.data.page_size } },
      );
      riddleItems = [...riddleItems, ...nextPage.data.items];
    }

    return riddleItems.map((riddle) => ({
      id: riddle.riddle_id,
      question: riddle.riddle_question,
      answer: riddle.riddle_answer,
      file: riddle.riddle_file || null,
    }));
  } catch (err) {
    console.error("Error fetching riddles:", err);
    throw err;
  }
}

export async function getTestcases(
  question_id: number,
): Promise<TestcaseType[]> {
  try {
    const response = await axiosClient.get<
      {
        test_case_id: number;
        question_id: number;
        input_data: string;
        expected_output: string;
      }[]
    >(`/questions/get-all-testcases/${question_id}`);

    return response.data.map((testcase, index) => ({
      test_case_id: testcase.test_case_id,
      question_id: testcase.question_id,
      input_data: JSON.parse(testcase.input_data),
      expected_output: testcase.expected_output,
      caseID: `Case ${index + 1}`,
    }));
  } catch (err) {
    console.error("Error fetching testcases:", err);
    throw err;
  }
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
