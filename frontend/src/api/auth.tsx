import axiosClient from "@/lib/axiosClient";
import type {
    LoginRequest,
    LoginResponse,
    SignupRequest,
    UserProfile,
} from "@/types/Auth";

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

export async function getProfile(): Promise<UserProfile> {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("No token found — please log in first.");
    }

    const response = await axiosClient.get<UserProfile>("/auth/profile", {
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

// src/api/auth.ts
