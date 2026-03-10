import type { MostRecentSub } from "./MostRecentSub.type";
import type { UserPreferences } from "../account/UserPreferences.type";
import type { Judge0Response } from "../questions/Judge0Response";

export interface CodeRunResponse {
    judge0Response: Judge0Response,
    mostRecentSubResponse: MostRecentSub,
    userPrefs: UserPreferences
}