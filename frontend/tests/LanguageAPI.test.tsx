import axiosClient from "../src/lib/axiosClient";
import { Language } from "../src/types/questions/Language.type";
import { logFrontend } from "../src/api/LoggerAPI";
import { AddLanguage, UpdateLanguage, getAllLanguages, getLanguageByJudgeID } from "../src/api/LanguageAPI";

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

const languages: Language[] = [
    {
        row_id: 1,
        lang_judge_id: 71,
        monaco_id: "python",
        display_name: "Python",
        active: true
    },
    {
        row_id: 2,
        lang_judge_id: 51,
        monaco_id: "java",
        display_name: "Java",
        active: true
    },
]

describe("LanguageAPI", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getAllLanguages", () => {
        it("fetches all the languages", async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: languages,
            } as any);

            await getAllLanguages();

            expect(mockedAxios.get).toHaveBeenCalledWith("/lang/all");
        });

        it("throws on error", async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
            await expect(getAllLanguages()).rejects.toThrow("Network error");
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

    describe("UpdateLanguage", () => {
        it("updates a language", async () => {
            mockedAxios.patch.mockResolvedValueOnce({
                data: languages[0],
            } as any);

            await UpdateLanguage(languages[0]);

            expect(mockedAxios.patch).toHaveBeenCalledWith("/lang/update",
                expect.objectContaining({
                    lang_judge_id: languages[0].lang_judge_id,
                    display_name: languages[0].display_name,
                    monaco_id: languages[0].monaco_id,
                    active: languages[0].active,
                })
            );
        });

        it("throws on error", async () => {
            mockedAxios.patch.mockRejectedValueOnce(new Error("Network error"));
            await expect(UpdateLanguage(languages[0])).rejects.toThrow("Network error");
            await expect(mockedLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: "ERROR",
                    component: "LanguageAPI",
                })
            )
        });
    });
});

