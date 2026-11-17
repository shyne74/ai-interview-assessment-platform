import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    Check,
    Plus,
    X,
    Clock,
    ArrowRight,
    Sparkles,
    Sliders,
    ChevronDown,
    ChevronUp,
    AlertCircle
} from "lucide-react";
import { ROLES, ROLE_DOMAINS } from "../config/taxonomy";
import api from "../utils/api";

export default function MockInterviewSetup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isFirstRender = useRef(true);

    const paramType = searchParams.get("type") || "Standard interview";
    const paramRole = searchParams.get("role") || localStorage.getItem("preferredRole") || "Frontend Developer";
    const paramDifficulty = searchParams.get("difficulty") || "Medium";
    const paramSkill = searchParams.get("skill") || "";
    const paramFocus = searchParams.get("focus") || searchParams.get("domain") || "";
    const initialTargetTopic = paramSkill || paramFocus;

    // Normalize canonical role title matching (avoid defaulting to Frontend Developer for coding/algorithms)
    const matchedRole = useMemo(() => {
        if (!paramRole) return "Software Engineer";
        const clean = paramRole.trim().toLowerCase();
        if (clean === "coding" || clean === "coding assessment" || clean === "algorithms" || clean === "algorithm" || clean === "dsa") {
            return "Software Engineer";
        }
        const found = ROLES.find(
            (r) => r.toLowerCase() === clean || clean.includes(r.toLowerCase()) || r.toLowerCase().includes(clean)
        );
        return found || "Software Engineer";
    }, [paramRole]);

    const [role, setRole] = useState(matchedRole);
    const [testType, setTestType] = useState(paramType);
    const [questionCount, setQuestionCount] = useState("5 questions");
    const [difficulty, setDifficulty] = useState(paramDifficulty);

    // Resolve assessment type from ?type= (coding, mixed, theory)
    const initialAssessmentType = useMemo(() => {
        const t = (paramType || "").toLowerCase();
        if (t === "coding" || t.includes("coding")) return "coding";
        if (t === "mixed" || t.includes("mixed")) return "mixed";
        return "theory";
    }, [paramType]);

    const [assessmentType, setAssessmentType] = useState(initialAssessmentType);

    // Topics under selected role
    const defaultTopics = ROLE_DOMAINS[matchedRole] || ["General"];

    // Predefined topics selected - if specific targeted skill is provided, don't auto-select unrelated predefined topics!
    const [selectedTopics, setSelectedTopics] = useState(() => {
        if (initialTargetTopic) {
            const matchedPredefined = defaultTopics.find(
                t => t.toLowerCase() === initialTargetTopic.toLowerCase()
            );
            return matchedPredefined ? [matchedPredefined] : [];
        }
        return defaultTopics.slice(0, 3);
    });

    // Custom user-entered topics
    const [customTopics, setCustomTopics] = useState(() => {
        if (initialTargetTopic) {
            const matchedPredefined = defaultTopics.find(
                t => t.toLowerCase() === initialTargetTopic.toLowerCase()
            );
            if (!matchedPredefined) return [initialTargetTopic];
        }
        return [];
    });

    const [customTopicInput, setCustomTopicInput] = useState("");

    // Combined topics for assessment generation
    const allSelectedTopics = useMemo(() => {
        return [...selectedTopics, ...customTopics];
    }, [selectedTopics, customTopics]);

    // Numeric question count and live estimated time calculation
    const numericQuestionCount = useMemo(() => {
        const parsed = parseInt(questionCount.replace(/\D/g, ""), 10);
        return isNaN(parsed) ? 5 : parsed;
    }, [questionCount]);

    const estimatedDurationMinutes = useMemo(() => {
        if (numericQuestionCount <= 5) return 20;
        if (numericQuestionCount <= 8) return 30;
        return 45;
    }, [numericQuestionCount]);

    // AI Generation controls
    const [generateWithAI, setGenerateWithAI] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Sync topics when role changes (guards initial render so URL params are preserved)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const available = ROLE_DOMAINS[role] || ["General"];
        if (initialTargetTopic) {
            const matchedPredefined = available.find(
                t => t.toLowerCase() === initialTargetTopic.toLowerCase()
            );
            if (matchedPredefined) {
                setSelectedTopics([matchedPredefined]);
                setCustomTopics([]);
            } else {
                setSelectedTopics([]);
                setCustomTopics([initialTargetTopic]);
            }
        } else {
            setSelectedTopics(available.slice(0, 3));
            setCustomTopics([]);
        }
    }, [role, initialTargetTopic]);

    useEffect(() => {
        const t = (paramType || "").toLowerCase();
        if (t === "coding" || t.includes("coding")) {
            setAssessmentType("coding");
        } else if (t === "mixed" || t.includes("mixed")) {
            setAssessmentType("mixed");
        }
    }, [paramType]);

    const toggleTopic = (t) => {
        if (selectedTopics.includes(t)) {
            setSelectedTopics(selectedTopics.filter((item) => item !== t));
        } else {
            setSelectedTopics([...selectedTopics, t]);
        }
    };

    const selectAllTopics = () => {
        setSelectedTopics(ROLE_DOMAINS[role] || []);
    };

    const clearAllPredefinedTopics = () => {
        setSelectedTopics([]);
    };

    const handleAddCustomTopic = (e) => {
        if (e) e.preventDefault();
        const trimmed = customTopicInput.trim();
        if (!trimmed) return;
        const exists = allSelectedTopics.some(t => t.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
            setCustomTopics([...customTopics, trimmed]);
        }
        setCustomTopicInput("");
    };

    const handleRemoveCustomTopic = (topicToRemove) => {
        setCustomTopics(customTopics.filter(t => t !== topicToRemove));
    };

    const handleProceedToInstructions = () => {
        if (allSelectedTopics.length === 0) return;

        const count = numericQuestionCount;
        const durationMinutes = estimatedDurationMinutes;
        const topicsStr = allSelectedTopics.join(", ");

        const targetUrl = `/interview/rules?role=${encodeURIComponent(role)}&type=${encodeURIComponent(testType)}&difficulty=${encodeURIComponent(difficulty)}&questions=${count}&assessmentType=${encodeURIComponent(assessmentType)}&duration=${durationMinutes}&domain=${encodeURIComponent(topicsStr)}&topics=${encodeURIComponent(topicsStr)}&generateWithAI=${generateWithAI}`;

        navigate(targetUrl);
    };

    const availableRoleTopics = ROLE_DOMAINS[role] || ["General"];
    const hasTopicsSelected = allSelectedTopics.length > 0;

    return (
        <div className="mock-setup-page" style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1200px", margin: "0 auto" }}>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .stagger-1 {
                    animation: fadeInUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .stagger-2 {
                    animation: fadeInUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both;
                }

                @media (prefers-reduced-motion: reduce) {
                    .stagger-1, .stagger-2 {
                        animation: none !important;
                        opacity: 1 !important;
                        transform: none !important;
                    }
                }

                /* Topic selection chips */
                .setup-topic-chip {
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    background-color: #ffffff;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    outline: none;
                    transition: all 0.14s ease;
                }
                .setup-topic-chip:hover {
                    border-color: #86efac;
                    background-color: #f0fdf4;
                    color: #166534;
                }
                .setup-topic-chip.selected {
                    background-color: #f0fdf4;
                    color: #15803d;
                    border: 1.5px solid #16a34a;
                    font-weight: 600;
                }
                .setup-topic-chip:focus-visible {
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                }

                /* Form select and inputs */
                .setup-select {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 14px;
                    background-color: #ffffff;
                    color: #0f172a;
                    outline: none;
                    transition: border-color 0.14s ease, box-shadow 0.14s ease;
                }
                .setup-select:focus {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
                }

                @media (max-width: 840px) {
                    .setup-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .summary-card-container {
                        position: static !important;
                    }
                }
            `}</style>

            {/* Header: Plain and Useful */}
            <div className="stagger-1">
                <div style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#16a34a",
                    marginBottom: "6px"
                }}>
                    Practice · Mock Interview
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Mock interview
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0,
                    lineHeight: "1.5"
                }}>
                    Choose a role and topics. You'll get questions generated for them.
                </p>
            </div>

            {/* Split Content */}
            <div className="setup-grid stagger-2" style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: "24px",
                alignItems: "start"
            }}>
                {/* Left Column: Form Sections & True What to Expect */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    {/* Main Setup Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px"
                    }}>
                        {/* Section 1: Role */}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                <label style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Role
                                </label>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    Questions match this engineering track
                                </span>
                            </div>
                            <select
                                className="setup-select"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Section 2: Topics */}
                        <div style={{
                            padding: "18px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                <label style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Topics ({allSelectedTopics.length} selected)
                                </label>
                                <div style={{ display: "flex", gap: "12px" }}>
                                    <button
                                        type="button"
                                        onClick={selectAllTopics}
                                        style={{
                                            border: "none",
                                            background: "none",
                                            color: "#16a34a",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            padding: 0
                                        }}
                                    >
                                        Select all predefined
                                    </button>
                                    {selectedTopics.length > 0 && (
                                        <>
                                            <span style={{ color: "#cbd5e1" }}>•</span>
                                            <button
                                                type="button"
                                                onClick={clearAllPredefinedTopics}
                                                style={{
                                                    border: "none",
                                                    background: "none",
                                                    color: "#64748b",
                                                    fontSize: "12px",
                                                    fontWeight: "500",
                                                    cursor: "pointer",
                                                    padding: 0
                                                }}
                                            >
                                                Clear
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                                Predefined curriculum topics for {role}:
                            </div>

                            {/* Predefined topic chips */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                                {availableRoleTopics.map((topic) => {
                                    const isChecked = selectedTopics.includes(topic);
                                    return (
                                        <button
                                            key={topic}
                                            type="button"
                                            onClick={() => toggleTopic(topic)}
                                            className={`setup-topic-chip ${isChecked ? "selected" : ""}`}
                                        >
                                            {isChecked ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} />}
                                            {topic}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Topics Block */}
                            <div style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "14px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                        Custom topics ({customTopics.length})
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                                        AI will generate questions covering these
                                    </span>
                                </div>

                                {customTopics.length === 0 ? (
                                    <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic", marginBottom: "10px" }}>
                                        Add a topic the questions should cover
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                                        {customTopics.map((ct) => (
                                            <span
                                                key={ct}
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "6px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    backgroundColor: "#f0fdf4",
                                                    color: "#166534",
                                                    border: "1px solid #bbf7d0",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}
                                            >
                                                {ct}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomTopic(ct)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#166534",
                                                        cursor: "pointer",
                                                        padding: 0,
                                                        display: "flex",
                                                        alignItems: "center"
                                                    }}
                                                    title={`Remove ${ct}`}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Add Custom Topic Input */}
                                <form onSubmit={handleAddCustomTopic} style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        placeholder="Add custom topic (e.g. Memory Management, Next.js, WebSockets...)"
                                        value={customTopicInput}
                                        onChange={(e) => setCustomTopicInput(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            outline: "none"
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!customTopicInput.trim()}
                                        style={{
                                            backgroundColor: customTopicInput.trim() ? "#0f172a" : "#e2e8f0",
                                            color: customTopicInput.trim() ? "#ffffff" : "#94a3b8",
                                            border: "none",
                                            borderRadius: "6px",
                                            padding: "8px 16px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: customTopicInput.trim() ? "pointer" : "default",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        + Add
                                    </button>
                                </form>
                            </div>

                            {/* AI Generation Toggle under Topics */}
                            <div style={{
                                marginTop: "14px",
                                paddingTop: "12px",
                                borderTop: "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px"
                            }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0f172a", fontWeight: "600", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={generateWithAI}
                                        onChange={(e) => setGenerateWithAI(e.target.checked)}
                                        style={{ width: "16px", height: "16px", accentColor: "#16a34a", cursor: "pointer" }}
                                    />
                                    <span>AI generates fresh questions for your chosen topics</span>
                                </label>
                                <div style={{ fontSize: "12px", color: "#64748b", paddingLeft: "24px" }}>
                                    When disabled, questions are pulled from pre-approved question bank entries.
                                </div>
                            </div>

                            {/* Validation notice if 0 topics selected */}
                            {!hasTopicsSelected && (
                                <div style={{
                                    marginTop: "12px",
                                    padding: "8px 12px",
                                    backgroundColor: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "6px",
                                    color: "#991b1b",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}>
                                    <AlertCircle size={14} />
                                    <span>Select at least one topic to continue</span>
                                </div>
                            )}
                        </div>

                        {/* Section 3 & 4: Questions & Difficulty */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px"
                        }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                                    Questions
                                </label>
                                <select
                                    className="setup-select"
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(e.target.value)}
                                >
                                    <option>3 questions</option>
                                    <option>5 questions</option>
                                    <option>8 questions</option>
                                    <option>10 questions</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                                    Difficulty
                                </label>
                                <select
                                    className="setup-select"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                    <option>Mixed</option>
                                </select>
                            </div>
                        </div>

                        {/* Advanced Options Accordion */}
                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    color: "#16a34a",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <Sliders size={14} />
                                <span>Advanced options</span>
                                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {showAdvanced && (
                                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                        Question format
                                    </label>
                                    <select
                                        className="setup-select"
                                        value={assessmentType}
                                        onChange={(e) => setAssessmentType(e.target.value)}
                                    >
                                        <option value="theory">Theory & System Design (written reasoning)</option>
                                        <option value="coding">Algorithmic Coding (evaluated in code editor)</option>
                                        <option value="mixed">Mixed (Theory + Coding challenges)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* What to Expect Card: 3 True Statements from backend config */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <h2 style={{
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            What to expect
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "9999px",
                                    backgroundColor: "#f0fdf4",
                                    color: "#16a34a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    flexShrink: 0
                                }}>
                                    1
                                </div>
                                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.45" }}>
                                    Answer {numericQuestionCount} questions one at a time with typed explanations or code.
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "9999px",
                                    backgroundColor: "#f0fdf4",
                                    color: "#16a34a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    flexShrink: 0
                                }}>
                                    2
                                </div>
                                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.45" }}>
                                    A session countdown runs for {estimatedDurationMinutes} minutes, giving you focused time per question.
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <div style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "9999px",
                                    backgroundColor: "#f0fdf4",
                                    color: "#16a34a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    flexShrink: 0
                                }}>
                                    3
                                </div>
                                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.45" }}>
                                    Your answers are evaluated when you finish, with feedback and scoring for each question.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Summary Card */}
                <div className="summary-card-container" style={{ position: "sticky", top: "24px" }}>
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "26px"
                    }}>
                        <div style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "#16a34a",
                            marginBottom: "6px"
                        }}>
                            Interview Summary
                        </div>

                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 18px 0"
                        }}>
                            {role}
                        </h2>

                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            paddingBottom: "18px",
                            borderBottom: "1px solid #f1f5f9",
                            marginBottom: "18px",
                            fontSize: "13px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Interview type</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                    {assessmentType === "coding" ? "Coding assessment" : assessmentType === "mixed" ? "Mixed assessment" : "Mock interview"}
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <span style={{ color: "#64748b" }}>Topics</span>
                                <div style={{ textAlign: "right", maxWidth: "200px" }}>
                                    <div style={{ fontWeight: "600", color: "#0f172a" }}>
                                        {allSelectedTopics.length} topic{allSelectedTopics.length === 1 ? "" : "s"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>
                                        {selectedTopics.length > 0 && <span>{selectedTopics.join(", ")}</span>}
                                        {customTopics.length > 0 && (
                                            <span style={{ color: "#166534", fontWeight: "600", display: "block" }}>
                                                + {customTopics.join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Questions</span>
                                <span style={{ fontWeight: "600", color: generateWithAI ? "#166534" : "#0f172a" }}>
                                    {generateWithAI ? "Generated by AI for your topics" : "From approved question bank"}
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Question count</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{questionCount}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Difficulty</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{difficulty}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Estimated time</span>
                                <span style={{ fontWeight: "600", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={13} />
                                    {estimatedDurationMinutes} mins
                                </span>
                            </div>
                        </div>

                        {/* Primary Button */}
                        <button
                            type="button"
                            onClick={handleProceedToInstructions}
                            disabled={!hasTopicsSelected}
                            style={{
                                width: "100%",
                                backgroundColor: !hasTopicsSelected ? "#94a3b8" : "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: !hasTopicsSelected ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginBottom: "12px",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (hasTopicsSelected) e.currentTarget.style.backgroundColor = "#15803d"; }}
                            onMouseLeave={(e) => { if (hasTopicsSelected) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                        >
                            {!hasTopicsSelected ? "Select at least one topic" : "Continue to instructions"}
                            {hasTopicsSelected && <ArrowRight size={15} />}
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <Link
                                to="/practice"
                                style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    textDecoration: "none",
                                    fontWeight: "500"
                                }}
                            >
                                Back to Practice
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
