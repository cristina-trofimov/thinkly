import axiosClient from "../src/lib/axiosClient";
import { sendEmail } from "../src/api/EmailAPI";


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
const mockedAxios = axiosClient as jest.Mocked<typeof axiosClient>;

describe("EmailAPI – sendEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does nothing if `to` is empty", async () => {
    await sendEmail({
      to: "   ",
      subject: "Test",
      text: "Hello",
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("does nothing if `to` only contains commas", async () => {
    await sendEmail({
      to: ", , ,",
      subject: "Test",
      text: "Hello",
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("sends email immediately without scheduling", async () => {
    mockedAxios.post.mockResolvedValueOnce({} as any);

    await sendEmail({
      to: "a@test.com, b@test.com",
      subject: "Hi",
      text: "Body",
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/email/send", {
      to: ["a@test.com", "b@test.com"],
      subject: "Hi",
      text: "Body",
    });
  });

  it("schedules email one minute from now", async () => {
    mockedAxios.post.mockResolvedValueOnce({} as any);

    await sendEmail({
      to: "test@test.com",
      subject: "Scheduled",
      text: "Later",
      sendInOneMinute: true,
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/email/send", {
      to: ["test@test.com"],
      subject: "Scheduled",
      text: "Later",
      sendAt: "2025-01-01T12:01:00Z",
    });
  });

  it("schedules email using local datetime", async () => {
    mockedAxios.post.mockResolvedValueOnce({} as any);

    await sendEmail({
      to: "test@test.com",
      subject: "Local Time",
      text: "Later",
      sendAtLocal: "2025-01-01T08:00:00",
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/email/send",
      expect.objectContaining({
        to: ["test@test.com"],
        subject: "Local Time",
        text: "Later",
        sendAt: expect.stringMatching(/Z$/), // UTC ISO string
      })
    );
  });

  it("omits sendAt if local date is invalid", async () => {
    mockedAxios.post.mockResolvedValueOnce({} as any);

    await sendEmail({
      to: "test@test.com",
      subject: "Invalid Date",
      text: "Oops",
      sendAtLocal: "not-a-date",
    });

    expect(mockedAxios.post).toHaveBeenCalledWith("/email/send", {
      to: ["test@test.com"],
      subject: "Invalid Date",
      text: "Oops",
    });
  });

  it("throws when axios fails", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      sendEmail({
        to: "test@test.com",
        subject: "Fail",
        text: "Boom",
      })
    ).rejects.toThrow("Network error");
  });
});
