import axiosClient from "../src/lib/axiosClient";
import { Language } from "../src/types/questions/Language.type";
import { logFrontend } from "../src/api/LoggerAPI";
import { AddLanguage, getAllLanguages, getLanguageByJudgeID } from "../src/api/LanguageAPI";

jest.mock('../src/lib/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  API_URL: 'http://localhost:8000',
}))

jest.mock('../src/api/LoggerAPI', () => ({
    logFrontend: jest.fn()
}))

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>
const mockedLogger = logFrontend as jest.Mock

const activeLang: Language = {
    row_id: 1,
    lang_judge_id: 71,
    monaco_id: "python",
    display_name: "Python",
    active: true
}

const inactiveLang: Language = {
    row_id: 2,
    lang_judge_id: 51,
    monaco_id: "java",
    display_name: "Java",
    active: false
}

const languages: Language[] = [activeLang, inactiveLang]

describe("LanguageAPI", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getAllLanguages", () => {
        it("fetches all the languages if active is not specified", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: languages,
            } as any);

            await getAllLanguages(null);

            expect(mockedAxios.get).toHaveBeenCalledWith("/lang/all", { params: { active: null } });
        });

        it("fetches only active languages", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: [activeLang],
            } as any);

            await getAllLanguages(true);

            expect(mockedAxios.get).toHaveBeenCalledWith("/lang/all", { params: { active: true } });
        });

        it("fetches only inactive languages", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: [inactiveLang],
            } as any);

            await getAllLanguages(false);

            expect(mockedAxios.get).toHaveBeenCalledWith("/lang/all", { params: { active: false } });
        });

        it("throws on error", async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
            await expect(getAllLanguages(null)).rejects.toThrow("Network error");
            await expect(mockedLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: "ERROR",
                    component: "LanguageAPI",
                })
            )
        });
    });

    describe("getLanguageByJudgeID", () => {
        it("fetches a given language", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: languages[0],
            } as any);

            await getLanguageByJudgeID(71);

            expect(mockedAxios.get).toHaveBeenCalledWith("/lang/71");
        });

        it("throws on error", async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
            await expect(getLanguageByJudgeID(71)).rejects.toThrow("Network error");
            await expect(mockedLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: "ERROR",
                    component: "LanguageAPI",
            }))
        });
    });

    describe("AddLanguage", () => {
        it("adds a language", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: languages[0],
            } as any);

            await AddLanguage(languages[0]);

            expect(mockedAxios.post).toHaveBeenCalledWith("/lang/add",
                expect.objectContaining({
                    lang_judge_id: languages[0].lang_judge_id,
                    display_name: languages[0].display_name,
                    monaco_id: languages[0].monaco_id,
                    active: languages[0].active,
                })
            );
        });

        it("throws on error", async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
            await expect(AddLanguage(languages[0])).rejects.toThrow("Network error");
            await expect(mockedLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: "ERROR",
                    component: "LanguageAPI",
                })
            )
        });
    });
});

