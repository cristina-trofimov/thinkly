export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
}

export interface UserProfile {
    id: number;
    email: string;
    role: "admin" | "owner" | "student";
}

export interface DecodedToken {
    sub: UserProfile;
    exp: number;
    iat: number;
}
