jest.mock('../src/lib/axiosClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
    API_URL: 'http://localhost:8000',
}))

jest.mock("../src/api/LoggerAPI", () => ({
    logFrontend: jest.fn()
}));

import axiosClient from "../src/lib/axiosClient";
import { logFrontend } from "../src/api/LoggerAPI";
import { getTestcases } from "../src/api/TestCasesAPI";

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;
const mockedLogFrontend = logFrontend as jest.MockedFunction<typeof logFrontend>;

describe("getTestcases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("fetches and formats testcases correctly", async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: [
                {
                    test_case_id: 1,
                    question_id: 1,
                    input_data: { "a": [1, 2], "b": 6 },
                    expected_output: "",
                },
            ],
        } as any);

        const result = await getTestcases(1);

        expect(mockedAxios.get).toHaveBeenCalledWith("/testcase/get-all-testcases/1");
        expect(result).toEqual([
            {
                test_case_id: 1,
                question_id: 1,
                input_data: { a: [1, 2], b: 6 },
                expected_output: "",
            },
        ]);
    });

    it("throws error if axios fails", async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
        await expect(getTestcases(-1)).rejects.toThrow("Network error");
    });
});