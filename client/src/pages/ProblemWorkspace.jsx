import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Play,
    Send,
    RotateCcw,
    Copy,
    Check,
    Clock,
    HardDrive,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Terminal,
    Sparkles,
    FileCode,
    ListFilter
} from "lucide-react";
import api from "../utils/api";
import { getTopicByLabel, getTopicBySlug } from "../config/dsaTopics";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastContext";

const STARTER_TEMPLATES = {
    javascript: `// JavaScript (Node.js) Starter Template
const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    
    // Write your solution logic here
    console.log(input);
}

solve();
`,
    python: `# Python 3 Starter Template
import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    
    # Write your solution logic here
    print(" ".join(input_data))

if __name__ == '__main__':
    solve()
`,
    cpp: `// C++ (GCC 9.2) Starter Template
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Write your solution logic here

    return 0;
}
`,
    java: `// Java (OpenJDK 13) Starter Template
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNext()) return;

        // Write your solution logic here
    }
}
`
};

const LANGUAGE_CONFIGS = [
    { id: 63, key: "javascript", label: "JavaScript (Node.js)" },
    { id: 71, key: "python", label: "Python (3.8+)" },
    { id: 54, key: "cpp", label: "C++ (GCC)" },
    { id: 62, key: "java", label: "Java (OpenJDK)" }
];

