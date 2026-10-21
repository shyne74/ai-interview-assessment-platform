import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
    const isExamPage = location.pathname.startsWith("/adaptive-interview") || location.pathname.startsWith("/interview");

    if (isAuthPage || isExamPage) {
        return <Outlet />;
    }

    return (
        <div className="app-layout-root">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="app-main-wrapper">
                <TopBar
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />
                <main className="app-page-container">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
