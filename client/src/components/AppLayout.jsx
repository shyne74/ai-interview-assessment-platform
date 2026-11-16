import { Outlet, useLocation } from "react-router-dom";
import TopNavigation from "./TopNavigation";
import "../wireframe.css";

export default function AppLayout() {
    const location = useLocation();
    const path = location.pathname;

    // Authentication, live exam views, and problem workspace have their own distraction-free wireframe layouts
    const isAuthPage = path === "/login" || path === "/register";
    const isLiveExamPage = (
        path.startsWith("/interview/") && !path.includes("/rules")
    ) || path.startsWith("/adaptive-interview") || path.startsWith("/practice/problems/");

    if (isAuthPage || isLiveExamPage) {
        return <Outlet />;
    }

    return (
        <div className="wf-body-canvas">
            <TopNavigation />
            <main className="wf-content-container">
                <Outlet />
            </main>
        </div>
    );
}
