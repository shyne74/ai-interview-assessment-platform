import React from "react";
import { useNavigate } from "react-router-dom";
import {
    MessageSquare,
    Activity,
    Target,
    FileText,
    Briefcase,
    Clock,
    ArrowRight,
    Sparkles
} from "lucide-react";
import { DSA_TOPICS } from "../config/dsaTopics";

export default function PracticeHub() {
    const navigate = useNavigate();

    // 5 curated quick-start DSA topic chips
    const quickDsaTopics = DSA_TOPICS.slice(0, 5);

    return (
        <div className="practice-hub-page" style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1120px", margin: "0 auto" }}>
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
                    animation: fadeInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .stagger-2 {
                    animation: fadeInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both;
                }
                .stagger-3 {
                    animation: fadeInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
                }
                .stagger-4 {
                    animation: fadeInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
                }

                @media (prefers-reduced-motion: reduce) {
                    .stagger-1, .stagger-2, .stagger-3, .stagger-4 {
                        animation: none !important;
                        opacity: 1 !important;
                        transform: none !important;
                    }
                }

                /* Primary Format Cards */
                .format-card {
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 28px;
                    display: flex;
                    flex-direction: column;
                    justifyContent: space-between;
                    box-sizing: border-box;
                    outline: none;
                    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease;
                }
                .format-card:hover {
                    transform: translateY(-2px);
                    border-color: #16a34a;
                    box-shadow: 0 10px 24px -4px rgba(22, 163, 74, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04);
                }
                .format-card:focus-visible {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                }
                .format-card:active {
                    transform: scale(0.99);
                }

                /* Compact Material Row */
                .material-row {
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justifyContent: space-between;
                    gap: 16px;
                    cursor: pointer;
                    outline: none;
                    transition: transform 0.16s ease, border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
                }
                .material-row:hover {
                    transform: translateY(-1px);
                    border-color: #16a34a;
                    background-color: #fcfdfd;
                    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
                }
                .material-row:hover .row-action-link {
                    color: #15803d !important;
                    transform: translateX(2px);
                }
                .material-row:focus-visible {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.22);
                }
                .material-row:active {
                    transform: scale(0.995);
                }

                /* Topic chips */
                .dsa-chip-btn {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    background-color: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #475569;
                    cursor: pointer;
                    text-decoration: none;
                    outline: none;
                    transition: all 0.14s ease;
                }
                .dsa-chip-btn:hover {
                    background-color: #f0fdf4;
                    border-color: #86efac;
                    color: #16a34a;
                }
                .dsa-chip-btn:focus-visible {
                    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.3);
                }

                @media (max-width: 768px) {
                    .format-cards-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .one-skill-card {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                    .one-skill-actions {
                        width: 100%;
                    }
                    .one-skill-actions button {
                        width: 100%;
                        justify-content: center;
                    }
                    .material-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    .material-row .row-right {
                        width: 100%;
                        display: flex;
                        justify-content: flex-end;
                    }
                }
            `}</style>

            {/* Top section: Clean heading & sentence */}
            <div className="stagger-1">
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Practice
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0,
                    lineHeight: "1.5",
                    maxWidth: "680px"
                }}>
                    Pick a format and start. Each one takes about 30 to 60 minutes.
                </p>
            </div>

            {/* Two Main Format Cards */}
            <div className="format-cards-grid stagger-2" style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
            }}>
                {/* Mock Interview */}
                <div
                    className="format-card"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate("/practice/mock-setup"); }}
                >
                    <div>
                        {/* 44px Tinted Rounded Square Icon */}
                        <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #dcfce7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#16a34a",
                            marginBottom: "16px"
                        }}>
                            <MessageSquare size={22} strokeWidth={2} />
                        </div>

                        <h2 style={{
                            fontSize: "19px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: "0 0 8px 0",
                            letterSpacing: "-0.02em"
                        }}>
                            Mock interview
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: "0 0 20px 0"
                        }}>
                            Practise technical and role-specific questions in a familiar interview format. Choose your role, then begin.
                        </p>

                        {/* Meta row */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom: "24px"
                        }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <Clock size={14} color="#64748b" />
                                60 mins
                            </span>
                            <span style={{ color: "#cbd5e1" }}>•</span>
                            <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "500",
                                color: "#334155"
                            }}>
                                Recruiter-style
                            </span>
                        </div>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/practice/mock-setup")}
                            style={{
                                width: "100%",
                                backgroundColor: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "11px 20px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                transition: "background-color 0.15s ease, transform 0.1s ease"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#15803d"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#16a34a"; }}
                        >
                            Set up interview
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>

                {/* Adaptive Assessment */}
                <div
                    className="format-card"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate("/adaptive-exam"); }}
                >
                    <div>
                        {/* 44px Tinted Rounded Square Icon */}
                        <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #dcfce7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#16a34a",
                            marginBottom: "16px"
                        }}>
                            <Activity size={22} strokeWidth={2} />
                        </div>

                        <h2 style={{
                            fontSize: "19px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: "0 0 8px 0",
                            letterSpacing: "-0.02em"
                        }}>
                            Adaptive assessment
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: "0 0 20px 0"
                        }}>
                            Explore your current level with a question path that responds to your answers in real time.
                        </p>

                        {/* Meta row */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom: "24px"
                        }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <Clock size={14} color="#64748b" />
                                30 mins
                            </span>
                            <span style={{ color: "#cbd5e1" }}>•</span>
                            <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "500",
                                color: "#334155"
                            }}>
                                Adapts to your answers
                            </span>
                        </div>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/adaptive-exam")}
                            style={{
                                width: "100%",
                                backgroundColor: "#ffffff",
                                color: "#0f172a",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                padding: "11px 20px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#16a34a";
                                e.currentTarget.style.color = "#16a34a";
                                e.currentTarget.style.backgroundColor = "#f0fdf4";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#cbd5e1";
                                e.currentTarget.style.color = "#0f172a";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                            }}
                        >
                            Explore adaptive
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* "One Skill" Full-Width Horizontal Card */}
            <div
                className="one-skill-card format-card stagger-3"
                style={{
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                    flexWrap: "wrap"
                }}
            >
                <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #dcfce7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#16a34a",
                            flexShrink: 0
                        }}>
                            <Target size={18} strokeWidth={2} />
                        </div>
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: 0,
                            letterSpacing: "-0.02em"
                        }}>
                            One skill
                        </h2>
                    </div>

                    <p style={{
                        fontSize: "14px",
                        color: "#475569",
                        lineHeight: "1.5",
                        margin: "0 0 12px 0",
                        maxWidth: "620px"
                    }}>
                        Question practice is the shortest path from a weak area to a focused attempt.
                    </p>

                    {/* Curated DSA Quick Chips */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>Popular topics:</span>
                        {quickDsaTopics.map((topic) => (
                            <button
                                key={topic.slug}
                                type="button"
                                className="dsa-chip-btn"
                                onClick={() => navigate(`/practice/topics/${topic.slug}`)}
                                title={`Practice ${topic.label} coding problems`}
                            >
                                {topic.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="one-skill-actions">
                    <button
                        type="button"
                        onClick={() => navigate("/practice/one-skill")}
                        style={{
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "11px 22px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "background-color 0.15s ease, transform 0.1s ease"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#15803d"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#16a34a"; }}
                    >
                        Choose a skill
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            {/* Prepare from your material: Compact 2-row section */}
            <div className="stagger-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#0f172a",
                        margin: 0
                    }}>
                        Prepare from your material
                    </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Row 1: PDF Preparation */}
                    <div
                        className="material-row"
                        tabIndex={0}
                        onClick={() => navigate("/prepare?mode=pdf")}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate("/prepare?mode=pdf"); }}
                        role="button"
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #dcfce7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#16a34a",
                                flexShrink: 0
                            }}>
                                <FileText size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <h4 style={{
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#0f172a",
                                    margin: "0 0 2px 0"
                                }}>
                                    PDF preparation
                                </h4>
                                <p style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    margin: 0,
                                    lineHeight: "1.4"
                                }}>
                                    Bring study notes or a reference document. Review the topics before generating questions.
                                </p>
                            </div>
                        </div>

                        <div className="row-right">
                            <span
                                className="row-action-link"
                                style={{
                                    color: "#16a34a",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                Use a PDF
                                <ArrowRight size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Job-Description Practice */}
                    <div
                        className="material-row"
                        tabIndex={0}
                        onClick={() => navigate("/prepare?mode=jd")}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate("/prepare?mode=jd"); }}
                        role="button"
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #dcfce7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#16a34a",
                                flexShrink: 0
                            }}>
                                <Briefcase size={20} strokeWidth={2} />
                            </div>
                            <div>
                                <h4 style={{
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#0f172a",
                                    margin: "0 0 2px 0"
                                }}>
                                    Job-description practice
                                </h4>
                                <p style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    margin: 0,
                                    lineHeight: "1.4"
                                }}>
                                    See the skills a role asks for, then practise questions tailored to those requirements.
                                </p>
                            </div>
                        </div>

                        <div className="row-right">
                            <span
                                className="row-action-link"
                                style={{
                                    color: "#16a34a",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                Analyse a job description
                                <ArrowRight size={14} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
