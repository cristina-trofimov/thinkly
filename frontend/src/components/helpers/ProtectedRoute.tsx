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
    const { user } = useUser();

    useEffect(() => {
        const verifySession = async () => {
            // If no token exists at all, we don't even try to refresh
            if (!token) {
                setStatus('unauthorized');
                return;
            }

            try {
                /**
                 * If the token is expired (15 mins), our Axios Interceptor will 
                 * catch the 401, refresh the token via the cookie, and then 
                 * this call will eventually succeed.
                 */
                if (user) {
                    setUserRole(user?.accountType.toLowerCase());
                    setStatus('authorized');
                }

            } catch (error) {
                // If getProfile fails even after the interceptor tried to refresh,
                // it means the 7-day refresh token is also expired.
                logFrontend({
                    level: 'ERROR',
                    message: `Auth verification failed: ${(error as Error).message}`,
                    component: 'ProtectedRoute.tsx',
                    url: globalThis.location.href,
                });
                setStatus('unauthorized');
            }
        };

        verifySession();
    }, [token]);

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