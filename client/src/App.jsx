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

import AdminDashboard from "./pages/adminDashboard";
import QuestionBank from "./pages/questionbank";
import AIGenerator from "./pages/aigenerator";
import Roles from "./pages/roles";
import CandidateData from "./pages/candidateData";
import AdminRegisterCandidates from "./pages/AdminRegisterCandidates";
import CodeforcesImporter from "./pages/CodeforcesImporter";
import AdminResults from "./pages/adminResults";
import AdminAnalytics from "./pages/adminAnalytics";

import ProtectedRoute from "./components/protected_routes";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes wrapped in AppLayout */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            {/* Candidate Space */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/practice" element={<PracticeHub />} />
                            <Route path="/practice/mock-setup" element={<MockInterviewSetup />} />
                            <Route path="/practice/coding-setup" element={<CodingAssessmentSetup />} />
                            <Route path="/practice/one-skill" element={<OneSkillSetup />} />
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
