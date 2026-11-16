import { useNavigate } from "react-router-dom";

export default function PracticeHub() {
    const navigate = useNavigate();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "1120px", margin: "0 auto" }}>
            <style>{`
                .practice-hub-card {
                    background-color: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 14px;
                    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
                    outline: none;
                }
                .practice-hub-card:hover {
                    border-color: #3b82f6 !important;
                    background-color: #f0f7ff !important;
                    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.08);
                }
                .practice-hub-card:focus-visible {
                    border-color: #3b82f6 !important;
                    background-color: #f0f7ff !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
                }
                .practice-hub-card:focus-within {
                    border-color: #3b82f6;
                    background-color: #f0f7ff;
                }
            `}</style>

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
                    02 / PRACTICE
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    A practice path for your next goal.
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0
                }}>
                    Choose a format. We'll keep the setup short and the focus on what you want to learn.
                </p>
            </div>

            {/* Top Cards: Mock Interview vs Adaptive Assessment */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
            }}>
                {/* Mock Interview */}
                <div
                    className="practice-hub-card"
                    tabIndex={0}
                    style={{
                        padding: "32px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                    }}
                >
                    <div>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>💬</div>
                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 10px 0"
                        }}>
                            Mock interview
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: 0
                        }}>
                            Practise technical and role-specific questions in a familiar interview format. Choose your role, then begin.
                        </p>
                    </div>

                    <div style={{ marginTop: "28px" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/practice/mock-setup")}
                            style={{
                                backgroundColor: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "11px 20px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1e3a8a"; }}
                        >
                            Set up interview →
                        </button>
                    </div>
                </div>

                {/* Adaptive Assessment */}
                <div
                    className="practice-hub-card"
                    tabIndex={0}
                    style={{
                        padding: "32px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                    }}
                >
                    <div>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>〰️</div>
                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 10px 0"
                        }}>
                            Adaptive assessment
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: 0
                        }}>
                            Explore your current level with a question path that responds to your answers. Start with your preferred domain.
                        </p>
                    </div>

                    <div style={{ marginTop: "28px" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/adaptive-exam")}
                            style={{
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
                                gap: "6px",
                                transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#94a3b8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                        >
                            Explore adaptive →
                        </button>
                    </div>
                </div>
            </div>

            {/* Middle Section: Prepare from your own material */}
            <div>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px"
                }}>
                    <h3 style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#0f172a",
                        margin: 0
                    }}>
                        Prepare from your own material
                    </h3>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Source → topics → questions → practice
                    </span>
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px"
                }}>
                    {/* PDF Preparation */}
                    <div
                        className="practice-hub-card"
                        tabIndex={0}
                        style={{
                            padding: "28px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "#fdf2f8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                marginBottom: "14px"
                            }}>
                                📄
                            </div>
                            <h4 style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "#0f172a",
                                margin: "0 0 8px 0"
                            }}>
                                PDF preparation
                            </h4>
                            <p style={{
                                fontSize: "13px",
                                color: "#475569",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                Bring study notes or a reference document. Review the topics before generating questions.
                            </p>
                        </div>

                        <div style={{ marginTop: "24px" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/prepare?mode=pdf")}
                                style={{
                                    backgroundColor: "transparent",
                                    color: "#2563eb",
                                    border: "none",
                                    padding: 0,
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                Use a PDF →
                            </button>
                        </div>
                    </div>

                    {/* Job Description Practice */}
                    <div
                        className="practice-hub-card"
                        tabIndex={0}
                        style={{
                            padding: "28px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <div>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "#fffbeb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                marginBottom: "14px"
                            }}>
                                💼
                            </div>
                            <h4 style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "#0f172a",
                                margin: "0 0 8px 0"
                            }}>
                                Job-description practice
                            </h4>
                            <p style={{
                                fontSize: "13px",
                                color: "#475569",
                                lineHeight: "1.5",
                                margin: 0
                            }}>
                                See the skills a role asks for, then practise questions tailored to those requirements.
                            </p>
                        </div>

                        <div style={{ marginTop: "24px" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/prepare?mode=jd")}
                                style={{
                                    backgroundColor: "transparent",
                                    color: "#2563eb",
                                    border: "none",
                                    padding: 0,
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                Analyse a job description →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simplified One-Skill Practice Section */}
            <div
                className="practice-hub-card"
                tabIndex={0}
                style={{
                    padding: "28px 32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                    flexWrap: "wrap"
                }}
            >
                <div style={{ maxWidth: "680px" }}>
                    <h3 style={{
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "#0f172a",
                        margin: "0 0 6px 0"
                    }}>
                        Just want to work on one skill?
                    </h3>
                    <p style={{
                        fontSize: "14px",
                        color: "#475569",
                        lineHeight: "1.5",
                        margin: 0
                    }}>
                        Question practice is the shortest path from a weak area to a focused attempt.
                    </p>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={() => navigate("/practice/one-skill")}
                        style={{
                            backgroundColor: "#1e3a8a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "11px 24px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "background-color 0.15s ease"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1e3a8a"; }}
                    >
                        Configure
                    </button>
                </div>
            </div>

            {/* Subdued Footer Note */}
            <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "8px" }}>
                Proposed UX concept · Illustrative data · Exact scoring, limits and behavior require implementation verification.
            </div>
        </div>
    );
}
