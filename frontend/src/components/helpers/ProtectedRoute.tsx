import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { logFrontend } from "@/api/LoggerAPI";
import { useUser } from "@/context/UserContext";

interface ProtectedRouteProps {
    allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
    const [userRole, setUserRole] = useState<string | null>(null);
    const token = localStorage.getItem("token");
    const { user, loading: contextLoading } = useUser();

    useEffect(() => {
        if (contextLoading) return; // wait for context to settle first
        if (!token) {
            setStatus('unauthorized');
            return;
        }
        if (user) {
            if (!user.accountType) {
                setStatus('unauthorized');
                return;
            }
            setUserRole(user.accountType.toLowerCase());
            setStatus('authorized');
        } else {
            setStatus('unauthorized');
        }
    }, [token, user, contextLoading]);

    if (contextLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
        );
    }

    // 1. While checking (or refreshing), show nothing or a spinner
    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
        );
    }

    // 2. Redirect to login if unauthorized
    if (status === 'unauthorized') {
        return <Navigate to="/" replace />;
    }

    // 3. Check Role
    if (userRole && !allowedRoles.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // 4. Authorized: Render the children
    return <Outlet />;
};

export default ProtectedRoute;