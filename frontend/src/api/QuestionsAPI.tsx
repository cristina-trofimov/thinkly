import axiosClient from "@/lib/axiosClient";
import type { Question } from "../types/questions/Question.type";
import type { Riddle } from "../types/riddle/Riddle.type";
import type { TestcaseType } from "@/types/questions/Testcases.type";

const DEFAULT_PAGE_SIZE = 100;

type QuestionsResponse = {
  total: number;
  page: number;
  page_size: number;
  items: {
    question_id: number;
    question_name: string;
    question_description: string;
    media: string | null;
    preset_code: string | null;
    template_solution: string;
    difficulty: "easy" | "medium" | "hard" | "Easy" | "Medium" | "Hard";
    last_modified_at: string;
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

function normalizeDifficulty(
  difficulty: QuestionsResponse["items"][number]["difficulty"],
): Question["difficulty"] {
  const lowered = difficulty.toLowerCase();
  if (lowered === "easy") return "Easy";
  if (lowered === "medium") return "Medium";
  return "Hard";
}

function mapQuestion(q: QuestionsResponse["items"][number]): Question {
  return {
    id: q.question_id,
    title: q.question_name,
    description: q.question_description,
    media: q.media ?? "",
    preset_code: q.preset_code ?? "",
    template_solution: q.template_solution,
    difficulty: normalizeDifficulty(q.difficulty),
    date: new Date(q.last_modified_at),
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
    `/questions/get-all-questions`,
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

export async function getRiddles(): Promise<Riddle[]> {
  try {
    const firstPage = await axiosClient.get<RiddlesResponse>(
      `/questions/get-all-riddles`,
      { params: { page: 1, page_size: DEFAULT_PAGE_SIZE } },
    );

    let riddleItems = [...firstPage.data.items];
    const totalPages = Math.ceil(firstPage.data.total / firstPage.data.page_size);

    for (let page = 2; page <= totalPages; page += 1) {
      const nextPage = await axiosClient.get<RiddlesResponse>(
        `/questions/get-all-riddles`,
        { params: { page, page_size: firstPage.data.page_size } },
      );
      riddleItems = [...riddleItems, ...nextPage.data.items];
    }

    const formatted: Riddle[] = riddleItems.map(q => ({
      id: q.riddle_id,
      question: q.riddle_question,
      answer: q.riddle_answer,
      file: q.riddle_file || null,
    }));

    return formatted;
  } catch (err) {
    console.error("Error fetching questions:", err);
    throw err;
  }
}

export async function getTestcases(question_id: number): Promise<TestcaseType[]> {
  try {
      const response = await axiosClient.get<{
          test_case_id: number,
          question_id: number,
          input_data: string,
          expected_output: string,
          caseID: string,
      }[]>(`/questions/get-all-testcases/${question_id}`);

      const formatted: TestcaseType[] = response.data.map(t => ({
          test_case_id: t.test_case_id,
          question_id: t.question_id,
          input_data: JSON.parse(t.input_data),
          expected_output: t.expected_output,
          caseID: `Case ${response.data.indexOf(t) + 1}`,
      }));

      return formatted;
    } catch (err) {
      console.error("Error fetching testcases:", err);
      throw err;
    }
}

