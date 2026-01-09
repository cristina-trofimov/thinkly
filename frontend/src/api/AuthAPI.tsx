import axiosClient from "@/lib/axiosClient";
import type { Account } from "@/types/account/Account.type";
import type {
    LoginRequest,
    LoginResponse,
    SignupRequest,
} from "@/types/Auth.type";

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axiosClient.post<LoginResponse>("/auth/login", data);
    return response.data;
}

export async function signup(data: SignupRequest): Promise<void> {
    await axiosClient.post("/auth/signup", data);
}

export async function googleLogin(credential: string): Promise<LoginResponse> {
    const response = await axiosClient.post<LoginResponse>("/auth/google-auth", { credential });
    return response.data;
}

export async function getProfile(): Promise<Account> {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("No token found — please log in first.");
    }

    const response = await axiosClient.get<Account>("/auth/profile", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
}

export async function logout(): Promise<void> {
    console.log("Logging out...");
    const token = localStorage.getItem("token");
    console.log("Token:", token);
    if (!token) {
        throw new Error("No token found.");
    }

    await axiosClient.post(
        "/auth/logout",
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    // Clear token on success
    localStorage.removeItem("token");
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  // Call your backend endpoint to send the reset email
  const response = await axiosClient.post<ForgotPasswordResponse>("/auth/forgot-password", data);
  return response.data;
}