import { Outlet, Navigate } from "react-router-dom";

export default function ProtectedRoute() {
    const token = localStorage.getItem("token");

    // If no active token, redirect to login page
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
