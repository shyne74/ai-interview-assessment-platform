import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

    // AI Generation controls - enable AI generation by default when practicing targeted skill
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
            if (selectedTopics.length + customTopics.length > 1) {
                setSelectedTopics(selectedTopics.filter((item) => item !== t));
            }
        } else {
            setSelectedTopics([...selectedTopics, t]);
        }
    };

    const selectAllTopics = () => {
        setSelectedTopics(ROLE_DOMAINS[role] || []);
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
        if (allSelectedTopics.length <= 1) return;
        setCustomTopics(customTopics.filter(t => t !== topicToRemove));
    };

    const handleProceedToInstructions = () => {
        const count = parseInt(questionCount.replace(/\D/g, ""), 10) || 5;
        const durationMinutes = count <= 5 ? 20 : count <= 8 ? 30 : 45;
        const topicsStr = allSelectedTopics.join(", ");

        const targetUrl = `/interview/rules?role=${encodeURIComponent(role)}&type=${encodeURIComponent(testType)}&difficulty=${encodeURIComponent(difficulty)}&questions=${count}&assessmentType=${encodeURIComponent(assessmentType)}&duration=${durationMinutes}&domain=${encodeURIComponent(topicsStr)}&topics=${encodeURIComponent(topicsStr)}&generateWithAI=${generateWithAI}`;

        navigate(targetUrl);
    };

    const availableRoleTopics = ROLE_DOMAINS[role] || ["General"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1216px", margin: "0 auto" }}>
            {/* Header */}
            <div>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: "6px"
                }}>
                    03 / MOCK INTERVIEW
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Set your focus. Then begin.
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0
                }}>
                    Select your subject, refine your topics, and let AI generate relevant questions for your assessment.
                </p>
            </div>

            {/* Split Content */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: "24px"
            }}>
                {/* Left Column: Form & What to Expect */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Interview Setup Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 20px 0"
                        }}>
                            Interview setup
                        </h2>

                        {/* Role / Subject selection */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Subject or role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    backgroundColor: "#ffffff"
                                }}
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                                Technical domains and question patterns are aligned to this subject.
                            </div>
                        </div>

                        {/* Topic Selection Section */}
                        <div style={{
                            marginBottom: "24px",
                            padding: "16px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                    Target topics ({allSelectedTopics.length} selected: {selectedTopics.length} predefined, {customTopics.length} custom)
                                </label>
                                <button
                                    type="button"
                                    onClick={selectAllTopics}
                                    style={{
                                        border: "none",
                                        background: "none",
                                        color: "#2563eb",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        padding: 0
                                    }}
                                >
                                    Select all predefined
                                </button>
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
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: isChecked ? "600" : "500",
                                                backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                                                color: isChecked ? "#1d4ed8" : "#475569",
                                                border: isChecked ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <span>{isChecked ? "✓" : "+"}</span>
                                            {topic}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Topics Section */}
                            <div style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e0e7ff",
                                borderRadius: "8px",
                                padding: "12px 14px",
                                marginBottom: "14px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#4338ca", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span>🏷️</span> Custom Topics ({customTopics.length})
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                        AI will generate questions tailored to your custom entries
                                    </span>
                                </div>

                                {customTopics.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                                        {customTopics.map((ct) => (
                                            <span
                                                key={ct}
                                                style={{
                                                    padding: "5px 10px",
                                                    borderRadius: "6px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    backgroundColor: "#f5f3ff",
                                                    color: "#6d28d9",
                                                    border: "1.5px solid #c4b5fd",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "6px"
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: "9px",
                                                    fontWeight: "800",
                                                    backgroundColor: "#ede9fe",
                                                    padding: "1px 5px",
                                                    borderRadius: "3px",
                                                    letterSpacing: "0.05em"
                                                }}>
                                                    CUSTOM
                                                </span>
                                                {ct}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomTopic(ct)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#7c3aed",
                                                        cursor: "pointer",
                                                        padding: "0 2px",
                                                        fontSize: "13px",
                                                        fontWeight: "bold",
                                                        lineHeight: 1
                                                    }}
                                                    title={`Remove custom topic "${ct}"`}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Add Custom Topic Form Input */}
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        placeholder="Add custom topic (e.g. React Server Components, Next.js, System Design...)"
                                        value={customTopicInput}
                                        onChange={(e) => setCustomTopicInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomTopic(e);
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px"
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomTopic}
                                        disabled={!customTopicInput.trim()}
                                        style={{
                                            backgroundColor: customTopicInput.trim() ? "#4f46e5" : "#e2e8f0",
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
                                        + Add custom topic
                                    </button>
                                </div>
                            </div>

                            {/* AI Question Generation Toggle & Preview Action */}
                            {/* AI Question Generation Toggle */}
                            <div style={{
                                borderTop: "1px solid #e2e8f0",
                                paddingTop: "14px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "#0f172a", fontWeight: "600", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={generateWithAI}
                                        onChange={(e) => setGenerateWithAI(e.target.checked)}
                                        style={{ width: "16px", height: "16px", accentColor: "#4f46e5", cursor: "pointer" }}
                                    />
                                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span>✨</span> Generate dynamic AI questions for chosen topics
                                    </span>
                                </label>
                                <div style={{ fontSize: "12px", color: "#64748b", paddingLeft: "26px" }}>
                                    AI will tailor questions directly to your chosen topics once your examination begins.
                                </div>
                            </div>
                        </div>

                        {/* Two Columns: Questions & Difficulty */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px",
                            marginBottom: "16px"
                        }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Number of questions
                                </label>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        backgroundColor: "#ffffff"
                                    }}
                                >
                                    <option>3 questions</option>
                                    <option>5 questions</option>
                                    <option>8 questions</option>
                                    <option>10 questions</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Difficulty
                                </label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        backgroundColor: "#ffffff"
                                    }}
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
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>Advanced options</span>
                                <span>{showAdvanced ? "▲" : "▼"}</span>
                            </button>
                            {showAdvanced && (
                                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                            Assessment Question Format
                                        </label>
                                        <select
                                            value={assessmentType}
                                            onChange={(e) => setAssessmentType(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "8px 10px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "13px",
                                                backgroundColor: "#ffffff"
                                            }}
                                        >
                                            <option value="theory">Theory & System Design (written reasoning)</option>
                                            <option value="coding">Algorithmic Coding (evaluated with code runner)</option>
                                            <option value="mixed">Mixed (Theory + Coding challenges)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* What to Expect Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <h3 style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            What to expect
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <span style={{ fontSize: "16px" }}>💬</span>
                                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                                    Read one question at a time and explain your thinking in your own words.
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <span style={{ fontSize: "16px" }}>⚡</span>
                                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                                    After submitting, review an AI-assisted skill breakdown and specific feedback.
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                            Timing and submission rules should be shown once verified. This concept does not assume pauses, resume, or automatic saving.
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Summary Card */}
                <div>
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px",
                        position: "sticky",
                        top: "24px"
                    }}>
                        <div style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#64748b",
                            marginBottom: "8px"
                        }}>
                            READY TO START
                        </div>

                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            color: "#0f172a",
                            margin: "0 0 20px 0"
                        }}>
                            {role}
                        </h3>

                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            paddingBottom: "20px",
                            borderBottom: "1px solid #f1f5f9",
                            marginBottom: "20px",
                            fontSize: "13px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Format</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                    {assessmentType === "coding" ? "Coding Assessment" : assessmentType === "mixed" ? "Mixed (Theory + Code)" : "Standard interview"}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <span style={{ color: "#64748b" }}>Topics</span>
                                <div style={{ textAlign: "right", maxWidth: "200px" }}>
                                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13px" }}>
                                        {allSelectedTopics.length} topic{allSelectedTopics.length === 1 ? "" : "s"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>
                                        {selectedTopics.length > 0 && <span>{selectedTopics.join(", ")}</span>}
                                        {customTopics.length > 0 && (
                                            <span style={{ color: "#7c3aed", fontWeight: "600", display: "block" }}>
                                                + {customTopics.join(", ")} (custom)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Generation</span>
                                <span style={{ fontWeight: "600", color: generateWithAI ? "#166534" : "#2563eb" }}>
                                    {generateWithAI ? "✨ AI Dynamic" : "📚 Question Bank"}
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Questions</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{questionCount}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Difficulty</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{difficulty}</span>
                            </div>
                        </div>

                        <p style={{
                            fontSize: "12px",
                            color: "#64748b",
                            lineHeight: "1.5",
                            margin: "0 0 20px 0"
                        }}>
                            Find a comfortable place to think. There's no need to have every answer.
                        </p>

                        <button
                            type="button"
                            onClick={handleProceedToInstructions}
                            style={{
                                width: "100%",
                                backgroundColor: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                marginBottom: "12px"
                            }}
                        >
                            Proceed to instructions →
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <Link
                                to="/practice"
                                style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    textDecoration: "none"
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
