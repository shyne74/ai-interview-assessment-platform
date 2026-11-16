import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { Clock, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";

const SUPPORTED_LANGUAGES = [
    { id: "javascript", label: "JavaScript (Node.js)", judgeId: 63 },
    { id: "python", label: "Python 3", judgeId: 71 },
    { id: "cpp", label: "C++ (GCC)", judgeId: 54 },
    { id: "java", label: "Java (OpenJDK)", judgeId: 62 }
];

const LANGUAGE_BOILERPLATES = {
    javascript: `// JavaScript (Node.js) - Standard I/O
const fs = require('fs');

function solve() {
    // Read all input tokens from standard input
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === '') return;

    // TODO: Parse input tokens and implement solution
    // Example: const n = parseInt(input[0], 10);

    // Print your result to standard output
}

solve();
`,
    python: `# Python 3 - Standard I/O
import sys

def solve():
    # Read all input tokens from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    # TODO: Parse input tokens and implement solution
    # Example: n = int(input_data[0])

    # Print your result to standard output
    pass

if __name__ == '__main__':
    solve()
`,
    cpp: `// C++ (GCC) - Fast I/O
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Fast I/O operations
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Read input from cin and implement solution
    // Example: int n; if (cin >> n) { ... }

    // Print your result to cout

    return 0;
}
`,
    java: `// Java (OpenJDK) - Main class for Judge0
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // TODO: Read input using scanner and implement solution
        // Example: if (scanner.hasNextInt()) { int n = scanner.nextInt(); }

        // Print your result to standard output
    }
}
`
};

function normalizeCode(code) {
    if (!code || typeof code !== "string") return "";
    return code
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
}

function stripCommentsAndWhitespace(code = "") {
    if (!code || typeof code !== "string") return "";
    return code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")
        .replace(/#.*/g, "")
        .replace(/\s+/g, "")
        .trim();
}

function isStarterBoilerplate(code, language = "javascript") {
    const normalized = normalizeCode(code);
    if (!normalized) return true;
    const langKey = (language || "javascript").toLowerCase();
    const template = LANGUAGE_BOILERPLATES[langKey];
    if (template && normalizeCode(template) === normalized) {
        return true;
    }
    const strippedCandidate = stripCommentsAndWhitespace(code);
    if (template && strippedCandidate === stripCommentsAndWhitespace(template)) {
        return true;
    }
    for (const key of Object.keys(LANGUAGE_BOILERPLATES)) {
        if (normalizeCode(LANGUAGE_BOILERPLATES[key]) === normalized) {
            return true;
        }
        if (strippedCandidate === stripCommentsAndWhitespace(LANGUAGE_BOILERPLATES[key])) {
            return true;
        }
    }
    if (langKey === "python" && (strippedCandidate === "importsysdefsolve():passif__name__=='__main__':solve()" || strippedCandidate === "defsolve():pass")) {
        return true;
    }
    return false;
}

export default function Interview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [runningCode, setRunningCode] = useState(false);
    const [codeOutput, setCodeOutput] = useState(null);
    const [error, setError] = useState("");
    const [pasteWarning, setPasteWarning] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    const [interviewData, setInterviewData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    const [secondsLeft, setSecondsLeft] = useState(1800);

    const [securityModal, setSecurityModal] = useState({
        open: false,
        type: "fullscreen_exit",
        title: "Exam Security Alert",
        message: "You exited fullscreen mode or navigated away from the assessment.",
        violationCount: 0,
        maxAllowed: 3,
        autoSubmitted: false
    });

    const heartbeatRef = useRef(null);
    const lastViolationTimeRef = useRef(0);

    // 1. Fetch Session from Backend
    useEffect(() => {
        let isMounted = true;

        async function fetchInterview() {
            try {
                setLoading(true);
                setError("");
                const res = await api.get(`/interviews/${id}`);
                const data = res.data;

                if (!isMounted) return;

                if (data.status === "evaluated" || data.status === "completed") {
                    navigate(`/results/${id}`, { replace: true });
                    return;
                }

                setInterviewData(data.interview);
                const qList = (data.questions && data.questions.length > 0) ? data.questions : (data.interview?.responses || []);
                setQuestions(qList);

                // Populate initial answers cleanly: only coding questions receive starter boilerplate
                const initialAnswers = {};
                (data.interview?.responses || []).forEach((resp, idx) => {
                    const qItem = qList[idx];
                    const isQCoding = resp.questionType === "coding" || qItem?.assessmentType === "coding" || qItem?.type === "coding" || Boolean(qItem?.codingData?.samples?.length);
                    const lang = resp.language || "javascript";

                    if (isQCoding) {
                        const codeByLang = {};
                        SUPPORTED_LANGUAGES.forEach(l => {
                            codeByLang[l.id] = LANGUAGE_BOILERPLATES[l.id];
                        });
                        if (resp.code) {
                            codeByLang[lang] = resp.code;
                        }

                        initialAnswers[idx] = {
                            text: resp.userAnswer || "",
                            code: resp.code || (LANGUAGE_BOILERPLATES[lang] || ""),
                            language: lang,
                            codeByLanguage: codeByLang
                        };
                    } else {
                        initialAnswers[idx] = {
                            text: resp.userAnswer || "",
                            code: "",
                            language: "javascript",
                            codeByLanguage: {}
                        };
                    }
                });
                setAnswers(initialAnswers);

                // Auto-enter fullscreen upon session load
                try {
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(() => {});
                    }
                } catch (e) {}

                // Calculate server-authoritative remaining time
                if (data.interview?.startedAt && data.interview?.durationSeconds) {
                    const elapsed = Math.floor((Date.now() - new Date(data.interview.startedAt).getTime()) / 1000);
                    const remaining = Math.max(0, data.interview.durationSeconds - elapsed);
                    setSecondsLeft(remaining);
                }
            } catch (err) {
                console.error("Error fetching interview:", err);
                if (isMounted) {
                    setError(err.response?.data?.message || "Could not retrieve the interview session.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchInterview();

        return () => {
            isMounted = false;
        };
    }, [id, navigate]);

    // Synchronize selected language when question index changes
    useEffect(() => {
        const cur = answers[currentIndex];
        if (cur?.language) {
            setSelectedLanguage(cur.language);
        }
        setCodeOutput(null);
    }, [currentIndex]);

    // 2. Countdown Timer with Auto-Submit
    useEffect(() => {
        if (loading || submitting) return;

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, submitting]);

    // 3. Heartbeat & Exam Security Telemetry
    useEffect(() => {
        if (loading || submitting) return;

        // Periodic heartbeat every 25s
        heartbeatRef.current = setInterval(() => {
            api.post(`/interviews/${id}/heartbeat`).catch(() => {});
        }, 25000);

        const triggerViolation = async (type, details) => {
            if (submitting || securityModal.autoSubmitted) return;
            const now = Date.now();
            // Debounce duplicate triggers within 2000ms
            if (now - lastViolationTimeRef.current < 2000) return;
            lastViolationTimeRef.current = now;

            try {
                const res = await api.post(`/interviews/${id}/violation`, {
                    type,
                    questionIndex: currentIndex,
                    details: details || `Integrity violation: ${type}`
                });

                const vCount = res.data?.violationCount || 1;
                const maxAllowed = res.data?.maxAllowed || 3;
                const autoSub = !!res.data?.autoSubmitted;

                setSecurityModal({
                    open: true,
                    type,
                    title: autoSub ? "Exam Disqualified & Terminated" : "Exam Security Warning",
                    violationCount: vCount,
                    maxAllowed,
                    autoSubmitted: autoSub,
                    message: autoSub
                        ? "Maximum allowed integrity violations exceeded. Your exam has been automatically submitted."
                        : type === "fullscreen_exit"
                            ? "You exited fullscreen mode. Proctored exams must be completed strictly in fullscreen."
                            : type === "tab_switch"
                                ? "You navigated away from the assessment tab. Leaving the test window is an integrity violation."
                                : "Assessment window lost focus. Continued switching or multitasking will lead to exam termination."
                });

                if (autoSub) {
                    setSubmitting(true);
                    setTimeout(() => {
                        navigate(`/results/${id}`, { replace: true });
                    }, 3000);
                }
            } catch (err) {
                console.warn("Could not log violation to backend:", err);
                setSecurityModal(prev => ({
                    ...prev,
                    open: true,
                    type,
                    title: "Exam Security Warning",
                    message: "Please return to fullscreen immediately to continue your proctored assessment."
                }));
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !securityModal.autoSubmitted) {
                triggerViolation("fullscreen_exit", "Candidate exited fullscreen mode");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !securityModal.autoSubmitted) {
                triggerViolation("tab_switch", "Candidate navigated away from the exam tab");
            }
        };

        const handleWindowBlur = () => {
            if (document.hidden || !document.fullscreenElement || securityModal.autoSubmitted) return;
            triggerViolation("window_blur", "Assessment window lost focus");
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [id, currentIndex, loading, submitting, securityModal.autoSubmitted]);

    const formatTimer = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    const currentQ = questions[currentIndex] || {};
    const isCoding = currentQ.assessmentType === "coding" || currentQ.type === "coding" || Boolean(currentQ?.codingData?.samples?.length);

    const currentAns = answers[currentIndex] || {
        text: "",
        code: isCoding ? (LANGUAGE_BOILERPLATES[selectedLanguage] || "") : "",
        language: selectedLanguage,
        codeByLanguage: {}
    };
    const wordCount = currentAns.text.trim() ? currentAns.text.trim().split(/\s+/).length : 0;

    const answeredCount = questions.filter((q, idx) => {
        const a = answers[idx];
        if (!a) return false;
        const qIsCoding = q.assessmentType === "coding" || q.type === "coding" || Boolean(q?.codingData?.samples?.length);
        if (qIsCoding) {
            return Boolean(a.code && a.code.trim() && !isStarterBoilerplate(a.code, a.language || selectedLanguage));
        }
        return Boolean(a.text && a.text.trim().length > 0);
    }).length;

    const handleTextChange = (e) => {
        setAnswers({
            ...answers,
            [currentIndex]: {
                ...currentAns,
                text: e.target.value
            }
        });
    };

    const handleLanguageChange = (newLang) => {
        setSelectedLanguage(newLang);
        const existingCodeByLang = currentAns.codeByLanguage || {};
        const updatedCodeByLang = {
            ...existingCodeByLang,
            [selectedLanguage]: currentAns.code
        };

        const nextCode = updatedCodeByLang[newLang] !== undefined
            ? updatedCodeByLang[newLang]
            : (LANGUAGE_BOILERPLATES[newLang] || "");

        updatedCodeByLang[newLang] = nextCode;

        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                ...currentAns,
                language: newLang,
                code: nextCode,
                codeByLanguage: updatedCodeByLang
            }
        }));
        setCodeOutput(null);
    };

    const handleCodeChange = (e) => {
        const val = e.target.value;
        const existingCodeByLang = currentAns.codeByLanguage || {};
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                ...currentAns,
                code: val,
                language: selectedLanguage,
                codeByLanguage: {
                    ...existingCodeByLang,
                    [selectedLanguage]: val
                }
            }
        }));
    };

    const handleResetToTemplate = () => {
        const template = LANGUAGE_BOILERPLATES[selectedLanguage] || "";
        const existingCodeByLang = currentAns.codeByLanguage || {};
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                ...currentAns,
                code: template,
                language: selectedLanguage,
                codeByLanguage: {
                    ...existingCodeByLang,
                    [selectedLanguage]: template
                }
            }
        }));
        setCodeOutput(null);
        setResetConfirmOpen(false);
    };

    const handleResumeAssessment = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen request error:", e);
        }
        setSecurityModal(prev => ({ ...prev, open: false }));
    };

    const handlePaste = (e) => {
        e.preventDefault();
        setPasteWarning(true);
        setTimeout(() => setPasteWarning(false), 3500);

        api.post(`/interviews/${id}/violation`, {
            type: "clipboard",
            questionIndex: currentIndex,
            details: "External paste attempted into editor"
        }).catch(() => {});
    };

    // Run Code via Judge0
    const handleRunCode = async () => {
        if (!currentAns.code.trim()) {
            setCodeOutput({ status: "error", message: "Please write some code before executing." });
            return;
        }

        setRunningCode(true);
        setCodeOutput(null);

        const langConfig = SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage);
        const judgeLangId = langConfig ? langConfig.judgeId : 63;

        try {
            const res = await api.post("/coding/submit", {
                questionId: currentQ._id,
                languageId: judgeLangId,
                sourceCode: currentAns.code
            });

            setCodeOutput({
                status: "success",
                data: res.data
            });
        } catch (err) {
            setCodeOutput({
                status: "error",
                message: err.response?.data?.message || "Execution service unavailable. Your code is still saved for evaluation."
            });
        } finally {
            setRunningCode(false);
        }
    };

    // Auto-save candidate progress to server so it is preserved if leaving midway
    useEffect(() => {
        if (!id || loading || submitting || !questions.length) return;
        const saveTimer = setTimeout(() => {
            api.post(`/interviews/${id}/progress`, {
                answers,
                currentIndex
            }).catch(() => {});
        }, 1200);

        return () => clearTimeout(saveTimer);
    }, [answers, currentIndex, id, loading, submitting, questions.length]);

    const handleSaveAndExit = async () => {
        try {
            await api.post(`/interviews/${id}/progress`, {
                answers,
                currentIndex
            });
        } catch (e) {
            console.error("Error saving progress:", e);
        }
        navigate("/dashboard");
    };

    // Submit Final Exam
    const handleSubmit = async (auto = false) => {
        if (submitting) return;
        setSubmitting(true);
        setError("");

        // 1. Immediately halt heartbeats and timers to prevent conflicting requests
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }

        try {
            // Build evaluated responses array
            const payload = questions.map((q, idx) => {
                const ans = answers[idx] || {};
                const qIsCoding = q.assessmentType === "coding" || q.type === "coding" || Boolean(q?.codingData?.samples?.length);
                const rawCode = (ans.code || "").trim();
                const isUntouched = qIsCoding && isStarterBoilerplate(rawCode, ans.language || selectedLanguage);

                return {
                    questionId: q._id,
                    userAnswer: ans.text || "",
                    code: isUntouched ? "" : rawCode,
                    language: ans.language || selectedLanguage,
                    unchanged: isUntouched
                };
            });

            // Back up payload to localStorage for resiliency
            try {
                localStorage.setItem(`exam_backup_${id}`, JSON.stringify(payload));
            } catch (e) {}

            // 2. Submit answers to Express backend with 120s timeout
            let submitSucceeded = false;
            try {
                await api.post(`/interviews/${id}/submit`, {
                    answers: payload,
                    reason: auto ? "auto-submitted: time expired" : "Candidate submitted assessment"
                }, { timeout: 120000 });
                submitSucceeded = true;
            } catch (postErr) {
                console.warn("Direct submit timed out or errored, falling back to status polling:", postErr);
            }

            // Polling fallback: if direct request didn't return, poll every 3s up to 60s
            if (!submitSucceeded) {
                const startTime = Date.now();
                while (Date.now() - startTime < 60000) {
                    await new Promise(r => setTimeout(r, 3000));
                    try {
                        const checkRes = await api.get(`/interviews/${id}`);
                        const status = checkRes.data?.interview?.status || checkRes.data?.status;
                        if (status === "evaluated" || status === "completed") {
                            submitSucceeded = true;
                            break;
                        }
                    } catch (pollErr) {
                        // Keep polling
                    }
                }
            }

            if (!submitSucceeded) {
                setError("Your assessment answers were saved and are processing. Please visit your dashboard shortly to view your completed report.");
                setSubmitting(false);
                return;
            }

            // 3. Trigger optional automated AI deep analysis in background
            try {
                await api.post(`/results/${id}/analyze`, {}, { timeout: 15000 });
            } catch (analyzeErr) {
                console.warn("Analysis trigger notice:", analyzeErr.message);
            }

            localStorage.removeItem("activeInterviewId");

            // 4. Navigate to submission confirmation screen
            navigate(`/exam-submitted/${id}`, { replace: true });
        } catch (err) {
            console.error("Submission failed:", err);
            setError(err.response?.data?.message || "Failed to submit assessment. Please retry.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
                        Loading your interview session...
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                        Retrieving questions and assessment parameters from the server.
                    </p>
                </div>
            </div>
        );
    }

    if (error && !questions.length) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                <div style={{ textAlign: "center", maxWidth: "480px", padding: "32px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "32px", color: "#ef4444", marginBottom: "16px" }}>⚠️</div>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>
                        Session Error
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
                        {error}
                    </p>
                    <Link to="/dashboard" className="wf-btn-primary" style={{ textDecoration: "none" }}>
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
            {/* Top Bar matching Screen 07 */}
            <header style={{
                height: "56px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
                boxSizing: "border-box",
                position: "sticky",
                top: 0,
                zIndex: 40
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "6px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "800",
                        fontSize: "14px"
                    }}>
                        A
                    </div>
                    <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                        AI Assess
                    </span>
                </div>

                <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                    {interviewData?.roleTitle || "Technical Screen"} · {
                        interviewData?.interviewType === "one-skill"
                            ? "One-skill practice"
                            : (interviewData?.interviewType === "coding" || interviewData?.assessmentType === "coding")
                            ? "Coding assessment"
                            : interviewData?.interviewType === "pdf-prep"
                            ? "PDF prep"
                            : interviewData?.interviewType === "jd"
                            ? "JD practice"
                            : "Mock interview"
                    }
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                    <span style={{
                        color: secondsLeft < 300 ? "#dc2626" : "#334155",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        <Clock size={15} strokeWidth={1.8} style={{ color: secondsLeft < 300 ? "#dc2626" : "#64748b" }} />
                        <span>{formatTimer(secondsLeft)} remaining</span>
                    </span>
                    <button
                        type="button"
                        onClick={handleSaveAndExit}
                        disabled={submitting}
                        style={{
                            backgroundColor: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "5px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Save & Exit
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            padding: "5px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        End and submit
                    </button>
                </div>
            </header>

            {/* Paste Violation Warning Banner */}
            {pasteWarning && (
                <div style={{
                    backgroundColor: "#fef2f2",
                    borderBottom: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "10px 32px",
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <AlertTriangle size={16} style={{ color: "#dc2626" }} />
                    <span>Direct pasting is disabled to protect assessment integrity. Please type your response.</span>
                </div>
            )}

            {/* Dedicated Submitting & Evaluating Screen */}
            {submitting && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "24px"
                }}>
                    <div style={{
                        maxWidth: "460px",
                        width: "100%",
                        textAlign: "center",
                        padding: "40px 32px",
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                        backgroundColor: "#ffffff"
                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto"
                        }}>
                            <Loader2 size={26} className="animate-spin" style={{ color: "#16a34a" }} />
                        </div>

                        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#0f172a", margin: "0 0 8px 0" }}>
                            Evaluating your assessment
                        </h2>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px 0", lineHeight: 1.5 }}>
                            Our evaluation engine is analyzing your responses against calibrated criteria.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                <CheckCircle2 size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>Answers securely saved</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                <CheckCircle2 size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>Integrity verification complete</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                                <Loader2 size={18} className="animate-spin" style={{ color: "#16a34a", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "#16a34a" }}>Evaluating technical responses...</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #f1f5f9", opacity: 0.7 }}>
                                <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #cbd5e1", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: "400", color: "#64748b" }}>Generating comprehensive score report</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Exam Area */}
            <main style={{
                flex: 1,
                maxWidth: "1080px",
                width: "100%",
                margin: "0 auto",
                padding: "36px 24px 64px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "24px"
            }}>
                {/* Question Card */}
                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "32px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                    {/* Progress Header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                        fontSize: "13px"
                    }}>
                        <span style={{ fontWeight: "700", color: "#0f172a" }}>
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                        <span style={{ color: "#64748b" }}>
                            {answeredCount} of {questions.length} answered
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                        height: "4px",
                        backgroundColor: "#e2e8f0",
                        borderRadius: "2px",
                        overflow: "hidden",
                        marginBottom: "24px"
                    }}>
                        <div style={{
                            width: `${((currentIndex + 1) / questions.length) * 100}%`,
                            height: "100%",
                            backgroundColor: "#2563eb",
                            borderRadius: "2px",
                            transition: "width 0.2s ease"
                        }} />
                    </div>

                    {/* Topic / Difficulty Pills */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <span style={{
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em"
                        }}>
                            {currentQ.domain || currentQ.role || "Technical"}
                        </span>
                        <span style={{
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: "600",
                            textTransform: "capitalize"
                        }}>
                            {currentQ.difficulty || "Medium"}
                        </span>
                        <span style={{
                            backgroundColor: isCoding ? "#fef3c7" : "#ecfdf5",
                            color: isCoding ? "#92400e" : "#065f46",
                            border: `1px solid ${isCoding ? "#fde68a" : "#a7f3d0"}`,
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: "600"
                        }}>
                            {isCoding ? "Coding Challenge" : "Theory & Reasoning"}
                        </span>
                    </div>

                    {/* Question Title & Description */}
                    <h1 style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#0f172a",
                        lineHeight: "1.4",
                        margin: "0 0 10px 0"
                    }}>
                        {currentQ.questionText || currentQ.codingData?.title || "Explain your technical solution."}
                    </h1>

                    {currentQ.codingData?.description && (
                        <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 20px 0" }}>
                            {currentQ.codingData.description}
                        </p>
                    )}

                    {/* Samples / Constraints if coding */}
                    {isCoding && currentQ.codingData?.samples?.length > 0 && (
                        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "20px", fontSize: "13px" }}>
                            <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>Sample Test Case:</div>
                            <div style={{ color: "#334155" }}><strong>Input:</strong> <code>{currentQ.codingData.samples[0].input}</code></div>
                            <div style={{ color: "#334155", marginTop: "4px" }}><strong>Output:</strong> <code>{currentQ.codingData.samples[0].output}</code></div>
                        </div>
                    )}

                    {/* Answer Area: Coding vs Theory */}
                    {isCoding ? (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                                        Language:
                                    </label>
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        style={{
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#1e293b",
                                            backgroundColor: "#ffffff",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {SUPPORTED_LANGUAGES.map((lang) => (
                                            <option key={lang.id} value={lang.id}>
                                                {lang.label}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => setResetConfirmOpen(true)}
                                        title="Reset editor for this language to starter template"
                                        style={{
                                            padding: "5px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            backgroundColor: "#f8fafc",
                                            color: "#475569",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        <span>↺</span> Reset to Template
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRunCode}
                                    disabled={runningCode}
                                    style={{
                                        backgroundColor: "#f0fdf4",
                                        border: "1px solid #86efac",
                                        borderRadius: "6px",
                                        padding: "7px 16px",
                                        fontSize: "12.5px",
                                        fontWeight: "700",
                                        color: "#166534",
                                        cursor: runningCode ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                >
                                    {runningCode ? "Executing..." : "▶ Run Code (Judge0)"}
                                </button>
                            </div>

                            <textarea
                                value={currentAns.code}
                                onChange={handleCodeChange}
                                onPaste={handlePaste}
                                rows={14}
                                placeholder="// Write your solution here..."
                                spellCheck={false}
                                style={{
                                    width: "100%",
                                    padding: "16px",
                                    borderRadius: "10px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#0f172a",
                                    color: "#f8fafc",
                                    fontFamily: "Consolas, 'Courier New', Monaco, monospace",
                                    fontSize: "13.5px",
                                    lineHeight: "1.55",
                                    boxSizing: "border-box",
                                    outline: "none",
                                    resize: "vertical"
                                }}
                            />

                            {/* Execution Output Panel */}
                            {codeOutput && (
                                <div style={{
                                    marginTop: "14px",
                                    padding: "14px 16px",
                                    borderRadius: "8px",
                                    backgroundColor: codeOutput.status === "success" ? "#f0fdf4" : "#fef2f2",
                                    border: `1px solid ${codeOutput.status === "success" ? "#bbf7d0" : "#fecaca"}`,
                                    fontSize: "13px"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                        <span style={{
                                            fontWeight: "700",
                                            color: codeOutput.status === "success" ? "#065f46" : "#991b1b",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}>
                                            <span>{codeOutput.status === "success" ? "✓" : "✕"}</span>
                                            {codeOutput.data?.submission?.execution?.status || (codeOutput.status === "success" ? "Execution Output" : "Execution Error")}
                                        </span>
                                        {codeOutput.data?.submission?.execution?.tests?.[0]?.time && (
                                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                                                Time: {codeOutput.data.submission.execution.tests[0].time}s | Mem: {codeOutput.data.submission.execution.tests[0].memory}KB
                                            </span>
                                        )}
                                    </div>

                                    {codeOutput.data?.submission?.execution?.tests ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {codeOutput.data.submission.execution.tests.map((t, idx) => (
                                                <div key={idx} style={{ padding: "8px 10px", backgroundColor: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                                                    <div style={{ fontWeight: "600", color: t.status?.id === 3 ? "#16a34a" : "#dc2626", marginBottom: "4px" }}>
                                                        Test Case #{idx + 1}: {t.status?.description || "Completed"}
                                                    </div>
                                                    {t.stdout && (
                                                        <div style={{ color: "#334155", fontFamily: "monospace" }}>
                                                            <strong>Output:</strong> {t.stdout}
                                                        </div>
                                                    )}
                                                    {t.compile_output && (
                                                        <div style={{ color: "#b91c1c", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                                            <strong>Compiler Output:</strong> {t.compile_output}
                                                        </div>
                                                    )}
                                                    {t.stderr && (
                                                        <div style={{ color: "#b91c1c", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                                            <strong>Error:</strong> {t.stderr}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "12px" }}>
                                            {codeOutput.message || JSON.stringify(codeOutput.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "8px"
                            }}>
                                <label style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                                    Your answer
                                </label>
                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                    {wordCount} words
                                </span>
                            </div>

                            <textarea
                                value={currentAns.text}
                                onChange={handleTextChange}
                                onPaste={handlePaste}
                                rows={10}
                                placeholder="Explain your architectural reasoning, trade-offs, and implementation approach..."
                                style={{
                                    width: "100%",
                                    padding: "16px",
                                    borderRadius: "10px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    fontFamily: "inherit",
                                    boxSizing: "border-box",
                                    outline: "none",
                                    resize: "vertical"
                                }}
                            />

                            <div style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginTop: "8px"
                            }}>
                                Explain your reasoning. A clear partial answer is useful too.
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "32px",
                        paddingTop: "24px",
                        borderTop: "1px solid #f1f5f9"
                    }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                style={{
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    padding: "9px 16px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: currentIndex === 0 ? "#94a3b8" : "#334155",
                                    cursor: currentIndex === 0 ? "not-allowed" : "pointer"
                                }}
                            >
                                ← Previous
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            {currentIndex < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex(currentIndex + 1)}
                                    style={{
                                        backgroundColor: "#1e3a8a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "10px 20px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                >
                                    Next question →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting}
                                    style={{
                                        backgroundColor: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "10px 22px",
                                        fontSize: "14px",
                                        fontWeight: "700",
                                        cursor: submitting ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Submit assessment →
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subdued Footer Note */}
                <div style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    textAlign: "center",
                    lineHeight: "1.4"
                }}>
                    Proctored assessment session · Fullscreen, focus change, and clipboard activity are continuously logged to the server.
                </div>
            </main>

            {/* Fullscreen & Integrity Security Warning Modal */}
            {securityModal.open && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.82)",
                    backdropFilter: "blur(6px)",
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}>
                    <div style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "16px",
                        maxWidth: "520px",
                        width: "100%",
                        padding: "32px",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
                        border: securityModal.autoSubmitted ? "2px solid #ef4444" : "2px solid #f59e0b",
                        textAlign: "center"
                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            backgroundColor: securityModal.autoSubmitted ? "#fee2e2" : "#fef3c7",
                            color: securityModal.autoSubmitted ? "#b91c1c" : "#b45309",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            margin: "0 auto 16px auto"
                        }}>
                            {securityModal.autoSubmitted ? "🚫" : "⚠️"}
                        </div>

                        <div style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "9999px",
                            backgroundColor: securityModal.autoSubmitted ? "#fee2e2" : "#fef3c7",
                            color: securityModal.autoSubmitted ? "#991b1b" : "#92400e",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            marginBottom: "12px"
                        }}>
                            {securityModal.autoSubmitted
                                ? "DISQUALIFICATION NOTICE"
                                : `INTEGRITY WARNING: ${securityModal.violationCount} OF ${securityModal.maxAllowed}`}
                        </div>

                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            color: "#0f172a",
                            margin: "0 0 10px 0"
                        }}>
                            {securityModal.title}
                        </h2>

                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.6",
                            margin: "0 0 24px 0"
                        }}>
                            {securityModal.message}
                        </p>

                        <div style={{
                            backgroundColor: "#f8fafc",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            fontSize: "12.5px",
                            color: "#64748b",
                            textAlign: "left",
                            marginBottom: "24px",
                            border: "1px solid #e2e8f0"
                        }}>
                            <div style={{ fontWeight: "700", color: "#334155", marginBottom: "4px" }}>Proctoring Protocol:</div>
                            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.5" }}>
                                <li>All answers and code changes are saved automatically.</li>
                                <li>You must remain in fullscreen throughout the assessment.</li>
                                <li>Reaching {securityModal.maxAllowed} violations terminates the examination immediately.</li>
                            </ul>
                        </div>

                        {securityModal.autoSubmitted ? (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#fef2f2",
                                color: "#991b1b",
                                borderRadius: "8px",
                                fontWeight: "600",
                                fontSize: "13px"
                            }}>
                                Redirecting to assessment evaluation and results...
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResumeAssessment}
                                style={{
                                    width: "100%",
                                    backgroundColor: "#1e3a8a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "10px",
                                    padding: "14px 20px",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    boxShadow: "0 4px 6px -1px rgba(30, 58, 138, 0.25)"
                                }}
                            >
                                <span>⛶</span> Return to Fullscreen & Resume Assessment
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Reset Code Confirmation Modal */}
            {resetConfirmOpen && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    backdropFilter: "blur(2px)",
                    zIndex: 99998,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}>
                    <div style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        maxWidth: "420px",
                        width: "100%",
                        padding: "24px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px 0" }}>
                            Reset {SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.label || selectedLanguage} Code?
                        </h3>
                        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                            This will overwrite your typed code for this language with the clean starter template. Other languages and responses will not be affected.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setResetConfirmOpen(false)}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "#475569",
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResetToTemplate}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: "#dc2626",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    color: "#ffffff",
                                    cursor: "pointer"
                                }}
                            >
                                Reset Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
