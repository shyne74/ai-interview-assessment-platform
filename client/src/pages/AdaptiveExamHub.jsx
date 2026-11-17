import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowRight,
    AlertCircle,
    RotateCcw,
    Check,
    Clock,
    Sparkles,
    Shield
} from "lucide-react";
import api from "../utils/api";

export const ADAPTIVE_DOMAIN_CATEGORIES = [
    {
        category: "Web & Application Engineering",
        domains: [
            { id: "frontend", label: "Frontend Development", role: "Frontend Developer", description: "React, modern JavaScript, UI state, rendering performance, and DOM accessibility." },
            { id: "backend", label: "Backend Development", role: "Backend Developer", description: "Node.js, REST APIs, databases, authentication, concurrency, and caching." },
            { id: "fullstack", label: "Full Stack Development", role: "Full Stack Developer", description: "End-to-end web engineering, frontend integration, REST APIs, and database migrations." },
            { id: "mobile", label: "Mobile Development", role: "Mobile Developer", description: "Native and cross-platform mobile patterns, lifecycle, UI state, and device performance." }
        ]
    },
    {
        category: "Core Computer Science & Architecture",
        domains: [
            { id: "dsa", label: "Data Structures & Algorithms", role: "Software Engineer", description: "Trees, graphs, dynamic programming, sorting, recursion, and computational complexity." },
            { id: "system-design", label: "System Design & Distributed Systems", role: "System Architect", description: "Scalability, caching strategies, message queues, partitioning, and microservices." },
            { id: "database", label: "Database Management & SQL", role: "Backend Developer", description: "Query optimization, indexing, ACID transactions, normalization, and NoSQL storage." },
            { id: "os-networks", label: "Operating Systems & Computer Networks", role: "Software Engineer", description: "Process scheduling, virtual memory, sockets, TCP/IP, DNS, and HTTP/3 protocols." },
            { id: "software-testing", label: "Software Testing & QA", role: "Software Engineer", description: "Unit tests, integration pipelines, mocking, regression suites, and test-driven design." }
        ]
    },
    {
        category: "AI, Machine Learning & Data",
        domains: [
            { id: "genai-llm", label: "Generative AI & LLMs", role: "AI/ML Engineer", description: "Prompt engineering, RAG pipelines, vector databases, fine-tuning, and AI agents." },
            { id: "aiml", label: "AI & Machine Learning Foundations", role: "AI/ML Engineer", description: "Supervised & unsupervised models, deep neural networks, and feature engineering." },
            { id: "data-engineering", label: "Data Engineering & Analytics", role: "Data Engineer", description: "ETL pipelines, data warehousing, Apache Spark, BigQuery, and stream processing." }
        ]
    },
    {
        category: "Cloud, Infrastructure & Security",
        domains: [
            { id: "cloud", label: "Cloud Computing (AWS / GCP / Azure)", role: "Cloud Engineer", description: "Serverless compute, IAM roles, cloud networking, VPCs, and storage services." },
            { id: "devops", label: "DevOps & CI/CD Pipelines", role: "DevOps Engineer", description: "Docker containers, Kubernetes orchestration, CI/CD automation, and monitoring." },
            { id: "cybersecurity", label: "Cybersecurity & Web Security", role: "Security Engineer", description: "OWASP Top 10 vulnerabilities, authentication, encryption, PKI, and security auditing." }
        ]
    }
];

export const ALL_ADAPTIVE_DOMAINS = ADAPTIVE_DOMAIN_CATEGORIES.flatMap(c => c.domains);

