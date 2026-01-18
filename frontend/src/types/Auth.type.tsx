// types/Auth.type.ts

export interface LoginResponse {
    token: string;
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

// ⚠️ FIXED: Matches Python backend structure
export interface DecodedToken {
    sub: string;       // Python sends email here
    role: string;      // Python sends "participant" or "owner"
    id: number;        // Python sends user_id here
    exp: number;
    iat?: number;
    jti?: string;
}