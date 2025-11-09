export interface LoginResponse {
    token: string;
}

export interface UserProfile {
    id: number;
    email: string;
    username: string;
    role: "user" | "admin" | "owner";
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    username?: string;
    firstName: string;
    lastName: string;
}

export interface DecodedToken {
    sub: UserProfile;
    exp: number;
    iat: number;
}