export default function ProblemWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

    // Problem data & UI state
    const [problem, setProblem] = useState(null);
    const [isExecutable, setIsExecutable] = useState(true);
    const [loading, setLoading] = useState(true);
    const [activeLeftTab, setActiveLeftTab] = useState("description"); // "description" | "samples" | "submissions"
    
    // Code editor state
    const [selectedLanguageKey, setSelectedLanguageKey] = useState("python");
    const [code, setCode] = useState("");
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Submissions list
    const [pastSubmissions, setPastSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Sibling problems in topic for prev/next
    const [topicProblems, setTopicProblems] = useState([]);
    const [topicSlug, setTopicSlug] = useState("arrays");

    // Execution & Result state
    const [executing, setExecuting] = useState(false);
    const [executionType, setExecutionType] = useState(null); // "run" | "submit"
    const [executionResult, setExecutionResult] = useState(null);
    const [aiEvaluation, setAiEvaluation] = useState(null);
    const [activeSampleTab, setActiveSampleTab] = useState(0);

    const currentLangConfig = useMemo(() => {
        return LANGUAGE_CONFIGS.find(l => l.key === selectedLanguageKey) || LANGUAGE_CONFIGS[1];
    }, [selectedLanguageKey]);

    // Local draft storage key
    const draftStorageKey = useMemo(() => {
        return `dsa_draft_${id}_${selectedLanguageKey}`;
    }, [id, selectedLanguageKey]);

    // Check if code has been modified from template
    const isCodeUnchanged = useMemo(() => {
        const trimmed = (code || "").trim();
        const template = (STARTER_TEMPLATES[selectedLanguageKey] || "").trim();
        return !trimmed || trimmed === template;
    }, [code, selectedLanguageKey]);

    // Load problem details
    const fetchProblem = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/coding/problems/${id}`);
            const p = res.data.problem;
            setProblem(p);
            setIsExecutable(res.data.isExecutable);

            // Infer topic from question domain or keywords
            const matchedTopic = getTopicByLabel(p.domain) || getTopicBySlug(p.domain?.toLowerCase());
            const detectedSlug = matchedTopic ? matchedTopic.slug : "arrays";
            setTopicSlug(detectedSlug);

            // Fetch sibling problems in this topic for next/prev
            try {
                const siblingsRes = await api.get(`/coding/problems?topic=${detectedSlug}&limit=50`);
                setTopicProblems(siblingsRes.data.problems || []);
            } catch (sibErr) {
                console.warn("Could not load sibling problems:", sibErr);
            }
        } catch (err) {
            console.error("Failed to load problem:", err);
            toastError("Failed to load problem details.");
        } finally {
            setLoading(false);
        }
    }, [id, toastError]);

    // Fetch past submissions
    const fetchSubmissions = useCallback(async () => {
        setLoadingSubmissions(true);
        try {
            const res = await api.get(`/coding/submissions/${id}`);
            setPastSubmissions(res.data.submissions || []);
        } catch (err) {
            console.warn("Failed to load submissions:", err);
        } finally {
            setLoadingSubmissions(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProblem();
        fetchSubmissions();
    }, [fetchProblem, fetchSubmissions]);

    // Load code draft from localStorage or template
    useEffect(() => {
        const savedDraft = localStorage.getItem(draftStorageKey);
        if (savedDraft) {
            setCode(savedDraft);
        } else {
            setCode(STARTER_TEMPLATES[selectedLanguageKey] || "");
        }
    }, [draftStorageKey, selectedLanguageKey]);

    // Persist draft to localStorage on change
    const handleCodeChange = (newCode) => {
        setCode(newCode);
        try {
            localStorage.setItem(draftStorageKey, newCode);
        } catch (e) {
            console.warn("Could not save draft to localStorage:", e);
        }
    };

    // Reset code to starter template
    const handleResetTemplate = () => {
        const template = STARTER_TEMPLATES[selectedLanguageKey] || "";
        setCode(template);
        localStorage.setItem(draftStorageKey, template);
        toastInfo("Editor reset to starter template.");
    };

    // Copy sample text
    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
    };

    // Prev / Next Navigation
    const currentIndex = topicProblems.findIndex(p => p._id === id);
    const prevProblem = currentIndex > 0 ? topicProblems[currentIndex - 1] : null;
    const nextProblem = currentIndex >= 0 && currentIndex < topicProblems.length - 1 ? topicProblems[currentIndex + 1] : null;

    // Run code (samples only)
    const handleRunCode = async () => {
        if (!isExecutable) {
            toastError("This problem does not support execution.");
            return;
        }
        if (isCodeUnchanged) {
            toastError("Please modify the code before running tests.");
            return;
        }

        setExecuting(true);
        setExecutionType("run");
        setExecutionResult(null);
        setAiEvaluation(null);

        try {
            const res = await api.post("/coding/submit", {
                problemId: id,
                languageId: currentLangConfig.id,
                sourceCode: code,
                isRunOnly: true
            });

            const exec = res.data.execution;
            setExecutionResult(exec);
            if (exec.status === "Accepted") {
                toastSuccess(`All ${exec.passedCount}/${exec.totalCount} sample test cases passed!`);
            } else {
                toastError(`Result: ${exec.status} (${exec.passedCount}/${exec.totalCount} passed)`);
            }
        } catch (err) {
            console.error("Run error:", err);
            toastError(err.response?.data?.message || "Execution failed.");
        } finally {
            setExecuting(false);
        }
    };

    // Submit code (full execution + AI evaluation + database record)
    const handleSubmitCode = async () => {
        if (!isExecutable) {
            toastError("This problem does not support automated submission.");
            return;
        }
        if (isCodeUnchanged) {
            toastError("Please implement a solution before submitting.");
            return;
        }

        setExecuting(true);
        setExecutionType("submit");
        setExecutionResult(null);
        setAiEvaluation(null);

        try {
            const res = await api.post("/coding/submit", {
                problemId: id,
                languageId: currentLangConfig.id,
                sourceCode: code,
                isRunOnly: false
            });

            const sub = res.data.submission;
            setExecutionResult(sub.execution);
            if (sub.evaluation) {
                setAiEvaluation(sub.evaluation);
            }

            if (sub.execution?.status === "Accepted") {
                toastSuccess("Accepted! Solution verified and recorded.");
            } else {
                toastError(`Submission status: ${sub.execution?.status || "Wrong Answer"}`);
            }

            // Refresh submissions list
            fetchSubmissions();
        } catch (err) {
            console.error("Submit error:", err);
            toastError(err.response?.data?.message || "Submission failed.");
        } finally {
            setExecuting(false);
        }
    };

    // Handle indentation with Tab key
    const handleKeyDown = (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const spaces = "    ";
            const newCode = code.substring(0, start) + spaces + code.substring(end);
            handleCodeChange(newCode);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    // Start Exam with this problem
    const handleTryInExamMode = async () => {
        try {
            const res = await api.post("/interviews", {
                roleTitle: "Coding Assessment",
                domain: problem?.domain || "Algorithms",
                assessmentType: "coding",
                interviewType: "proctored-dsa",
                questionIds: [id],
                durationSeconds: 30 * 60,
                totalQuestions: 1
            });
            const interviewId = res.data._id || res.data.interview?._id;
            toastSuccess("Starting proctored session for this problem.");
            navigate(`/interview/${interviewId}`);
        } catch (err) {
            toastError("Could not start exam mode.");
        }
    };

    if (loading) {
        return (
            <div style={{ maxWidth: "1280px", margin: "40px auto", padding: "0 24px" }}>
                <Skeleton height={40} width={280} style={{ marginBottom: "16px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <Skeleton height={500} style={{ borderRadius: "12px" }} />
                    <Skeleton height={500} style={{ borderRadius: "12px" }} />
                </div>
            </div>
        );
    }

    if (!problem) {
        return (
            <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
                <h2>Problem not found</h2>
                <p style={{ color: "#64748b" }}>This coding problem could not be located in our question bank.</p>
                <Button variant="primary" onClick={() => navigate("/dashboard")}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    const samples = problem.codingData?.samples || problem.codingData?.sampleTestCases || [];
    const memoryLimit = problem.codingData?.memoryLimit || 256;
    const timeLimit = problem.codingData?.timeLimit || 2;

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Top Workspace Header */}
            <div style={{
                height: "56px",
                backgroundColor: "#1e293b",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px"
            }}>
                {/* Left: Back & Breadcrumb */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Link
                        to={`/practice/topics/${topicSlug}`}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#94a3b8",
                            textDecoration: "none",
                            fontSize: "13px",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#0f172a"
                        }}
                    >
                        <ArrowLeft size={14} />
                        Back to {topicSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </Link>

                    <div style={{ height: "16px", width: "1px", backgroundColor: "#475569" }} />

                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>
                        {problem.codingData?.contestId ? `Codeforces ${problem.codingData.contestId}${problem.codingData.index}` : "Practice Problem"}
                    </span>
                    <Badge variant={problem.difficulty === "easy" ? "success" : problem.difficulty === "hard" ? "error" : "warning"}>
                        {problem.difficulty || "Medium"}
                    </Badge>
                </div>

                {/* Right: Prev/Next & Exam Mode */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!prevProblem}
                        onClick={() => prevProblem && navigate(`/practice/problems/${prevProblem._id}`)}
                        style={{ color: "#cbd5e1", borderColor: "#475569", padding: "4px 8px" }}
                        title="Previous problem in topic"
                    >
                        <ChevronLeft size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!nextProblem}
                        onClick={() => nextProblem && navigate(`/practice/problems/${nextProblem._id}`)}
                        style={{ color: "#cbd5e1", borderColor: "#475569", padding: "4px 8px" }}
                        title="Next problem in topic"
                    >
                        <ChevronRight size={16} />
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleTryInExamMode}
                        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                    >
                        <Shield size={14} style={{ color: "#10b981" }} />
                        Try in Exam Mode
                    </Button>
                </div>
            </div>

            {/* Split Screen Workspace Area */}
            <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "minmax(350px, 1fr) minmax(400px, 1.15fr)",
                height: "calc(100vh - 56px)",
                overflow: "hidden"
            }}>
                {/* LEFT PANE: Tabs (Description, Samples, Submissions) */}
                <div style={{
                    backgroundColor: "#1e293b",
                    borderRight: "1px solid #334155",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden"
                }}>
                    {/* Left Pane Tab Bar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        borderBottom: "1px solid #334155",
                        backgroundColor: "#0f172a",
                        padding: "0 12px"
                    }}>
                        {[
                            { key: "description", label: "Description", icon: FileCode },
                            { key: "samples", label: `Samples (${samples.length})`, icon: Terminal },
                            { key: "submissions", label: `Submissions (${pastSubmissions.length})`, icon: ListFilter }
                        ].map(t => {
                            const Icon = t.icon;
                            const isActive = activeLeftTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActiveLeftTab(t.key)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "12px 14px",
                                        border: "none",
                                        borderBottom: isActive ? "2px solid #10b981" : "2px solid transparent",
                                        backgroundColor: "transparent",
                                        color: isActive ? "#10b981" : "#94a3b8",
                                        fontSize: "13px",
                                        fontWeight: isActive ? "600" : "400",
                                        cursor: "pointer"
                                    }}
                                >
                                    <Icon size={14} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Left Pane Tab Content */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "24px",
                        lineHeight: 1.6,
                        color: "#e2e8f0"
                    }}>
                        {activeLeftTab === "description" && (
                            <div>
                                {/* Meta Badges */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "12px", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <Clock size={13} /> {timeLimit}s limit
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <HardDrive size={13} /> {memoryLimit} MB
                                    </span>
                                    {problem.codingData?.problemUrl && (
                                        <a
                                            href={problem.codingData.problemUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                fontSize: "12px",
                                                color: "#38bdf8",
                                                textDecoration: "none",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                        >
                                            Codeforces Problem <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>

                                {!isExecutable && (
                                    <div style={{
                                        backgroundColor: "#334155",
                                        borderRadius: "8px",
                                        padding: "12px 16px",
                                        marginBottom: "20px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        fontSize: "13px",
                                        color: "#cbd5e1"
                                    }}>
                                        <AlertTriangle size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
                                        <span>
                                            This problem is formatted for practice review. Automated Judge0 execution is disabled for this item.
                                        </span>
                                    </div>
                                )}

                                {/* Problem Statement */}
                                <div style={{ fontSize: "14px", whiteSpace: "pre-wrap", marginBottom: "24px" }}>
                                    {problem.questionText}
                                </div>

                                {/* Input Specification */}
                                {problem.codingData?.inputSpecification && (
                                    <div style={{ marginBottom: "20px" }}>
                                        <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                            Input Format
                                        </h4>
                                        <div style={{ fontSize: "13px", color: "#cbd5e1", backgroundColor: "#0f172a", padding: "12px 16px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                                            {problem.codingData.inputSpecification}
                                        </div>
                                    </div>
                                )}

                                {/* Output Specification */}
                                {problem.codingData?.outputSpecification && (
                                    <div style={{ marginBottom: "20px" }}>
                                        <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                            Output Format
                                        </h4>
                                        <div style={{ fontSize: "13px", color: "#cbd5e1", backgroundColor: "#0f172a", padding: "12px 16px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                                            {problem.codingData.outputSpecification}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeLeftTab === "samples" && (
                            <div>
                                <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", color: "#f8fafc" }}>
                                    Sample Test Cases
                                </h3>
                                {samples.length === 0 ? (
                                    <p style={{ color: "#94a3b8", fontSize: "13px" }}>No sample test cases specified for this problem.</p>
                                ) : (
                                    samples.map((s, idx) => (
                                        <div key={idx} style={{
                                            backgroundColor: "#0f172a",
                                            border: "1px solid #334155",
                                            borderRadius: "8px",
                                            marginBottom: "16px",
                                            overflow: "hidden"
                                        }}>
                                            <div style={{
                                                padding: "8px 12px",
                                                backgroundColor: "#1e293b",
                                                borderBottom: "1px solid #334155",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#94a3b8"
                                            }}>
                                                Sample #{idx + 1}
                                            </div>

                                            <div style={{ padding: "12px" }}>
                                                {/* Input */}
                                                <div style={{ marginBottom: "12px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                        <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Input</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(s.input, `in-${idx}`)}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: copiedIndex === `in-${idx}` ? "#10b981" : "#94a3b8",
                                                                cursor: "pointer",
                                                                fontSize: "11px",
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "4px"
                                                            }}
                                                        >
                                                            {copiedIndex === `in-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                                                            {copiedIndex === `in-${idx}` ? "Copied" : "Copy"}
                                                        </button>
                                                    </div>
                                                    <pre style={{
                                                        backgroundColor: "#020617",
                                                        padding: "10px",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontFamily: "Consolas, Menlo, monospace",
                                                        margin: 0,
                                                        color: "#38bdf8",
                                                        overflowX: "auto"
                                                    }}>
                                                        {s.input || "(empty)"}
                                                    </pre>
                                                </div>

                                                {/* Output */}
                                                <div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                        <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Expected Output</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(s.output, `out-${idx}`)}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: copiedIndex === `out-${idx}` ? "#10b981" : "#94a3b8",
                                                                cursor: "pointer",
                                                                fontSize: "11px",
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "4px"
                                                            }}
                                                        >
                                                            {copiedIndex === `out-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                                                            {copiedIndex === `out-${idx}` ? "Copied" : "Copy"}
                                                        </button>
                                                    </div>
                                                    <pre style={{
                                                        backgroundColor: "#020617",
                                                        padding: "10px",
                                                        borderRadius: "6px",
                                                        fontSize: "12px",
                                                        fontFamily: "Consolas, Menlo, monospace",
                                                        margin: 0,
                                                        color: "#4ade80",
                                                        overflowX: "auto"
                                                    }}>
                                                        {s.output || "(empty)"}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeLeftTab === "submissions" && (
                            <div>
                                <h3 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", color: "#f8fafc" }}>
                                    Your Past Submissions
                                </h3>
                                {loadingSubmissions ? (
                                    <Skeleton height={60} count={3} />
                                ) : pastSubmissions.length === 0 ? (
                                    <p style={{ color: "#94a3b8", fontSize: "13px" }}>
                                        No submissions recorded yet for this problem. Click "Submit" to record an attempt.
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {pastSubmissions.map((sub) => {
                                            const status = sub.execution?.status || "Attempted";
                                            const isAccepted = status === "Accepted";
                                            return (
                                                <div
                                                    key={sub._id}
                                                    style={{
                                                        backgroundColor: "#0f172a",
                                                        border: "1px solid #334155",
                                                        borderRadius: "8px",
                                                        padding: "12px 16px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between"
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        {isAccepted ? (
                                                            <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                                                        ) : (
                                                            <XCircle size={18} style={{ color: "#f43f5e" }} />
                                                        )}
                                                        <div>
                                                            <span style={{
                                                                fontSize: "13px",
                                                                fontWeight: "600",
                                                                color: isAccepted ? "#10b981" : "#f43f5e"
                                                            }}>
                                                                {status}
                                                            </span>
                                                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                                {new Date(sub.createdAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: "right", fontSize: "12px", color: "#94a3b8" }}>
                                                        {sub.execution?.runtimeSeconds ? `${sub.execution.runtimeSeconds.toFixed(3)}s` : "-"}
                                                        {" · "}
                                                        {sub.execution?.memoryKB ? `${sub.execution.memoryKB} KB` : "-"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Code Editor & Execution Drawer */}
                <div style={{
                    backgroundColor: "#0b1329",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden"
                }}>
                    {/* Editor Control Header */}
                    <div style={{
                        height: "44px",
                        backgroundColor: "#0f172a",
                        borderBottom: "1px solid #1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 16px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <select
                                value={selectedLanguageKey}
                                onChange={(e) => setSelectedLanguageKey(e.target.value)}
                                style={{
                                    backgroundColor: "#1e293b",
                                    color: "#f8fafc",
                                    border: "1px solid #334155",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    outline: "none",
                                    cursor: "pointer"
                                }}
                            >
                                {LANGUAGE_CONFIGS.map(lang => (
                                    <option key={lang.key} value={lang.key}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={handleResetTemplate}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    padding: "4px 6px"
                                }}
                                title="Reset to default template"
                            >
                                <RotateCcw size={12} />
                                Reset Template
                            </button>
                        </div>

                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {code.length} chars · {code.split("\n").length} lines
                        </div>
                    </div>

                    {/* Monaco-Style Dark Monospace Textarea */}
                    <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}>
                        <textarea
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            placeholder="// Write your solution here..."
                            style={{
                                flex: 1,
                                width: "100%",
                                height: "100%",
                                boxSizing: "border-box",
                                padding: "16px 20px",
                                backgroundColor: "#0b1329",
                                color: "#f8fafc",
                                border: "none",
                                outline: "none",
                                resize: "none",
                                fontFamily: "Consolas, 'Fira Code', Menlo, Monaco, monospace",
                                fontSize: "13px",
                                lineHeight: "1.6",
                                tabSize: 4
                            }}
                        />
                    </div>

                    {/* Results / Feedback Panel (if executed) */}
                    {executionResult && (
                        <div style={{
                            maxHeight: "220px",
                            backgroundColor: "#020617",
                            borderTop: "2px solid #334155",
                            overflowY: "auto",
                            padding: "16px 20px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        color: executionResult.status === "Accepted" ? "#10b981" : "#f43f5e"
                                    }}>
                                        {executionResult.status}
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                        {executionResult.passedCount} / {executionResult.totalCount} test cases passed
                                    </span>
                                    {executionResult.runtimeSeconds !== undefined && (
                                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                                            Runtime: {executionResult.runtimeSeconds.toFixed(3)}s · Memory: {executionResult.memoryKB} KB
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setExecutionResult(null)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#64748b",
                                        fontSize: "12px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>

                            {/* AI Complexity / Quality Analysis if submitted */}
                            {aiEvaluation && (
                                <div style={{
                                    backgroundColor: "#0f172a",
                                    border: "1px solid #1e293b",
                                    borderRadius: "6px",
                                    padding: "10px 14px",
                                    marginBottom: "10px",
                                    fontSize: "12px",
                                    color: "#cbd5e1"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: "600", marginBottom: "4px" }}>
                                        <Sparkles size={14} /> AI Complexity Analysis
                                    </div>
                                    <p style={{ margin: "0 0 4px" }}>{aiEvaluation.feedback || aiEvaluation.analysis}</p>
                                    {(aiEvaluation.timeComplexity || aiEvaluation.spaceComplexity) && (
                                        <div style={{ display: "flex", gap: "14px", color: "#94a3b8", fontSize: "11px" }}>
                                            {aiEvaluation.timeComplexity && <span>Time: <strong>{aiEvaluation.timeComplexity}</strong></span>}
                                            {aiEvaluation.spaceComplexity && <span>Space: <strong>{aiEvaluation.spaceComplexity}</strong></span>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Failed test details if any */}
                            {executionResult.tests?.some(t => !t.status || t.status.id !== 3) && (
                                <div style={{ fontSize: "12px", color: "#f87171" }}>
                                    {executionResult.tests.find(t => t.stderr || t.compile_output)?.stderr ||
                                     executionResult.tests.find(t => t.stderr || t.compile_output)?.compile_output ||
                                     "Output differed from expected solution output on sample tests."}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div style={{
                        height: "56px",
                        backgroundColor: "#0f172a",
                        borderTop: "1px solid #1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 20px"
                    }}>
                        <div style={{ fontSize: "12px", color: isCodeUnchanged ? "#f59e0b" : "#10b981" }}>
                            {isCodeUnchanged ? "Template untouched" : "Draft ready to test"}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={executing || isCodeUnchanged || !isExecutable}
                                onClick={handleRunCode}
                                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <Play size={14} />
                                {executing && executionType === "run" ? "Running..." : "Run Code"}
                            </Button>

                            <Button
                                variant="primary"
                                size="sm"
                                disabled={executing || isCodeUnchanged || !isExecutable}
                                onClick={handleSubmitCode}
                                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <Send size={14} />
                                {executing && executionType === "submit" ? "Submitting..." : "Submit Solution"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
