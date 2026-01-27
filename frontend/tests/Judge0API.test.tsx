import axiosClient from "../src/lib/axiosClient"
import { submitToJudge0, getOutput } from "../src/api/Judge0API"

jest.mock("../src/lib/axiosClient")

const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>

const IP = '127.0.0.1:2358'
const TOKEN = 'abc123'
const code = "print('Hello')";
const language_id = "71";
const stdin = "";
const expected_output = "Hello\n";


describe("Judge0API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("submitToJudge0", () => {
    it("submit to judge0 and returns final output", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { token: TOKEN },
      });

      mockedAxios.get
      .mockResolvedValueOnce({
        data: { status: { description: "In Queue" } },
      })
      .mockResolvedValueOnce({
        data: {
          status: { description: "Accepted" },
          stdout: expected_output,
        },
      });

      const result = await submitToJudge0(IP, code, language_id, stdin, expected_output);

      expect(mockedAxios.post).toHaveBeenCalledWith(`http://${IP}/submissions`, {
        source_code: code,
        language_id: language_id,
        number_of_runs: null,
        stdin: stdin,
        expected_output: expected_output,
        cpu_time_limit: null,
        cpu_extra_time: null,
        wall_time_limit: null,
        memory_limit: null,
        stack_limit: null,
        max_processes_and_or_threads: null,
        enable_per_process_and_thread_time_limit: null,
        enable_per_process_and_thread_memory_limit: null,
        max_file_size: null,
        enable_network: null,
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })

    it("throws error if axios fails", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
      await expect(submitToJudge0(
        IP,
        'print("Hello',
        '71',
        'input',
        null
      )).rejects.toThrow("Network error")
    })
  })

  describe("getOutput", () => {
    it("fetches output of a given token", async () => {
      mockedAxios.get
      .mockResolvedValueOnce({
        data: { status: { description: 'In Queue' } }
      } as any)
      .mockResolvedValueOnce({
        data: { status: { description: 'Processing' } }
      } as any)
      .mockResolvedValueOnce({
        data: {
          status: { description: 'Accepted' },
          stdout: 'OK'
        }
      } as any)

      const promise = await getOutput(
        IP, TOKEN, new AbortController().signal, 100
      );

      await jest.advanceTimersByTimeAsync(300)

      const result = await promise

      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    })

    it("throws error after maxAttempts", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: { description: 'In Queue' } }
      } as any)
      expect(getOutput(IP, TOKEN, new AbortController().signal, 0, 1))
        .rejects.toThrow('Judge0 polling timed out')
    })

    it("throws error if aborted", async () => {
      const con = new AbortController()
      con.abort()
      await expect(() => getOutput(IP, TOKEN, con.signal))
        .rejects.toThrow('Judge0 polling aborted')
    })
  })
})
