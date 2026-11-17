import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

    const handleStartAdaptive = async () => {
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
                    Adaptive Assessment
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Find the edge of what you know.
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0
                }}>
                    An assessment that adapts to your answers in real time, so you can see where to focus next.
                </p>
            </div>

            {/* Split Content */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr",
                gap: "24px"
            }}>
                {/* Left Column: Adaptive Path & Principles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Blue Banner with 3 Steps */}
                    <div style={{
                        backgroundColor: "#f0f7ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: "16px",
                            marginBottom: "20px"
                        }}>
                            <div>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginBottom: "4px" }}>
                                    01
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                    Start with a question
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginBottom: "4px" }}>
                                    02
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                    Respond in your words
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginBottom: "4px" }}>
                                    03
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                    Explore the next level
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "500" }}>
                            A harder question is a signal to explore, not a judgement about your ability.
                        </div>
                    </div>

                    {/* Principles Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                    }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <span style={{ color: "#10b981", fontSize: "16px", fontWeight: "700" }}>✓</span>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Your answers guide the path
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b" }}>
                                    The assessment uses your responses to dynamically scale difficulty and select what to explore next.
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <span style={{ color: "#10b981", fontSize: "16px", fontWeight: "700" }}>✓</span>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    No need to choose a difficulty
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b" }}>
                                    Start with your domain. The real-time adaptive engine calibrates your level question by question.
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <span style={{ color: "#10b981", fontSize: "16px", fontWeight: "700" }}>✓</span>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Finish with a useful direction
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b" }}>
                                    Review skill-level feedback, mastery rank, and recommended next practice steps.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Start Card */}
                <div>
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h3 style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            Choose your domain
                        </h3>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Target Domain ({ALL_ADAPTIVE_DOMAINS.length} available)
                            </label>
                            <select
                                value={selectedDomainLabel}
                                onChange={(e) => setSelectedDomainLabel(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1.5px solid #cbd5e1",
                                    fontSize: "13.5px",
                                    fontWeight: "600",
                                    color: "#0f172a",
                                    backgroundColor: "#ffffff"
                                }}
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

                        {/* Domain Preview Card */}
                        <div style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "14px",
                            marginBottom: "20px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e3a8a" }}>
                                    {activeDomainObj.label}
                                </span>
                                <span style={{
                                    fontSize: "10.5px",
                                    fontWeight: "700",
                                    color: "#4338ca",
                                    backgroundColor: "#e0e7ff",
                                    padding: "2px 6px",
                                    borderRadius: "4px"
                                }}>
                                    Track: {activeDomainObj.role}
                                </span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.45" }}>
                                {activeDomainObj.description}
                            </p>
                        </div>

                        <p style={{
                            fontSize: "13px",
                            color: "#64748b",
                            lineHeight: "1.5",
                            marginBottom: "20px"
                        }}>
                            You will answer calibrated technical questions with real-time AI difficulty progression and instant feedback.
                        </p>

                        {error && (
                            <div style={{
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#b91c1c",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                marginBottom: "16px"
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleStartAdaptive}
                            disabled={loading}
                            style={{
                                width: "100%",
                                backgroundColor: loading ? "#94a3b8" : "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                marginBottom: "14px"
                            }}
                        >
                            {loading ? "Initializing assessment..." : "Start adaptive assessment →"}
                        </button>

                        <div style={{ textAlign: "center", marginBottom: "24px" }}>
                            <Link
                                to="/practice/mock-setup"
                                style={{
                                    fontSize: "13px",
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    fontWeight: "500"
                                }}
                            >
                                Use a standard interview instead
                            </Link>
                        </div>

                        <div style={{
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px 14px",
                            fontSize: "11px",
                            color: "#64748b",
                            lineHeight: "1.4"
                        }}>
                            <span style={{ fontWeight: "700", color: "#334155" }}>About this concept: </span>
                            Questions start at Intermediate Level 2 and dynamically adjust between Beginner (1) and Expert (4) based on your answer evaluation.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
