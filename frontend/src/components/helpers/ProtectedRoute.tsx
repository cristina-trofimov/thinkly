import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/types/Auth.type";

interface ProtectedRouteProps {
    allowedRoles: string[]; // e.g. ['admin', 'owner']
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const token = localStorage.getItem("token");

    // 1. No token? Redirect to login.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        const currentTime = Date.now() / 1000;

        // 2. Token expired? Redirect to login.
        if (decoded.exp < currentTime) {
            localStorage.removeItem("token");
            return <Navigate to="/login" replace />;
        }

        // 3. Check Role
        // ⚠️ Note: Your Python backend uses 'participant', not 'user'. 
        // Ensure allowedRoles matches your DB strings exactly.
        if (!allowedRoles.includes(decoded.role)) {
            return <Navigate to="/unauthorized" replace />;
        }

        // 4. Authorized: Render the page
        return <Outlet />;

    } catch (error) {
        // 5. Corrupt token? Clear it and redirect.
        localStorage.removeItem("token");
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;