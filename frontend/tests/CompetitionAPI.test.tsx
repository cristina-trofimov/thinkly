import axiosClient from "../src/lib/axiosClient";
import {
  getCompetitions,
  getCompetitionsDetails,
  createCompetition,
  listCompetitions,
  getCompetitionById,
  deleteCompetition,
  updateCompetition,
} from "../src/api/CompetitionAPI";

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

describe("CompetitionAPI", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCompetitions", () => {
    it("fetches and formats competitions", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            competition_title: "Hackathon",
            competition_location: "Montreal",
            start_date: "2025-01-01",
            end_date: "2025-01-02",
          },
        ],
      } as any);

      const result = await getCompetitions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/competitions/");
      expect(result).toEqual([
        {
          id: 1,
          competitionTitle: "Hackathon",
          competitionLocation: "Montreal",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-02"),
        },
      ]);
    });

    it("throws on error", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));
      await expect(getCompetitions()).rejects.toThrow("Network error");
    });
  });

  describe("getCompetitionsDetails", () => {
    it("fetches competitions for homepage", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: 2,
            competition_title: "Algo Cup",
            date: "2025-02-01",
          },
        ],
      } as any);

      const result = await getCompetitionsDetails();

      expect(mockedAxios.get).toHaveBeenCalledWith("/homepage/get-competitions");
      expect(result).toEqual([
        {
          id: 2,
          competitionTitle: "Algo Cup",
          date: "2025-02-01",
          participants: [],
        },
      ]);
    });
  });

  describe("createCompetition", () => {
    it("creates a competition", async () => {
      const payload = {
        competition_title: "New Competition",
        competition_location: "Toronto",
        start_date: "2025-03-01",
        end_date: "2025-03-02",
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 10, ...payload },
      } as any);

      const result = await createCompetition(payload as any);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/competitions/create",
        payload
      );
      expect(result).toEqual({ id: 10, ...payload });
    });
  });

  describe("listCompetitions", () => {
    it("lists all competitions", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
      } as any);

      const result = await listCompetitions();

      expect(mockedAxios.get).toHaveBeenCalledWith("/competitions/list");
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe("getCompetitionById", () => {
    it("fetches competition by ID", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { id: 5, competition_title: "Test" },
      } as any);

      const result = await getCompetitionById(5);

      expect(mockedAxios.get).toHaveBeenCalledWith("/competitions/5");
      expect(result).toEqual({ id: 5, competition_title: "Test" });
    });
  });

  describe("deleteCompetition", () => {
    it("deletes a competition", async () => {
      mockedAxios.delete.mockResolvedValueOnce({} as any);

      await deleteCompetition(3);

      expect(mockedAxios.delete).toHaveBeenCalledWith("/competitions/3");
    });
  });

  describe("updateCompetition", () => {
    it("updates a competition", async () => {
      const payload = {
        id: 7,
        competition_title: "Updated Title",
      };

      mockedAxios.put.mockResolvedValueOnce({
        data: payload,
      } as any);

      const result = await updateCompetition(payload as any);

      expect(mockedAxios.put).toHaveBeenCalledWith(
        "/competitions/7",
        payload
      );
      expect(result).toEqual(payload);
    });
  });
});
