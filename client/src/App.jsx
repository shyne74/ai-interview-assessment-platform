import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import PracticeHub from "./pages/PracticeHub";
import MockInterviewSetup from "./pages/MockInterviewSetup";
import CodingAssessmentSetup from "./pages/CodingAssessmentSetup";
import OneSkillSetup from "./pages/OneSkillSetup";
import AdaptiveExamHub from "./pages/AdaptiveExamHub";
import PrepareWithAI from "./pages/PrepareWithAI";
import ProctoringRules from "./pages/ProctoringRules";
import Interview from "./pages/Interview";
import AdaptiveInterview from "./pages/AdaptiveInterview";
import ExamSubmitted from "./pages/ExamSubmitted";
import Results from "./pages/result";
import Analytics from "./pages/analytics";
import History from "./pages/history";
import Profile from "./pages/profile";
import DsaTopicPage from "./pages/DsaTopicPage";
import ProblemWorkspace from "./pages/ProblemWorkspace";

import AdminDashboard from "./pages/adminDashboard";
import QuestionBank from "./pages/questionbank";
import AIGenerator from "./pages/aigenerator";
import Roles from "./pages/roles";
import CandidateData from "./pages/candidateData";
import AdminRegisterCandidates from "./pages/AdminRegisterCandidates";
import CodeforcesImporter from "./pages/CodeforcesImporter";
import AdminResults from "./pages/adminResults";
import AdminAnalytics from "./pages/adminAnalytics";
import AdminBatchesList from "./pages/AdminBatchesList";
import AdminBatchWizard from "./pages/AdminBatchWizard";
import AdminBatchTracking from "./pages/AdminBatchTracking";
import ChangePassword from "./pages/ChangePassword";
import ExamInvite from "./pages/ExamInvite";

import ProtectedRoute from "./components/protected_routes";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";
import { ToastProvider } from "./components/ui/ToastContext";

function HomeRedirect() {
    const role = localStorage.getItem("role");
    return <Navigate to={role === "admin" ? "/admin-dashboard" : "/dashboard"} replace />;
}

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <BrowserRouter>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/exam-invite/:interviewId" element={<ExamInvite />} />

                    {/* Protected Routes wrapped in AppLayout */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            {/* Candidate Space */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/practice" element={<PracticeHub />} />
                            <Route path="/practice/mock-setup" element={<MockInterviewSetup />} />
                            <Route path="/practice/coding-setup" element={<CodingAssessmentSetup />} />
                            <Route path="/practice/one-skill" element={<OneSkillSetup />} />
                            <Route path="/practice/topics/:slug" element={<DsaTopicPage />} />
                            <Route path="/practice/problems/:id" element={<ProblemWorkspace />} />
                            <Route path="/adaptive-exam" element={<AdaptiveExamHub />} />
                            <Route path="/adaptive" element={<AdaptiveExamHub />} />
                            <Route path="/prepare" element={<PrepareWithAI />} />
                            <Route path="/prepare/pdf" element={<PrepareWithAI />} />
                            <Route path="/prepare/jd" element={<PrepareWithAI />} />
                            <Route path="/interview/rules" element={<ProctoringRules />} />
                            <Route path="/interview/:id" element={<Interview />} />
                            <Route path="/adaptive-interview/:id" element={<AdaptiveInterview />} />
                            <Route path="/exam-submitted/:id" element={<ExamSubmitted />} />
                            <Route path="/results/:id" element={<Results />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/settings" element={<Profile />} />

                            {/* Administration Space */}
                            <Route element={<AdminRoute />}>
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                                <Route path="/questionbank" element={<QuestionBank />} />
                                <Route path="/aigenerator" element={<AIGenerator />} />
                                <Route path="/admin/ai-tools" element={<AIGenerator />} />
                                <Route path="/roles" element={<Roles />} />
                                <Route path="/candidate-data" element={<CandidateData />} />
                                <Route path="/admin/candidates/add" element={<AdminRegisterCandidates />} />
                                <Route path="/codeforces" element={<CodeforcesImporter />} />
                                <Route path="/admin-results" element={<AdminResults />} />
                                <Route path="/admin-analytics" element={<AdminAnalytics />} />
                                <Route path="/admin/batches" element={<AdminBatchesList />} />
                                <Route path="/admin/batches/new" element={<AdminBatchWizard />} />
                                <Route path="/admin/batches/:id" element={<AdminBatchTracking />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* Default Fallback Redirect */}
                    <Route path="/" element={<HomeRedirect />} />
                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
