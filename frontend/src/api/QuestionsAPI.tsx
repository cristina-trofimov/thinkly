import axiosClient from "@/lib/axiosClient";
import type { Question } from "@/types/questions/Question.type";
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { logFrontend } from "./LoggerAPI";
import type { Riddle } from "@/types/riddle/Riddle.type";

const DEFAULT_PAGE_SIZE = 100;

type QuestionListItemResponse = {
  question_id: number;
  question_name: string;
  question_description: string;
  media: string | null;
  preset_code: string | null;
  template_solution: string;
  difficulty: "easy" | "medium" | "hard" | "Easy" | "Medium" | "Hard";
  from_string_function?: string;
  to_string_function?: string;
  created_at?: string;
  last_modified_at: string;
};

type QuestionsResponse = {
  total: number;
  page: number;
  page_size: number;
  items: QuestionListItemResponse[];
};

type QuestionByIdResponse =
  | QuestionListItemResponse
  | {
      status_code: number;
      data: QuestionListItemResponse;
    };

type RiddlesResponse = {
  total: number;
  page: number;
  page_size: number;
  items: {
    riddle_file: string | null;
    riddle_id: number;
    riddle_question: string;
    riddle_answer: string;
  }[];
};

export type QuestionsPageParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  difficulty?: "easy" | "medium" | "hard";
  sort?: "asc" | "desc";
};

export type QuestionsPageResult = {
  total: number;
  page: number;
  pageSize: number;
  items: Question[];
};

function normalizeDifficulty(
  difficulty: QuestionListItemResponse["difficulty"],
): Question["difficulty"] {
  const lowered = difficulty.toLowerCase();
  if (lowered === "easy") return "Easy";
  if (lowered === "medium") return "Medium";
  return "Hard";
}

function mapQuestion(question: QuestionListItemResponse): Question {
  const createdAt = question.created_at ?? question.last_modified_at;

  return {
    question_id: question.question_id,
    question_name: question.question_name,
    question_description: question.question_description,
    media: question.media,
    preset_code: question.preset_code,
    template_solution: question.template_solution,
    difficulty: normalizeDifficulty(question.difficulty),
    from_string_function: question.from_string_function ?? "",
    to_string_function: question.to_string_function ?? "",
    created_at: new Date(createdAt),
    last_modified_at: new Date(question.last_modified_at),
  };
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
    items: response.data.items.map(mapQuestion),
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

export async function getQuestionByID(question_id: number): Promise<Question> {
  try {
    const response = await axiosClient.get<QuestionByIdResponse>(
      "/questions/question",
      {
        params: {
          question_id,
        },
      },
    );

    const question =
      "data" in response.data ? response.data.data : response.data;

    return mapQuestion(question);
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
    logFrontend({
      level: "ERROR",
      message: `An error occurred when fetching riddles. Reason: ${err}`,
      component: "QuestionsAPI",
      url: globalThis.location.href,
      stack: (err as Error).stack,
    })
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
      logFrontend({
        level: "ERROR",
        message: `An error occurred when fetching testcases. Reason: ${err}`,
        component: "QuestionsAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
      })
      throw err;
    }
}
