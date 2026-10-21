import { Outlet, Navigate } from "react-router-dom";

/**
 * Route guard that requires user.role === "admin".
 * If not authenticated, redirects to /login.
 * If authenticated but role is candidate/user, redirects to /dashboard (or 403 access denied).
 */
export default function AdminRoute() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
