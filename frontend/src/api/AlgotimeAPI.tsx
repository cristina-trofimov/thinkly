import axiosClient from "@/lib/axiosClient"
import {
  type CreateAlgotimeRequest,
  type CreateAlgotimeResponse,
} from "../types/algoTime/AlgoTime.type"

export async function createAlgotime(
  payload: CreateAlgotimeRequest
): Promise<CreateAlgotimeResponse> {
    try{
  const response = await axiosClient.post<CreateAlgotimeResponse>(
    "/algotime/create",
    payload
  );
  return response.data
    }catch (err) {
        console.error("Error creating algotime session:", err);
        throw err;
    }
}