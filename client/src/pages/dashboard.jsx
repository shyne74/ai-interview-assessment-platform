import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Clock,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Code2,
    Target,
    Zap,
    Check,
    Layers,
    ListTree,
    Users,
    AlertTriangle,
    Shield
} from "lucide-react";
import api from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastContext";
import { getTopicByLabel } from "../config/dsaTopics";

const DSA_TOPICS = [
    "Arrays",
    "Strings",
    "Hash Maps",
    "Two Pointers",
    "Sliding Window",
    "Linked Lists",
    "Stacks & Queues",
    "Binary Search",
    "Sorting",
    "Recursion",
    "Trees",
    "Binary Search Trees",
    "Heaps",
    "Graphs",
    "Backtracking",
    "Greedy",
    "Dynamic Programming",
    "Tries",
    "Bit Manipulation",
    "Math"
];

export default function Dashboard() {
    const navigate = useNavigate();
    const { error: toastError } = useToast();

    const username = localStorage.getItem("username") || "Candidate";

    // Time-based greeting (pure text, clean and mature)
    const greetingText = useMemo(() => {
        const hour = new Date().getHours();
        const displayName = username && username !== "undefined" && username !== "null" ? username : "Candidate";
        if (hour < 12) return `Good morning, ${displayName}`;
        if (hour < 18) return `Good afternoon, ${displayName}`;
        return `Good evening, ${displayName}`;
    }, [username]);

    // Dashboard Loading & Error State
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    // Active test banner state
    const [activeInterview, setActiveInterview] = useState(null);
    const [liveSeconds, setLiveSeconds] = useState(0);

    // Pending assessments state
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingList, setPendingList] = useState([]);
    const [isRestricted, setIsRestricted] = useState(false);
    const [pendingPanelOpen, setPendingPanelOpen] = useState(false);
    const [startingPendingId, setStartingPendingId] = useState(null);
    const pendingRef = useRef(null);

    // Genuine attempts map for score labels on cards
    const [lastAttemptsMap, setLastAttemptsMap] = useState({});

    // Carousel Slide State (Session-persisted)
    const [currentSlide, setCurrentSlide] = useState(() => {
        try {
            const saved = sessionStorage.getItem("candidate_home_active_slide");
            const parsed = parseInt(saved, 10);
            return !isNaN(parsed) && parsed >= 0 && parsed < 4 ? parsed : 0;
        } catch (e) {
            return 0;
        }
    });
    const [slideDirection, setSlideDirection] = useState("next");
    const [isAnimating, setIsAnimating] = useState(false);

    // Close pending panel on outside click or Esc
    useEffect(() => {
        function handleKey(e) {
            if (e.key === "Escape") setPendingPanelOpen(false);
        }
        function handleClick(e) {
            if (pendingRef.current && !pendingRef.current.contains(e.target)) {
                setPendingPanelOpen(false);
            }
        }
        window.addEventListener("keydown", handleKey);
        document.addEventListener("mousedown", handleClick);
        return () => {
            window.removeEventListener("keydown", handleKey);
            document.removeEventListener("mousedown", handleClick);
        };
    }, []);

    // Fetch dashboard state
    const fetchDashboardState = async () => {
        setLoading(true);
        setFetchError("");
        try {
            // 1. Fetch active unfinished attempt (Resume Exam)
            const activeRes = await api.get("/interviews/active").catch(() => ({ data: { hasActive: false } }));
            if (activeRes.data?.hasActive && activeRes.data?.interview) {
                setActiveInterview(activeRes.data.interview);
                setLiveSeconds(activeRes.data.interview.remainingSeconds || 1800);
            } else {
                setActiveInterview(null);
                setLiveSeconds(0);
            }

            // 2. Fetch assigned pending assessments
            const pendingRes = await api.get("/interviews/pending").catch(() => ({ data: { count: 0, pendingAssessments: [] } }));
            if (pendingRes.data) {
                setPendingCount(pendingRes.data.count || 0);
                setPendingList(pendingRes.data.pendingAssessments || []);
                setIsRestricted(Boolean(pendingRes.data.isRestricted));
            }

            // 3. Fetch candidate's genuine assessment results (to show 'Last: X.X/10' badge on slides)
            const resultsRes = await api.get("/results").catch(() => ({ data: { results: [] } }));
            const userResults = resultsRes.data?.results || [];

            if (userResults.length > 0) {
                const attemptsMap = {};
                userResults.forEach((r) => {
                    let score = r.overallScore;
                    if (score > 10) score = score / 10;
                    score = Math.round(score * 10) / 10;

                    const key = (r.roleTitle || r.domain || "").toLowerCase();
                    if (attemptsMap[key] === undefined) {
                        attemptsMap[key] = score;
                    }
                });
                setLastAttemptsMap(attemptsMap);
            } else {
                setLastAttemptsMap({});
            }
        } catch (err) {
            console.error("Dashboard state load error:", err);
            setFetchError("Unable to load latest dashboard metrics. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardState();
    }, []);

    // Live countdown timer for active interview
    useEffect(() => {
        if (!activeInterview || liveSeconds <= 0) return;
        const timer = setInterval(() => {
            setLiveSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setActiveInterview(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeInterview, liveSeconds]);

    // Format remaining time
    const formattedRemaining = useMemo(() => {
        const mins = Math.floor(liveSeconds / 60);
        const secs = liveSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }, [liveSeconds]);

    const durationSeconds = activeInterview?.durationSeconds || 1800;
    const progressPercent = Math.min(100, Math.max(0, ((durationSeconds - liveSeconds) / durationSeconds) * 100));

    // Handle Start Pending Assessment
    const handleStartPendingAssessment = async (pendingId) => {
        if (startingPendingId) return;
        setStartingPendingId(pendingId);
        try {
            const res = await api.post(`/interviews/${pendingId}/start`);
            const interviewId = res.data.interviewId || pendingId;
            localStorage.setItem("activeInterviewId", interviewId);
            navigate(`/interview/${interviewId}`);
        } catch (err) {
            console.error("Failed to start pending assessment:", err);
            toastError("Failed to launch assessment. Please try again.");
            setStartingPendingId(null);
        }
    };

    // Navigation handlers
    const handleStartTest = (testType, duration = 30) => {
        if (testType === "Adaptive Challenge") {
            navigate("/adaptive-exam");
        } else if (testType === "Coding") {
            navigate("/practice/coding-setup");
        } else if (testType === "System Design" || testType === "One Skill") {
            navigate("/practice/one-skill");
        } else {
            navigate(`/practice/mock-setup?type=${encodeURIComponent(testType)}&duration=${duration}`);
        }
    };

    const handleTopicClick = (topic) => {
        const topicObj = getTopicByLabel(topic);
        const slug = topicObj ? topicObj.slug : encodeURIComponent(topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        navigate(`/practice/topics/${slug}`);
    };

    const handleResume = () => {
        if (!activeInterview) return;
        if (activeInterview.type === "adaptive") {
            navigate(`/adaptive-interview/${activeInterview.id}`);
        } else {
            navigate(`/interview/${activeInterview.id}`);
        }
    };

    // Card attempts helper for genuine historical score badges
    const getLastAttempt = (keywords) => {
        for (const kw of keywords) {
            const match = Object.keys(lastAttemptsMap).find((k) => k.includes(kw.toLowerCase()));
            if (match && lastAttemptsMap[match] !== undefined) {
                return lastAttemptsMap[match];
            }
        }
        return null;
    };

    const mockScore = getLastAttempt(["mock", "technical", "screen"]);
    const codingScore = getLastAttempt(["coding", "algorithm", "code"]);
    const sysDesignScore = getLastAttempt(["system design", "architecture", "one skill"]);
    const adaptiveScore = getLastAttempt(["adaptive"]);

    // Carousel Slides Definition (Order strictly preserved: Mock -> Coding -> One Skill -> Adaptive)
    const slides = [
        {
            id: "mock",
            category: "Technical screen",
            icon: MessageSquare,
            title: "Mock interview",
            description: "Practice a comprehensive recruiter screening to identify gaps in CS fundamentals, technical communication, and role alignment.",
            highlight: "Detailed score report and rubric breakdown",
            duration: "30 mins",
            buttonLabel: "Start interview",
            score: mockScore,
            onStart: () => handleStartTest("Technical Screen", 30)
        },
        {
            id: "coding",
            category: "Code sandbox",
            icon: Code2,
            title: "Coding assessment",
            description: "Solve algorithmic and data structure problems designed to rigorously test problem-solving skills, complexity analysis, and edge cases.",
            highlight: "Automated test execution and complexity analysis",
            duration: "60 mins",
            buttonLabel: "Start coding assessment",
            score: codingScore,
            onStart: () => handleStartTest("Coding", 60)
        },
        {
            id: "oneskill",
            category: "Focused practice",
            icon: Target,
            title: "One skill practice",
            description: "Target a specific architectural or engineering area to design scalable systems and clearly justify critical trade-offs.",
            highlight: "Single-domain drill with instant guidance",
            duration: "60 mins",
            buttonLabel: "Start practice",
            score: sysDesignScore,
            onStart: () => handleStartTest("One Skill", 60)
        },
        {
            id: "adaptive",
            category: "Dynamic path",
            icon: Zap,
            title: "Adaptive challenge",
            description: "Questions calibrate dynamically to your ability. Higher performance unlocks advanced concepts while reinforcing foundational gaps.",
            highlight: "Real-time item response calibrated testing",
            duration: "30 mins",
            buttonLabel: "Start challenge",
            score: adaptiveScore,
            onStart: () => handleStartTest("Adaptive Challenge", 30)
        }
    ];

    // Carousel Navigation
    const goToSlide = (newIndex, direction = "next") => {
        if (newIndex === currentSlide || isAnimating) return;
        setSlideDirection(direction);
        setIsAnimating(true);
        setCurrentSlide(newIndex);
        try {
            sessionStorage.setItem("candidate_home_active_slide", String(newIndex));
        } catch (e) {}
        setTimeout(() => setIsAnimating(false), 300);
    };

    const handlePrev = () => {
        const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
        goToSlide(prevIndex, "prev");
    };

    const handleNext = () => {
        const nextIndex = (currentSlide + 1) % slides.length;
        goToSlide(nextIndex, "next");
    };

    // Keyboard Navigation for Carousel
    const handleCarouselKeyDown = (e) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            handlePrev();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            handleNext();
        }
    };

    // Touch Swipe Navigation for Carousel
    const touchStartX = useRef(0);
    const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX.current - touchEndX;
        if (Math.abs(diff) > 45) {
            if (diff > 0) handleNext();
            else handlePrev();
        }
    };

    const currentItem = slides[currentSlide];
    const nextItem = slides[(currentSlide + 1) % slides.length];
    const CurrentIcon = currentItem.icon;

    // If initial loading, render layout-matched skeleton
    if (loading) {
        return (
            <div style={{ maxWidth: "1216px", margin: "0 auto", paddingTop: "8px" }}>
                {/* Header Skeleton */}
                <div style={{ marginBottom: "26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Skeleton variant="title" width="280px" height="32px" style={{ marginBottom: "8px" }} />
                        <Skeleton variant="text" width="200px" />
                    </div>
                    <Skeleton variant="button" width="180px" height="36px" borderRadius="20px" />
                </div>

                {/* Single Wide Card Skeleton */}
                <div style={{ maxWidth: "860px", margin: "0 auto 40px auto" }}>
                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "36px", height: "260px", boxSizing: "border-box" }}>
                        <Skeleton variant="badge" width="120px" height="24px" style={{ marginBottom: "16px" }} />
                        <Skeleton variant="title" width="260px" height="28px" style={{ marginBottom: "12px" }} />
                        <Skeleton variant="text" width="90%" style={{ marginBottom: "8px" }} />
                        <Skeleton variant="text" width="60%" style={{ marginBottom: "28px" }} />
                        <Skeleton variant="button" width="160px" height="40px" />
                    </div>
                </div>

                {/* Domain Tiles Skeleton */}
                <Skeleton variant="text" width="180px" height="20px" style={{ marginBottom: "16px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} variant="rect" height="84px" borderRadius="10px" />
                    ))}
                </div>
            </div>
        );
    }

    // Error State
    if (fetchError && !activeInterview) {
        return (
            <div style={{ maxWidth: "600px", margin: "40px auto" }}>
                <EmptyState
                    icon={<AlertTriangle size={36} strokeWidth={1.5} color="var(--color-warning)" />}
                    title="Could not load your dashboard"
                    description={fetchError}
                    actionLabel="Retry loading"
                    onAction={fetchDashboardState}
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1216px", margin: "0 auto", paddingTop: "8px" }}>
            {/* Header Greeting + Interactive Pending Assessments Notification */}
            <div
                className="animate-fade-in stagger-1"
                style={{
                    marginBottom: "26px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "16px"
                }}
            >
                <div>
                    <h1 style={{
                        fontSize: "var(--text-display)",
                        lineHeight: "var(--lh-display)",
                        letterSpacing: "var(--ls-display)",
                        fontWeight: "600",
                        color: "var(--color-text)",
                        margin: "0 0 6px 0",
                        textWrap: "balance"
                    }}>
                        {greetingText}
                    </h1>
                    <p style={{
                        fontSize: "var(--text-body)",
                        lineHeight: "var(--lh-body)",
                        color: "var(--color-text-secondary)",
                        margin: 0,
                        fontWeight: "400"
                    }}>
                        What would you like to practice today?
                    </p>
                </div>

                {/* Interactive Pending Assessments Notification Pill & Popover */}
                <div style={{ position: "relative" }} ref={pendingRef}>
                    <button
                        type="button"
                        aria-expanded={pendingPanelOpen}
                        onClick={() => setPendingPanelOpen(!pendingPanelOpen)}
                        className="interactive-scale"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 16px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "var(--text-label)",
                            fontWeight: "500",
                            backgroundColor: pendingCount > 0 ? "var(--color-primary-light)" : "var(--color-surface)",
                            color: pendingCount > 0 ? "var(--color-primary-active)" : "var(--color-text-secondary)",
                            border: pendingCount > 0 ? "1px solid var(--color-primary-border)" : "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-xs)",
                            cursor: "pointer",
                            transition: "all var(--motion-fast) var(--ease-standard)"
                        }}
                    >
                        {pendingCount > 0 ? (
                            <Clock size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
                        ) : (
                            <CheckCircle2 size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
                        )}
                        <span>
                            {pendingCount > 0
                                ? `${pendingCount} assessment${pendingCount === 1 ? "" : "s"} pending`
                                : "All caught up · 0 pending"}
                        </span>
                        <ChevronDown
                            size={13}
                            strokeWidth={1.75}
                            style={{
                                transition: "transform var(--motion-base) var(--ease-standard)",
                                transform: pendingPanelOpen ? "rotate(180deg)" : "rotate(0deg)"
                            }}
                        />
                    </button>

                    {/* Popover Panel */}
                    {pendingPanelOpen && (
                        <div
                            className="ui-card animate-fade-in"
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                width: "380px",
                                maxWidth: "90vw",
                                backgroundColor: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                                boxShadow: "var(--shadow-xl)",
                                padding: "18px",
                                zIndex: 100
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "10px" }}>
                                <div style={{ fontSize: "var(--text-body)", fontWeight: "600", color: "var(--color-text)" }}>
                                    Assigned pending assessments ({pendingCount})
                                </div>
                                <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: "500" }}>
                                    {pendingCount > 0 ? "Awaiting your attempt" : "Up to date"}
                                </span>
                            </div>

                            {pendingCount === 0 ? (
                                <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "var(--text-label)", lineHeight: "1.5" }}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                                        <CheckCircle2 size={24} strokeWidth={1.75} color="var(--color-primary)" />
                                    </div>
                                    <span style={{ fontWeight: "600", color: "var(--color-text)", display: "block" }}>
                                        You have 0 pending assigned assessments.
                                    </span>
                                    <p style={{ margin: "4px 0 0 0", color: "var(--color-text-muted)", fontSize: "var(--text-caption)" }}>
                                        All recruiter or examiner assigned exams have been completed.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                                    {pendingList.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                padding: "12px",
                                                borderRadius: "var(--radius-md)",
                                                backgroundColor: "var(--color-surface-secondary)",
                                                border: "1px solid var(--color-border)"
                                            }}
                                        >
                                            <div style={{ fontWeight: "600", color: "var(--color-text)", fontSize: "13.5px", marginBottom: "2px" }}>
                                                {item.roleTitle}
                                            </div>
                                            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", marginBottom: "10px" }}>
                                                {item.domain} · {item.durationMinutes} mins · {item.questionCount} questions
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={startingPendingId === item.id}
                                                disabled={Boolean(startingPendingId)}
                                                onClick={() => handleStartPendingAssessment(item.id)}
                                                style={{ width: "100%", fontWeight: "500" }}
                                            >
                                                Start assessment
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Resume Banner (Full Width, Live Ticking Timer, Progress Bar) */}
            {activeInterview && (
                <div
                    className="animate-fade-in stagger-2"
                    style={{
                        width: "100%",
                        backgroundColor: liveSeconds <= 120
                            ? "var(--color-danger-light)"
                            : liveSeconds <= 600
                                ? "var(--color-warning-light)"
                                : "var(--color-surface)",
                        border: `1px solid ${
                            liveSeconds <= 120
                                ? "var(--color-danger-border)"
                                : liveSeconds <= 600
                                    ? "var(--color-warning-border)"
                                    : "var(--color-primary-border)"
                        }`,
                        borderRadius: "var(--radius-lg)",
                        padding: "16px 20px",
                        marginBottom: "32px",
                        boxShadow: "var(--shadow-sm)",
                        boxSizing: "border-box"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: liveSeconds <= 120 ? "#fee2e2" : liveSeconds <= 600 ? "#fef3c7" : "var(--color-primary-light)",
                                color: liveSeconds <= 120 ? "var(--color-danger)" : liveSeconds <= 600 ? "var(--color-warning-text)" : "var(--color-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <Clock size={18} strokeWidth={1.75} />
                            </span>
                            <div>
                                <div style={{ fontSize: "14.5px", fontWeight: "600", color: "var(--color-text)" }}>
                                    Resume: {activeInterview.roleTitle || "Active assessment"}
                                </div>
                                <div style={{ fontSize: "12.5px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span
                                        className="tabular-nums"
                                        style={{
                                            fontWeight: "500",
                                            color: liveSeconds <= 120 ? "var(--color-danger)" : liveSeconds <= 600 ? "var(--color-warning-text)" : "var(--color-text)"
                                        }}
                                    >
                                        {formattedRemaining} left
                                    </span>
                                    <span>•</span>
                                    <span style={{ fontWeight: "400" }}>
                                        {activeInterview.totalQuestions
                                            ? `Question ${(activeInterview.answeredCount || 0) + 1} of ${activeInterview.totalQuestions}`
                                            : "Exam in progress"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant={liveSeconds <= 120 ? "danger" : "primary"}
                            size="sm"
                            onClick={handleResume}
                            style={{
                                padding: "7px 16px",
                                fontWeight: "500",
                                fontSize: "13px"
                            }}
                        >
                            Resume
                        </Button>
                    </div>

                    {/* Progress track showing time spent */}
                    <div style={{ marginTop: "8px" }}>
                        <ProgressBar
                            value={progressPercent}
                            height="4px"
                            variant={liveSeconds <= 120 ? "danger" : liveSeconds <= 600 ? "warning" : "primary"}
                        />
                    </div>
                </div>
            )}

            {/* Dedicated Assigned Exam Card */}
            {pendingList.length > 0 && (
                <div
                    className="animate-fade-in stagger-2"
                    style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "24px",
                        marginBottom: "36px",
                        boxShadow: "0 2px 4px rgba(22, 163, 74, 0.06)",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "4px", backgroundColor: "#16a34a" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "#166534", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "10px" }}>
                                    Assigned Company Assessment
                                </span>
                                {pendingList[0].batchName && (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                                        • {pendingList[0].batchName} ({pendingList[0].organizationName || "AssessAI"})
                                    </span>
                                )}
                            </div>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#0f172a", margin: "0 0 6px 0" }}>
                                {pendingList[0].roleTitle}
                            </h2>
                            <div style={{ fontSize: "13px", color: "#475569", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                                <span>Domain: <strong>{pendingList[0].domain}</strong></span>
                                <span>•</span>
                                <span>Format: <strong>{pendingList[0].assessmentType || "Theory"}</strong></span>
                                <span>•</span>
                                <span>Duration: <strong>{pendingList[0].durationMinutes} mins</strong></span>
                                <span>•</span>
                                <span>Questions: <strong>{pendingList[0].questionCount} questions</strong></span>
                            </div>

                            {(pendingList[0].opensAt || pendingList[0].closesAt) && (
                                <div style={{ fontSize: "12px", color: "#b45309", marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Clock size={13} />
                                    <span>
                                        {pendingList[0].opensAt && `Opens: ${new Date(pendingList[0].opensAt).toLocaleString()}`}
                                        {pendingList[0].closesAt && ` • Deadline: ${new Date(pendingList[0].closesAt).toLocaleString()}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                navigate(`/interview/rules?interviewId=${pendingList[0].id}&role=${encodeURIComponent(pendingList[0].roleTitle)}&domain=${encodeURIComponent(pendingList[0].domain)}&duration=${pendingList[0].durationMinutes}&questions=${pendingList[0].questionCount}&assessmentType=${pendingList[0].assessmentType}`);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 24px",
                                backgroundColor: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                        >
                            Start Assessment →
                        </button>
                    </div>
                </div>
            )}

            {/* Restricted Banner if candidates are restricted to assigned test only */}
            {isRestricted ? (
                <div style={{ padding: "24px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center", marginBottom: "48px" }}>
                    <Shield size={24} style={{ color: "#16a34a", margin: "0 auto 8px auto" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px 0" }}>
                        Formal Exam Mode Active
                    </h3>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                        Your examiner has configured this account strictly for scheduled company assessments. Practice sandboxes are hidden during your test round.
                    </p>
                </div>
            ) : (
                <>

            {/* Section 1: Single-Card Interactive Carousel (Order: Mock -> Coding -> One Skill -> Adaptive) */}
            <div
                className="animate-fade-in stagger-2"
                style={{ marginBottom: "48px" }}
                role="region"
                aria-roledescription="carousel"
                aria-label="Interview format options"
                tabIndex={0}
                onKeyDown={handleCarouselKeyDown}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                        <h2 style={{
                            fontSize: "var(--text-h3)",
                            lineHeight: "var(--lh-h3)",
                            letterSpacing: "var(--ls-h3)",
                            fontWeight: "600",
                            color: "var(--color-text)",
                            margin: "0 0 2px 0"
                        }}>
                            Choose your interview format
                        </h2>
                        <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: "400" }}>
                            Use the arrow keys or controls to browse options
                        </span>
                    </div>

                    {/* Next option hint button */}
                    <button
                        type="button"
                        onClick={handleNext}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-text-muted)",
                            fontSize: "var(--text-caption)",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            transition: "color var(--motion-fast) var(--ease-standard)"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                    >
                        <span>Next: {nextItem.title}</span>
                        <ChevronRight size={13} strokeWidth={1.75} />
                    </button>
                </div>

                {/* Main Carousel Stage with Flanking Controls */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px",
                    position: "relative"
                }}>
                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Previous interview format"
                        className="interactive-scale"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-xs)",
                            color: "var(--color-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            zIndex: 2,
                            transition: "all var(--motion-fast) var(--ease-standard)"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-hover)";
                            e.currentTarget.style.color = "var(--color-text)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.color = "var(--color-text-secondary)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        }}
                    >
                        <ChevronLeft size={18} strokeWidth={1.75} />
                    </button>

                    {/* The Active Slide Card */}
                    <div
                        key={currentSlide}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${currentSlide + 1} of ${slides.length}`}
                        className="carousel-slide-card"
                        style={{
                            flex: 1,
                            maxWidth: "840px",
                            minHeight: "260px",
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "16px",
                            padding: "32px 36px",
                            boxShadow: "var(--shadow-sm)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box",
                            animation: slideDirection === "next"
                                ? "slideInFromRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                                : "slideInFromLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                        }}
                    >
                        <div>
                            {/* Top Meta Row: Category Badge + Last Attempt (if exists) */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                <Badge variant="neutral" size="md">
                                    <CurrentIcon size={13} strokeWidth={1.75} style={{ marginRight: "4px" }} />
                                    <span>{currentItem.category}</span>
                                </Badge>
                                {currentItem.score !== null && (
                                    <Badge variant="success" size="md">
                                        Last attempt: {currentItem.score} / 10
                                    </Badge>
                                )}
                            </div>

                            {/* Title */}
                            <h3 style={{
                                fontSize: "var(--text-h2)",
                                lineHeight: "var(--lh-h2)",
                                letterSpacing: "var(--ls-h2)",
                                fontWeight: "600",
                                color: "var(--color-text)",
                                margin: "0 0 10px 0",
                                textWrap: "balance"
                            }}>
                                {currentItem.title}
                            </h3>

                            {/* Description */}
                            <p style={{
                                fontSize: "var(--text-body)",
                                lineHeight: "var(--lh-body)",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 14px 0",
                                maxWidth: "60ch",
                                textWrap: "pretty",
                                fontWeight: "400"
                            }}>
                                {currentItem.description}
                            </p>

                            {/* What You'll Get Highlight Line */}
                            <div style={{
                                fontSize: "var(--text-label)",
                                color: "var(--color-text-secondary)",
                                fontWeight: "400",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}>
                                <Check size={14} strokeWidth={2} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                                <span>{currentItem.highlight}</span>
                            </div>
                        </div>

                        {/* Bottom Action Row: Duration Chip + Prominent Start Button */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "24px",
                            paddingTop: "18px",
                            borderTop: "1px solid var(--color-border-subtle)"
                        }}>
                            <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "var(--text-label)",
                                fontWeight: "500",
                                color: "var(--color-text-muted)",
                                backgroundColor: "var(--color-surface-secondary)",
                                padding: "5px 12px",
                                borderRadius: "var(--radius-full)",
                                border: "1px solid var(--color-border)"
                            }}>
                                <Clock size={13} strokeWidth={1.75} />
                                <span className="tabular-nums">{currentItem.duration}</span>
                            </div>

                            <Button
                                variant="primary"
                                size="md"
                                onClick={currentItem.onStart}
                                style={{
                                    padding: "9px 20px",
                                    fontSize: "var(--text-body)",
                                    fontWeight: "500",
                                    boxShadow: "var(--shadow-sm)"
                                }}
                            >
                                {currentItem.buttonLabel}
                            </Button>
                        </div>
                    </div>

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Next interview format"
                        className="interactive-scale"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-xs)",
                            color: "var(--color-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            zIndex: 2,
                            transition: "all var(--motion-fast) var(--ease-standard)"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border-hover)";
                            e.currentTarget.style.color = "var(--color-text)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.color = "var(--color-text-secondary)";
                            e.currentTarget.style.backgroundColor = "var(--color-surface)";
                        }}
                    >
                        <ChevronRight size={18} strokeWidth={1.75} />
                    </button>
                </div>

                {/* Dot Indicators & Step Count */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "20px"
                }}>
                    {/* Dots Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {slides.map((slide, idx) => {
                            const isActive = idx === currentSlide;
                            return (
                                <button
                                    key={slide.id}
                                    type="button"
                                    aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                                    onClick={() => goToSlide(idx, idx > currentSlide ? "next" : "prev")}
                                    style={{
                                        width: isActive ? "20px" : "7px",
                                        height: "7px",
                                        borderRadius: "var(--radius-full)",
                                        backgroundColor: isActive ? "var(--color-primary)" : "#cbd5e1",
                                        border: "none",
                                        padding: 0,
                                        cursor: "pointer",
                                        transition: "all var(--motion-base) var(--ease-standard)"
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Step label */}
                    <div className="tabular-nums" style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: "500", letterSpacing: "0.02em" }}>
                        {currentSlide + 1} of {slides.length}
                    </div>
                </div>

                {/* Polite SR Announcement */}
                <div aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>
                    {`Slide ${currentSlide + 1} of ${slides.length}: ${currentItem.title}`}
                </div>
            </div>

            {/* Section 2: Sharpen your skills (Interactive DSA Topic Bubbles) */}
            <div className="animate-fade-in stagger-3" style={{ marginBottom: "48px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{
                        fontSize: "var(--text-h3)",
                        lineHeight: "var(--lh-h3)",
                        letterSpacing: "var(--ls-h3)",
                        fontWeight: "600",
                        color: "var(--color-text)",
                        margin: 0
                    }}>
                        Sharpen your skills
                    </h2>
                    <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-muted)", fontWeight: "400" }}>
                        Click any topic to configure practice
                    </span>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        alignItems: "center"
                    }}
                >
                    {DSA_TOPICS.map((topic) => (
                        <button
                            key={topic}
                            type="button"
                            onClick={() => handleTopicClick(topic)}
                            className="dsa-topic-bubble"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "8px 18px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "9999px",
                                color: "#334155",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                outline: "none",
                                position: "relative",
                                willChange: "transform",
                                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.12)";
                                e.currentTarget.style.zIndex = "10";
                                e.currentTarget.style.backgroundColor = "#f0fdf4";
                                e.currentTarget.style.borderColor = "#86efac";
                                e.currentTarget.style.color = "#16a34a";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 163, 74, 0.12)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.zIndex = "1";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.borderColor = "#e2e8f0";
                                e.currentTarget.style.color = "#334155";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            {topic}
                        </button>
                    ))}
                </div>
            </div>
            </>
            )}

            {/* Carousel & Keyframe Styles */}
            <style>{`
                @keyframes slideInFromRight {
                    from {
                        opacity: 0;
                        transform: translateX(16px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideInFromLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-16px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @media (max-width: 768px) {
                    .carousel-slide-card {
                        padding: 24px 20px !important;
                    }
                }
            `}</style>
        </div>
    );
}
