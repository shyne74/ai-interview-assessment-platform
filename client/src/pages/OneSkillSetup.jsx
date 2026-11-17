import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Search,
    Check,
    Plus,
    X,
    ArrowRight,
    AlertCircle,
    Sliders,
    Clock
} from "lucide-react";
import api from "../utils/api";
import { getTopicByLabel, getTopicBySlug } from "../config/dsaTopics";

export const DOMAIN_TOPICS_MAP = {
    "Backend Developer": [
        "REST APIs",
        "Authentication & Authorization",
        "Database Management",
        "SQL",
        "MongoDB",
        "Node.js",
        "Express.js",
        "Caching",
        "System Design",
        "Error Handling",
        "Microservices Architecture",
        "Message Queues & Kafka",
        "API Security",
        "Concurrency & Async I/O"
    ],
    "Frontend Developer": [
        "React",
        "JavaScript",
        "TypeScript",
        "State Management",
        "Component Lifecycle",
        "Web Accessibility",
        "Performance Optimization",
        "CSS",
        "Next.js",
        "Testing & Jest",
        "Responsive Design",
        "Browser DOM APIs"
    ],
    "Full Stack Developer": [
        "Full Stack Architecture",
        "React",
        "Node.js",
        "REST & GraphQL APIs",
        "Database Migrations",
        "Web Security (CORS/CSRF)",
        "Authentication & JWT",
        "State Management",
        "End-to-End Testing"
    ],
    "Software Engineer": [
        "Data Structures",
        "Algorithms",
        "Dynamic Programming",
        "Graph Algorithms",
        "Binary Trees",
        "Recursion & Backtracking",
        "Time & Space Complexity",
        "Object-Oriented Design",
        "Concurrency & Mutexes"
    ],
    "AI/ML Engineer": [
        "Machine Learning",
        "Deep Learning",
        "Model Evaluation",
        "NLP & Transformers",
        "Computer Vision",
        "Feature Engineering",
        "PyTorch",
        "TensorFlow",
        "MLOps & Deployment",
        "Vector Databases & Embeddings"
    ],
    "Mobile Developer": [
        "React Native",
        "Flutter",
        "iOS / Swift",
        "Android / Kotlin",
        "Mobile UI State",
        "Offline Storage",
        "Push Notifications",
        "App Performance"
    ],
    "System Architect": [
        "Distributed Systems",
        "Scalability & Load Balancing",
        "Message Brokers (Kafka/RabbitMQ)",
        "Database Partitioning & Sharding",
        "Disaster Recovery & High Availability",
        "Microservices & Event Sourcing",
        "Consensus Protocols (Raft/Paxos)"
    ],
    "DevOps Engineer": [
        "Docker",
        "Kubernetes",
        "CI/CD Pipelines",
        "Terraform",
        "Linux Administration",
        "Cloud Monitoring & Prometheus",
        "Service Meshes (Istio)"
    ],
    "Cloud Engineer": [
        "AWS Architecture",
        "Google Cloud Platform",
        "VPC & Networking",
        "IAM & Cloud Security",
        "Serverless (Lambda/Cloud Functions)",
        "Cloud Storage & S3",
        "Cloud Cost Optimization"
    ],
    "Data Engineer": [
        "ETL / ELT Pipelines",
        "Apache Spark",
        "Data Warehousing (BigQuery/Snowflake)",
        "Apache Kafka",
        "SQL Query Optimization",
        "Data Modeling & Schema Design",
        "Airflow Orchestration"
    ],
    "Security Engineer": [
        "OWASP Top 10",
        "Penetration Testing",
        "Cryptography & PKI",
        "OAuth2 & OpenID Connect",
        "Network Security & Firewalls",
        "Vulnerability Scanning",
        "Threat Modeling"
    ]
};

