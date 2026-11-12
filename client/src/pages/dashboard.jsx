import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
    const navigate = useNavigate();

    const username = localStorage.getItem("username") || "Candidate";

    // Greeting matching wireframe 2
    const greetingText = useMemo(() => {
        const hour = new Date().getHours();
        const displayName = username && username !== "undefined" && username !== "null" ? username : "Candidate";
        if (hour < 12) return `Good morning, ${displayName}`;
        if (hour < 18) return `Good afternoon, ${displayName}`;
        return `Good evening, ${displayName}`;
    }, [username]);

    // Active test banner state - dynamically loaded from backend
    const [activeInterview, setActiveInterview] = useState(null);
    const [loadingActive, setLoadingActive] = useState(true);

    // Pending assessments state - genuinely loaded from backend assignment data
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingList, setPendingList] = useState([]);
    const [pendingPanelOpen, setPendingPanelOpen] = useState(false);
    const [startingPendingId, setStartingPendingId] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchDashboardState() {
            try {
                // 1. Fetch genuine unfinished attempt (Resume Exam)
                const res = await api.get("/interviews/active");
                if (isMounted) {
                    if (res.data?.hasActive && res.data?.interview) {
                        setActiveInterview(res.data.interview);
                    } else {
                        setActiveInterview(null);
                    }
                }
            } catch (err) {
                if (isMounted) setActiveInterview(null);
            } finally {
                if (isMounted) setLoadingActive(false);
            }

            // 2. Fetch genuine assigned pending assessments
            try {
                const pendingRes = await api.get("/interviews/pending");
                if (isMounted && pendingRes.data) {
                    setPendingCount(pendingRes.data.count || 0);
                    setPendingList(pendingRes.data.pendingAssessments || []);
                }
            } catch (pErr) {
                if (isMounted) {
                    setPendingCount(0);
                    setPendingList([]);
                }
            }
        }
        fetchDashboardState();
        return () => { isMounted = false; };
    }, []);

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
            setStartingPendingId(null);
        }
    };

    const handleStartTest = (testType, duration = 30) => {
        // Step 3 -> Step 4: Always navigate to the dedicated configuration screen first
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

    const handleResume = () => {
        if (!activeInterview) return;
        if (activeInterview.type === "adaptive") {
            navigate(`/adaptive-interview/${activeInterview.id}`);
        } else {
            navigate(`/interview/${activeInterview.id}`);
        }
    };

    return (
        <div style={{ maxWidth: "1216px", margin: "0 auto", paddingTop: "8px" }}>
            {/* Header Greeting + Interactive Pending Assessments Notification */}
            <div style={{ marginBottom: "26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <h1 style={{
                        fontSize: "26px",
                        fontWeight: "700",
                        color: "#111827",
                        margin: "0 0 6px 0",
                        letterSpacing: "-0.02em",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span>{greetingText}</span>
                        <span style={{ fontSize: "22px" }}>☀️</span>
                    </h1>
                    <p style={{ fontSize: "14.5px", color: "#6b7280", margin: 0 }}>
                        What would you like to do today?
                    </p>
                </div>

                {/* Interactive Pending Assessments Notification Pill */}
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setPendingPanelOpen(!pendingPanelOpen)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                            backgroundColor: pendingCount > 0 ? "#eff6ff" : "#f8fafc",
                            color: pendingCount > 0 ? "#1d4ed8" : "#64748b",
                            border: pendingCount > 0 ? "1.5px solid #93c5fd" : "1px solid #e2e8f0",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                    >
                        <span>📋</span>
                        <span>{pendingCount} Assessment{pendingCount === 1 ? "" : "s"} Pending</span>
                        <span style={{ fontSize: "10px" }}>{pendingPanelOpen ? "▲" : "▼"}</span>
                    </button>

                    {/* Expandable Pending Assessments Panel */}
                    {pendingPanelOpen && (
                        <div style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "8px",
                            width: "380px",
                            maxWidth: "90vw",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                            padding: "16px",
                            zIndex: 50
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                    Assigned Pending Assessments ({pendingCount})
                                </div>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    Awaiting completion
                                </span>
                            </div>

                            {pendingCount === 0 ? (
                                <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    ✨ You have 0 pending assigned assessments. All assigned exams are completed!
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {pendingList.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                padding: "12px",
                                                borderRadius: "8px",
                                                backgroundColor: "#f8fafc",
                                                border: "1px solid #e2e8f0"
                                            }}
                                        >
                                            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13.5px", marginBottom: "2px" }}>
                                                {item.roleTitle}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                                                {item.domain} · {item.durationMinutes} mins · {item.questionCount} questions
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleStartPendingAssessment(item.id)}
                                                disabled={startingPendingId === item.id}
                                                style={{
                                                    backgroundColor: "#16a34a",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    padding: "6px 14px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    cursor: startingPendingId === item.id ? "not-allowed" : "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}
                                            >
                                                {startingPendingId === item.id ? "Launching..." : "▶ Start Assessment"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Resume Banner (Width ~644px as shown in wireframe) - ONLY renders when an unfinished assessment exists */}
            {activeInterview && (
                <div
                    style={{
                        width: "644px",
                        maxWidth: "100%",
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "36px",
                        boxSizing: "border-box"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "14px", color: "#b45309" }}>⏳</span>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                            Resume: {activeInterview.roleTitle || "Assessment"} — {activeInterview.remainingMinutes} min{activeInterview.remainingMinutes === 1 ? "" : "s"} left
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleResume}
                        style={{
                            backgroundColor: "#f59e0b",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Resume exam
                    </button>
                </div>
            )}

            {/* Section 1: AI-powered mock interviews (4 Cards) */}
            <div style={{ marginBottom: "54px" }}>
                <h2 style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: "16px",
                    letterSpacing: "-0.01em"
                }}>
                    AI-powered mock interviews
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "20px"
                    }}
                >
                    {/* Card 1: mock interview */}
                    <div
                        style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "24px 20px 20px 20px",
                            height: "230px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                        }}
                    >
                        <div>
                            <div style={{ marginBottom: "14px" }}>
                                <span
                                    style={{
                                        backgroundColor: "#e2e8f0",
                                        color: "#334155",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        padding: "3px 8px",
                                        borderRadius: "4px"
                                    }}
                                >
                                    mock interview
                                </span>
                            </div>
                            <p style={{
                                fontSize: "13px",
                                color: "#374151",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                Practice a recruiter screening to identify gaps in CS fundamentals, role fit, and interview readiness.
                            </p>
                        </div>

                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                color: "#4b5563",
                                marginBottom: "16px"
                            }}>
                                <span>⏱</span>
                                <span>30 mins</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleStartTest("Technical Screen", 30)}
                                style={{
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>▶</span> Start
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Coding */}
                    <div
                        style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "24px 20px 20px 20px",
                            height: "230px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                        }}
                    >
                        <div>
                            <h3 style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "#111827",
                                margin: "0 0 14px 0"
                            }}>
                                Coding
                            </h3>
                            <p style={{
                                fontSize: "13px",
                                color: "#374151",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                Solve algorithmic and data structure problems designed to test your problem-solving skills.
                            </p>
                        </div>

                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                color: "#4b5563",
                                marginBottom: "16px"
                            }}>
                                <span>⏱</span>
                                <span>60 mins</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleStartTest("Coding", 60)}
                                style={{
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>▶</span> Start
                            </button>
                        </div>
                    </div>

                    {/* Card 3: one skill at a time */}
                    <div
                        style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "24px 20px 20px 20px",
                            height: "230px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                        }}
                    >
                        <div>
                            <div style={{ marginBottom: "14px" }}>
                                <span
                                    style={{
                                        backgroundColor: "#e2e8f0",
                                        color: "#334155",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        padding: "3px 8px",
                                        borderRadius: "4px"
                                    }}
                                >
                                    one skill at a time
                                </span>
                            </div>
                            <p style={{
                                fontSize: "13px",
                                color: "#374151",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                Improve your ability to design scalable systems and clearly justify architectural decisions.
                            </p>
                        </div>

                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                color: "#4b5563",
                                marginBottom: "16px"
                            }}>
                                <span>⏱</span>
                                <span>60 mins</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleStartTest("System Design", 60)}
                                style={{
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>▶</span> Start
                            </button>
                        </div>
                    </div>

                    {/* Card 4: Adaptive Challenge */}
                    <div
                        style={{
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "24px 20px 20px 20px",
                            height: "230px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                        }}
                    >
                        <div>
                            <h3 style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "#111827",
                                margin: "0 0 14px 0"
                            }}>
                                Adaptive Challenge
                            </h3>
                            <p style={{
                                fontSize: "13px",
                                color: "#374151",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                Questions get harder or easier based on your answers. Earn streaks, points, and mastery badges.
                            </p>
                        </div>

                        <div>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px",
                                color: "#4b5563",
                                marginBottom: "16px"
                            }}>
                                <span>⏱</span>
                                <span>30 mins</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/adaptive-exam")}
                                style={{
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>▶</span> Start
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Sharpen your skills (4 Cards) */}
            <div>
                <h2 style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: "16px",
                    letterSpacing: "-0.01em"
                }}>
                    Sharpen your skills
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "20px"
                    }}
                >
                    {/* Card 1: System Design */}
                    <div
                        onClick={() => handleStartTest("System Design", 30)}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "16px 20px",
                            height: "80px",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}
                    >
                        <h4 style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#111827",
                            margin: "0 0 4px 0"
                        }}>
                            System Design
                        </h4>
                        <p style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            margin: 0
                        }}>
                            Learn to architect scalable systems.
                        </p>
                    </div>

                    {/* Card 2: Data Structures */}
                    <div
                        onClick={() => handleStartTest("Data Structures", 30)}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "16px 20px",
                            height: "80px",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}
                    >
                        <h4 style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#111827",
                            margin: "0 0 4px 0"
                        }}>
                            Data Structures
                        </h4>
                        <p style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            margin: 0
                        }}>
                            Arrays, trees, graphs and more.
                        </p>
                    </div>

                    {/* Card 3: Algorithms */}
                    <div
                        onClick={() => handleStartTest("Algorithms", 30)}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "16px 20px",
                            height: "80px",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}
                    >
                        <h4 style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#111827",
                            margin: "0 0 4px 0"
                        }}>
                            Algorithms
                        </h4>
                        <p style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            margin: 0
                        }}>
                            Sorting, searching, dynamic programming.
                        </p>
                    </div>

                    {/* Card 4: Behavioral */}
                    <div
                        onClick={() => handleStartTest("Behavioral", 30)}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "16px 20px",
                            height: "80px",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                        }}
                    >
                        <h4 style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#111827",
                            margin: "0 0 4px 0"
                        }}>
                            Behavioral
                        </h4>
                        <p style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            margin: 0
                        }}>
                            Ace the soft-skills round.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
