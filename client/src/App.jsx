import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import ProtectedRoute from "./components/protected_routes";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";

import Interview from "./pages/Interview";
import AdaptiveInterview from "./pages/AdaptiveInterview";
import AdaptiveExamHub from "./pages/AdaptiveExamHub";
import Results from "./pages/result";
import Analytics from "./pages/analytics";
import History from "./pages/history";
import Profile from "./pages/profile";

import QuestionBank from "./pages/questionbank";
import AIGenerator from "./pages/aigenerator";
import CodeforcesImporter from "./pages/CodeforcesImporter";
import CandidateData from "./pages/candidateData";
import AdminResults from "./pages/adminResults";
import AdminAnalytics from "./pages/adminAnalytics";
import Roles from "./pages/roles";
import AdminDashboard from "./pages/adminDashboard";

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes wrapped in AppLayout (Sidebar + TopBar) */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            {/* Candidate Space */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/adaptive-exam" element={<AdaptiveExamHub />} />
                            <Route path="/adaptive" element={<AdaptiveExamHub />} />
                            <Route path="/interview/latest" element={<Navigate to="/adaptive-exam" replace />} />
                            <Route path="/interview/:id" element={<Interview />} />
                            <Route path="/adaptive-interview/:id" element={<AdaptiveInterview />} />
                            <Route path="/results/:id" element={<Results />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/profile" element={<Profile />} />

                            {/* Administration Space - Protected by AdminRoute */}
                            <Route element={<AdminRoute />}>
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                                <Route path="/questionbank" element={<QuestionBank />} />
                                <Route path="/aigenerator" element={<AIGenerator />} />
                                <Route path="/codeforces" element={<CodeforcesImporter />} />
                                <Route path="/roles" element={<Roles />} />
                                <Route path="/candidate-data" element={<CandidateData />} />
                                <Route path="/admin-results" element={<AdminResults />} />
                                <Route path="/admin-analytics" element={<AdminAnalytics />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* Default Fallback Redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;