export const SKILL_METADATA = [
    {
        title: "Backend Developer",
        category: "Web Engineering",
        description: "RESTful architecture, database normalization, asynchronous workers, and backend application performance.",
        tags: ["Node.js", "Express", "REST APIs", "SQL", "MongoDB", "Caching"]
    },
    {
        title: "Frontend Developer",
        category: "Web Engineering",
        description: "Modern component architecture, client-side state lifecycles, CSS ergonomics, and browser runtime performance.",
        tags: ["React", "JavaScript", "TypeScript", "State Management", "Performance"]
    },
    {
        title: "Full Stack Developer",
        category: "Web Engineering",
        description: "End-to-end service design, frontend-to-backend API contract parity, database schemas, and integration pipelines.",
        tags: ["React", "Node.js", "Full Stack Architecture", "APIs", "Databases"]
    },
    {
        title: "Software Engineer",
        category: "Core Computer Science",
        description: "Foundational algorithms, algorithmic complexity analysis, memory safety, concurrency, and OOP architecture.",
        tags: ["Data Structures", "Algorithms", "Dynamic Programming", "Graphs", "Trees"]
    },
    {
        title: "AI/ML Engineer",
        category: "AI & Emerging Tech",
        description: "Model selection, training loops, neural network optimization, data cleaning, and high-throughput inference.",
        tags: ["PyTorch", "Deep Learning", "Transformers", "NLP", "Feature Engineering"]
    },
    {
        title: "Mobile Developer",
        category: "Web Engineering",
        description: "Cross-platform mobile frameworks, lifecycle events, offline synchronization, and native touch optimizations.",
        tags: ["React Native", "Flutter", "Mobile State", "Offline Storage"]
    },
    {
        title: "System Architect",
        category: "Core Computer Science",
        description: "Large-scale distributed systems, fault tolerance, high concurrency, and event-driven architecture.",
        tags: ["Distributed Systems", "Scalability", "Message Queues", "Caching"]
    },
    {
        title: "DevOps Engineer",
        category: "Cloud & Infrastructure",
        description: "Containerization, Kubernetes cluster management, CI/CD automation, and infrastructure as code.",
        tags: ["Docker", "Kubernetes", "CI/CD Pipelines", "Terraform", "Linux"]
    },
    {
        title: "Cloud Engineer",
        category: "Cloud & Infrastructure",
        description: "Multi-cloud architecture, VPC routing, IAM policies, serverless microservices, and cloud storage.",
        tags: ["AWS / GCP", "VPC & Networking", "IAM Security", "Serverless"]
    },
    {
        title: "Data Engineer",
        category: "AI & Emerging Tech",
        description: "Scalable data ingestion pipelines, Apache Spark, warehouse modeling, and streaming transforms.",
        tags: ["Data Warehousing", "ETL Pipelines", "Apache Spark", "BigQuery"]
    },
    {
        title: "Security Engineer",
        category: "Security & Operations",
        description: "Secure design patterns, OWASP vulnerability mitigation, cryptographic protocols, and audits.",
        tags: ["Application Security", "OWASP", "Cryptography", "OAuth2"]
    }
];

const CATEGORIES = [
    "All Disciplines",
    "Web Engineering",
    "Core Computer Science",
    "Cloud & Infrastructure",
    "AI & Emerging Tech",
    "Security & Operations"
];