export default function AdaptiveExamHub() {
    const navigate = useNavigate();
    const [selectedDomainLabel, setSelectedDomainLabel] = useState("Frontend Development");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const activeDomainObj = ALL_ADAPTIVE_DOMAINS.find(d => d.label === selectedDomainLabel) || ALL_ADAPTIVE_DOMAINS[0];
    const hasDomains = ALL_ADAPTIVE_DOMAINS.length > 0;

    const handleStartAdaptive = async () => {
        if (!activeDomainObj || loading) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/adaptive/start", {
                roleTitle: activeDomainObj.role,
                domain: activeDomainObj.label,
                difficulty: "medium",
                questionCount: 5,
                durationSeconds: 1800
            });
            const adaptiveId = res.data.interviewId || res.data.interview?._id;
            navigate(`/adaptive-interview/${adaptiveId}`);
        } catch (err) {
            console.error("Adaptive start error:", err);
            setError(err.response?.data?.message || "Failed to start adaptive session. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="adaptive-hub-page" style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1200px", margin: "0 auto" }}>
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

                .adaptive-select {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 14px;
                    font-weight: 500;
                    color: #0f172a;
                    background-color: #ffffff;
                    outline: none;
                    transition: border-color 0.14s ease, box-shadow 0.14s ease;
                }
                .adaptive-select:focus {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
                }

                .step-dot {
                    width: 28px;
                    height: 28px;
                    border-radius: 9999px;
                    background-color: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #16a34a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                @media (max-width: 840px) {
                    .adaptive-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .how-it-works-row {
                        grid-template-columns: 1fr !important;
                        gap: 20px !important;
                    }
                }
            `}</style>

            {/* Header: Plain and Truthful */}
            <div className="stagger-1">
                <div style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#16a34a",
                    marginBottom: "6px"
                }}>
                    Practice · Adaptive Assessment
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Adaptive assessment
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0,
                    lineHeight: "1.5"
                }}>
                    Questions get harder or easier based on your answers.
                </p>
            </div>

            {/* Split Content */}
            <div className="adaptive-grid stagger-2" style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr",
                gap: "24px",
                alignItems: "start"
            }}>
                {/* Left Column: Progression & Real Engine Truth */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    {/* How It Works Card: 3 Connected Progression Steps */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h2 style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: "0 0 20px 0"
                        }}>
                            How it works
                        </h2>

                        <div className="how-it-works-row" style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "16px",
                            position: "relative"
                        }}>
                            {/* Step 1 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div className="step-dot">
                                    1
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Start at medium
                                </div>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.45" }}>
                                    Your first question begins at medium difficulty in your chosen domain.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div className="step-dot">
                                    2
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Difficulty adapts
                                </div>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.45" }}>
                                    High scores increase question difficulty; lower scores reduce it.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div className="step-dot">
                                    3
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Clear evaluation
                                </div>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.45" }}>
                                    Finish with an overall percentage score, mastery tier, and question feedback.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* How Difficulty Adapts Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#16a34a"
                            }}>
                                <Activity size={18} strokeWidth={2} />
                            </div>
                            <h3 style={{
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "#0f172a",
                                margin: 0
                            }}>
                                Session parameters
                            </h3>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f8fafc" }}>
                                <span style={{ color: "#64748b" }}>Target question count</span>
                                <strong style={{ color: "#0f172a" }}>5 questions</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #f8fafc" }}>
                                <span style={{ color: "#64748b" }}>Total time limit</span>
                                <strong style={{ color: "#0f172a" }}>30 minutes</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Starting difficulty</span>
                                <strong style={{ color: "#0f172a" }}>Medium</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Domain Choice & Start Card */}
                <div>
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            Choose your domain
                        </h2>

                        {!hasDomains ? (
                            <div style={{ padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px" }}>
                                No adaptive domains are currently configured. Please check back later.
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Target domain ({ALL_ADAPTIVE_DOMAINS.length} available)
                                    </label>
                                    <select
                                        className="adaptive-select"
                                        value={selectedDomainLabel}
                                        onChange={(e) => setSelectedDomainLabel(e.target.value)}
                                    >
                                        {ADAPTIVE_DOMAIN_CATEGORIES.map((cat, idx) => (
                                            <optgroup key={idx} label={cat.category}>
                                                {cat.domains.map(d => (
                                                    <option key={d.id} value={d.label}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Single Domain Description Display */}
                                <div style={{
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "10px",
                                    padding: "16px",
                                    marginBottom: "20px"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                            {activeDomainObj.label}
                                        </span>
                                        <span style={{
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            color: "#166534",
                                            backgroundColor: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            padding: "2px 8px",
                                            borderRadius: "4px"
                                        }}>
                                            {activeDomainObj.role}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.45" }}>
                                        {activeDomainObj.description}
                                    </p>
                                </div>
                            </>
                        )}

                        {error && (
                            <div style={{
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#991b1b",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <AlertCircle size={15} color="#dc2626" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleStartAdaptive}
                            disabled={loading || !hasDomains}
                            style={{
                                width: "100%",
                                backgroundColor: loading || !hasDomains ? "#94a3b8" : "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading || !hasDomains ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginBottom: "14px",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!loading && hasDomains) e.currentTarget.style.backgroundColor = "#15803d"; }}
                            onMouseLeave={(e) => { if (!loading && hasDomains) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                        >
                            {loading ? "Starting assessment..." : "Start adaptive assessment"}
                            <ArrowRight size={15} />
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <Link
                                to="/practice/mock-setup"
                                style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    textDecoration: "none",
                                    fontWeight: "500"
                                }}
                            >
                                Use a standard interview instead
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
