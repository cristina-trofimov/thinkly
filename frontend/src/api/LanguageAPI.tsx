import axiosClient from "@/lib/axiosClient";
import type { Language } from "@/types/questions/Language.type";
import { logFrontend } from "./LoggerAPI";

export async function getAllLanguages(): Promise<Language[]> {
  try {
    const response = await axiosClient.get<{
      status_code: number,
      data: Language[]
    }>(`/lang/all`)

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

export async function AddLanguage(
    lang: Language,
  ): Promise<Language> {
    try {
      const response = await axiosClient.post(
        "/langs/add",
        {
            lang_judge_id: lang.lang_judge_id,
            display_name: lang.display_name,
            monaco_id: lang.monaco_id,
            active: lang.active,
        }
      )
  
      return response['data']
  
    } catch (err) {
    logFrontend({
        level: "ERROR",
        message: `An error occurred when adding a language. Reason: ${err}`,
        component: "LanguageAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
    })
      throw err
    }
  }

export async function UpdateLanguage(
    lang: Language,
  ): Promise<Language> {
    try {
      const response = await axiosClient.patch(
        "/langs/update",
        {
            lang_judge_id: lang.lang_judge_id,
            display_name: lang.display_name,
            monaco_id: lang.monaco_id,
            active: lang.active,
        }
      )
  
      return response['data']
  
    } catch (err) {
    logFrontend({
        level: "ERROR",
        message: `An error occurred when adding a language. Reason: ${err}`,
        component: "LanguageAPI",
        url: globalThis.location.href,
        stack: (err as Error).stack,
    })
      throw err
    }
  }