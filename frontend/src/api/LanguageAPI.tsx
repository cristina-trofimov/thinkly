 
import axiosClient from "@/lib/axiosClient";
import type { Language } from "@/types/questions/Language.type";
import { logFrontend } from "./LoggerAPI";

export async function getAllLanguages(active: boolean | null): Promise<Language[]> {
  try {
    const response = await axiosClient.get<{
      status_code: number,
      data: Language[]
    }>(`/lang/all`, {
      params: { active: active }
    })

    return response['data']['data'];
  } catch (err) {
    logFrontend({
        level: "ERROR",
        message: `An error occurred when fetching languages. Reason: ${err}`,
        component: "LanguageAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
    })
    throw err;
  }
}

export async function getLanguageByJudgeID(judge_id: number): Promise<Language> {
  try {
    const response = await axiosClient.get<{
      status_code: number,
      data: Language
    }>(`/lang/${judge_id}`)

    return response['data']['data'];
  } catch (err) {
    logFrontend({
        level: "ERROR",
        message: `An error occurred when fetching a language. Reason: ${err}`,
        component: "LanguageAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
    })
    throw err;
  }
}