export default function OneSkillSetup() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const roleQuery = searchParams.get("role") || searchParams.get("domain") || "";
    const skillQuery = searchParams.get("skill") || "";
    const typeQuery = searchParams.get("type") || searchParams.get("format") || "";
    const requestedStep = searchParams.get("step");

    // Redirect to DSA Topic practice if parameter matches a DSA topic
    useEffect(() => {
        const targetToCheck = skillQuery || roleQuery;
        if (!targetToCheck) return;
        const matchedDsaTopic = getTopicByLabel(targetToCheck) || getTopicBySlug(targetToCheck.toLowerCase());
        if (matchedDsaTopic) {
            navigate(`/practice/topics/${matchedDsaTopic.slug}`, { replace: true });
        }
    }, [skillQuery, roleQuery, navigate]);

    // Match canonical role title
    const canonicalRole = useMemo(() => {
        const rawRole = roleQuery || skillQuery || "";
        if (!rawRole) return "Backend Developer";
        const clean = rawRole.trim().toLowerCase();
        if (clean === "coding" || clean === "coding assessment" || clean === "algorithms" || clean === "dsa") {
            return "Software Engineer";
        }
        const matched = SKILL_METADATA.find(
            (s) => s.title.toLowerCase() === clean || clean.includes(s.title.toLowerCase())
        );
        return matched ? matched.title : "Backend Developer";
    }, [roleQuery, skillQuery]);

    // View state: 'select' (role picker) or 'config' (configuration)
    const [viewMode, setViewMode] = useState(() => {
        if (requestedStep === "select") return "select";
        if (roleQuery || skillQuery) return "config";
        return "select";
    });

    const [selectedSkill, setSelectedSkill] = useState(canonicalRole);

    // Filter states for Role Picker
    const [selectedCategory, setSelectedCategory] = useState("All Disciplines");
    const [searchFilter, setSearchFilter] = useState("");

    // Curriculum topics available for selected role
    const availableCurriculumTopics = useMemo(() => {
        return DOMAIN_TOPICS_MAP[selectedSkill] || [];
    }, [selectedSkill]);

    // Selected predefined topics (defaults to first 3 curriculum topics)
    const [selectedPredefinedTopics, setSelectedPredefinedTopics] = useState(() => {
        const list = DOMAIN_TOPICS_MAP[canonicalRole] || [];
        // If skillQuery corresponds to an actual specific subtopic, select that subtopic
        if (skillQuery && skillQuery.toLowerCase() !== canonicalRole.toLowerCase()) {
            const matched = list.find(t => t.toLowerCase() === skillQuery.toLowerCase());
            if (matched) return [matched];
        }
        return list.slice(0, 3);
    });

    // Custom Topics MUST start empty and NEVER be seeded with the role name!
    const [customTopics, setCustomTopics] = useState([]);
    const [customInput, setCustomInput] = useState("");

    // Sync state when selectedSkill changes
    useEffect(() => {
        const list = DOMAIN_TOPICS_MAP[selectedSkill] || [];
        if (skillQuery && skillQuery.toLowerCase() !== selectedSkill.toLowerCase()) {
            const matched = list.find(t => t.toLowerCase() === skillQuery.toLowerCase());
            if (matched) {
                setSelectedPredefinedTopics([matched]);
            } else {
                setSelectedPredefinedTopics(list.slice(0, 3));
            }
        } else {
            setSelectedPredefinedTopics(list.slice(0, 3));
        }
        // Custom topics must be empty by default
        setCustomTopics([]);
    }, [selectedSkill, skillQuery]);

    // Assessment Parameters
    const [questionCount, setQuestionCount] = useState(5);
    const [difficulty, setDifficulty] = useState("Medium");
    const [focusFormat, setFocusFormat] = useState(() => {
        const t = (typeQuery || "").toLowerCase();
        if (t === "coding" || t.includes("coding")) return "coding";
        if (t === "mixed" || t.includes("mixed")) return "mixed";
        return "theory";
    });

    // Unified Duration calculation (used by settings, summary, and payload)
    const durationMinutes = useMemo(() => {
        if (questionCount <= 3) return 15;
        if (questionCount <= 5) return 25;
        if (questionCount <= 8) return 40;
        return 50;
    }, [questionCount]);

    // Submission states
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");

    // Filtered skill cards for Role Picker
    const filteredSkills = useMemo(() => {
        return SKILL_METADATA.filter((item) => {
            const matchesCat = selectedCategory === "All Disciplines" || item.category === selectedCategory;
            const query = searchFilter.trim().toLowerCase();
            const matchesQuery = !query ||
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.tags.some(t => t.toLowerCase().includes(query));
            return matchesCat && matchesQuery;
        });
    }, [selectedCategory, searchFilter]);

    const handleSelectSkillCard = (skillTitle) => {
        setSelectedSkill(skillTitle);
        setViewMode("config");
        setSearchParams({ skill: skillTitle, step: "config" });
    };

    const handleBackToSkillSelection = () => {
        setViewMode("select");
        setSearchParams({ step: "select" });
    };

    const togglePredefinedTopic = (topic) => {
        if (selectedPredefinedTopics.includes(topic)) {
            setSelectedPredefinedTopics(selectedPredefinedTopics.filter((t) => t !== topic));
        } else {
            setSelectedPredefinedTopics([...selectedPredefinedTopics, topic]);
        }
    };

    const handleSelectAllCurriculum = () => {
        setSelectedPredefinedTopics([...availableCurriculumTopics]);
    };

    const handleClearCurriculum = () => {
        setSelectedPredefinedTopics([]);
    };

    const handleAddCustomTopic = (e) => {
        if (e) e.preventDefault();
        const trimmed = customInput.trim();
        if (!trimmed) return;
        // Never allow adding the role name as a topic
        if (trimmed.toLowerCase() === selectedSkill.toLowerCase()) {
            setCustomInput("");
            return;
        }
        if (customTopics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            setCustomInput("");
            return;
        }
        setCustomTopics([...customTopics, trimmed]);
        setCustomInput("");
    };

    const handleRemoveCustomTopic = (topic) => {
        setCustomTopics(customTopics.filter((t) => t !== topic));
    };

    // Total active topics count
    const totalActiveTopicsCount = selectedPredefinedTopics.length + customTopics.length;
    const hasTopicsSelected = totalActiveTopicsCount > 0;

    const handleStartAssessment = async () => {
        if (starting || !hasTopicsSelected) return;
        setStarting(true);
        setError("");

        try {
            // Strip out any accidental role name from topics
            const sanitizedCustom = customTopics.filter(t => t.toLowerCase() !== selectedSkill.toLowerCase());
            const allSelectedTopics = Array.from(new Set([
                ...selectedPredefinedTopics,
                ...sanitizedCustom
            ])).filter(t => Boolean(t) && t.toLowerCase() !== selectedSkill.toLowerCase());

            const payload = {
                interviewType: "one-skill",
                roleTitle: selectedSkill,
                domain: allSelectedTopics.length > 0 ? allSelectedTopics.join(", ") : selectedSkill,
                selectedTopics: allSelectedTopics,
                customTopics: sanitizedCustom,
                assessmentType: focusFormat,
                difficulty: difficulty.toLowerCase(),
                limit: questionCount,
                durationSeconds: durationMinutes * 60,
                generateWithAI: true
            };

            const res = await api.post("/interviews", payload);
            const interviewId = res.data.interviewId;

            localStorage.setItem("activeInterviewId", interviewId);
            navigate(`/interview/${interviewId}`, { replace: true });
        } catch (err) {
            console.error("Failed to launch one-skill assessment:", err);
            setError(err.response?.data?.message || "Could not generate focused assessment. Please retry.");
            setStarting(false);
        }
    };

    // Format human-friendly question mode label
    const questionModeLabel = useMemo(() => {
        if (focusFormat === "coding") return "Algorithmic coding";
        if (focusFormat === "mixed") return "Mixed (Concepts + Code)";
        return "Reasoning & concepts";
    }, [focusFormat]);

    // ==============================================================
    // STEP 1: ROLE PICKER SCREEN
    // ==============================================================
    if (viewMode === "select") {
        return (
            <div className="one-skill-select-page" style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
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
                    .role-card {
                        background-color: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 20px 22px;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        justifyContent: space-between;
                        gap: 16px;
                        outline: none;
                        box-sizing: border-box;
                        transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
                    }
                    .role-card:hover {
                        border-color: #16a34a !important;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 18px rgba(22, 163, 74, 0.08);
                    }
                    .role-card:hover .role-cfg-btn {
                        background-color: #15803d !important;
                        color: #ffffff !important;
                        border-color: #15803d !important;
                    }
                    .role-card:focus-visible {
                        border-color: #16a34a !important;
                        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                    }

                    .cat-filter-btn {
                        padding: 6px 14px;
                        border-radius: 9999px;
                        font-size: 13px;
                        cursor: pointer;
                        outline: none;
                        transition: all 0.14s ease;
                        white-space: nowrap;
                    }
                    .cat-filter-btn.selected {
                        background-color: #f0fdf4;
                        border: 1.5px solid #16a34a;
                        color: #15803d;
                        font-weight: 600;
                    }
                    .cat-filter-btn.unselected {
                        background-color: #ffffff;
                        border: 1px solid #cbd5e1;
                        color: #475569;
                        font-weight: 500;
                    }
                    .cat-filter-btn.unselected:hover {
                        border-color: #94a3b8;
                        background-color: #f8fafc;
                    }
                    .cat-filter-btn:focus-visible {
                        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                    }

                    @media (max-width: 768px) {
                        .roles-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `}</style>

                {/* Header */}
                <div>
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#0f172a",
                        letterSpacing: "-0.03em",
                        margin: "0 0 6px 0"
                    }}>
                        Choose a role
                    </h1>
                    <p style={{ fontSize: "15px", color: "#475569", margin: 0, lineHeight: "1.5" }}>
                        Pick the role you want to practise. You'll choose topics next.
                    </p>
                </div>

                {/* Search Bar + Filter Tabs */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Search Field with Lucide Icon */}
                    <div style={{ position: "relative", maxWidth: "420px" }}>
                        <div style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center"
                        }}>
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search roles or skills..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 14px 10px 38px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13.5px",
                                backgroundColor: "#ffffff",
                                outline: "none",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    {/* Filter Category Chips */}
                    <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`cat-filter-btn ${isSelected ? "selected" : "unselected"}`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Role Cards Grid */}
                {filteredSkills.length === 0 ? (
                    <div style={{
                        padding: "48px 24px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        textAlign: "center",
                        color: "#64748b",
                        fontSize: "14px"
                    }}>
                        No roles match "{searchFilter}". Try another word.
                    </div>
                ) : (
                    <div className="roles-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "16px"
                    }}>
                        {filteredSkills.map((item) => (
                            <div
                                key={item.title}
                                tabIndex={0}
                                onClick={() => handleSelectSkillCard(item.title)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        handleSelectSkillCard(item.title);
                                    }
                                }}
                                className="role-card"
                            >
                                <div>
                                    {/* Muted category label in sentence case */}
                                    <span style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        color: "#64748b",
                                        marginBottom: "6px"
                                    }}>
                                        {item.category}
                                    </span>

                                    {/* Role Name */}
                                    <h2 style={{
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        color: "#0f172a",
                                        margin: 0,
                                        lineHeight: "1.3"
                                    }}>
                                        {item.title}
                                    </h2>
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectSkillCard(item.title);
                                        }}
                                        className="role-cfg-btn"
                                        style={{
                                            width: "100%",
                                            padding: "9px 14px",
                                            borderRadius: "6px",
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #cbd5e1",
                                            color: "#0f172a",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        Configure
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <button
                        type="button"
                        onClick={() => navigate("/practice")}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            fontSize: "13px",
                            cursor: "pointer",
                            fontWeight: "500"
                        }}
                    >
                        ← Back to Practice Hub
                    </button>
                </div>
            </div>
        );
    }

    // ==============================================================
    // STEP 2: CONFIGURE PAGE
    // ==============================================================
    return (
        <div className="one-skill-config-page" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
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
                .config-chip {
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    cursor: pointer;
                    display: inline-flex;
                    alignItems: center;
                    gap: 6px;
                    outline: none;
                    transition: all 0.14s ease;
                }
                .config-chip.selected {
                    background-color: #f0fdf4;
                    color: #15803d;
                    border: 1.5px solid #16a34a;
                    font-weight: 600;
                }
                .config-chip.unselected {
                    background-color: #ffffff;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    font-weight: 500;
                }
                .config-chip.unselected:hover {
                    border-color: #86efac;
                    background-color: #f0fdf4;
                }
                .config-chip:focus-visible {
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                }

                .config-select {
                    width: 100%;
                    padding: 9px 12px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 13.5px;
                    background-color: #ffffff;
                    color: #0f172a;
                    outline: none;
                }
                .config-select:focus {
                    border-color: #16a34a;
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
                }

                @media (max-width: 840px) {
                    .config-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .config-summary-container {
                        position: static !important;
                    }
                }
            `}</style>

            {/* Header */}
            <div>
                <div style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#16a34a",
                    marginBottom: "6px"
                }}>
                    Practice · Focused Assessment
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Configure your assessment
                </h1>
                <p style={{ fontSize: "15px", color: "#475569", margin: 0, lineHeight: "1.5" }}>
                    Select topics from the curriculum or add specialized topics for {selectedSkill}.
                </p>
            </div>

            {/* 2-Column Split: Form + Review Sidebar */}
            <div className="config-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px", alignItems: "start" }}>
                
                {/* Left Column: Form Sections */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    {/* SECTION 1: TOPICS */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                                Topics
                            </h2>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    {selectedPredefinedTopics.length} of {availableCurriculumTopics.length} selected
                                </span>
                                <span style={{ color: "#cbd5e1" }}>•</span>
                                <button
                                    type="button"
                                    onClick={handleSelectAllCurriculum}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#16a34a",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        padding: 0
                                    }}
                                >
                                    Select all
                                </button>
                                <span style={{ color: "#cbd5e1" }}>•</span>
                                <button
                                    type="button"
                                    onClick={handleClearCurriculum}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#64748b",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        padding: 0
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Interactive Clickable Topic Chips Grid (Chips Only) */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {availableCurriculumTopics.length === 0 ? (
                                <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", padding: "8px 0" }}>
                                    No predefined curriculum topics available for this role. You can add custom topics below.
                                </div>
                            ) : (
                                availableCurriculumTopics.map((topic) => {
                                    const isSelected = selectedPredefinedTopics.includes(topic);
                                    return (
                                        <button
                                            key={topic}
                                            type="button"
                                            onClick={() => togglePredefinedTopic(topic)}
                                            className={`config-chip ${isSelected ? "selected" : "unselected"}`}
                                        >
                                            {isSelected ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} />}
                                            <span>{topic}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: CUSTOM TOPICS */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 4px 0" }}>
                            Custom topics
                        </h2>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0", lineHeight: "1.4" }}>
                            Add a topic you want the questions to cover, for example Redlock or Vector Index Optimization.
                        </p>

                        {/* Input form */}
                        <form onSubmit={handleAddCustomTopic} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                            <input
                                type="text"
                                placeholder="Add specialized topic..."
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: "9px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13px",
                                    backgroundColor: "#ffffff",
                                    outline: "none"
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!customInput.trim()}
                                style={{
                                    padding: "9px 16px",
                                    borderRadius: "8px",
                                    backgroundColor: customInput.trim() ? "#0f172a" : "#e2e8f0",
                                    color: customInput.trim() ? "#ffffff" : "#94a3b8",
                                    border: "none",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: customInput.trim() ? "pointer" : "not-allowed",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                + Add
                            </button>
                        </form>

                        {/* Custom Topics Chips (Without Sparkle) */}
                        {customTopics.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {customTopics.map((topic) => (
                                    <div
                                        key={topic}
                                        style={{
                                            padding: "5px 10px",
                                            borderRadius: "6px",
                                            backgroundColor: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            color: "#166534",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}
                                    >
                                        <span>{topic}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustomTopic(topic)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#166534",
                                                cursor: "pointer",
                                                fontSize: "12px",
                                                padding: 0,
                                                display: "flex",
                                                alignItems: "center"
                                            }}
                                            title="Remove topic"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                                No custom topics added yet. Predefined curriculum topics will be used.
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: QUESTION SETTINGS */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px"
                    }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" }}>
                            Question settings
                        </h2>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Question count
                                </label>
                                <select
                                    className="config-select"
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                >
                                    <option value={3}>3 questions (15 mins)</option>
                                    <option value={5}>5 questions (25 mins)</option>
                                    <option value={8}>8 questions (40 mins)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Difficulty
                                </label>
                                <select
                                    className="config-select"
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                >
                                    <option value="Easy">Easy (Foundational)</option>
                                    <option value="Medium">Medium (Applied practice)</option>
                                    <option value="Hard">Hard (Complex edge cases)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Question mode
                                </label>
                                <select
                                    className="config-select"
                                    value={focusFormat}
                                    onChange={(e) => setFocusFormat(e.target.value)}
                                >
                                    <option value="theory">Reasoning & concepts (Theory)</option>
                                    <option value="coding">Algorithmic coding (Coding)</option>
                                    <option value="mixed">Mixed (Concepts + Code)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Summary Card */}
                <div className="config-summary-container" style={{ position: "sticky", top: "24px" }}>
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
                            Assessment Summary
                        </div>

                        <h2 style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            Your assessment
                        </h2>

                        {/* Breakdown Rows */}
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
                                <span style={{ color: "#64748b" }}>Role</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{selectedSkill}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <span style={{ color: "#64748b" }}>Topics</span>
                                <div style={{ textAlign: "right", maxWidth: "200px" }}>
                                    <div style={{ fontWeight: "600", color: "#0f172a" }}>
                                        {selectedPredefinedTopics.length} of {availableCurriculumTopics.length} available
                                    </div>
                                    {selectedPredefinedTopics.length > 0 && (
                                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>
                                            {selectedPredefinedTopics.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Custom topics</span>
                                <span style={{ fontWeight: "600", color: customTopics.length > 0 ? "#16a34a" : "#0f172a" }}>
                                    {customTopics.length}
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Questions</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{questionCount} questions</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Difficulty</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{difficulty}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Duration</span>
                                <span style={{ fontWeight: "600", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={13} />
                                    {durationMinutes} mins
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>Question mode</span>
                                <span style={{ fontWeight: "600", color: "#0f172a" }}>{questionModeLabel}</span>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                fontSize: "12.5px",
                                color: "#b91c1c",
                                backgroundColor: "#fef2f2",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                marginBottom: "16px",
                                border: "1px solid #fecaca"
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Zero Topics Warning */}
                        {!hasTopicsSelected && (
                            <div style={{
                                padding: "8px 12px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "8px",
                                color: "#991b1b",
                                fontSize: "12px",
                                marginBottom: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}>
                                <AlertCircle size={14} />
                                <span>Select at least one topic</span>
                            </div>
                        )}

                        {/* Primary Button */}
                        <button
                            type="button"
                            onClick={handleStartAssessment}
                            disabled={starting || !hasTopicsSelected}
                            style={{
                                width: "100%",
                                backgroundColor: starting || !hasTopicsSelected ? "#94a3b8" : "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: starting || !hasTopicsSelected ? "not-allowed" : "pointer",
                                marginBottom: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                                if (!starting && hasTopicsSelected) e.currentTarget.style.backgroundColor = "#15803d";
                            }}
                            onMouseLeave={(e) => {
                                if (!starting && hasTopicsSelected) e.currentTarget.style.backgroundColor = "#16a34a";
                            }}
                        >
                            {!hasTopicsSelected ? "Select at least one topic" : starting ? "Generating assessment..." : "Start assessment"}
                            {hasTopicsSelected && !starting && <ArrowRight size={15} />}
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <button
                                type="button"
                                onClick={handleBackToSkillSelection}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    padding: "4px"
                                }}
                            >
                                Change role
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
